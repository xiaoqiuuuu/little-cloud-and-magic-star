"""Refresh Token 服务端状态管理。"""

from datetime import datetime, timezone
from typing import Optional

from .config import get_connection


def _delete_expired_tokens(conn) -> None:
    conn.execute(
        "DELETE FROM admin_refresh_tokens WHERE expires_at <= ?",
        (datetime.now(timezone.utc).isoformat(),),
    )


def create_refresh_token(
    jti: str,
    admin_id: int,
    expires_at: datetime,
) -> None:
    conn = get_connection()
    try:
        _delete_expired_tokens(conn)
        conn.execute(
            """
            INSERT INTO admin_refresh_tokens (jti, admin_id, expires_at)
            VALUES (?, ?, ?)
            """,
            (jti, admin_id, expires_at.isoformat()),
        )
        conn.commit()
    finally:
        conn.close()


def rotate_refresh_token(
    old_jti: str,
    new_jti: str,
    admin_id: int,
    expires_at: datetime,
) -> bool:
    """原子地消费旧 Refresh Token 并登记新 Token。"""
    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        _delete_expired_tokens(conn)
        cursor = conn.execute(
            """
            UPDATE admin_refresh_tokens
            SET revoked_at = CURRENT_TIMESTAMP, replaced_by = ?
            WHERE jti = ? AND admin_id = ? AND revoked_at IS NULL
            """,
            (new_jti, old_jti, admin_id),
        )
        if cursor.rowcount != 1:
            conn.rollback()
            return False

        conn.execute(
            """
            INSERT INTO admin_refresh_tokens (jti, admin_id, expires_at)
            VALUES (?, ?, ?)
            """,
            (new_jti, admin_id, expires_at.isoformat()),
        )
        conn.commit()
        return True
    finally:
        conn.close()


def revoke_all_refresh_tokens(admin_id: int) -> int:
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            UPDATE admin_refresh_tokens
            SET revoked_at = CURRENT_TIMESTAMP
            WHERE admin_id = ? AND revoked_at IS NULL
            """,
            (admin_id,),
        )
        conn.commit()
        return cursor.rowcount
    finally:
        conn.close()


def get_refresh_token_admin_id(jti: str) -> Optional[int]:
    """返回仍有效的 Refresh Token 所属账号 ID。"""
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT admin_id
            FROM admin_refresh_tokens
            WHERE jti = ? AND revoked_at IS NULL
            """,
            (jti,),
        ).fetchone()
        return int(row[0]) if row else None
    finally:
        conn.close()
