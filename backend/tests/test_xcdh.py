import sys
import tempfile
import unittest
from pathlib import Path

import httpx
from fastapi import FastAPI


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import database.config as database_config  # noqa: E402
from api.dependencies import require_xcdh_messages_manage  # noqa: E402
from api.xcdh import admin_router, public_router  # noqa: E402
from database import init_db  # noqa: E402


test_app = FastAPI()
test_app.include_router(public_router)
test_app.include_router(admin_router)


class XcdhApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.previous_database = database_config.DATABASE_FILE
        database_config.DATABASE_FILE = str(Path(self.temp_dir.name) / "xcdh.db")
        init_db()
        test_app.dependency_overrides[require_xcdh_messages_manage] = lambda: {
            "username": "test-admin",
            "permissions": ["xcdh_messages.manage"],
        }
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=test_app),
            base_url="http://feiyinluguo.cn",
        )

    async def asyncTearDown(self):
        await self.client.aclose()
        test_app.dependency_overrides.clear()
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
        self.assertGreaterEqual(message["x"], 4)
        self.assertLessEqual(message["x"], 96)
        self.assertGreaterEqual(message["y"], 6)
        self.assertLessEqual(message["y"], 94)
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

    async def test_admin_can_search_hide_restore_and_delete_messages(self):
        first = await self.client.post(
            "/api/xcdh/messages",
            json={"username": "魔星甲", "content": "第一颗星愿"},
        )
        second = await self.client.post(
            "/api/xcdh/messages",
            json={"username": "魔星乙", "content": "需要审核的星愿"},
        )
        first_message = first.json()
        second_message = second.json()
        for _ in range(2):
            await self.client.post(
                f"/api/xcdh/messages/{second_message['id']}/click"
            )

        searched = await self.client.get(
            "/api/admin/xcdh/messages",
            params={"keyword": "审核", "sort_by": "click_count"},
        )
        self.assertEqual(searched.status_code, 200, searched.text)
        self.assertEqual(searched.json()["total"], 1)
        self.assertEqual(searched.json()["items"][0]["id"], second_message["id"])
        self.assertEqual(searched.json()["summary"]["total"], 2)
        self.assertEqual(searched.json()["summary"]["total_clicks"], 2)

        hidden = await self.client.patch(
            f"/api/admin/xcdh/messages/{second_message['id']}/visibility",
            json={"hidden": True},
        )
        self.assertEqual(hidden.status_code, 200, hidden.text)
        self.assertTrue(hidden.json()["is_hidden"])
        self.assertTrue(hidden.json()["hidden_at"])

        public_messages = await self.client.get("/api/xcdh/messages")
        self.assertEqual(
            [message["id"] for message in public_messages.json()],
            [first_message["id"]],
        )
        hidden_click = await self.client.post(
            f"/api/xcdh/messages/{second_message['id']}/click"
        )
        self.assertEqual(hidden_click.status_code, 404)

        hidden_list = await self.client.get(
            "/api/admin/xcdh/messages",
            params={"visibility": "hidden"},
        )
        self.assertEqual(hidden_list.json()["total"], 1)
        self.assertEqual(hidden_list.json()["items"][0]["id"], second_message["id"])

        restored = await self.client.patch(
            f"/api/admin/xcdh/messages/{second_message['id']}/visibility",
            json={"hidden": False},
        )
        self.assertFalse(restored.json()["is_hidden"])
        self.assertIsNone(restored.json()["hidden_at"])

        deleted = await self.client.delete(
            f"/api/admin/xcdh/messages/{first_message['id']}"
        )
        self.assertEqual(deleted.status_code, 204, deleted.text)
        remaining = await self.client.get("/api/admin/xcdh/messages")
        self.assertEqual(remaining.json()["summary"]["total"], 1)

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
        conn = database_config.get_connection()
        try:
            columns = {
                row[1]
                for row in conn.execute("PRAGMA table_info(xcdh_messages)").fetchall()
            }
        finally:
            conn.close()
        response = await self.client.get("/api/xcdh/messages")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()[0]["click_count"], 0)
        self.assertTrue({"is_hidden", "hidden_at"} <= columns)


if __name__ == "__main__":
    unittest.main()
