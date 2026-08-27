"""Static file serving with byte-range support for browser media playback."""

from collections.abc import AsyncIterator

import anyio
from starlette.datastructures import Headers
from starlette.responses import FileResponse, Response, StreamingResponse
from starlette.staticfiles import StaticFiles
from starlette.types import Scope


MAX_CHUNK_SIZE = 64 * 1024


def _parse_range(range_header: str, file_size: int) -> tuple[int, int] | None:
    """Parse one RFC 7233 byte range and return its inclusive bounds."""
    if file_size <= 0 or not range_header.startswith("bytes="):
        return None

    value = range_header.removeprefix("bytes=").strip()
    if not value or "," in value or "-" not in value:
        return None
    start_text, end_text = (part.strip() for part in value.split("-", 1))

    if start_text:
        if not start_text.isdigit():
            return None
        start = int(start_text)
        if start >= file_size:
            return None
        if not end_text:
            return start, file_size - 1
        if not end_text.isdigit():
            return None
        end = min(int(end_text), file_size - 1)
        return (start, end) if end >= start else None

    if not end_text.isdigit():
        return None
    suffix_length = int(end_text)
    if suffix_length <= 0:
        return None
    return max(file_size - suffix_length, 0), file_size - 1


async def _read_file_range(
    path: str,
    start: int,
    length: int,
) -> AsyncIterator[bytes]:
    async with await anyio.open_file(path, mode="rb") as file:
        await file.seek(start)
        remaining = length
        while remaining:
            chunk = await file.read(min(MAX_CHUNK_SIZE, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk


class RangeStaticFiles(StaticFiles):
    """Serve static files while honoring single byte-range requests."""

    async def get_response(self, path: str, scope: Scope) -> Response:
        response = await super().get_response(path, scope)
        if not isinstance(response, FileResponse):
            return response

        response.headers.setdefault("accept-ranges", "bytes")
        range_header = Headers(scope=scope).get("range")
        if not range_header or response.stat_result is None:
            return response

        file_size = response.stat_result.st_size
        byte_range = _parse_range(range_header, file_size)
        if byte_range is None:
            return Response(
                status_code=416,
                headers={
                    "accept-ranges": "bytes",
                    "content-range": f"bytes */{file_size}",
                },
            )

        start, end = byte_range
        content_length = end - start + 1
        headers = dict(response.headers)
        headers.update(
            {
                "accept-ranges": "bytes",
                "content-length": str(content_length),
                "content-range": f"bytes {start}-{end}/{file_size}",
            }
        )
        if scope["method"] == "HEAD":
            return Response(status_code=206, headers=headers)

        return StreamingResponse(
            _read_file_range(response.path, start, content_length),
            status_code=206,
            headers=headers,
        )
