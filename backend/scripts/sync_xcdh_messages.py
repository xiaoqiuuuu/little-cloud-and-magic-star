#!/usr/bin/env python3
"""Safely import legacy XCDH messages into the current SQLite database."""

import argparse
import os
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Sequence, Set, Tuple


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent


def _default_database_file() -> Path:
    configured = os.getenv("DATABASE_FILE")
    env_path = PROJECT_ROOT / ".env"
    if not configured and env_path.is_file():
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            if key.strip() == "DATABASE_FILE":
                configured = value.strip().strip("\"'")
                break
    if not configured:
        return BACKEND_DIR / "quiz.db"
    path = Path(configured).expanduser()
    return path if path.is_absolute() else PROJECT_ROOT / path


DEFAULT_DATABASE_FILE = _default_database_file()


REQUIRED_SOURCE_COLUMNS = {"id", "username", "content", "x", "y"}
REQUIRED_TARGET_COLUMNS = REQUIRED_SOURCE_COLUMNS | {"click_count", "created_at"}


@dataclass(frozen=True)
class SourceMessage:
    source_id: int
    username: str
    content: str
    x: float
    y: float
    click_count: int
    created_at: Optional[str]


@dataclass(frozen=True)
class SyncAction:
    kind: str
    message: SourceMessage
    target_id: Optional[int] = None


@dataclass(frozen=True)
class SyncResult:
    source_rows: int
    inserted: int
    matched: int
    missing_source_columns: Tuple[str, ...]
    backup_path: Optional[Path] = None


