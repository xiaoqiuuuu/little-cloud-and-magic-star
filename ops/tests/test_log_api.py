import hashlib
import os
import tempfile
import unittest
from datetime import datetime
from pathlib import Path


os.environ["LOG_API_KEY_SHA256"] = hashlib.sha256(b"test-key").hexdigest()

from ops import log_api  # noqa: E402
from fastapi import HTTPException  # noqa: E402


class LogApiTests(unittest.TestCase):
    def test_api_key_hash_validation(self):
        self.assertTrue(log_api.api_key_is_valid("test-key"))
        self.assertFalse(log_api.api_key_is_valid("wrong-key"))
        self.assertFalse(log_api.api_key_is_valid(None))

    def test_redacts_sensitive_values(self):
        raw = (
            "Authorization: Bearer abc.def password=hunter2 "
            "GET /?token=secret-token&ok=1 eyJabc.def.ghi"
        )
        redacted = log_api.redact_line(raw)
        self.assertNotIn("hunter2", redacted)
        self.assertNotIn("secret-token", redacted)
        self.assertNotIn("abc.def", redacted)
        self.assertNotIn("eyJabc.def.ghi", redacted)
        self.assertIn("<redacted>", redacted)

    def test_level_filter(self):
        lines = ["INFO ready", "WARNING slow", "ERROR failed", "Traceback here"]
        self.assertEqual(log_api.filter_level(lines, "error"), lines[2:])
        self.assertEqual(log_api.filter_level(lines, "critical"), [])

    def test_tail_lines(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "test.log"
            path.write_text("one\ntwo\nthree\nfour\n", encoding="utf-8")
            self.assertEqual(log_api.tail_lines(path, 2), ["three", "four"])

    def test_nginx_time_parsing(self):
        timezone = datetime.now().astimezone().tzinfo
        error_time = log_api._parse_nginx_time(
            "2026/07/18 21:00:00 [error] example", "nginx-error", timezone
        )
        access_time = log_api._parse_nginx_time(
            '127.0.0.1 - - [18/Jul/2026:21:00:00 +0800] "GET / HTTP/1.1" 200',
            "nginx-access",
            timezone,
        )
        self.assertIsNotNone(error_time)
        self.assertIsNotNone(access_time)

    def test_response_is_bounded_and_redacted(self):
        lines = ["INFO normal", "ERROR token=secret-value"]
        result, truncated = log_api.bound_response(lines, 1)
        self.assertTrue(truncated)
        self.assertEqual(result, ["ERROR token=<redacted>"])

    def test_rate_limit(self):
        client = "unit-test-client"
        log_api._rate_buckets.pop(client, None)
        for _ in range(log_api.RATE_LIMIT_REQUESTS):
            log_api._enforce_rate_limit(client)
        with self.assertRaises(HTTPException) as raised:
            log_api._enforce_rate_limit(client)
        self.assertEqual(raised.exception.status_code, 429)
        log_api._rate_buckets.pop(client, None)


if __name__ == "__main__":
    unittest.main()
