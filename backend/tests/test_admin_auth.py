import os
import sys
import tempfile
import unittest
from pathlib import Path

import httpx
from jose import jwt


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

TEST_DATABASE_DIR = tempfile.TemporaryDirectory()
os.environ["DATABASE_FILE"] = str(Path(TEST_DATABASE_DIR.name) / "quiz.db")
os.environ["ENVIRONMENT"] = "test"
os.environ["SECRET_KEY"] = "test-secret-key-for-admin-auth-tests"

from database import create_admin, init_db  # noqa: E402
from database.config import get_connection  # noqa: E402
from main import app  # noqa: E402


class AdminAuthApiTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        init_db()
        conn = get_connection()
        try:
            conn.execute("DELETE FROM admin_refresh_tokens")
            conn.execute("DELETE FROM admins")
            conn.commit()
        finally:
            conn.close()

        self.super_admin = create_admin(
            "rootadmin",
            "StrongPass123",
            "super_admin",
        )
        self.question_admin = create_admin(
            "editor",
            "EditorPass123",
            "question_admin",
        )

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

    async def test_login_issues_one_day_access_and_thirty_day_refresh_tokens(self):
        tokens = await self.login("rootadmin", "StrongPass123")

        access_claims = jwt.get_unverified_claims(tokens["access_token"])
        refresh_claims = jwt.get_unverified_claims(tokens["refresh_token"])
        self.assertEqual(access_claims["type"], "access")
        self.assertEqual(refresh_claims["type"], "refresh")
        self.assertAlmostEqual(
            access_claims["exp"] - access_claims["iat"],
            24 * 60 * 60,
            delta=1,
        )
        self.assertAlmostEqual(
            refresh_claims["exp"] - refresh_claims["iat"],
            30 * 24 * 60 * 60,
            delta=1,
        )

        refresh_as_access = await self.client.get(
            "/api/admin/me",
            headers=self.auth_headers(tokens["refresh_token"]),
        )
        self.assertEqual(refresh_as_access.status_code, 401)

    async def test_refresh_token_is_rotated_and_cannot_be_reused(self):
        tokens = await self.login("rootadmin", "StrongPass123")
        refreshed = await self.client.post(
            "/api/admin/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        self.assertEqual(refreshed.status_code, 200, refreshed.text)

        reused = await self.client.post(
            "/api/admin/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        self.assertEqual(reused.status_code, 401)

        me = await self.client.get(
            "/api/admin/me",
            headers=self.auth_headers(refreshed.json()["access_token"]),
        )
        self.assertEqual(me.status_code, 200)

    async def test_question_admin_cannot_access_super_admin_operations(self):
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

        self.assertEqual(users.status_code, 403)
        self.assertEqual(update_config.status_code, 403)
        self.assertEqual(batch_import.status_code, 403)

    async def test_super_admin_can_create_and_disable_a_hashed_account(self):
        tokens = await self.login("rootadmin", "StrongPass123")
        headers = self.auth_headers(tokens["access_token"])
        created = await self.client.post(
            "/api/admin/users",
            headers=headers,
            json={
                "username": "neweditor",
                "password": "NewEditorPass123",
                "role": "question_admin",
            },
        )
        self.assertEqual(created.status_code, 201, created.text)
        self.assertNotIn("password", created.json())

        conn = get_connection()
        try:
            stored_password = conn.execute(
                "SELECT password FROM admins WHERE id = ?",
                (created.json()["id"],),
            ).fetchone()[0]
        finally:
            conn.close()
        self.assertNotEqual(stored_password, "NewEditorPass123")
        self.assertTrue(stored_password.startswith("pbkdf2_sha256$"))

        new_user_tokens = await self.login("neweditor", "NewEditorPass123")
        disabled = await self.client.patch(
            f"/api/admin/users/{created.json()['id']}",
            headers=headers,
            json={"is_active": False},
        )
        self.assertEqual(disabled.status_code, 200, disabled.text)

        old_access = await self.client.get(
            "/api/admin/me",
            headers=self.auth_headers(new_user_tokens["access_token"]),
        )
        old_refresh = await self.client.post(
            "/api/admin/refresh",
            json={"refresh_token": new_user_tokens["refresh_token"]},
        )
        self.assertEqual(old_access.status_code, 401)
        self.assertEqual(old_refresh.status_code, 401)

    async def test_database_initialization_migrates_legacy_plaintext_passwords(self):
        conn = get_connection()
        try:
            conn.execute("DROP TABLE admin_refresh_tokens")
            conn.execute("DROP TABLE admins")
            conn.execute(
                """
                CREATE TABLE admins (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT DEFAULT 'question_admin'
                )
                """
            )
            conn.execute(
                "INSERT INTO admins (username, password, role) VALUES (?, ?, ?)",
                ("legacyeditor", "LegacyPass123", "question_admin"),
            )
            conn.commit()
        finally:
            conn.close()

        init_db()
        conn = get_connection()
        try:
            stored_password = conn.execute(
                "SELECT password FROM admins WHERE username = ?",
                ("legacyeditor",),
            ).fetchone()[0]
            columns = {
                row[1] for row in conn.execute("PRAGMA table_info(admins)").fetchall()
            }
        finally:
            conn.close()

        self.assertTrue(stored_password.startswith("pbkdf2_sha256$"))
        self.assertTrue({"is_active", "token_version", "created_at", "updated_at"} <= columns)
        await self.login("legacyeditor", "LegacyPass123")

    async def test_role_change_invalidates_existing_tokens(self):
        super_tokens = await self.login("rootadmin", "StrongPass123")
        editor_tokens = await self.login("editor", "EditorPass123")

        updated = await self.client.patch(
            f"/api/admin/users/{self.question_admin['id']}",
            headers=self.auth_headers(super_tokens["access_token"]),
            json={"role": "super_admin"},
        )
        self.assertEqual(updated.status_code, 200, updated.text)

        old_access = await self.client.get(
            "/api/admin/me",
            headers=self.auth_headers(editor_tokens["access_token"]),
        )
        old_refresh = await self.client.post(
            "/api/admin/refresh",
            json={"refresh_token": editor_tokens["refresh_token"]},
        )
        self.assertEqual(old_access.status_code, 401)
        self.assertEqual(old_refresh.status_code, 401)

        relogged = await self.login("editor", "EditorPass123")
        users = await self.client.get(
            "/api/admin/users",
            headers=self.auth_headers(relogged["access_token"]),
        )
        self.assertEqual(users.status_code, 200)

    async def test_current_super_admin_cannot_modify_or_delete_itself(self):
        tokens = await self.login("rootadmin", "StrongPass123")
        headers = self.auth_headers(tokens["access_token"])

        update_self = await self.client.patch(
            f"/api/admin/users/{self.super_admin['id']}",
            headers=headers,
            json={"role": "question_admin"},
        )
        delete_self = await self.client.delete(
            f"/api/admin/users/{self.super_admin['id']}",
            headers=headers,
        )
        reset_self = await self.client.put(
            f"/api/admin/users/{self.super_admin['id']}/password",
            headers=headers,
            json={"password": "AnotherStrongPass123"},
        )

        self.assertEqual(update_self.status_code, 400)
        self.assertEqual(reset_self.status_code, 200)
        self.assertEqual(delete_self.status_code, 400)

        invalidated_access = await self.client.get(
            "/api/admin/me",
            headers=headers,
        )
        self.assertEqual(invalidated_access.status_code, 401)


if __name__ == "__main__":
    unittest.main()
