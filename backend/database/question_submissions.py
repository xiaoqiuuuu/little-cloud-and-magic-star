"""公开出题问卷链接及原子入库操作。"""

import json
import secrets
import sqlite3
from typing import Dict, List, Optional

from models import Question

from .config import get_connection
from .questions import get_question_by_id
from .rbac import QUESTIONS_MANAGE


class InvalidQuestionSubmissionLink(Exception):
    """问卷链接不存在、已撤销或所属账号不可再管理题目。"""


class DuplicateSubmittedQuestion(Exception):
    """题库中已经存在相同题目和答案。"""

    def __init__(self, question_id: str):
        super().__init__(question_id)
        self.question_id = question_id


ACTIVE_LINK_SELECT = """
    SELECT
        l.admin_id,
        l.token,
        l.submission_count,
        l.last_submitted_at,
        l.created_at,
        l.updated_at,
        a.username,
        COALESCE(NULLIF(a.display_name, ''), a.username) AS display_name
    FROM question_submission_links l
    JOIN admins a ON a.id = l.admin_id
    WHERE a.is_active = 1
      AND EXISTS (
          SELECT 1
          FROM admin_access_roles ar
          JOIN access_role_permissions rp ON rp.role_key = ar.role_key
          WHERE ar.admin_id = a.id AND rp.permission_key = ?
      )
"""


def _row_to_link(row) -> Dict[str, object]:
    return {
        "admin_id": int(row["admin_id"]),
        "token": row["token"],
        "submission_count": int(row["submission_count"] or 0),
        "last_submitted_at": row["last_submitted_at"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "username": row["username"],
        "display_name": row["display_name"],
    }


def get_question_submission_link_for_admin(
    admin_id: int,
) -> Optional[Dict[str, object]]:
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            f"{ACTIVE_LINK_SELECT} AND l.admin_id = ?",
            (QUESTIONS_MANAGE, admin_id),
        ).fetchone()
        return _row_to_link(row) if row else None
    finally:
        conn.close()


def get_active_question_submission_link(
    token: str,
) -> Optional[Dict[str, object]]:
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            f"{ACTIVE_LINK_SELECT} AND l.token = ?",
            (QUESTIONS_MANAGE, token),
        ).fetchone()
        return _row_to_link(row) if row else None
    finally:
        conn.close()


def rotate_question_submission_link(admin_id: int) -> Dict[str, object]:
    token = secrets.token_urlsafe(32)
    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        conn.execute(
            """
            INSERT INTO question_submission_links (admin_id, token)
            VALUES (?, ?)
            ON CONFLICT(admin_id) DO UPDATE SET
                token = excluded.token,
                submission_count = 0,
                last_submitted_at = NULL,
                created_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            """,
            (admin_id, token),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    link = get_question_submission_link_for_admin(admin_id)
    if not link:
        raise RuntimeError("出题链接生成失败")
    return link


def revoke_question_submission_link(admin_id: int) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "DELETE FROM question_submission_links WHERE admin_id = ?",
            (admin_id,),
        )
        conn.commit()
        return cursor.rowcount == 1
    finally:
        conn.close()


def create_question_from_submission(
    token: str,
    *,
    question: str,
    answer: str,
    resources: List[str],
    tag: str,
) -> Question:
    """在一个写事务内校验链接、分配题号、入库并绑定贡献账号。"""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("BEGIN IMMEDIATE")
        owner = conn.execute(
            f"{ACTIVE_LINK_SELECT} AND l.token = ?",
            (QUESTIONS_MANAGE, token),
        ).fetchone()
        if not owner:
            raise InvalidQuestionSubmissionLink()

        duplicate = conn.execute(
            """
            SELECT id FROM questions
            WHERE question = ? AND LOWER(answer) = LOWER(?)
            LIMIT 1
            """,
            (question, answer),
        ).fetchone()
        if duplicate:
            raise DuplicateSubmittedQuestion(str(duplicate["id"]))

        next_id_row = conn.execute(
            """
            SELECT MAX(numeric_id) FROM (
                SELECT CAST(id AS INTEGER) AS numeric_id FROM questions
                UNION ALL
                SELECT CAST(question_id AS INTEGER) AS numeric_id
                FROM quiz_activity_questions
            )
            """
        ).fetchone()
        question_id = str(int(next_id_row[0]) + 1) if next_id_row[0] is not None else "0"
        display_name = owner["display_name"]
        admin_id = int(owner["admin_id"])

        conn.execute(
            """
            INSERT INTO questions (id, question, answer, resources, tag, author)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                question_id,
                question,
                answer,
                json.dumps(resources, ensure_ascii=False),
                tag,
                json.dumps([display_name], ensure_ascii=False),
            ),
        )
        conn.execute(
            """
            INSERT INTO question_contributors (question_id, admin_id, position)
            VALUES (?, ?, 0)
            """,
            (question_id, admin_id),
        )
        conn.execute(
            """
            UPDATE question_submission_links
            SET submission_count = submission_count + 1,
                last_submitted_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE admin_id = ? AND token = ?
            """,
            (admin_id, token),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    created = get_question_by_id(question_id)
    if not created:
        raise RuntimeError("问卷题目创建失败")
    return created
