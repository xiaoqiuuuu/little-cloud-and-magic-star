import sys
import tempfile
import unittest
from pathlib import Path

import httpx
from starlette.applications import Starlette


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from range_static import RangeStaticFiles  # noqa: E402


class RangeStaticFilesTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        Path(self.temp_dir.name, "sample.mp4").write_bytes(b"0123456789")
        self.app = Starlette()
        self.app.mount(
            "/uploads",
            RangeStaticFiles(directory=self.temp_dir.name),
            name="uploads",
        )
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=self.app),
            base_url="http://testserver",
        )

    async def asyncTearDown(self):
        await self.client.aclose()
        self.temp_dir.cleanup()

    async def test_full_response_advertises_range_support(self):
        response = await self.client.get("/uploads/sample.mp4")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"0123456789")
        self.assertEqual(response.headers["accept-ranges"], "bytes")

    async def test_range_response_returns_partial_content(self):
        response = await self.client.get(
            "/uploads/sample.mp4",
            headers={"Range": "bytes=2-5"},
        )

        self.assertEqual(response.status_code, 206)
        self.assertEqual(response.content, b"2345")
        self.assertEqual(response.headers["content-length"], "4")
        self.assertEqual(response.headers["content-range"], "bytes 2-5/10")
        self.assertEqual(response.headers["accept-ranges"], "bytes")

    async def test_suffix_and_open_ended_ranges_are_supported(self):
        suffix = await self.client.get(
            "/uploads/sample.mp4",
            headers={"Range": "bytes=-3"},
        )
        open_ended = await self.client.get(
            "/uploads/sample.mp4",
            headers={"Range": "bytes=7-"},
        )

        self.assertEqual(suffix.status_code, 206)
        self.assertEqual(suffix.content, b"789")
        self.assertEqual(open_ended.status_code, 206)
        self.assertEqual(open_ended.content, b"789")

    async def test_unsatisfiable_range_returns_416(self):
        response = await self.client.get(
            "/uploads/sample.mp4",
            headers={"Range": "bytes=20-30"},
        )

        self.assertEqual(response.status_code, 416)
        self.assertEqual(response.headers["content-range"], "bytes */10")

    async def test_head_range_returns_headers_without_body(self):
        response = await self.client.head(
            "/uploads/sample.mp4",
            headers={"Range": "bytes=0-3"},
        )

        self.assertEqual(response.status_code, 206)
        self.assertEqual(response.content, b"")
        self.assertEqual(response.headers["content-length"], "4")
        self.assertEqual(response.headers["content-range"], "bytes 0-3/10")
