import sys
import tempfile
import unittest
from pathlib import Path

import httpx


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import database.config as database_config  # noqa: E402
from database import create_admin, init_db, update_admin  # noqa: E402
from main import app  # noqa: E402


class QuestionAnswerInviteTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.previous_database = database_config.DATABASE_FILE
        database_config.DATABASE_FILE = str(
            Path(self.temp_dir.name) / "question-answer-invites.db"
        )
        init_db()
        self.owner = create_admin(
            "invite-owner",
            "StrongPass123",
            "question_admin",
            display_name="邀请人",
        )
        create_admin(
            "other-owner",
            "OtherPass123",
            "question_admin",
            display_name="其他出题人",
        )
        create_admin(
            "invite-operator",
            "OperatorPass123",
            "quiz_operator",
        )

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

    async def login_headers(
        self,
        username: str = "invite-owner",
        password: str = "StrongPass123",
    ) -> dict:
        response = await self.client.post(
            "/api/admin/login",
            json={"username": username, "password": password},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    async def create_question(
        self,
        headers: dict,
        question: str,
        answer: str,
    ) -> str:
        response = await self.client.post(
            "/api/admin/questions",
            headers=headers,
            json={
                "question": question,
                "answer": answer,
                "resources": ["https://example.com/question.jpg"],
                "tag": "common",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["id"]

    @staticmethod
    def invite_headers(token: str) -> dict:
        return {"X-Question-Answer-Invite-Token": token}

    async def test_random_invite_hides_answer_until_reveal(self):
        headers = await self.login_headers()
        first_id = await self.create_question(headers, "第一道随机题", "答案一")
        second_id = await self.create_question(headers, "第二道随机题", "答案二")
        answers = {first_id: "答案一", second_id: "答案二"}

        created = await self.client.post(
            "/api/admin/question-answer-invites",
            headers=headers,
        )
        self.assertEqual(created.status_code, 200, created.text)
        link = created.json()
        self.assertIn(link["question_id"], answers)
        self.assertGreaterEqual(len(link["token"]), 32)

        opened = await self.client.get(
            "/api/question-answer-invites",
            headers=self.invite_headers(link["token"]),
        )
        self.assertEqual(opened.status_code, 200, opened.text)
        self.assertEqual(opened.json()["question_id"], link["question_id"])
        self.assertNotIn("answer", opened.json())

        revealed = await self.client.post(
            "/api/question-answer-invites/reveal",
            headers=self.invite_headers(link["token"]),
        )
        self.assertEqual(revealed.status_code, 200, revealed.text)
        self.assertEqual(revealed.json()["answer"], answers[link["question_id"]])
        self.assertEqual(revealed.json()["reveal_count"], 1)

        refreshed = await self.client.get(
            "/api/admin/question-answer-invites",
            headers=headers,
        )
        self.assertEqual(refreshed.json()["reveal_count"], 1)
        self.assertIsNotNone(refreshed.json()["last_revealed_at"])

    async def test_regenerate_changes_question_and_invalidates_old_link(self):
        headers = await self.login_headers()
        await self.create_question(headers, "随机题 A", "A")
        await self.create_question(headers, "随机题 B", "B")

        first = await self.client.post(
            "/api/admin/question-answer-invites",
            headers=headers,
        )
        second = await self.client.post(
            "/api/admin/question-answer-invites",
            headers=headers,
        )
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(second.status_code, 200, second.text)
        self.assertNotEqual(first.json()["question_id"], second.json()["question_id"])
        self.assertNotEqual(first.json()["token"], second.json()["token"])

        old_link = await self.client.get(
            "/api/question-answer-invites",
            headers=self.invite_headers(first.json()["token"]),
        )
        new_link = await self.client.get(
            "/api/question-answer-invites",
            headers=self.invite_headers(second.json()["token"]),
        )
        self.assertEqual(old_link.status_code, 404)
        self.assertEqual(new_link.status_code, 200)

    async def test_revoke_and_disabled_owner_invalidate_link(self):
        headers = await self.login_headers()
        await self.create_question(headers, "可停用题目", "答案")
        created = await self.client.post(
            "/api/admin/question-answer-invites",
            headers=headers,
        )
        token = created.json()["token"]

        revoked = await self.client.delete(
            "/api/admin/question-answer-invites",
            headers=headers,
        )
        self.assertEqual(revoked.status_code, 204, revoked.text)
        after_revoke = await self.client.get(
            "/api/question-answer-invites",
            headers=self.invite_headers(token),
        )
        self.assertEqual(after_revoke.status_code, 404)

        recreated = await self.client.post(
            "/api/admin/question-answer-invites",
            headers=headers,
        )
        update_admin(self.owner["id"], is_active=False)
        after_disable = await self.client.get(
            "/api/question-answer-invites",
            headers=self.invite_headers(recreated.json()["token"]),
        )
        self.assertEqual(after_disable.status_code, 404)

    async def test_question_admin_only_randomizes_owned_questions(self):
        owner_headers = await self.login_headers()
        owner_question_id = await self.create_question(
            owner_headers,
            "自己的题目",
            "自己的答案",
        )
        other_headers = await self.login_headers("other-owner", "OtherPass123")
        await self.create_question(other_headers, "别人的题目", "别人的答案")

        created = await self.client.post(
            "/api/admin/question-answer-invites",
            headers=owner_headers,
        )
        self.assertEqual(created.status_code, 200, created.text)
        self.assertEqual(created.json()["question_id"], owner_question_id)

    async def test_accounts_without_question_permission_cannot_manage_invites(self):
        headers = await self.login_headers("invite-operator", "OperatorPass123")
        created = await self.client.post(
            "/api/admin/question-answer-invites",
            headers=headers,
        )
        self.assertEqual(created.status_code, 403, created.text)

    async def test_deleting_question_permanently_invalidates_its_token(self):
        headers = await self.login_headers()
        question_id = await self.create_question(headers, "即将删除的题目", "旧答案")
        created = await self.client.post(
            "/api/admin/question-answer-invites",
            headers=headers,
        )
        token = created.json()["token"]

        deleted = await self.client.delete(
            f"/api/admin/questions/{question_id}",
            headers=headers,
        )
        self.assertEqual(deleted.status_code, 200, deleted.text)
        reused_id = await self.create_question(headers, "复用题号的新题目", "新答案")
        self.assertEqual(reused_id, question_id)

        old_link = await self.client.get(
            "/api/question-answer-invites",
            headers=self.invite_headers(token),
        )
        self.assertEqual(old_link.status_code, 404)

    async def test_empty_owned_question_pool_returns_conflict(self):
        headers = await self.login_headers()
        created = await self.client.post(
            "/api/admin/question-answer-invites",
            headers=headers,
        )
        self.assertEqual(created.status_code, 409, created.text)


if __name__ == "__main__":
    unittest.main()
