"""答题活动、活动题目与独立统计的数据库操作。"""

import sqlite3
from typing import Any, Dict, List, Optional, Sequence

from .config import get_connection


EDITABLE_STATUSES = {"draft"}


def _row_to_activity(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": int(row["id"]),
        "name": row["name"],
        "description": row["description"] or "",
        "status": row["status"],
        "created_by": row["created_by"],
        "question_count": int(row["question_count"] or 0),
        "total_random_clicks": int(row["total_random_clicks"] or 0),
        "total_hide_clicks": int(row["total_hide_clicks"] or 0),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "started_at": row["started_at"],
        "ended_at": row["ended_at"],
    }


def _activity_query(where_clause: str = "", params: Sequence[Any] = ()):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            f"""
            SELECT
                a.id, a.name, a.description, a.status, a.created_by,
                a.created_at, a.updated_at, a.started_at, a.ended_at,
                COUNT(aq.question_id) AS question_count,
                COALESCE(SUM(aq.random_clicks), 0) AS total_random_clicks,
                COALESCE(SUM(aq.hide_clicks), 0) AS total_hide_clicks
            FROM quiz_activities a
            LEFT JOIN quiz_activity_questions aq ON aq.activity_id = a.id
            {where_clause}
            GROUP BY a.id
            """,
            params,
        ).fetchone()
        return _row_to_activity(row) if row else None
    finally:
        conn.close()


def list_activities() -> List[Dict[str, Any]]:
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT
                a.id, a.name, a.description, a.status, a.created_by,
                a.created_at, a.updated_at, a.started_at, a.ended_at,
                COUNT(aq.question_id) AS question_count,
                COALESCE(SUM(aq.random_clicks), 0) AS total_random_clicks,
                COALESCE(SUM(aq.hide_clicks), 0) AS total_hide_clicks
            FROM quiz_activities a
            LEFT JOIN quiz_activity_questions aq ON aq.activity_id = a.id
            GROUP BY a.id
            ORDER BY
                CASE a.status
                    WHEN 'active' THEN 0
                    WHEN 'paused' THEN 1
                    WHEN 'draft' THEN 2
                    ELSE 3
                END,
                a.created_at DESC,
                a.id DESC
            """
        ).fetchall()
        return [_row_to_activity(row) for row in rows]
    finally:
        conn.close()


def get_activity(activity_id: int) -> Optional[Dict[str, Any]]:
    activity = _activity_query("WHERE a.id = ?", (activity_id,))
    if not activity:
        return None

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT
                aq.question_id, aq.position, aq.question_snapshot,
                aq.tag_snapshot, aq.random_clicks, aq.hide_clicks,
                CASE WHEN q.id IS NULL THEN 0 ELSE 1 END AS question_exists
            FROM quiz_activity_questions aq
            LEFT JOIN questions q ON q.id = aq.question_id
            WHERE aq.activity_id = ?
            ORDER BY aq.position ASC, CAST(aq.question_id AS INTEGER) ASC
            """,
            (activity_id,),
        ).fetchall()
        activity["questions"] = [
            {
                "question_id": row["question_id"],
                "question": row["question_snapshot"],
                "tag": row["tag_snapshot"],
                "position": int(row["position"]),
                "random_clicks": int(row["random_clicks"]),
                "hide_clicks": int(row["hide_clicks"]),
                "question_exists": bool(row["question_exists"]),
            }
            for row in rows
        ]
        activity["question_ids"] = [item["question_id"] for item in activity["questions"]]
        return activity
    finally:
        conn.close()


def get_active_activity() -> Optional[Dict[str, Any]]:
    return _activity_query("WHERE a.status = 'active'")


def _normalized_question_ids(question_ids: Sequence[str]) -> List[str]:
    return list(dict.fromkeys(str(question_id) for question_id in question_ids))


def _question_snapshots(conn, question_ids: Sequence[str]) -> List[sqlite3.Row]:
    normalized = _normalized_question_ids(question_ids)
    if not normalized:
        return []
    placeholders = ",".join("?" for _ in normalized)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        f"SELECT id, question, tag FROM questions WHERE id IN ({placeholders})",
        normalized,
    ).fetchall()
    by_id = {row["id"]: row for row in rows}
    missing = [question_id for question_id in normalized if question_id not in by_id]
    if missing:
        raise ValueError(f"题目不存在：{', '.join(missing)}")
    return [by_id[question_id] for question_id in normalized]


