"""页面访问采集与聚合统计。"""

from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit

from .config import get_connection


REPORTING_TIMEZONE = timezone(timedelta(hours=8))
DIRECT_SOURCE = "直接访问"
INTERNAL_SOURCE = "站内跳转"


def _hash_identifier(kind: str, value: str) -> str:
    salt = os.getenv("ANALYTICS_HASH_SALT") or os.getenv("SECRET_KEY") or "local-analytics"
    return hmac.new(
        salt.encode("utf-8"),
        f"{kind}:{value}".encode("utf-8", "ignore"),
        hashlib.sha256,
    ).hexdigest()


def normalize_path(raw_path: str | None) -> str:
    """只保留站内路径，避免查询参数和异常长地址拆散页面统计。"""
    value = (raw_path or "/").strip()
    if not value.startswith("/"):
        return "/"
    path = urlsplit(value).path or "/"
    if path != "/":
        path = path.rstrip("/") or "/"
    return path[:512]


def normalize_source(referrer: str | None, site_host: str | None = None) -> str:
    """把完整来源 URL 归一化为可读且稳定的来源名称。"""
    value = (referrer or "").strip()
    if not value:
        return DIRECT_SOURCE

    try:
        host = (urlsplit(value).hostname or "").lower().removeprefix("www.")
    except ValueError:
        return DIRECT_SOURCE
    if not host:
        return DIRECT_SOURCE

    own_host = (site_host or "").lower().removeprefix("www.")
    if own_host and host == own_host:
        return INTERNAL_SOURCE

    known_sources = (
        (("baidu.com",), "百度"),
        (("google.com", "google.com.hk", "google.cn"), "Google"),
        (("bing.com",), "Bing"),
        (("sogou.com", "so.com"), "其他搜索引擎"),
        (("weibo.com", "weibo.cn"), "微博"),
        (("bilibili.com", "b23.tv"), "哔哩哔哩"),
        (("xiaohongshu.com", "xhslink.com"), "小红书"),
        (("douyin.com", "iesdouyin.com"), "抖音"),
        (("weixin.qq.com", "mp.weixin.qq.com"), "微信"),
    )
    for domains, label in known_sources:
        if any(host == domain or host.endswith(f".{domain}") for domain in domains):
            return label
    return host[:255]


def classify_user_agent(user_agent: str | None) -> tuple[str, str, str]:
    """无需额外依赖地提取足够用于运营统计的设备、浏览器和系统。"""
    ua = (user_agent or "").lower()
    if not ua:
        device = "未知"
    elif any(marker in ua for marker in ("bot", "spider", "crawler", "slurp")):
        device = "爬虫"
    elif any(marker in ua for marker in ("ipad", "tablet", "playbook")):
        device = "平板"
    elif any(marker in ua for marker in ("mobile", "iphone", "android")):
        device = "手机"
    else:
        device = "电脑"

    if "edg/" in ua:
        browser = "Edge"
    elif "micromessenger" in ua:
        browser = "微信内置浏览器"
    elif "qqbrowser" in ua:
        browser = "QQ 浏览器"
    elif "opr/" in ua or "opera" in ua:
        browser = "Opera"
    elif "firefox/" in ua:
        browser = "Firefox"
    elif "chrome/" in ua or "crios/" in ua:
        browser = "Chrome"
    elif "safari/" in ua:
        browser = "Safari"
    else:
        browser = "其他"

    if "iphone" in ua or "ipad" in ua or "ios" in ua:
        operating_system = "iOS"
    elif "android" in ua:
        operating_system = "Android"
    elif "windows" in ua:
        operating_system = "Windows"
    elif "mac os" in ua or "macintosh" in ua:
        operating_system = "macOS"
    elif "linux" in ua:
        operating_system = "Linux"
    else:
        operating_system = "其他"
    return device, browser, operating_system


