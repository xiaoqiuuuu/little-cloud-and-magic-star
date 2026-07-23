import sys
import tempfile
import unittest
from pathlib import Path

import httpx


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import database.config as database_config  # noqa: E402
from database import (  # noqa: E402
    ACCOUNTS_MANAGE,
    HOMEPAGE_MANAGE,
    QUESTIONS_MANAGE,
    QUIZ_OPERATE,
    create_admin,
    init_db,
)
from main import app  # noqa: E402


class RbacPermissionTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.previous_database = database_config.DATABASE_FILE
        database_config.DATABASE_FILE = str(Path(self.temp_dir.name) / "rbac.db")
        init_db()

        self.super_admin = create_admin(
            "rootadmin",
            "StrongPass123",
            "super_admin",
        )
        create_admin(
            "editor",
            "EditorPass123",
            "question_admin",
        )
        create_admin(
            "operator",
            "OperatorPass123",
            "quiz_operator",
        )

    def tearDown(self):
        database_config.DATABASE_FILE = self.previous_database
        self.temp_dir.cleanup()

    async def asyncSetUp(self):
        transport = httpx.ASGITransport(app=app)
        self.client = httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        )

    async def asyncTearDown(self):
        await self.client.aclose()

    async def login(self, username: str, password: str) -> dict:
        response = await self.client.post(
            "/api/admin/login",
            json={"username": username, "password": password},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    @staticmethod
    def auth_headers(access_token: str) -> dict:
        return {"Authorization": f"Bearer {access_token}"}

    async def test_question_manager_can_manage_question_features_but_not_accounts_or_homepage(self):
        tokens = await self.login("editor", "EditorPass123")
        headers = self.auth_headers(tokens["access_token"])

        users = await self.client.get("/api/admin/users", headers=headers)
        update_config = await self.client.put(
            "/api/configs",
            headers=headers,
            json={"key": "COUNTDOWN_SECONDS", "value": "90"},
        )
        batch_import = await self.client.post(
            "/api/admin/questions/batch_import",
            headers=headers,
            json={"questions": []},
        )
        activities = await self.client.get("/api/admin/activities", headers=headers)
        access_roles = await self.client.get("/api/admin/access/roles", headers=headers)
        site_events = await self.client.get("/api/admin/site-events", headers=headers)

        self.assertEqual(users.status_code, 403)
        self.assertEqual(update_config.status_code, 200)
        self.assertEqual(batch_import.status_code, 200)
        self.assertEqual(activities.status_code, 200)
        self.assertEqual(access_roles.status_code, 403)
        self.assertEqual(site_events.status_code, 403)

    async def test_default_roles_expose_permissions_in_current_user(self):
        expected = {
            "rootadmin": {
                QUESTIONS_MANAGE,
                ACCOUNTS_MANAGE,
                HOMEPAGE_MANAGE,
                QUIZ_OPERATE,
            },
            "editor": {QUESTIONS_MANAGE},
            "operator": {QUIZ_OPERATE},
        }
        passwords = {
            "rootadmin": "StrongPass123",
            "editor": "EditorPass123",
            "operator": "OperatorPass123",
        }
        for username, permissions in expected.items():
            tokens = await self.login(username, passwords[username])
            me = await self.client.get(
                "/api/admin/me",
                headers=self.auth_headers(tokens["access_token"]),
            )
            self.assertEqual(me.status_code, 200, me.text)
            self.assertEqual(set(me.json()["permissions"]), permissions)
            self.assertTrue(me.json()["role_name"])

    async def test_custom_homepage_role_only_accesses_homepage_management(self):
        super_tokens = await self.login("rootadmin", "StrongPass123")
        super_headers = self.auth_headers(super_tokens["access_token"])
        role = await self.client.post(
            "/api/admin/access/roles",
            headers=super_headers,
            json={
                "name": "主页运营",
                "description": "只维护主页活动",
                "permissions": [HOMEPAGE_MANAGE],
            },
        )
        self.assertEqual(role.status_code, 201, role.text)
        account = await self.client.post(
            "/api/admin/users",
            headers=super_headers,
            json={
                "username": "homepageeditor",
                "password": "HomepagePass123",
                "role": role.json()["key"],
                "display_name": "主页运营",
            },
        )
        self.assertEqual(account.status_code, 201, account.text)

        tokens = await self.login("homepageeditor", "HomepagePass123")
        headers = self.auth_headers(tokens["access_token"])
        site_events = await self.client.get("/api/admin/site-events", headers=headers)
        duplicated = await self.client.post(
            f"/api/admin/site-events/{site_events.json()[0]['id']}/duplicate",
            headers=headers,
        )
        questions = await self.client.get("/api/admin/questions", headers=headers)
        activities = await self.client.get("/api/admin/activities", headers=headers)
        users = await self.client.get("/api/admin/users", headers=headers)
        access_roles = await self.client.get("/api/admin/access/roles", headers=headers)

        self.assertEqual(site_events.status_code, 200)
        self.assertEqual(duplicated.status_code, 201, duplicated.text)
        self.assertEqual(questions.status_code, 403)
        self.assertEqual(activities.status_code, 403)
        self.assertEqual(users.status_code, 403)
        self.assertEqual(access_roles.status_code, 403)

    async def test_custom_account_role_can_manage_accounts_and_permissions(self):
        super_tokens = await self.login("rootadmin", "StrongPass123")
        super_headers = self.auth_headers(super_tokens["access_token"])
        role = await self.client.post(
            "/api/admin/access/roles",
            headers=super_headers,
            json={
                "name": "账号管理员",
                "permissions": [ACCOUNTS_MANAGE],
            },
        )
        account = await self.client.post(
            "/api/admin/users",
            headers=super_headers,
            json={
                "username": "accountmanager",
                "password": "AccountPass123",
                "role": role.json()["key"],
                "display_name": "账号管理员",
            },
        )
        self.assertEqual(account.status_code, 201, account.text)

        tokens = await self.login("accountmanager", "AccountPass123")
        headers = self.auth_headers(tokens["access_token"])
        users = await self.client.get("/api/admin/users", headers=headers)
        access_roles = await self.client.get("/api/admin/access/roles", headers=headers)
        created_role = await self.client.post(
            "/api/admin/access/roles",
            headers=headers,
            json={"name": "新运营角色", "permissions": [HOMEPAGE_MANAGE]},
        )
        questions = await self.client.get("/api/admin/questions", headers=headers)
        site_events = await self.client.get("/api/admin/site-events", headers=headers)

        self.assertEqual(users.status_code, 200)
        self.assertEqual(access_roles.status_code, 200)
        self.assertEqual(created_role.status_code, 201, created_role.text)
        self.assertEqual(questions.status_code, 403)
        self.assertEqual(site_events.status_code, 403)


if __name__ == "__main__":
    unittest.main()
