"""星辰大海留言的数据访问层。"""

import random
import sqlite3
from typing import Dict, List, Optional

from .config import get_connection


_position_random = random.SystemRandom()


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
    """创建星愿，并分配一个避开页面边缘的星空坐标。"""
    x = _position_random.uniform(5, 95)
    y = _position_random.uniform(9, 76)
    conn = get_connection()
    try:
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
