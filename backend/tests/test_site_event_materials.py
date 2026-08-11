import sys
import tempfile
import unittest
from pathlib import Path

import httpx


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import database.config as database_config  # noqa: E402
from database import create_admin, init_db  # noqa: E402
from main import app  # noqa: E402


class SiteEventMaterialTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.previous_database = database_config.DATABASE_FILE
        database_config.DATABASE_FILE = str(
            Path(self.temp_dir.name) / "site-event-materials.db"
        )
        init_db()
        create_admin("rootadmin", "StrongPass123", "super_admin")

    def tearDown(self):
        database_config.DATABASE_FILE = self.previous_database
        self.temp_dir.cleanup()

    async def asyncSetUp(self):
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://testserver",
        )

    async def asyncTearDown(self):
        await self.client.aclose()

    async def login_headers(self) -> dict:
        response = await self.client.post(
            "/api/admin/login",
            json={"username": "rootadmin", "password": "StrongPass123"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    async def test_homepage_reads_latest_material_manager_data(self):
        current = await self.client.get("/api/site-events/current")
        self.assertEqual(current.status_code, 200, current.text)
        self.assertTrue(current.json()["content"]["material_ids"])
        self.assertEqual(
            len(current.json()["content"]["material_ids"]),
            len(current.json()["content"]["materials"]),
        )

        headers = await self.login_headers()
        material = await self.client.post(
            "/api/admin/materials",
            headers=headers,
            json={
                "name": "首页联动物料",
                "description": "初始介绍",
                "resources": ["https://example.com/material-cover.jpg"],
            },
        )
        self.assertEqual(material.status_code, 200, material.text)
        material_id = material.json()["id"]

        options = await self.client.get(
            "/api/admin/site-events/material-options",
            headers=headers,
        )
        self.assertEqual(options.status_code, 200, options.text)
        self.assertIn(material_id, [item["id"] for item in options.json()])

        duplicated = await self.client.post(
            f"/api/admin/site-events/{current.json()['id']}/duplicate",
            headers=headers,
        )
        draft = duplicated.json()
        content = draft["content"]
        content["material_ids"] = [material_id]
        updated = await self.client.put(
            f"/api/admin/site-events/{draft['id']}",
            headers=headers,
            json={"content": content},
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(
            updated.json()["content"]["materials"][0]["description"],
            "初始介绍",
        )

        activated = await self.client.post(
            f"/api/admin/site-events/{draft['id']}/activate",
            headers=headers,
        )
        self.assertEqual(activated.status_code, 200, activated.text)
        changed = await self.client.put(
            f"/api/admin/materials/{material_id}",
            headers=headers,
            json={"description": "物料管理中更新后的介绍"},
        )
        self.assertEqual(changed.status_code, 200, changed.text)

        refreshed = await self.client.get("/api/site-events/current")
        self.assertEqual(refreshed.status_code, 200, refreshed.text)
        self.assertEqual(
            refreshed.json()["content"]["materials"][0]["description"],
            "物料管理中更新后的介绍",
        )


if __name__ == "__main__":
    unittest.main()