def _replace_activity_questions(conn, activity_id: int, question_ids: Sequence[str]) -> None:
    snapshots = _question_snapshots(conn, question_ids)
    conn.execute(
        "DELETE FROM quiz_activity_questions WHERE activity_id = ?",
        (activity_id,),
    )
    conn.executemany(
        """
        INSERT INTO quiz_activity_questions (
            activity_id, question_id, position, question_snapshot, tag_snapshot
        ) VALUES (?, ?, ?, ?, ?)
        """,
        [
            (
                activity_id,
                row["id"],
                position,
                row["question"],
                row["tag"],
            )
            for position, row in enumerate(snapshots)
        ],
    )


def create_activity(
    name: str,
    description: str,
    question_ids: Sequence[str],
    created_by: str,
) -> Dict[str, Any]:
    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        cursor = conn.execute(
            """
            INSERT INTO quiz_activities (name, description, created_by)
            VALUES (?, ?, ?)
            """,
            (name, description, created_by),
        )
        activity_id = int(cursor.lastrowid)
        _replace_activity_questions(conn, activity_id, question_ids)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return get_activity(activity_id)


def update_activity(
    activity_id: int,
    *,
    name: Optional[str] = None,
    description: Optional[str] = None,
    question_ids: Optional[Sequence[str]] = None,
) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("BEGIN IMMEDIATE")
        row = conn.execute(
            "SELECT status FROM quiz_activities WHERE id = ?",
            (activity_id,),
        ).fetchone()
        if not row:
            conn.rollback()
            return None
        if row["status"] not in EDITABLE_STATUSES:
            raise ValueError("活动开始后不能再修改名称或题目")

        updates = []
        values: List[Any] = []
        if name is not None:
            updates.append("name = ?")
            values.append(name)
        if description is not None:
            updates.append("description = ?")
            values.append(description)
        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            conn.execute(
                f"UPDATE quiz_activities SET {', '.join(updates)} WHERE id = ?",
                values + [activity_id],
            )
        if question_ids is not None:
            _replace_activity_questions(conn, activity_id, question_ids)
            conn.execute(
                "UPDATE quiz_activities SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (activity_id,),
            )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return get_activity(activity_id)


