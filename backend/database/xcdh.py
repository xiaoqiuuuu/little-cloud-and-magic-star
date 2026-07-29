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
            WHERE id = ?
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
