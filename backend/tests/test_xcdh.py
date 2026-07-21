import sys
import tempfile
import unittest
from pathlib import Path

import httpx
from fastapi import FastAPI


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import database.config as database_config  # noqa: E402
from api.xcdh import router as xcdh_router  # noqa: E402
from database import init_db  # noqa: E402


test_app = FastAPI()
test_app.include_router(xcdh_router)


class XcdhApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.previous_database = database_config.DATABASE_FILE
        database_config.DATABASE_FILE = str(Path(self.temp_dir.name) / "xcdh.db")
        init_db()
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=test_app),
            base_url="http://feiyinluguo.cn",
        )

    async def asyncTearDown(self):
        await self.client.aclose()
        database_config.DATABASE_FILE = self.previous_database
        self.temp_dir.cleanup()

    async def test_creates_and_lists_messages(self):
        created = await self.client.post(
            "/api/xcdh/messages",
            json={"username": "  魔星  ", "content": "  奔赴星辰大海  "},
        )
        self.assertEqual(created.status_code, 201, created.text)
        message = created.json()
        self.assertEqual(message["username"], "魔星")
        self.assertEqual(message["content"], "奔赴星辰大海")
        self.assertGreaterEqual(message["x"], 5)
        self.assertLessEqual(message["x"], 95)
        self.assertGreaterEqual(message["y"], 9)
        self.assertLessEqual(message["y"], 76)
        self.assertEqual(message["click_count"], 0)

        clicked = await self.client.post(
            f"/api/xcdh/messages/{message['id']}/click"
        )
        self.assertEqual(clicked.status_code, 200, clicked.text)
        self.assertEqual(clicked.json()["click_count"], 1)

        listed = await self.client.get("/api/xcdh/messages")
        self.assertEqual(listed.status_code, 200, listed.text)
        self.assertEqual(listed.json(), [clicked.json()])

    async def test_rejects_blank_messages(self):
        response = await self.client.post(
            "/api/xcdh/messages",
            json={"username": "   ", "content": "有内容"},
        )
        self.assertEqual(response.status_code, 422)

    async def test_missing_star_click_returns_404(self):
        response = await self.client.post("/api/xcdh/messages/999/click")
        self.assertEqual(response.status_code, 404)

    async def test_initialization_adds_click_count_to_legacy_table(self):
        conn = database_config.get_connection()
        try:
            conn.execute("DROP TABLE xcdh_messages")
            conn.execute(
                """
                CREATE TABLE xcdh_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL,
                    content TEXT NOT NULL,
                    x REAL NOT NULL,
                    y REAL NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.execute(
                """
                INSERT INTO xcdh_messages (username, content, x, y)
                VALUES ('旧星愿', '继续闪耀', 50, 50)
                """
            )
            conn.commit()
        finally:
            conn.close()

        init_db()
        response = await self.client.get("/api/xcdh/messages")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()[0]["click_count"], 0)


if __name__ == "__main__":
    unittest.main()
