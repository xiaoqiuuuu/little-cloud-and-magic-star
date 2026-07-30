"""星辰大海留言的数据访问层。"""

import random
import sqlite3
from typing import Dict, Iterable, List, Optional, Tuple

from .config import get_connection


_position_random = random.SystemRandom()
_POSITION_X_RANGE = (4.0, 96.0)
_POSITION_Y_RANGE = (6.0, 94.0)
_POSITION_CANDIDATE_COUNT = 48
_POSITION_SAMPLE_LIMIT = 5000
_WORLD_ASPECT_RATIO = 3000 / 2000


def select_balanced_xcdh_position(
    existing_positions: Iterable[Tuple[float, float]],
    random_source=_position_random,
    candidate_count: int = _POSITION_CANDIDATE_COUNT,
) -> Tuple[float, float]:
    """从多个随机候选点中选择距离现有星愿最远的位置。"""
    positions = list(existing_positions)
    candidates = [
        (
            random_source.uniform(*_POSITION_X_RANGE),
            random_source.uniform(*_POSITION_Y_RANGE),
        )
        for _ in range(max(1, candidate_count))
    ]
    if not positions:
        return candidates[0]

    def nearest_distance_squared(candidate: Tuple[float, float]) -> float:
        candidate_x, candidate_y = candidate
        return min(
            ((candidate_x - existing_x) * _WORLD_ASPECT_RATIO) ** 2
            + (candidate_y - existing_y) ** 2
            for existing_x, existing_y in positions
        )

    return max(candidates, key=nearest_distance_squared)


def list_xcdh_messages(limit: int = 1000) -> List[Dict]:
    """按投递顺序返回星愿留言。"""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT * FROM (
                SELECT id, username, content, x, y, click_count, created_at
                FROM xcdh_messages
                WHERE is_hidden = 0
                ORDER BY id DESC
                LIMIT ?
            )
            ORDER BY id ASC
            """,
            (limit,),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def list_admin_xcdh_messages(
    page: int = 1,
    page_size: int = 20,
    keyword: Optional[str] = None,
    visibility: str = "all",
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> Dict:
    """分页返回后台星愿列表及全局汇总。"""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        where = []
        params = []
        normalized_keyword = (keyword or "").strip()
        if normalized_keyword:
            wildcard = f"%{normalized_keyword}%"
            where.append(
                "(CAST(id AS TEXT) LIKE ? OR username LIKE ? OR content LIKE ?)"
            )
            params.extend([wildcard, wildcard, wildcard])
        if visibility == "visible":
            where.append("is_hidden = 0")
        elif visibility == "hidden":
            where.append("is_hidden = 1")

        where_sql = f" WHERE {' AND '.join(where)}" if where else ""
        order_columns = {
            "id": "id",
            "click_count": "click_count",
            "created_at": "created_at",
        }
        order_column = order_columns.get(sort_by, "created_at")
        order_direction = "ASC" if sort_order.lower() == "asc" else "DESC"
        total = conn.execute(
            f"SELECT COUNT(*) FROM xcdh_messages{where_sql}",
            params,
        ).fetchone()[0]
        rows = conn.execute(
            f"""
            SELECT id, username, content, x, y, click_count, created_at,
                   is_hidden, hidden_at
            FROM xcdh_messages
            {where_sql}
            ORDER BY {order_column} {order_direction}, id {order_direction}
            LIMIT ? OFFSET ?
            """,
            [*params, page_size, (page - 1) * page_size],
        ).fetchall()
        summary = conn.execute(
            """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN is_hidden = 0 THEN 1 ELSE 0 END) AS visible,
                SUM(CASE WHEN is_hidden = 1 THEN 1 ELSE 0 END) AS hidden,
                COALESCE(SUM(click_count), 0) AS total_clicks
            FROM xcdh_messages
            """
        ).fetchone()
        return {
            "total": int(total),
            "items": [dict(row) for row in rows],
            "summary": {
                "total": int(summary["total"] or 0),
                "visible": int(summary["visible"] or 0),
                "hidden": int(summary["hidden"] or 0),
                "total_clicks": int(summary["total_clicks"] or 0),
            },
        }
    finally:
        conn.close()


def set_xcdh_message_hidden(message_id: int, hidden: bool) -> Optional[Dict]:
    """隐藏或恢复星愿，并返回最新后台数据。"""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.execute(
            """
            UPDATE xcdh_messages
            SET is_hidden = ?,
                hidden_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE id = ?
            """,
            (int(hidden), int(hidden), message_id),
        )
        if cursor.rowcount == 0:
            return None
        conn.commit()
        row = conn.execute(
            """
            SELECT id, username, content, x, y, click_count, created_at,
                   is_hidden, hidden_at
            FROM xcdh_messages
            WHERE id = ?
            """,
            (message_id,),
        ).fetchone()
        return dict(row)
    finally:
        conn.close()


def delete_xcdh_message(message_id: int) -> bool:
    """永久删除一条星愿。"""
    conn = get_connection()
    try:
        cursor = conn.execute("DELETE FROM xcdh_messages WHERE id = ?", (message_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def create_xcdh_message(username: str, content: str) -> Dict:
    """创建星愿，并在完整画布的稀疏区域分配安全坐标。"""
    conn = get_connection()
    try:
        existing_positions = conn.execute(
            """
            SELECT x, y
            FROM xcdh_messages
            ORDER BY id DESC
            LIMIT ?
            """,
            (_POSITION_SAMPLE_LIMIT,),
        ).fetchall()
        x, y = select_balanced_xcdh_position(existing_positions)
        cursor = conn.execute(
            """
            INSERT INTO xcdh_messages (username, content, x, y)
            VALUES (?, ?, ?, ?)
            """,
            (username, content, x, y),
        )
        message_id = int(cursor.lastrowid)
        conn.commit()
        row = conn.execute(
            """
            SELECT id, username, content, x, y, click_count, created_at
            FROM xcdh_messages
            WHERE id = ?
            """,
            (message_id,),
        ).fetchone()
        return {
            "id": int(row[0]),
            "username": row[1],
            "content": row[2],
            "x": float(row[3]),
            "y": float(row[4]),
            "click_count": int(row[5]),
            "created_at": row[6],
        }
    finally:
        conn.close()


def increment_xcdh_message_click(message_id: int) -> Optional[Dict]:
    """记录一次星愿查看，并返回最新数据。"""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.execute(
            """
            UPDATE xcdh_messages
            SET click_count = click_count + 1
            WHERE id = ? AND is_hidden = 0
            """,
            (message_id,),
        )
        if cursor.rowcount == 0:
            return None
        conn.commit()
        row = conn.execute(
            """
            SELECT id, username, content, x, y, click_count, created_at
            FROM xcdh_messages
            WHERE id = ?
            """,
            (message_id,),
        ).fetchone()
        return dict(row)
    finally:
        conn.close()