def _open_read_only(path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(f"{path.resolve().as_uri()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    return connection


def _table_columns(connection: sqlite3.Connection, table: str) -> Set[str]:
    return {str(row[1]) for row in connection.execute(f"PRAGMA table_info({table})")}


def _read_source_messages(source: sqlite3.Connection) -> Tuple[List[SourceMessage], Tuple[str, ...]]:
    columns = _table_columns(source, "xcdh_messages")
    missing_required = REQUIRED_SOURCE_COLUMNS - columns
    if missing_required:
        missing = ", ".join(sorted(missing_required))
        raise ValueError(f"Source xcdh_messages is missing required columns: {missing}")

    click_expression = "click_count" if "click_count" in columns else "0 AS click_count"
    created_expression = "created_at" if "created_at" in columns else "NULL AS created_at"
    rows = source.execute(
        f"""
        SELECT id, username, content, x, y, {click_expression}, {created_expression}
        FROM xcdh_messages
        ORDER BY id
        """
    ).fetchall()

    messages: List[SourceMessage] = []
    for row in rows:
        message = SourceMessage(
            source_id=int(row["id"]),
            username=str(row["username"]),
            content=str(row["content"]),
            x=float(row["x"]),
            y=float(row["y"]),
            click_count=int(row["click_count"]),
            created_at=str(row["created_at"]) if row["created_at"] is not None else None,
        )
        if not message.username.strip() or not message.content.strip():
            raise ValueError(f"Source message {message.source_id} has blank username or content")
        if not 0 <= message.x <= 100 or not 0 <= message.y <= 100:
            raise ValueError(f"Source message {message.source_id} has coordinates outside 0..100")
        if message.click_count < 0:
            raise ValueError(f"Source message {message.source_id} has a negative click count")
        messages.append(message)

    missing_optional = tuple(
        column for column in ("click_count", "created_at") if column not in columns
    )
    return messages, missing_optional


def _validate_target(target: sqlite3.Connection) -> None:
    columns = _table_columns(target, "xcdh_messages")
    missing = REQUIRED_TARGET_COLUMNS - columns
    if missing:
        names = ", ".join(sorted(missing))
        raise ValueError(f"Target xcdh_messages is missing required columns: {names}")


def _plan_sync(
    target: sqlite3.Connection,
    messages: Sequence[SourceMessage],
) -> List[SyncAction]:
    _validate_target(target)
    claimed_target_ids: Set[int] = set()
    actions: List[SyncAction] = []

    for message in messages:
        exact_matches = target.execute(
            """
            SELECT id
            FROM xcdh_messages
            WHERE username = ? AND content = ? AND x = ? AND y = ?
            ORDER BY id
            """,
            (message.username, message.content, message.x, message.y),
        ).fetchall()
        target_id = next(
            (int(row["id"]) for row in exact_matches if int(row["id"]) not in claimed_target_ids),
            None,
        )
        if target_id is None:
            actions.append(SyncAction("insert", message))
        else:
            claimed_target_ids.add(target_id)
            actions.append(SyncAction("match", message, target_id))

    return actions


def _summarize(
    actions: Sequence[SyncAction],
    missing_source_columns: Tuple[str, ...],
    backup_path: Optional[Path] = None,
) -> SyncResult:
    return SyncResult(
        source_rows=len(actions),
        inserted=sum(action.kind == "insert" for action in actions),
        matched=sum(action.kind == "match" for action in actions),
        missing_source_columns=missing_source_columns,
        backup_path=backup_path,
    )


def _backup_database(target_path: Path) -> Path:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = target_path.with_name(f"{target_path.name}.backup-{timestamp}")
    source = _open_read_only(target_path)
    backup = sqlite3.connect(backup_path)
    try:
        source.backup(backup)
    finally:
        backup.close()
        source.close()
    return backup_path


def synchronize(
    source_path: Path,
    target_path: Path,
    apply: bool = False,
    create_backup: bool = True,
) -> SyncResult:
    source_path = source_path.resolve()
    target_path = target_path.resolve()
    if source_path == target_path:
        raise ValueError("Source and target databases must be different files")
    if not source_path.is_file():
        raise FileNotFoundError(f"Source database does not exist: {source_path}")
    if not target_path.is_file():
        raise FileNotFoundError(f"Target database does not exist: {target_path}")

    source = _open_read_only(source_path)
    try:
        messages, missing_source_columns = _read_source_messages(source)
    finally:
        source.close()

    target = _open_read_only(target_path)
    try:
        actions = _plan_sync(target, messages)
    finally:
        target.close()
    preview = _summarize(actions, missing_source_columns)
    if not apply or preview.inserted == 0:
        return preview

    backup_path = _backup_database(target_path) if create_backup else None
    target = sqlite3.connect(target_path)
    target.row_factory = sqlite3.Row
    target.execute("PRAGMA busy_timeout = 5000")
    imported_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    try:
        target.execute("BEGIN IMMEDIATE")
        actions = _plan_sync(target, messages)
        for action in actions:
            if action.kind != "insert":
                continue
            message = action.message
            target.execute(
                """
                INSERT INTO xcdh_messages (
                    username, content, x, y, click_count, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    message.username,
                    message.content,
                    message.x,
                    message.y,
                    message.click_count,
                    message.created_at or imported_at,
                ),
            )
        target.commit()
    except Exception:
        target.rollback()
        raise
    finally:
        target.close()

    return _summarize(actions, missing_source_columns, backup_path)


def _print_result(result: SyncResult, applied: bool) -> None:
    print(f"Source rows: {result.source_rows}")
    print(f"Rows to insert: {result.inserted}")
    print(f"Existing exact matches: {result.matched}")
    if result.missing_source_columns:
        missing = ", ".join(result.missing_source_columns)
        print(f"Legacy fields not present: {missing}")
    if result.backup_path:
        print(f"Backup: {result.backup_path}")
    if applied and result.inserted:
        print("Migration applied.")
    elif applied:
        print("No missing XCDH messages; target database was not changed.")
    else:
        print("Dry run only; pass --apply to write the target database.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path, help="Legacy SQLite database")
    parser.add_argument(
        "--target",
        type=Path,
        default=DEFAULT_DATABASE_FILE,
        help=f"Target SQLite database (default: {DEFAULT_DATABASE_FILE})",
    )
    parser.add_argument("--apply", action="store_true", help="Apply the migration")
    args = parser.parse_args()
    try:
        result = synchronize(args.source, args.target, apply=args.apply)
    except (FileNotFoundError, sqlite3.Error, ValueError) as error:
        parser.error(str(error))
    _print_result(result, args.apply)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
