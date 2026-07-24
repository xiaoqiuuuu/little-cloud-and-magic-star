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
    CONTENT_ROLES_MANAGE,
    HOMEPAGE_MANAGE,
    MATERIALS_MANAGE,
    QUESTIONS_MANAGE,
    QUIZ_ACTIVITIES_MANAGE,
    QUIZ_OPERATE,
    VISIT_STATS_VIEW,
    create_admin,
    init_db,
)
from main import app  # noqa: E402


QUESTION_ADMIN_PERMISSIONS = {
    QUESTIONS_MANAGE,
    MATERIALS_MANAGE,
    CONTENT_ROLES_MANAGE,
    QUIZ_ACTIVITIES_MANAGE,
    VISIT_STATS_VIEW,
}


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
        self.question_admin = create_admin(
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

    async def test_default_content_manager_keeps_all_legacy_content_modules(self):
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
        materials = await self.client.get("/api/admin/materials", headers=headers)
        visit_stats = await self.client.get("/api/stats/", headers=headers)
        access_roles = await self.client.get("/api/admin/access/roles", headers=headers)
        site_events = await self.client.get("/api/admin/site-events", headers=headers)

        self.assertEqual(users.status_code, 403)
        self.assertEqual(update_config.status_code, 200)
        self.assertEqual(batch_import.status_code, 200)
        self.assertEqual(activities.status_code, 200)
        self.assertEqual(materials.status_code, 200)
        self.assertEqual(visit_stats.status_code, 200)
        self.assertEqual(access_roles.status_code, 403)
        self.assertEqual(site_events.status_code, 403)

    async def test_default_roles_expose_permissions_in_current_user(self):
        expected = {
            "rootadmin": {
                *QUESTION_ADMIN_PERMISSIONS,
                ACCOUNTS_MANAGE,
                HOMEPAGE_MANAGE,
                QUIZ_OPERATE,
            },
            "editor": QUESTION_ADMIN_PERMISSIONS,
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

    async def test_granular_roles_only_access_their_assigned_modules(self):
        super_tokens = await self.login("rootadmin", "StrongPass123")
        super_headers = self.auth_headers(super_tokens["access_token"])
        role_specs = {
            "materialonly": ("物料专员", MATERIALS_MANAGE),
            "activityonly": ("活动专员", QUIZ_ACTIVITIES_MANAGE),
            "roleonly": ("内容角色专员", CONTENT_ROLES_MANAGE),
            "statsonly": ("数据分析员", VISIT_STATS_VIEW),
        }
        role_keys = {}
        for username, (name, permission) in role_specs.items():
            role = await self.client.post(
                "/api/admin/access/roles",
                headers=super_headers,
                json={"name": name, "permissions": [permission]},
            )
            account = await self.client.post(
                "/api/admin/users",
                headers=super_headers,
                json={
                    "username": username,
                    "password": "GranularPass123",
                    "roles": [role.json()["key"]],
                },
            )
            self.assertEqual(account.status_code, 201, account.text)
            role_keys[username] = role.json()["key"]

        material_tokens = await self.login("materialonly", "GranularPass123")
        material_headers = self.auth_headers(material_tokens["access_token"])
        material = await self.client.post(
            "/api/admin/materials",
            headers=material_headers,
            json={"name": "独立物料", "description": "", "resources": []},
        )
        material_questions = await self.client.get(
            "/api/admin/questions",
            headers=material_headers,
        )
        self.assertEqual(material.status_code, 200, material.text)
        self.assertEqual(material.json()["contributors"][0]["username"], "materialonly")
        self.assertEqual(material_questions.status_code, 403)
        remove_bound_material_permission = await self.client.patch(
            f"/api/admin/access/roles/{role_keys['materialonly']}",
            headers=super_headers,
            json={"name": "物料专员", "permissions": []},
        )
        self.assertEqual(remove_bound_material_permission.status_code, 409)

        activity_tokens = await self.login("activityonly", "GranularPass123")
        activity_headers = self.auth_headers(activity_tokens["access_token"])
        activities = await self.client.get(
            "/api/admin/activities",
            headers=activity_headers,
        )
        question_options = await self.client.get(
            "/api/admin/activities/question-options",
            headers=activity_headers,
        )
        countdown = await self.client.put(
            "/api/configs",
            headers=activity_headers,
            json={"key": "COUNTDOWN_SECONDS", "value": "75"},
        )
        activity_questions = await self.client.get(
            "/api/admin/questions",
            headers=activity_headers,
        )
        self.assertEqual(activities.status_code, 200, activities.text)
        self.assertEqual(question_options.status_code, 200, question_options.text)
        self.assertEqual(countdown.status_code, 200, countdown.text)
        self.assertEqual(activity_questions.status_code, 403)

        role_tokens = await self.login("roleonly", "GranularPass123")
        content_role = await self.client.post(
            "/api/roles",
            headers=self.auth_headers(role_tokens["access_token"]),
            json={
                "name": "测试内容角色",
                "desc": "用于权限测试",
                "camp": "平民",
                "identity": "测试",
                "color": "blue",
            },
        )
        self.assertEqual(content_role.status_code, 200, content_role.text)

        stats_tokens = await self.login("statsonly", "GranularPass123")
        stats_headers = self.auth_headers(stats_tokens["access_token"])
        stats = await self.client.get("/api/stats/", headers=stats_headers)
        stats_activities = await self.client.get(
            "/api/admin/activities",
            headers=stats_headers,
        )
        self.assertEqual(stats.status_code, 200, stats.text)
        self.assertEqual(stats_activities.status_code, 403)

    async def test_user_can_have_multiple_roles_and_permissions_are_unioned(self):
        super_tokens = await self.login("rootadmin", "StrongPass123")
        super_headers = self.auth_headers(super_tokens["access_token"])
        account = await self.client.post(
            "/api/admin/users",
            headers=super_headers,
            json={
                "username": "multioperator",
                "password": "MultiOperator123",
                "roles": ["question_admin", "quiz_operator"],
            },
        )
        self.assertEqual(account.status_code, 201, account.text)
        self.assertEqual(
            account.json()["role_keys"],
            ["question_admin", "quiz_operator"],
        )
        self.assertEqual(
            set(account.json()["permissions"]),
            {*QUESTION_ADMIN_PERMISSIONS, QUIZ_OPERATE},
        )

        tokens = await self.login("multioperator", "MultiOperator123")
        headers = self.auth_headers(tokens["access_token"])
        me = await self.client.get("/api/admin/me", headers=headers)
        questions = await self.client.get("/api/admin/questions", headers=headers)
        users = await self.client.get("/api/admin/users", headers=headers)

        self.assertEqual(me.status_code, 200, me.text)
        self.assertEqual(
            [role["key"] for role in me.json()["roles"]],
            ["question_admin", "quiz_operator"],
        )
        self.assertEqual(
            set(me.json()["permissions"]),
            {*QUESTION_ADMIN_PERMISSIONS, QUIZ_OPERATE},
        )
        self.assertEqual(questions.status_code, 200, questions.text)
        self.assertEqual(users.status_code, 403)

        access_roles = await self.client.get(
            "/api/admin/access/roles",
            headers=super_headers,
        )
        counts = {role["key"]: role["user_count"] for role in access_roles.json()}
        self.assertEqual(counts["question_admin"], 2)
        self.assertEqual(counts["quiz_operator"], 2)

    async def test_updating_multiple_roles_invalidates_existing_session(self):
        super_tokens = await self.login("rootadmin", "StrongPass123")
        super_headers = self.auth_headers(super_tokens["access_token"])
        account = await self.client.post(
            "/api/admin/users",
            headers=super_headers,
            json={
                "username": "rolechanger",
                "password": "RoleChanger123",
                "roles": ["question_admin"],
            },
        )
        original_tokens = await self.login("rolechanger", "RoleChanger123")

        updated = await self.client.patch(
            f"/api/admin/users/{account.json()['id']}",
            headers=super_headers,
            json={"roles": ["question_admin", "quiz_operator"]},
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(
            updated.json()["role_keys"],
            ["question_admin", "quiz_operator"],
        )

        old_access = await self.client.get(
            "/api/admin/me",
            headers=self.auth_headers(original_tokens["access_token"]),
        )
        old_refresh = await self.client.post(
            "/api/admin/refresh",
            json={"refresh_token": original_tokens["refresh_token"]},
        )
        self.assertEqual(old_access.status_code, 401)
        self.assertEqual(old_refresh.status_code, 401)

        relogged = await self.login("rolechanger", "RoleChanger123")
        me = await self.client.get(
            "/api/admin/me",
            headers=self.auth_headers(relogged["access_token"]),
        )
        self.assertEqual(
            set(me.json()["permissions"]),
            {*QUESTION_ADMIN_PERMISSIONS, QUIZ_OPERATE},
        )

    async def test_super_admin_role_works_when_it_is_not_the_primary_role(self):
        super_tokens = await self.login("rootadmin", "StrongPass123")
        account = await self.client.post(
            "/api/admin/users",
            headers=self.auth_headers(super_tokens["access_token"]),
            json={
                "username": "secondarysuper",
                "password": "SecondarySuper123",
                "roles": ["question_admin", "super_admin"],
            },
        )
        self.assertEqual(account.status_code, 201, account.text)
        self.assertEqual(account.json()["role"], "question_admin")

        tokens = await self.login("secondarysuper", "SecondarySuper123")
        headers = self.auth_headers(tokens["access_token"])
        users = await self.client.get("/api/admin/users", headers=headers)
        reset_all = await self.client.post(
            "/api/admin/questions/reset_stats_all",
            headers=headers,
        )
        self.assertEqual(users.status_code, 200, users.text)
        self.assertEqual(reset_all.status_code, 200, reset_all.text)

    async def test_account_must_keep_at_least_one_role(self):
        super_tokens = await self.login("rootadmin", "StrongPass123")
        response = await self.client.patch(
            f"/api/admin/users/{self.question_admin['id']}",
            headers=self.auth_headers(super_tokens["access_token"]),
            json={"roles": []},
        )
        self.assertEqual(response.status_code, 422)

    async def test_legacy_question_roles_expand_once_to_granular_permissions(self):
        super_tokens = await self.login("rootadmin", "StrongPass123")
        role = await self.client.post(
            "/api/admin/access/roles",
            headers=self.auth_headers(super_tokens["access_token"]),
            json={"name": "旧版内容管理员", "permissions": [QUESTIONS_MANAGE]},
        )
        role_key = role.json()["key"]
        granular_permissions = [
            MATERIALS_MANAGE,
            CONTENT_ROLES_MANAGE,
            QUIZ_ACTIVITIES_MANAGE,
            VISIT_STATS_VIEW,
        ]

        conn = database_config.get_connection()
        try:
            placeholders = ",".join("?" for _ in granular_permissions)
            conn.execute(
                f"DELETE FROM access_role_permissions WHERE permission_key IN ({placeholders})",
                granular_permissions,
            )
            conn.execute(
                f"DELETE FROM access_permissions WHERE key IN ({placeholders})",
                granular_permissions,
            )
            conn.commit()
        finally:
            conn.close()

        init_db()
        conn = database_config.get_connection()
        try:
            migrated = {
                row[0]
                for row in conn.execute(
                    """
                    SELECT permission_key FROM access_role_permissions
                    WHERE role_key = ?
                    """,
                    (role_key,),
                ).fetchall()
            }
            conn.execute(
                """
                DELETE FROM access_role_permissions
                WHERE role_key = ? AND permission_key = ?
                """,
                (role_key, MATERIALS_MANAGE),
            )
            conn.commit()
        finally:
            conn.close()

        self.assertTrue(set(granular_permissions) <= migrated)
        init_db()
        conn = database_config.get_connection()
        try:
            restored = conn.execute(
                """
                SELECT 1 FROM access_role_permissions
                WHERE role_key = ? AND permission_key = ?
                """,
                (role_key, MATERIALS_MANAGE),
            ).fetchone()
        finally:
            conn.close()
        self.assertIsNone(restored)


if __name__ == "__main__":
    unittest.main()