def backfill_page_visit_dimensions(cursor) -> None:
    """为升级前的访问记录补齐匿名维度，让历史数据仍可参与统计。"""
    rows = cursor.execute(
        """
        SELECT id, visit_time, ip_address, referrer, user_agent
        FROM page_visits
        WHERE visitor_key IS NULL OR session_key IS NULL
           OR source IS NULL OR device_type IS NULL
           OR browser IS NULL OR operating_system IS NULL
        """
    ).fetchall()
    for visit_id, visit_time, ip_address, referrer, user_agent in rows:
        visitor_key = _hash_identifier("legacy-visitor", f"{ip_address or ''}|{user_agent or ''}")
        session_key = _hash_identifier(
            "legacy-session",
            f"{visitor_key}|{str(visit_time or '')[:13]}",
        )
        device, browser, operating_system = classify_user_agent(user_agent)
        cursor.execute(
            """
            UPDATE page_visits
            SET path = COALESCE(path, '/'),
                visitor_key = COALESCE(visitor_key, ?),
                session_key = COALESCE(session_key, ?),
                source = COALESCE(source, ?),
                device_type = COALESCE(device_type, ?),
                browser = COALESCE(browser, ?),
                operating_system = COALESCE(operating_system, ?)
            WHERE id = ?
            """,
            (
                visitor_key,
                session_key,
                normalize_source(referrer),
                device,
                browser,
                operating_system,
                visit_id,
            ),
        )


