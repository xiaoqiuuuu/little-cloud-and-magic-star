"""管理员账号相关的数据库操作。"""

import sqlite3
from typing import Any, Dict, List, Optional

from passwords import hash_password, is_password_hash, verify_password

from .config import get_connection


ADMIN_COLUMNS = """
    id, username, password, role, is_active, token_version, created_at, updated_at
"""


def _row_to_admin(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": int(row["id"]),
        "username": row["username"],
        "role": row["role"],
        "is_active": bool(row["is_active"]),
        "token_version": int(row["token_version"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _get_admin_row_by_username(username: str) -> Optional[sqlite3.Row]:
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        return conn.execute(
            f"SELECT {ADMIN_COLUMNS} FROM admins WHERE username = ? COLLATE NOCASE",
            (username,),
        ).fetchone()
    finally:
        conn.close()


def verify_admin(username: str, password: str) -> Optional[Dict[str, Any]]:
    """验证启用状态的管理员账号。"""
    row = _get_admin_row_by_username(username)
    if not row or not bool(row["is_active"]):
        return None
    if not verify_password(password, row["password"]):
        return None

    # 正常情况下初始化迁移已完成；这里保留惰性迁移作为兜底。
    if not is_password_hash(row["password"]):
        conn = get_connection()
        try:
            conn.execute(
                """
                UPDATE admins
                SET password = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (hash_password(password), row["id"]),
            )
            conn.commit()
        finally:
            conn.close()

    return _row_to_admin(row)


def get_admin_by_username(username: str) -> Optional[Dict[str, Any]]:
    row = _get_admin_row_by_username(username)
    return _row_to_admin(row) if row else None


def get_admin_by_id(admin_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            f"SELECT {ADMIN_COLUMNS} FROM admins WHERE id = ?",
            (admin_id,),
        ).fetchone()
        return _row_to_admin(row) if row else None
    finally:
        conn.close()


def list_admins() -> List[Dict[str, Any]]:
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            f"""
            SELECT {ADMIN_COLUMNS}
            FROM admins
            ORDER BY CASE role WHEN 'super_admin' THEN 0 ELSE 1 END,
                     username COLLATE NOCASE
            """
        ).fetchall()
        return [_row_to_admin(row) for row in rows]
    finally:
        conn.close()


def create_admin(username: str, password: str, role: str) -> Dict[str, Any]:
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            INSERT INTO admins (username, password, role)
            VALUES (?, ?, ?)
            """,
            (username, hash_password(password), role),
        )
        conn.commit()
        admin_id = int(cursor.lastrowid)
    finally:
        conn.close()
    admin = get_admin_by_id(admin_id)
    if not admin:
        raise RuntimeError("管理员账号创建失败")
    return admin


def update_admin(
    admin_id: int,
    *,
    username: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> Optional[Dict[str, Any]]:
    current = get_admin_by_id(admin_id)
    if not current:
        return None

    updates: Dict[str, Any] = {}
    if username is not None and username != current["username"]:
        updates["username"] = username
    if role is not None and role != current["role"]:
        updates["role"] = role
    if is_active is not None and is_active != current["is_active"]:
        updates["is_active"] = int(is_active)
    if not updates:
        return current

    assignments = [f"{column} = ?" for column in updates]
    assignments.extend([
        "token_version = token_version + 1",
        "updated_at = CURRENT_TIMESTAMP",
    ])
    values = list(updates.values()) + [admin_id]

    conn = get_connection()
    try:
        conn.execute(
            f"UPDATE admins SET {', '.join(assignments)} WHERE id = ?",
            values,
        )
        conn.commit()
    finally:
        conn.close()
    return get_admin_by_id(admin_id)


def reset_admin_password(admin_id: int, password: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            UPDATE admins
            SET password = ?, token_version = token_version + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (hash_password(password), admin_id),
        )
        conn.commit()
        if cursor.rowcount != 1:
            return None
    finally:
        conn.close()
    return get_admin_by_id(admin_id)


def increment_admin_token_version(admin_id: int) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            UPDATE admins
            SET token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (admin_id,),
        )
        conn.commit()
        return cursor.rowcount == 1
    finally:
        conn.close()


def delete_admin(admin_id: int) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute('DELETE FROM admins WHERE id = ?', (admin_id,))
        conn.commit()
        return cursor.rowcount == 1
    finally:
        conn.close()


def count_active_super_admins() -> int:
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT COUNT(*) FROM admins
            WHERE role = 'super_admin' AND is_active = 1
            """
        ).fetchone()
        return int(row[0])
    finally:
        conn.close()
