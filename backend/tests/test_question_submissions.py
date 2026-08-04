import sys
import tempfile
import unittest
from pathlib import Path

import httpx


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import database.config as database_config  # noqa: E402
import upload_storage  # noqa: E402
from database import (  # noqa: E402
    create_admin,
    get_question_by_id,
    get_question_submission_link_for_admin,
    init_db,
    update_admin,
)
from main import app  # noqa: E402


class QuestionSubmissionTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.previous_database = database_config.DATABASE_FILE
        self.previous_upload_dir = upload_storage.UPLOAD_DIR
        database_config.DATABASE_FILE = str(
            Path(self.temp_dir.name) / "question-submissions.db"
        )
        upload_storage.UPLOAD_DIR = str(Path(self.temp_dir.name) / "uploads")
        Path(upload_storage.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
        init_db()
        self.question_admin = create_admin(
            "questionnaire-owner",
            "StrongPass123",
            "question_admin",
            display_name="问卷出题人",
        )
        create_admin(
            "questionnaire-operator",
            "OperatorPass123",
            "quiz_operator",
        )

    def tearDown(self):
        database_config.DATABASE_FILE = self.previous_database
        upload_storage.UPLOAD_DIR = self.previous_upload_dir
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
        username: str = "questionnaire-owner",
        password: str = "StrongPass123",
    ) -> dict:
        response = await self.client.post(
            "/api/admin/login",
            json={
                "username": username,
                "password": password,
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    async def create_link(self) -> tuple[dict, dict]:
        headers = await self.login_headers()
        response = await self.client.post(
            "/api/admin/question-submission-link",
            headers=headers,
        )
        self.assertEqual(response.status_code, 200, response.text)
        return headers, response.json()

    @staticmethod
    def submission_headers(token: str) -> dict:
        return {"X-Question-Submission-Token": token}

    async def test_public_submission_enters_library_and_binds_link_owner(self):
        headers = await self.login_headers()
        missing = await self.client.get(
            "/api/admin/question-submission-link",
            headers=headers,
        )
        self.assertEqual(missing.status_code, 200, missing.text)
        self.assertIsNone(missing.json())

        _, link = await self.create_link()
        token = link["token"]
        self.assertGreaterEqual(len(token), 32)
        self.assertEqual(link["submission_count"], 0)

        form = await self.client.get(
            "/api/question-submissions",
            headers=self.submission_headers(token),
        )
        self.assertEqual(form.status_code, 200, form.text)
        self.assertEqual(form.json()["owner_name"], "问卷出题人")

        submitted = await self.client.post(
            "/api/question-submissions",
            headers=self.submission_headers(token),
            json={
                "question": "  通过问卷提交的题目？  ",
                "answer": "  正确答案  ",
                "resources": ["https://example.com/question.jpg"],
                "tag": "daily",
            },
        )
        self.assertEqual(submitted.status_code, 201, submitted.text)
        question_id = submitted.json()["question_id"]
        created = get_question_by_id(question_id)
        self.assertIsNotNone(created)
        self.assertEqual(created.question, "通过问卷提交的题目？")
        self.assertEqual(created.answer, "正确答案")
        self.assertEqual(created.author, ["问卷出题人"])
        self.assertEqual(
            [contributor.id for contributor in created.contributors],
            [self.question_admin["id"]],
        )

        refreshed_link = get_question_submission_link_for_admin(
            self.question_admin["id"]
        )
        self.assertEqual(refreshed_link["submission_count"], 1)
        self.assertIsNotNone(refreshed_link["last_submitted_at"])

        duplicate = await self.client.post(
            "/api/question-submissions",
            headers=self.submission_headers(token),
            json={
                "question": "通过问卷提交的题目？",
                "answer": "正确答案",
                "resources": [],
                "tag": "daily",
            },
        )
        self.assertEqual(duplicate.status_code, 409, duplicate.text)
        self.assertIn(f"#{question_id}", duplicate.json()["detail"])

    async def test_rotating_and_revoking_link_invalidates_old_urls(self):
        headers, first_link = await self.create_link()
        rotated = await self.client.post(
            "/api/admin/question-submission-link",
            headers=headers,
        )
        self.assertEqual(rotated.status_code, 200, rotated.text)
        second_token = rotated.json()["token"]
        self.assertNotEqual(first_link["token"], second_token)

        old_form = await self.client.get(
            "/api/question-submissions",
            headers=self.submission_headers(first_link["token"]),
        )
        new_form = await self.client.get(
            "/api/question-submissions",
            headers=self.submission_headers(second_token),
        )
        self.assertEqual(old_form.status_code, 404)
        self.assertEqual(new_form.status_code, 200)

        revoked = await self.client.delete(
            "/api/admin/question-submission-link",
            headers=headers,
        )
        self.assertEqual(revoked.status_code, 204, revoked.text)
        after_revoke = await self.client.get(
            "/api/question-submissions",
            headers=self.submission_headers(second_token),
        )
        self.assertEqual(after_revoke.status_code, 404)

    async def test_disabled_owner_immediately_invalidates_link(self):
        _, link = await self.create_link()
        update_admin(self.question_admin["id"], is_active=False)
        form = await self.client.get(
            "/api/question-submissions",
            headers=self.submission_headers(link["token"]),
        )
        self.assertEqual(form.status_code, 404)

    async def test_public_upload_requires_active_link(self):
        _, link = await self.create_link()
        upload = await self.client.post(
            "/api/question-submissions/upload",
            headers=self.submission_headers(link["token"]),
            files={"file": ("question.jpg", b"image-bytes", "image/jpeg")},
        )
        self.assertEqual(upload.status_code, 200, upload.text)
        uploaded_path = Path(upload_storage.UPLOAD_DIR) / Path(upload.json()["url"]).name
        self.assertTrue(uploaded_path.exists())

        invalid = await self.client.post(
            "/api/question-submissions/upload",
            headers=self.submission_headers("not-a-valid-token-value"),
            files={"file": ("question.jpg", b"image-bytes", "image/jpeg")},
        )
        self.assertEqual(invalid.status_code, 404)

    async def test_public_resources_reject_unsafe_schemes(self):
        _, link = await self.create_link()
        response = await self.client.post(
            "/api/question-submissions",
            headers=self.submission_headers(link["token"]),
            json={
                "question": "不安全资源链接",
                "answer": "答案",
                "resources": ["javascript:alert(1)"],
                "tag": "common",
            },
        )
        self.assertEqual(response.status_code, 422, response.text)

    async def test_accounts_without_question_permission_cannot_create_links(self):
        headers = await self.login_headers(
            "questionnaire-operator",
            "OperatorPass123",
        )
        response = await self.client.post(
            "/api/admin/question-submission-link",
            headers=headers,
        )
        self.assertEqual(response.status_code, 403, response.text)


if __name__ == "__main__":
    unittest.main()
