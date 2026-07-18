"""Read-only, API-key-protected access to bounded production logs."""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
import re
import subprocess
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse


LOGGER = logging.getLogger("little_cloud_log_api")
LOGGER.setLevel(logging.INFO)
LOGGER.propagate = False
if not LOGGER.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(levelname)s %(name)s %(message)s"))
    LOGGER.addHandler(handler)
APP_UNIT = "little-cloud.service"
NGINX_ERROR_LOG = Path("/www/wwwlogs/feiyinluguo.cn.error.log")
NGINX_ACCESS_LOG = Path("/www/wwwlogs/feiyinluguo.cn.log")
MAX_LIMIT = 500
MAX_SCAN_LINES = 5000
MAX_RESPONSE_CHARS = 256_000
MAX_TAIL_BYTES = 2 * 1024 * 1024
RATE_LIMIT_REQUESTS = 30
RATE_LIMIT_WINDOW_SECONDS = 60

SINCE_OPTIONS = {
    "15m": timedelta(minutes=15),
    "1h": timedelta(hours=1),
    "6h": timedelta(hours=6),
    "24h": timedelta(hours=24),
    "3d": timedelta(days=3),
}
JOURNAL_SINCE = {
    "15m": "15 minutes ago",
    "1h": "1 hour ago",
    "6h": "6 hours ago",
    "24h": "24 hours ago",
    "3d": "3 days ago",
}
LEVEL_PATTERNS = {
    "all": None,
    "warning": re.compile(r"warning|warn|error|exception|traceback|critical|failed", re.I),
    "error": re.compile(r"error|exception|traceback|critical|failed", re.I),
    "critical": re.compile(r"critical|fatal|panic", re.I),
}
SENSITIVE_QUERY = re.compile(
    r"(?i)([?&](?:password|passwd|token|secret|api[-_]?key)=)[^&\s]+"
)
SENSITIVE_FIELD = re.compile(
    r"(?i)\b(authorization|cookie|set-cookie|password|passwd|token|secret|api[-_]?key)"
    r"(\s*[:=]\s*)([^\s,;]+)"
)
BEARER_TOKEN = re.compile(r"(?i)(bearer\s+)[A-Za-z0-9._~+/=-]+")
JWT_TOKEN = re.compile(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b")
NGINX_ERROR_TIME = re.compile(r"^(\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2})")
NGINX_ACCESS_TIME = re.compile(r"\[(\d{2}/[A-Za-z]{3}/\d{4}:\d{2}:\d{2}:\d{2} [+-]\d{4})\]")

_rate_buckets: dict[str, deque[float]] = defaultdict(deque)
_rate_lock = threading.Lock()


def _configured_key_hash() -> str:
    value = os.getenv("LOG_API_KEY_SHA256", "").strip().lower()
    if not re.fullmatch(r"[0-9a-f]{64}", value):
        raise RuntimeError("LOG_API_KEY_SHA256 must be a SHA-256 hex digest")
    return value


CONFIGURED_KEY_HASH = _configured_key_hash()


def api_key_is_valid(raw_key: str | None) -> bool:
    if not raw_key:
        return False
    digest = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    return hmac.compare_digest(digest, CONFIGURED_KEY_HASH)


def redact_line(line: str) -> str:
    line = BEARER_TOKEN.sub(r"\1<redacted>", line)
    line = SENSITIVE_QUERY.sub(r"\1<redacted>", line)
    line = SENSITIVE_FIELD.sub(r"\1\2<redacted>", line)
    return JWT_TOKEN.sub("<redacted-jwt>", line)


def filter_level(lines: list[str], level: str) -> list[str]:
    pattern = LEVEL_PATTERNS[level]
    if pattern is None:
        return lines
    return [line for line in lines if pattern.search(line)]


def _enforce_rate_limit(client: str) -> None:
    now = time.monotonic()
    with _rate_lock:
        bucket = _rate_buckets[client]
        while bucket and now - bucket[0] >= RATE_LIMIT_WINDOW_SECONDS:
            bucket.popleft()
        if len(bucket) >= RATE_LIMIT_REQUESTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="查询过于频繁，请稍后再试",
            )
        bucket.append(now)
        if len(_rate_buckets) > 10_000:
            _rate_buckets.clear()


