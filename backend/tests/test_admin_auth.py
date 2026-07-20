import os
import json
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

from database import (  # noqa: E402
    create_admin,
    create_question,
    get_next_question_id,
    init_db,
)
from database.config import get_connection  # noqa: E402
from main import app  # noqa: E402
from models import Question  # noqa: E402


class AdminAuthApiTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        init_db()
        conn = get_connection()
        try:
            conn.execute("DELETE FROM site_events")
            conn.execute("DELETE FROM quiz_activity_questions")
            conn.execute("DELETE FROM quiz_activities")
            conn.execute("DELETE FROM question_contributors")
            conn.execute("DELETE FROM material_contributors")
            conn.execute("DELETE FROM questions")
            conn.execute("DELETE FROM materials")
            conn.execute("DELETE FROM admin_refresh_tokens")
            conn.execute("DELETE FROM admins")
            conn.execute("DELETE FROM producers")
            conn.commit()
        finally:
            conn.close()

        # 重新插入由数据库迁移提供的默认官网活动。
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
        self.quiz_operator = create_admin(
            "operator",
            "OperatorPass123",
            "quiz_operator",
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

    async def test_quiz_operator_is_limited_to_the_live_quiz_surface(self):
        tokens = await self.login("operator", "OperatorPass123")
        headers = self.auth_headers(tokens["access_token"])

        admin_questions = await self.client.get("/api/admin/questions", headers=headers)
        materials = await self.client.get("/api/admin/materials", headers=headers)
        activities = await self.client.get("/api/admin/activities", headers=headers)
        site_events = await self.client.get("/api/admin/site-events", headers=headers)
        countdown = await self.client.get(
            "/api/configs/COUNTDOWN_SECONDS",
            headers=headers,
        )

        self.assertEqual(admin_questions.status_code, 403)
        self.assertEqual(materials.status_code, 403)
        self.assertEqual(activities.status_code, 403)
        self.assertEqual(site_events.status_code, 403)
        self.assertEqual(countdown.status_code, 200)

    async def test_super_admin_can_switch_homepage_events_and_keep_old_urls(self):
        current = await self.client.get("/api/site-events/current")
        self.assertEqual(current.status_code, 200, current.text)
        original = current.json()

        editor_tokens = await self.login("editor", "EditorPass123")
        editor_response = await self.client.get(
            "/api/admin/site-events",
            headers=self.auth_headers(editor_tokens["access_token"]),
        )
        self.assertEqual(editor_response.status_code, 403)

        super_tokens = await self.login("rootadmin", "StrongPass123")
        headers = self.auth_headers(super_tokens["access_token"])
        duplicated = await self.client.post(
            f"/api/admin/site-events/{original['id']}/duplicate",
            headers=headers,
        )
        self.assertEqual(duplicated.status_code, 201, duplicated.text)
        draft = duplicated.json()
        self.assertEqual(draft["status"], "draft")
        self.assertFalse(draft["is_current"])

        content = draft["content"]
        content["title"] = "下一场官网活动"
        updated = await self.client.put(
            f"/api/admin/site-events/{draft['id']}",
            headers=headers,
            json={
                "slug": "next-shenzhen-event-2026",
                "name": "下一场深圳活动",
                "date_label": "2026 年 8 月",
                "location": "深圳",
                "content": content,
            },
        )
        self.assertEqual(updated.status_code, 200, updated.text)

        hidden_draft = await self.client.get(
            "/api/site-events/next-shenzhen-event-2026"
        )
        self.assertEqual(hidden_draft.status_code, 404)

        activated = await self.client.post(
            f"/api/admin/site-events/{draft['id']}/activate",
            headers=headers,
        )
        self.assertEqual(activated.status_code, 200, activated.text)
        self.assertTrue(activated.json()["is_current"])

        switched_current = await self.client.get("/api/site-events/current")
        old_url = await self.client.get(f"/api/site-events/{original['slug']}")
        public_list = await self.client.get("/api/site-events")
        self.assertEqual(switched_current.json()["slug"], "next-shenzhen-event-2026")
        self.assertEqual(old_url.status_code, 200)
        self.assertEqual(len(public_list.json()), 2)

        changed_published_slug = await self.client.put(
            f"/api/admin/site-events/{original['id']}",
            headers=headers,
            json={"slug": "changed-old-url"},
        )
        self.assertEqual(changed_published_slug.status_code, 409)

        archived = await self.client.post(
            f"/api/admin/site-events/{original['id']}/archive",
            headers=headers,
        )
        self.assertEqual(archived.status_code, 200, archived.text)
        self.assertEqual(archived.json()["status"], "archived")
        self.assertEqual(
            (await self.client.get(f"/api/site-events/{original['slug']}")).status_code,
            200,
        )

        archive_current = await self.client.post(
            f"/api/admin/site-events/{draft['id']}/archive",
            headers=headers,
        )
        self.assertEqual(archive_current.status_code, 409)

        extra_draft = await self.client.post(
            f"/api/admin/site-events/{draft['id']}/duplicate",
            headers=headers,
        )
        deleted = await self.client.delete(
            f"/api/admin/site-events/{extra_draft.json()['id']}",
            headers=headers,
        )
        self.assertEqual(deleted.status_code, 204)

    async def test_activity_switching_scopes_questions_and_keeps_independent_stats(self):
        create_question(Question(
            id="1",
            question="第一题",
            answer="A",
            tag="common",
        ))
        create_question(Question(
            id="2",
            question="第二题",
            answer="B",
            tag="concert",
        ))
        create_question(Question(
            id="3",
            question="第三题",
            answer="C",
            tag="vlog",
        ))

        super_tokens = await self.login("rootadmin", "StrongPass123")
        operator_tokens = await self.login("operator", "OperatorPass123")
        super_headers = self.auth_headers(super_tokens["access_token"])
        operator_headers = self.auth_headers(operator_tokens["access_token"])

        before_start = await self.client.get("/api/questions/ids", headers=operator_headers)
        super_before_start = await self.client.get(
            "/api/questions/ids",
            headers=super_headers,
        )
        self.assertEqual(before_start.status_code, 200)
        self.assertEqual(before_start.json(), [])
        self.assertEqual(super_before_start.status_code, 200)
        self.assertEqual(
            [item["id"] for item in super_before_start.json()],
            ["1", "2", "3"],
        )

        first = await self.client.post(
            "/api/admin/activities",
            headers=super_headers,
            json={"name": "第一场", "description": "", "question_ids": ["1", "2"]},
        )
        second = await self.client.post(
            "/api/admin/activities",
            headers=super_headers,
            json={"name": "第二场", "description": "", "question_ids": ["2", "3"]},
        )
        self.assertEqual(first.status_code, 201, first.text)
        self.assertEqual(second.status_code, 201, second.text)

        started_first = await self.client.post(
            f"/api/admin/activities/{first.json()['id']}/start",
            headers=super_headers,
        )
        self.assertEqual(started_first.status_code, 200, started_first.text)

        first_ids = await self.client.get("/api/questions/ids", headers=operator_headers)
        super_first_ids = await self.client.get(
            "/api/questions/ids",
            headers=super_headers,
        )
        super_live_ids = await self.client.get(
            "/api/quiz/questions/ids",
            headers=super_headers,
            params={"activity_id": first.json()["id"]},
        )
        operator_live_ids = await self.client.get(
            "/api/quiz/questions/ids",
            headers=operator_headers,
            params={"activity_id": first.json()["id"]},
        )
        forbidden_question = await self.client.get("/api/questions/3", headers=operator_headers)
        super_preview_question = await self.client.get(
            "/api/questions/3",
            headers=super_headers,
        )
        super_live_forbidden_question = await self.client.get(
            "/api/quiz/questions/3",
            headers=super_headers,
            params={"activity_id": first.json()["id"]},
        )
        answer = await self.client.post(
            "/api/answer",
            headers=operator_headers,
            json={"question_id": "1", "answer": "a"},
        )
        random_click = await self.client.post(
            "/api/track/random/1",
            headers=operator_headers,
            params={"activity_id": first.json()["id"]},
        )
        hide_click = await self.client.post(
            "/api/track/hide/1",
            headers=operator_headers,
            params={"activity_id": first.json()["id"]},
        )
        super_random_click = await self.client.post(
            "/api/track/random/2",
            headers=super_headers,
            params={"activity_id": first.json()["id"]},
        )
        super_preview_click = await self.client.post(
            "/api/track/random/3",
            headers=super_headers,
        )
        update_live_question = await self.client.put(
            "/api/admin/questions/1",
            headers=super_headers,
            json={"question": "活动中不应被修改"},
        )
        self.assertEqual([item["id"] for item in first_ids.json()], ["1", "2"])
        self.assertEqual(
            [item["id"] for item in super_first_ids.json()],
            ["1", "2", "3"],
        )
        self.assertEqual([item["id"] for item in super_live_ids.json()], ["1", "2"])
        self.assertEqual([item["id"] for item in operator_live_ids.json()], ["1", "2"])
        self.assertEqual(forbidden_question.status_code, 403)
        self.assertEqual(super_preview_question.status_code, 200)
        self.assertEqual(super_live_forbidden_question.status_code, 403)
        self.assertTrue(answer.json()["correct"])
        self.assertEqual(random_click.status_code, 200)
        self.assertEqual(hide_click.status_code, 200)
        self.assertEqual(super_random_click.status_code, 200)
        self.assertEqual(super_preview_click.status_code, 200)
        self.assertEqual(update_live_question.status_code, 409)

        started_second = await self.client.post(
            f"/api/admin/activities/{second.json()['id']}/start",
            headers=super_headers,
        )
        self.assertEqual(started_second.status_code, 200, started_second.text)
        stale_click = await self.client.post(
            "/api/track/random/2",
            headers=operator_headers,
            params={"activity_id": first.json()["id"]},
        )
        self.assertEqual(stale_click.status_code, 409)
        stale_live_questions = await self.client.get(
            "/api/quiz/questions/ids",
            headers=super_headers,
            params={"activity_id": first.json()["id"]},
        )
        self.assertEqual(stale_live_questions.status_code, 409)
        second_ids = await self.client.get("/api/questions/ids", headers=operator_headers)
        self.assertEqual([item["id"] for item in second_ids.json()], ["2", "3"])
        second_detail = await self.client.get(
            f"/api/admin/activities/{second.json()['id']}",
            headers=super_headers,
        )
        self.assertEqual(second_detail.json()["questions"][0]["random_clicks"], 0)

        first_detail = await self.client.get(
            f"/api/admin/activities/{first.json()['id']}",
            headers=super_headers,
        )
        self.assertEqual(first_detail.json()["status"], "paused")
        first_question_stat = first_detail.json()["questions"][0]
        self.assertEqual(first_question_stat["random_clicks"], 1)
        self.assertEqual(first_question_stat["hide_clicks"], 1)
        self.assertEqual(first_detail.json()["questions"][1]["random_clicks"], 1)

        immutable = await self.client.put(
            f"/api/admin/activities/{first.json()['id']}",
            headers=super_headers,
            json={"question_ids": ["1"]},
        )
        self.assertEqual(immutable.status_code, 400)

        switched_back = await self.client.post(
            f"/api/admin/activities/{first.json()['id']}/start",
            headers=super_headers,
        )
        self.assertEqual(switched_back.status_code, 200)
        self.assertEqual(switched_back.json()["total_random_clicks"], 2)
        self.assertEqual(switched_back.json()["total_hide_clicks"], 1)

        ended = await self.client.post(
            f"/api/admin/activities/{first.json()['id']}/end",
            headers=super_headers,
        )
        self.assertEqual(ended.status_code, 200)
        restart_ended = await self.client.post(
            f"/api/admin/activities/{first.json()['id']}/start",
            headers=super_headers,
        )
        self.assertEqual(restart_ended.status_code, 400)
        after_end = await self.client.get("/api/questions/ids", headers=operator_headers)
        super_after_end = await self.client.get(
            "/api/questions/ids",
            headers=super_headers,
        )
        ended_live_questions = await self.client.get(
            "/api/quiz/questions/ids",
            headers=super_headers,
            params={"activity_id": first.json()["id"]},
        )
        self.assertEqual(after_end.json(), [])
        self.assertEqual(
            [item["id"] for item in super_after_end.json()],
            ["1", "2", "3"],
        )
        self.assertEqual(ended_live_questions.status_code, 409)

        conn = get_connection()
        try:
            legacy_stats = conn.execute(
                "SELECT random_clicks, hide_clicks FROM questions WHERE id = '1'"
            ).fetchone()
        finally:
            conn.close()
        self.assertEqual(tuple(legacy_stats), (0, 0))
        conn = get_connection()
        try:
            preview_stats = conn.execute(
                "SELECT random_clicks, hide_clicks FROM questions WHERE id = '3'"
            ).fetchone()
        finally:
            conn.close()
        self.assertEqual(tuple(preview_stats), (1, 0))

    async def test_question_tags_and_timestamps_support_activity_filtering(self):
        tokens = await self.login("rootadmin", "StrongPass123")
        headers = self.auth_headers(tokens["access_token"])

        created = await self.client.post(
            "/api/admin/questions",
            headers=headers,
            json={
                "question": "音乐题目",
                "answer": "A",
                "resources": [],
                "tag": "music",
                "author": ["rootadmin"],
            },
        )
        self.assertEqual(created.status_code, 200, created.text)
        question = created.json()
        self.assertEqual(question["tag"], "music")
        self.assertTrue(question["created_at"])
        self.assertTrue(question["updated_at"])

        conn = get_connection()
        try:
            columns = {
                row[1] for row in conn.execute("PRAGMA table_info(questions)").fetchall()
            }
            conn.execute(
                "UPDATE questions SET updated_at = '2000-01-01 00:00:00' WHERE id = ?",
                (question["id"],),
            )
            conn.commit()
        finally:
            conn.close()
        self.assertTrue({"created_at", "updated_at"} <= columns)

        updated = await self.client.put(
            f"/api/admin/questions/{question['id']}",
            headers=headers,
            json={"tag": "粉丝互动"},
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["tag"], "粉丝互动")
        self.assertEqual(updated.json()["created_at"], question["created_at"])
        self.assertNotEqual(updated.json()["updated_at"], "2000-01-01 00:00:00")

        filtered = await self.client.get(
            "/api/admin/questions",
            headers=headers,
            params={"tag": "粉丝互动"},
        )
        stats = await self.client.get("/api/admin/stats", headers=headers)
        self.assertEqual(filtered.status_code, 200, filtered.text)
        self.assertEqual(filtered.json()["total"], 1)
        self.assertEqual(stats.json()["by_tag"]["粉丝互动"], 1)

    async def test_deleting_questions_does_not_rebind_activity_references(self):
        create_question(Question(
            id="9",
            question="草稿原题",
            answer="A",
            tag="common",
        ))
        super_tokens = await self.login("rootadmin", "StrongPass123")
        super_headers = self.auth_headers(super_tokens["access_token"])
        draft = await self.client.post(
            "/api/admin/activities",
            headers=super_headers,
            json={"name": "草稿活动", "description": "", "question_ids": ["9"]},
        )
        self.assertEqual(draft.status_code, 201, draft.text)

        deleted = await self.client.delete("/api/admin/questions/9", headers=super_headers)
        self.assertEqual(deleted.status_code, 200, deleted.text)
        create_question(Question(
            id="9",
            question="复用题号的新题",
            answer="B",
            tag="vlog",
        ))

        draft_detail = await self.client.get(
            f"/api/admin/activities/{draft.json()['id']}",
            headers=super_headers,
        )
        self.assertEqual(draft_detail.json()["question_ids"], [])
        self.assertEqual(draft_detail.json()["question_count"], 0)
        start_empty_draft = await self.client.post(
            f"/api/admin/activities/{draft.json()['id']}/start",
            headers=super_headers,
        )
        self.assertEqual(start_empty_draft.status_code, 400)

        historical = await self.client.post(
            "/api/admin/activities",
            headers=super_headers,
            json={"name": "历史活动", "description": "", "question_ids": ["9"]},
        )
        await self.client.post(
            f"/api/admin/activities/{historical.json()['id']}/start",
            headers=super_headers,
        )
        await self.client.post(
            f"/api/admin/activities/{historical.json()['id']}/end",
            headers=super_headers,
        )
        await self.client.delete("/api/admin/questions/9", headers=super_headers)
        self.assertEqual(get_next_question_id(), "10")

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

    async def test_questions_and_materials_bind_accounts_and_default_to_self(self):
        editor_tokens = await self.login("editor", "EditorPass123")
        editor_headers = self.auth_headers(editor_tokens["access_token"])

        question = await self.client.post(
            "/api/admin/questions",
            headers=editor_headers,
            json={
                "question": "账号绑定题目",
                "answer": "answer",
                "tag": "common",
                "contributor_ids": [self.super_admin["id"]],
            },
        )
        self.assertEqual(question.status_code, 200, question.text)
        self.assertEqual(
            [item["id"] for item in question.json()["contributors"]],
            [self.question_admin["id"]],
        )
        self.assertEqual(question.json()["author"], ["editor"])

        material = await self.client.post(
            "/api/admin/materials",
            headers=editor_headers,
            json={
                "name": "账号绑定物料",
                "description": "",
                "resources": [],
                "contributor_ids": [self.super_admin["id"]],
            },
        )
        self.assertEqual(material.status_code, 200, material.text)
        self.assertEqual(
            [item["id"] for item in material.json()["contributors"]],
            [self.question_admin["id"]],
        )

        super_tokens = await self.login("rootadmin", "StrongPass123")
        super_headers = self.auth_headers(super_tokens["access_token"])
        updated_card = await self.client.patch(
            f"/api/admin/users/{self.question_admin['id']}",
            headers=super_headers,
            json={"display_name": "编辑名片"},
        )
        self.assertEqual(updated_card.status_code, 200, updated_card.text)
        refreshed_question = await self.client.get(
            f"/api/admin/questions/{question.json()['id']}",
            headers=super_headers,
        )
        self.assertEqual(refreshed_question.json()["author"], ["编辑名片"])

        editor_questions = await self.client.get(
            "/api/admin/questions",
            headers=super_headers,
            params={"contributor_id": self.question_admin["id"]},
        )
        root_questions = await self.client.get(
            "/api/admin/questions",
            headers=super_headers,
            params={"contributor_id": self.super_admin["id"]},
        )
        editor_materials = await self.client.get(
            "/api/admin/materials",
            headers=super_headers,
            params={"contributor_id": self.question_admin["id"]},
        )
        self.assertEqual(editor_questions.json()["total"], 1)
        self.assertEqual(root_questions.json()["total"], 0)
        self.assertEqual(editor_materials.json()["total"], 1)

        delete_bound_account = await self.client.delete(
            f"/api/admin/users/{self.question_admin['id']}",
            headers=super_headers,
        )
        self.assertEqual(delete_bound_account.status_code, 409)

    async def test_database_initialization_binds_username_authors_and_empty_questions(self):
        fallback = create_admin(
            "fylgcyzlm",
            "FallbackPass123",
            "question_admin",
        )
        conn = get_connection()
        try:
            conn.execute(
                """
                INSERT INTO questions (id, question, answer, resources, tag, author)
                VALUES ('90', '用户名旧题', 'a', '[]', 'common', ?)
                """,
                (json.dumps(["editor"]),),
            )
            conn.execute(
                """
                INSERT INTO questions (id, question, answer, resources, tag, author)
                VALUES ('91', '空出题人旧题', 'a', '[]', 'common', '')
                """
            )
            conn.commit()
        finally:
            conn.close()

        init_db()
        init_db()
        conn = get_connection()
        try:
            bound_rows = conn.execute(
                """
                SELECT question_id, admin_id
                FROM question_contributors
                WHERE question_id IN ('90', '91')
                ORDER BY question_id
                """
            ).fetchall()
            empty_author = conn.execute(
                "SELECT author FROM questions WHERE id = '91'"
            ).fetchone()[0]
        finally:
            conn.close()

        self.assertEqual(
            bound_rows,
            [("90", self.question_admin["id"]), ("91", fallback["id"])],
        )
        self.assertEqual(json.loads(empty_author), ["fylgcyzlm"])

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
                        CHECK(role IN ('super_admin', 'question_admin'))
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
            migrated_schema = conn.execute(
                "SELECT sql FROM sqlite_master WHERE name = 'admins'"
            ).fetchone()[0]
        finally:
            conn.close()

        self.assertTrue(stored_password.startswith("pbkdf2_sha256$"))
        self.assertTrue({"is_active", "token_version", "created_at", "updated_at"} <= columns)
        self.assertIn("quiz_operator", migrated_schema)
        await self.login("legacyeditor", "LegacyPass123")
        create_admin("migratedoperator", "OperatorPass123", "quiz_operator")
        await self.login("migratedoperator", "OperatorPass123")

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