def start_activity(activity_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("BEGIN IMMEDIATE")
        activity = conn.execute(
            "SELECT status FROM quiz_activities WHERE id = ?",
            (activity_id,),
        ).fetchone()
        if not activity:
            conn.rollback()
            return None
        if activity["status"] == "ended":
            raise ValueError("已结束的活动不能重新开始")

        question_row = conn.execute(
            """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN q.id IS NULL THEN 1 ELSE 0 END) AS missing
            FROM quiz_activity_questions aq
            LEFT JOIN questions q ON q.id = aq.question_id
            WHERE aq.activity_id = ?
            """,
            (activity_id,),
        ).fetchone()
        if int(question_row["total"] or 0) == 0:
            raise ValueError("活动至少需要选择一道题目")
        if int(question_row["missing"] or 0) > 0:
            raise ValueError("活动包含已删除的题目，请编辑后再开始")

        # 首次开始时冻结用于活动统计展示的题目标题和标签。
        if activity["status"] == "draft":
            conn.execute(
                """
                UPDATE quiz_activity_questions
                SET question_snapshot = (
                        SELECT question FROM questions q
                        WHERE q.id = quiz_activity_questions.question_id
                    ),
                    tag_snapshot = (
                        SELECT tag FROM questions q
                        WHERE q.id = quiz_activity_questions.question_id
                    )
                WHERE activity_id = ?
                """,
                (activity_id,),
            )

        conn.execute(
            """
            UPDATE quiz_activities
            SET status = 'paused', updated_at = CURRENT_TIMESTAMP
            WHERE status = 'active' AND id != ?
            """,
            (activity_id,),
        )
        conn.execute(
            """
            UPDATE quiz_activities
            SET status = 'active',
                started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
                ended_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (activity_id,),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return get_activity(activity_id)


def pause_activity(activity_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            UPDATE quiz_activities
            SET status = 'paused', updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'active'
            """,
            (activity_id,),
        )
        conn.commit()
        if cursor.rowcount != 1:
            return None
    finally:
        conn.close()
    return get_activity(activity_id)


def end_activity(activity_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            UPDATE quiz_activities
            SET status = 'ended', ended_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status IN ('active', 'paused')
            """,
            (activity_id,),
        )
        conn.commit()
        if cursor.rowcount != 1:
            return None
    finally:
        conn.close()
    return get_activity(activity_id)


def delete_activity(activity_id: int) -> bool:
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("BEGIN IMMEDIATE")
        row = conn.execute(
            "SELECT status FROM quiz_activities WHERE id = ?",
            (activity_id,),
        ).fetchone()
        if not row:
            conn.rollback()
            return False
        if row["status"] != "draft":
            raise ValueError("只有草稿活动可以删除")
        conn.execute(
            "DELETE FROM quiz_activity_questions WHERE activity_id = ?",
            (activity_id,),
        )
        conn.execute("DELETE FROM quiz_activities WHERE id = ?", (activity_id,))
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def get_active_activity_question_ids(
    expected_activity_id: Optional[int] = None,
) -> List[Dict[str, str]]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT q.id, q.tag
            FROM quiz_activities a
            JOIN quiz_activity_questions aq ON aq.activity_id = a.id
            JOIN questions q ON q.id = aq.question_id
            WHERE a.status = 'active' AND (? IS NULL OR a.id = ?)
            ORDER BY aq.position ASC, CAST(q.id AS INTEGER) ASC
            """,
            (expected_activity_id, expected_activity_id),
        ).fetchall()
        return [{"id": row[0], "tag": row[1]} for row in rows]
    finally:
        conn.close()


def get_active_activity_questions():
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT q.id
            FROM quiz_activities a
            JOIN quiz_activity_questions aq ON aq.activity_id = a.id
            JOIN questions q ON q.id = aq.question_id
            WHERE a.status = 'active'
            ORDER BY aq.position ASC, CAST(q.id AS INTEGER) ASC
            """
        ).fetchall()
        return [row[0] for row in rows]
    finally:
        conn.close()


def active_activity_contains_question(
    question_id: str,
    expected_activity_id: Optional[int] = None,
) -> bool:
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT 1
            FROM quiz_activities a
            JOIN quiz_activity_questions aq ON aq.activity_id = a.id
            WHERE a.status = 'active' AND aq.question_id = ?
              AND (? IS NULL OR a.id = ?)
            """,
            (question_id, expected_activity_id, expected_activity_id),
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def get_started_activity_using_question(question_id: str) -> Optional[Dict[str, Any]]:
    """查询正在进行或暂停、仍需保持题目内容稳定的活动。"""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            """
            SELECT a.id, a.name, a.status
            FROM quiz_activities a
            JOIN quiz_activity_questions aq ON aq.activity_id = a.id
            WHERE aq.question_id = ? AND a.status IN ('active', 'paused')
            ORDER BY CASE a.status WHEN 'active' THEN 0 ELSE 1 END, a.id DESC
            LIMIT 1
            """,
            (question_id,),
        ).fetchone()
        if not row:
            return None
        return {"id": int(row["id"]), "name": row["name"], "status": row["status"]}
    finally:
        conn.close()


def increment_active_activity_stat(
    question_id: str,
    stat: str,
    expected_activity_id: int,
) -> Optional[int]:
    columns = {
        "random": "random_clicks",
        "hide": "hide_clicks",
    }
    column = columns.get(stat)
    if not column:
        raise ValueError("不支持的统计类型")

    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        active_row = conn.execute(
            """
            SELECT id FROM quiz_activities
            WHERE id = ? AND status = 'active'
            """,
            (expected_activity_id,),
        ).fetchone()
        if not active_row:
            conn.rollback()
            return None
        cursor = conn.execute(
            f"""
            UPDATE quiz_activity_questions
            SET {column} = {column} + 1
            WHERE question_id = ? AND activity_id = ?
            """,
            (question_id, expected_activity_id),
        )
        if cursor.rowcount != 1:
            conn.rollback()
            return None
        conn.commit()
        return expected_activity_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