def add_visit(
    *,
    ip_address: str,
    referrer: str,
    user_agent: str,
    path: str,
    visitor_id: str,
    session_id: str,
    site_host: str,
) -> bool:
    """写入一次页面访问；短时间内同一会话重复上报不会重复计数。"""
    visitor_seed = visitor_id or f"{ip_address}|{user_agent}"
    session_seed = session_id or f"{visitor_seed}|{datetime.now(timezone.utc):%Y-%m-%d-%H}"
    visitor_key = _hash_identifier("visitor", visitor_seed)
    session_key = _hash_identifier("session", session_seed)
    clean_path = normalize_path(path)
    source = normalize_source(referrer, site_host)
    device, browser, operating_system = classify_user_agent(user_agent)

    conn = get_connection()
    try:
        duplicate = conn.execute(
            """
            SELECT 1
            FROM page_visits
            WHERE session_key = ? AND path = ?
              AND visit_time >= datetime('now', '-5 seconds')
            LIMIT 1
            """,
            (session_key, clean_path),
        ).fetchone()
        if duplicate:
            return False
        conn.execute(
            """
            INSERT INTO page_visits (
                ip_address, referrer, user_agent, path, visitor_key,
                session_key, source, device_type, browser, operating_system
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                ip_address[:64],
                referrer[:1024],
                user_agent[:1024],
                clean_path,
                visitor_key,
                session_key,
                source,
                device,
                browser,
                operating_system,
            ),
        )
        conn.commit()
        return True
    finally:
        conn.close()


def _change_percent(current: int, previous: int) -> float | None:
    if previous == 0:
        return None
    return round((current - previous) * 100 / previous, 1)


def _utc_boundary(local_date) -> str:
    local_midnight = datetime.combine(local_date, datetime.min.time(), REPORTING_TIMEZONE)
    return local_midnight.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def get_visit_stats(days: int = 30) -> dict:
    """返回中国时区下的访问概览与图表数据。"""
    today = datetime.now(REPORTING_TIMEZONE).date()
    start_date = today - timedelta(days=days - 1)
    previous_start = start_date - timedelta(days=days)
    local_date_sql = "date(visit_time, '+8 hours')"
    period_start_utc = _utc_boundary(start_date)
    period_end_utc = _utc_boundary(today + timedelta(days=1))
    today_start_utc = _utc_boundary(today)
    previous_start_utc = _utc_boundary(previous_start)

    conn = get_connection()
    try:
        total_pv, total_uv = conn.execute(
            "SELECT COUNT(*), COUNT(DISTINCT visitor_key) FROM page_visits"
        ).fetchone()
        today_pv, today_uv = conn.execute(
            f"""
            SELECT COUNT(*), COUNT(DISTINCT visitor_key)
            FROM page_visits WHERE visit_time >= ? AND visit_time < ?
            """,
            (today_start_utc, period_end_utc),
        ).fetchone()
        period_pv, period_uv, period_sessions = conn.execute(
            f"""
            SELECT COUNT(*), COUNT(DISTINCT visitor_key), COUNT(DISTINCT session_key)
            FROM page_visits WHERE visit_time >= ? AND visit_time < ?
            """,
            (period_start_utc, period_end_utc),
        ).fetchone()
        previous_pv, previous_uv = conn.execute(
            f"""
            SELECT COUNT(*), COUNT(DISTINCT visitor_key)
            FROM page_visits WHERE visit_time >= ? AND visit_time < ?
            """,
            (previous_start_utc, period_start_utc),
        ).fetchone()

        daily_rows = conn.execute(
            f"""
            SELECT {local_date_sql} AS visit_date,
                   COUNT(*) AS pv,
                   COUNT(DISTINCT visitor_key) AS uv,
                   COUNT(DISTINCT session_key) AS sessions
            FROM page_visits
            WHERE visit_time >= ? AND visit_time < ?
            GROUP BY visit_date ORDER BY visit_date ASC
            """,
            (period_start_utc, period_end_utc),
        ).fetchall()
        daily_map = {
            row[0]: {"date": row[0], "pv": row[1], "uv": row[2], "sessions": row[3]}
            for row in daily_rows
        }
        daily = []
        for offset in range(days):
            date_label = (start_date + timedelta(days=offset)).isoformat()
            daily.append(daily_map.get(date_label, {
                "date": date_label,
                "pv": 0,
                "uv": 0,
                "sessions": 0,
            }))

        hourly_rows = conn.execute(
            """
            SELECT strftime('%H', datetime(visit_time, '+8 hours')) AS hour, COUNT(*)
            FROM page_visits
            WHERE visit_time >= ? AND visit_time < ?
            GROUP BY hour ORDER BY hour
            """,
            (today_start_utc, period_end_utc),
        ).fetchall()
        hourly_map = {int(row[0]): row[1] for row in hourly_rows}
        hourly = [{"hour": hour, "pv": hourly_map.get(hour, 0)} for hour in range(24)]

        def ranked_dimension(column: str, limit: int) -> list[dict]:
            rows = conn.execute(
                f"""
                SELECT COALESCE(NULLIF({column}, ''), '未知') AS name,
                       COUNT(*) AS pv,
                       COUNT(DISTINCT visitor_key) AS uv
                FROM page_visits
                WHERE visit_time >= ? AND visit_time < ?
                GROUP BY name ORDER BY pv DESC, name ASC LIMIT ?
                """,
                (period_start_utc, period_end_utc, limit),
            ).fetchall()
            return [{"name": row[0], "pv": row[1], "uv": row[2]} for row in rows]

        return {
            "period_days": days,
            "generated_at": datetime.now(REPORTING_TIMEZONE).isoformat(timespec="seconds"),
            "summary": {
                "total_pv": total_pv,
                "total_uv": total_uv,
                "today_pv": today_pv,
                "today_uv": today_uv,
                "period_pv": period_pv,
                "period_uv": period_uv,
                "period_sessions": period_sessions,
                "pages_per_session": round(period_pv / period_sessions, 2) if period_sessions else 0,
                "pv_change_percent": _change_percent(period_pv, previous_pv),
                "uv_change_percent": _change_percent(period_uv, previous_uv),
            },
            "daily": daily,
            "hourly": hourly,
            "pages": ranked_dimension("path", 10),
            "sources": ranked_dimension("source", 10),
            "devices": ranked_dimension("device_type", 10),
            "browsers": ranked_dimension("browser", 10),
        }
    finally:
        conn.close()