def require_api_key(
    request: Request,
    x_log_api_key: str | None = Header(default=None, alias="X-Log-API-Key"),
) -> None:
    client = request.client.host if request.client else "unknown"
    _enforce_rate_limit(client)
    if not api_key_is_valid(x_log_api_key):
        LOGGER.warning("Denied log query client=%s", client)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的日志查询凭据",
        )


def query_journal(since: str, scan_lines: int) -> list[str]:
    command = [
        "journalctl",
        "--unit",
        APP_UNIT,
        "--since",
        JOURNAL_SINCE[since],
        "--no-pager",
        "--output",
        "short-iso",
        "--lines",
        str(scan_lines),
    ]
    result = subprocess.run(
        command,
        text=True,
        capture_output=True,
        timeout=8,
        check=False,
        env={**os.environ, "LC_ALL": "C"},
    )
    if result.returncode != 0:
        LOGGER.error("journalctl failed code=%s", result.returncode)
        raise HTTPException(status_code=500, detail="应用日志查询失败")
    return result.stdout.splitlines()


def tail_lines(path: Path, count: int) -> list[str]:
    if not path.is_file():
        return []
    chunk_size = 8192
    data = b""
    with path.open("rb") as handle:
        handle.seek(0, os.SEEK_END)
        position = handle.tell()
        while position > 0 and data.count(b"\n") <= count and len(data) < MAX_TAIL_BYTES:
            read_size = min(chunk_size, position)
            position -= read_size
            handle.seek(position)
            data = handle.read(read_size) + data
    return data.decode("utf-8", "replace").splitlines()[-count:]


def _parse_nginx_time(line: str, source: str, local_tz) -> datetime | None:
    if source == "nginx-error":
        match = NGINX_ERROR_TIME.search(line)
        if match:
            return datetime.strptime(match.group(1), "%Y/%m/%d %H:%M:%S").replace(tzinfo=local_tz)
    else:
        match = NGINX_ACCESS_TIME.search(line)
        if match:
            return datetime.strptime(match.group(1), "%d/%b/%Y:%H:%M:%S %z")
    return None


def query_nginx(source: str, since: str, scan_lines: int) -> list[str]:
    path = NGINX_ERROR_LOG if source == "nginx-error" else NGINX_ACCESS_LOG
    lines = tail_lines(path, scan_lines)
    now = datetime.now().astimezone()
    cutoff = now - SINCE_OPTIONS[since]
    filtered = []
    for line in lines:
        timestamp = _parse_nginx_time(line, source, now.tzinfo)
        if timestamp is None or timestamp >= cutoff:
            filtered.append(line)
    return filtered


def bound_response(lines: list[str], limit: int) -> tuple[list[str], bool]:
    selected = lines[-limit:]
    result: list[str] = []
    total_chars = 0
    truncated = len(lines) > len(selected)
    for line in reversed(selected):
        safe_line = redact_line(line)
        if total_chars + len(safe_line) > MAX_RESPONSE_CHARS:
            truncated = True
            break
        result.append(safe_line)
        total_chars += len(safe_line)
    result.reverse()
    return result, truncated


app = FastAPI(
    title="Little Cloud Read-only Log API",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


@app.middleware("http")
async def no_store(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/logs", dependencies=[Depends(require_api_key)])
def get_logs(
    request: Request,
    source: Literal["app", "nginx-error", "nginx-access"] = "app",
    since: Literal["15m", "1h", "6h", "24h", "3d"] = "1h",
    level: Literal["all", "warning", "error", "critical"] = "error",
    limit: int = Query(default=200, ge=1, le=MAX_LIMIT),
) -> JSONResponse:
    scan_lines = min(MAX_SCAN_LINES, max(limit * 10, 500))
    if source == "app":
        raw_lines = query_journal(since, scan_lines)
    else:
        raw_lines = query_nginx(source, since, scan_lines)

    filtered = filter_level(raw_lines, level)
    lines, truncated = bound_response(filtered, limit)
    client = request.client.host if request.client else "unknown"
    LOGGER.info(
        "Log query client=%s source=%s since=%s level=%s returned=%s",
        client,
        source,
        since,
        level,
        len(lines),
    )
    return JSONResponse(
        {
            "source": source,
            "since": since,
            "level": level,
            "limit": limit,
            "count": len(lines),
            "truncated": truncated,
            "lines": lines,
        }
    )
