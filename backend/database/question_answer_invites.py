"""单题邀请答题链接及原子判题统计。"""

import json
import secrets
import sqlite3
from typing import Dict, Optional

from .config import get_connection
from .rbac import QUESTIONS_MANAGE, QUESTIONS_MANAGE_ALL


class InvalidQuestionAnswerInvite(Exception):
    """邀请链接不存在、已撤销，或创建者不再拥有题目权限。"""


INVITE_SELECT = """
    SELECT
        l.question_id,
        l.admin_id,
        l.token,
        l.reveal_count,
        l.last_revealed_at,
        l.created_at,
        l.updated_at,
        a.username,
        COALESCE(NULLIF(a.display_name, ''), a.username) AS display_name,
        q.question,
        q.answer,
        q.resources,
        q.tag,
        q.author
    FROM question_answer_invite_links l
    JOIN admins a ON a.id = l.admin_id
    JOIN questions q ON q.id = l.question_id
"""


def _parse_string_list(raw_value: Optional[str]) -> list[str]:
    if not raw_value:
        return []
    try:
        parsed = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        parsed = raw_value
    values = parsed if isinstance(parsed, list) else [parsed]
    return [str(value).strip() for value in values if str(value).strip()]


def _row_to_invite(row: sqlite3.Row) -> Dict[str, object]:
    return {
        "question_id": str(row["question_id"]),
        "admin_id": int(row["admin_id"]),
        "token": row["token"],
        "reveal_count": int(row["reveal_count"] or 0),
        "last_revealed_at": row["last_revealed_at"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "username": row["username"],
        "display_name": row["display_name"],
        "question": row["question"],
        "answer": row["answer"],
        "resources": _parse_string_list(row["resources"]),
        "tag": row["tag"],
        "author": _parse_string_list(row["author"]),
    }


def _has_permission(conn, admin_id: int, permission_key: str) -> bool:
    return conn.execute(
        """
        SELECT 1
        FROM admin_access_roles ar
        JOIN access_role_permissions rp ON rp.role_key = ar.role_key
        WHERE ar.admin_id = ? AND rp.permission_key = ?
        LIMIT 1
        """,
        (admin_id, permission_key),
    ).fetchone() is not None


def _admin_still_controls_question(conn, row: sqlite3.Row) -> bool:
    admin_id = int(row["admin_id"])
    question_id = str(row["question_id"])
    if not _has_permission(conn, admin_id, QUESTIONS_MANAGE):
        return False
    if _has_permission(conn, admin_id, QUESTIONS_MANAGE_ALL):
        return True

    contributor_count = conn.execute(
        "SELECT COUNT(*) FROM question_contributors WHERE question_id = ?",
        (question_id,),
    ).fetchone()[0]
    if contributor_count:
        return conn.execute(
            """
            SELECT 1 FROM question_contributors
            WHERE question_id = ? AND admin_id = ?
            LIMIT 1
            """,
            (question_id, admin_id),
        ).fetchone() is not None

    aliases = {
        str(value).strip().casefold()
        for value in (row["username"], row["display_name"])
        if value and str(value).strip()
    }
    authors = {value.casefold() for value in _parse_string_list(row["author"])}
    return bool(aliases.intersection(authors))


def _get_active_invite_row(conn, token: str) -> Optional[sqlite3.Row]:
    row = conn.execute(
        f"""
        {INVITE_SELECT}
        WHERE l.token = ? AND a.is_active = 1
        """,
        (token,),
    ).fetchone()
    if not row or not _admin_still_controls_question(conn, row):
        return None
    return row


def get_question_answer_invite_for_admin(
    admin_id: int,
) -> Optional[Dict[str, object]]:
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            f"{INVITE_SELECT} WHERE l.admin_id = ?",
            (admin_id,),
        ).fetchone()
        return _row_to_invite(row) if row else None
    finally:
        conn.close()


def get_active_question_answer_invite(token: str) -> Optional[Dict[str, object]]:
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        row = _get_active_invite_row(conn, token)
        return _row_to_invite(row) if row else None
    finally:
        conn.close()


def rotate_question_answer_invite(
    question_id: str,
    admin_id: int,
) -> Dict[str, object]:
    token = secrets.token_urlsafe(32)
    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        conn.execute(
            """
            INSERT INTO question_answer_invite_links (admin_id, question_id, token)
            VALUES (?, ?, ?)
            ON CONFLICT(admin_id) DO UPDATE SET
                question_id = excluded.question_id,
                token = excluded.token,
                reveal_count = 0,
                last_revealed_at = NULL,
                created_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            """,
            (admin_id, question_id, token),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    invite = get_question_answer_invite_for_admin(admin_id)
    if not invite:
        raise RuntimeError("邀请答题链接生成失败")
    return invite


def revoke_question_answer_invite(admin_id: int) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "DELETE FROM question_answer_invite_links WHERE admin_id = ?",
            (admin_id,),
        )
        conn.commit()
        return cursor.rowcount == 1
    finally:
        conn.close()


def reveal_question_answer_invite(token: str) -> Dict[str, object]:
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("BEGIN IMMEDIATE")
        row = _get_active_invite_row(conn, token)
        if not row:
            raise InvalidQuestionAnswerInvite()
        reveal_count = int(row["reveal_count"] or 0) + 1
        conn.execute(
            """
            UPDATE question_answer_invite_links
            SET reveal_count = ?,
                last_revealed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE question_id = ? AND token = ?
            """,
            (reveal_count, row["question_id"], token),
        )
        conn.commit()
        return {
            "answer": str(row["answer"]),
            "reveal_count": reveal_count,
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
