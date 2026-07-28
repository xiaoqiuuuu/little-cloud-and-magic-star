import sqlite3
import tempfile
import unittest
from pathlib import Path

from scripts.sync_xcdh_messages import synchronize


def create_legacy_database(path: Path) -> None:
    connection = sqlite3.connect(path)
    try:
        connection.execute(
            """
            CREATE TABLE xcdh_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                content TEXT NOT NULL,
                x REAL NOT NULL,
                y REAL NOT NULL
            )
            """
        )
        connection.executemany(
            "INSERT INTO xcdh_messages (id, username, content, x, y) VALUES (?, ?, ?, ?, ?)",
            [
                (2, "legacy-a", "same", 20.0, 30.0),
                (5, "legacy-b", "new", 60.0, 70.0),
            ],
        )
        connection.commit()
    finally:
        connection.close()


def create_target_database(path: Path) -> None:
    connection = sqlite3.connect(path)
    try:
        connection.execute(
            """
            CREATE TABLE xcdh_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                content TEXT NOT NULL,
                x REAL NOT NULL CHECK(x >= 0 AND x <= 100),
                y REAL NOT NULL CHECK(y >= 0 AND y <= 100),
                click_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.executemany(
            """
            INSERT INTO xcdh_messages (id, username, content, x, y, click_count)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                (1, "legacy-a", "same", 20.0, 30.0, 4),
                (2, "current", "keep", 50.0, 50.0, 9),
            ],
        )
        connection.commit()
    finally:
        connection.close()


class XcdhSyncTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        root = Path(self.temp_dir.name)
        self.source = root / "legacy.sqlite"
        self.target = root / "target.sqlite"
        create_legacy_database(self.source)
        create_target_database(self.target)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_dry_run_does_not_change_target(self):
        result = synchronize(self.source, self.target)
        self.assertEqual(result.source_rows, 2)
        self.assertEqual(result.inserted, 1)
        self.assertEqual(result.matched, 1)
        self.assertEqual(result.missing_source_columns, ("click_count", "created_at"))

        connection = sqlite3.connect(self.target)
        try:
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM xcdh_messages").fetchone()[0], 2)
        finally:
            connection.close()

    def test_apply_is_idempotent_and_keeps_current_rows(self):
        first = synchronize(
            self.source,
            self.target,
            apply=True,
            create_backup=False,
        )
        self.assertEqual(first.inserted, 1)
        self.assertEqual(first.matched, 1)

        second = synchronize(
            self.source,
            self.target,
            apply=True,
            create_backup=False,
        )
        self.assertEqual(second.inserted, 0)
        self.assertEqual(second.matched, 2)

        connection = sqlite3.connect(self.target)
        try:
            rows = connection.execute(
                "SELECT id, username, click_count, created_at FROM xcdh_messages ORDER BY id"
            ).fetchall()
            self.assertEqual(len(rows), 3)
            self.assertEqual(rows[1][1:3], ("current", 9))
            self.assertEqual(rows[2][1:3], ("legacy-b", 0))
            self.assertTrue(rows[2][3])
            self.assertIsNone(
                connection.execute(
                    "SELECT 1 FROM sqlite_master WHERE type = 'table' "
                    "AND name = 'xcdh_message_imports'"
                ).fetchone()
            )
        finally:
            connection.close()


if __name__ == "__main__":
    unittest.main()
