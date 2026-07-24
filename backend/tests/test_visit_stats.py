import sys
import tempfile
import unittest
from pathlib import Path

import httpx
from fastapi import FastAPI


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import database.config as database_config  # noqa: E402
from api.dependencies import require_visit_stats_view  # noqa: E402
from api.stats import router as stats_router  # noqa: E402
from database import init_db  # noqa: E402
from database.stats import (  # noqa: E402
    add_visit,
    classify_user_agent,
    get_visit_stats,
    normalize_path,
    normalize_source,
)


test_app = FastAPI()
test_app.include_router(stats_router)


class VisitStatsTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.previous_database = database_config.DATABASE_FILE
        database_config.DATABASE_FILE = str(Path(self.temp_dir.name) / "stats.db")
        init_db()

    def tearDown(self):
        database_config.DATABASE_FILE = self.previous_database
        self.temp_dir.cleanup()

    def record(self, **overrides):
        values = {
            "ip_address": "203.0.113.10",
            "referrer": "https://www.baidu.com/s?wd=cloud",
            "user_agent": (
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) "
                "AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1"
            ),
            "path": "/rules",
            "visitor_id": "visitor-a",
            "session_id": "session-a",
            "site_host": "feiyinluguo.cn",
        }
        values.update(overrides)
        return add_visit(**values)

    def test_normalizes_page_source_and_user_agent(self):
        self.assertEqual(normalize_path("/rules/?from=home"), "/rules")
        self.assertEqual(normalize_path("https://bad.example/path"), "/")
        self.assertEqual(normalize_source(""), "直接访问")
        self.assertEqual(
            normalize_source("https://feiyinluguo.cn/rules", "feiyinluguo.cn"),
            "站内跳转",
        )
        self.assertEqual(normalize_source("https://www.baidu.com/s?q=test"), "百度")
        self.assertEqual(
            classify_user_agent("Mozilla/5.0 (Linux; Android 15) Chrome/131 Mobile"),
            ("手机", "Chrome", "Android"),
        )

    def test_deduplicates_strict_mode_reports_and_aggregates_dimensions(self):
        self.assertTrue(self.record())
        self.assertFalse(self.record(path="/rules?duplicate=1"))
        self.assertTrue(self.record(path="/quiz"))
        self.assertTrue(self.record(
            path="/",
            referrer="",
            visitor_id="visitor-b",
            session_id="session-b",
            user_agent="Mozilla/5.0 (Windows NT 10.0) Edg/130.0",
        ))

        stats = get_visit_stats(7)
        summary = stats["summary"]
        self.assertEqual(summary["total_pv"], 3)
        self.assertEqual(summary["total_uv"], 2)
        self.assertEqual(summary["period_sessions"], 2)
        self.assertEqual(summary["pages_per_session"], 1.5)
        self.assertEqual(sum(day["pv"] for day in stats["daily"]), 3)
        self.assertEqual(len(stats["daily"]), 7)
        self.assertEqual(len(stats["hourly"]), 24)
        self.assertEqual(
            {item["name"]: item["pv"] for item in stats["pages"]},
            {"/": 1, "/quiz": 1, "/rules": 1},
        )
        self.assertEqual(
            {item["name"] for item in stats["sources"]},
            {"百度", "直接访问"},
        )
        self.assertEqual(
            {item["name"] for item in stats["devices"]},
            {"手机", "电脑"},
        )

    def test_initialization_migrates_legacy_visit_rows(self):
        conn = database_config.get_connection()
        try:
            conn.execute("DROP TABLE page_visits")
            conn.execute(
                """
                CREATE TABLE page_visits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    visit_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    ip_address TEXT,
                    referrer TEXT,
                    user_agent TEXT
                )
                """
            )
            conn.execute(
                """
                INSERT INTO page_visits (ip_address, referrer, user_agent)
                VALUES ('203.0.113.20', '', 'Mozilla/5.0 (Macintosh) Safari/605.1.15')
                """
            )
            conn.commit()
        finally:
            conn.close()

        init_db()
        conn = database_config.get_connection()
        try:
            row = conn.execute(
                """
                SELECT path, visitor_key, session_key, source, device_type, browser
                FROM page_visits
                """
            ).fetchone()
        finally:
            conn.close()

        self.assertEqual(row[0], "/")
        self.assertTrue(row[1])
        self.assertTrue(row[2])
        self.assertEqual(row[3], "直接访问")
        self.assertEqual(row[4], "电脑")
        self.assertEqual(row[5], "Safari")


class VisitStatsApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.previous_database = database_config.DATABASE_FILE
        database_config.DATABASE_FILE = str(Path(self.temp_dir.name) / "stats-api.db")
        init_db()
        test_app.dependency_overrides[require_visit_stats_view] = lambda: {
            "username": "test-admin",
            "role": "super_admin",
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

    async def test_records_real_ip_and_returns_requested_period(self):
        recorded = await self.client.post(
            "/api/stats/visit",
            headers={
                "x-real-ip": "203.0.113.30",
                "user-agent": "Mozilla/5.0 (Linux; Android 15) Chrome/131 Mobile",
            },
            json={
                "path": "/quiz?round=1",
                "referrer": "https://weibo.com/example",
                "visitor_id": "api-visitor",
                "session_id": "api-session",
            },
        )
        self.assertEqual(recorded.status_code, 200, recorded.text)
        self.assertEqual(recorded.json()["status"], "recorded")

        response = await self.client.get("/api/stats/", params={"days": 7})
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["period_days"], 7)
        self.assertEqual(payload["summary"]["period_pv"], 1)
        self.assertEqual(payload["pages"][0]["name"], "/quiz")
        self.assertEqual(payload["sources"][0]["name"], "微博")

        invalid_period = await self.client.get("/api/stats/", params={"days": 365})
        self.assertEqual(invalid_period.status_code, 422)


if __name__ == "__main__":
    unittest.main()
