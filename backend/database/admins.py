"""管理员账号相关的数据库操作。"""

import sqlite3
from typing import Any, Dict, List, Optional, Sequence, Union

from passwords import hash_password, is_password_hash, verify_password

from .config import get_connection
from .rbac import (
    get_access_role,
    get_admin_access_roles,
    get_admin_permission_keys,
)


ADMIN_COLUMNS = """
    id, username, password, role, is_active, token_version,
    display_name, profile_url, created_at, updated_at
"""

_UNSET = object()


def _row_to_admin(row: sqlite3.Row) -> Dict[str, Any]:
    assigned_roles = get_admin_access_roles(int(row["id"]))
    if not assigned_roles:
        access_role = get_access_role(row["role"])
        if access_role:
            assigned_roles = [
                {"key": access_role["key"], "name": access_role["name"]}
            ]
    primary_role = assigned_roles[0] if assigned_roles else {
        "key": row["role"],
        "name": row["role"],
    }
    return {
        "id": int(row["id"]),
        "username": row["username"],
        # role/role_name 保留为主角色兼容字段，roles 才是完整角色集合。
        "role": primary_role["key"],
        "role_name": primary_role["name"],
        "roles": assigned_roles,
        "role_keys": [role["key"] for role in assigned_roles],
        "role_names": [role["name"] for role in assigned_roles],
        "permissions": get_admin_permission_keys(int(row["id"])),
        "is_active": bool(row["is_active"]),
        "token_version": int(row["token_version"]),
        "display_name": row["display_name"] or row["username"],
        "profile_url": row["profile_url"],
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
            ORDER BY CASE
                         WHEN EXISTS (
                             SELECT 1 FROM admin_access_roles ar
                             WHERE ar.admin_id = admins.id
                               AND ar.role_key = 'super_admin'
                         ) THEN 0
                         WHEN EXISTS (
                             SELECT 1 FROM admin_access_roles ar
                             WHERE ar.admin_id = admins.id
                               AND ar.role_key = 'question_admin'
                         ) THEN 1
                         ELSE 2
                     END,
                     username COLLATE NOCASE
            """
        ).fetchall()
        return [_row_to_admin(row) for row in rows]
    finally:
        conn.close()


def create_admin(
    username: str,
    password: str,
    roles: Union[str, Sequence[str]],
    *,
    display_name: Optional[str] = None,
    profile_url: Optional[str] = None,
) -> Dict[str, Any]:
    role_keys = _normalize_role_keys(roles)
    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        cursor = conn.execute(
            """
            INSERT INTO admins (
                username, password, role, display_name, profile_url
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                username,
                hash_password(password),
                role_keys[0],
                display_name or username,
                profile_url,
            ),
        )
        admin_id = int(cursor.lastrowid)
        conn.executemany(
            """
            INSERT INTO admin_access_roles (admin_id, role_key, position)
            VALUES (?, ?, ?)
            """,
            [
                (admin_id, role_key, position)
                for position, role_key in enumerate(role_keys)
            ],
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
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
    roles: Optional[Sequence[str]] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    display_name: Any = _UNSET,
    profile_url: Any = _UNSET,
) -> Optional[Dict[str, Any]]:
    current = get_admin_by_id(admin_id)
    if not current:
        return None

    if roles is not None and role is not None:
        raise ValueError("不能同时提交 role 和 roles")
    requested_roles = roles if roles is not None else ([role] if role is not None else None)
    role_keys = (
        _normalize_role_keys(requested_roles)
        if requested_roles is not None
        else current["role_keys"]
    )
    roles_changed = role_keys != current["role_keys"]

    updates: Dict[str, Any] = {}
    if username is not None and username != current["username"]:
        updates["username"] = username
    if roles_changed:
        updates["role"] = role_keys[0]
    if is_active is not None and is_active != current["is_active"]:
        updates["is_active"] = int(is_active)
    if display_name is not _UNSET and display_name != current["display_name"]:
        updates["display_name"] = display_name
    if profile_url is not _UNSET and profile_url != current["profile_url"]:
        updates["profile_url"] = profile_url
    if not updates and not roles_changed:
        return current

    assignments = [f"{column} = ?" for column in updates]
    if {"username", "role", "is_active"}.intersection(updates) or roles_changed:
        assignments.append("token_version = token_version + 1")
    assignments.append("updated_at = CURRENT_TIMESTAMP")
    values = list(updates.values()) + [admin_id]

    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        conn.execute(
            f"UPDATE admins SET {', '.join(assignments)} WHERE id = ?",
            values,
        )
        if roles_changed:
            conn.execute(
                "DELETE FROM admin_access_roles WHERE admin_id = ?",
                (admin_id,),
            )
            conn.executemany(
                """
                INSERT INTO admin_access_roles (admin_id, role_key, position)
                VALUES (?, ?, ?)
                """,
                [
                    (admin_id, role_key, position)
                    for position, role_key in enumerate(role_keys)
                ],
            )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
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
        conn.execute("BEGIN IMMEDIATE")
        conn.execute(
            "DELETE FROM admin_access_roles WHERE admin_id = ?",
            (admin_id,),
        )
        cursor = conn.execute('DELETE FROM admins WHERE id = ?', (admin_id,))
        conn.commit()
        return cursor.rowcount == 1
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def count_active_super_admins() -> int:
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT COUNT(DISTINCT a.id)
            FROM admins a
            JOIN admin_access_roles ar ON ar.admin_id = a.id
            WHERE ar.role_key = 'super_admin' AND a.is_active = 1
            """
        ).fetchone()
        return int(row[0])
    finally:
        conn.close()


def _normalize_role_keys(roles: Union[str, Sequence[str]]) -> List[str]:
    values = [roles] if isinstance(roles, str) else list(roles)
    role_keys = list(
        dict.fromkeys(str(role_key).strip() for role_key in values if str(role_key).strip())
    )
    if not role_keys:
        raise ValueError("账号至少需要一个角色")
    missing = [role_key for role_key in role_keys if not get_access_role(role_key)]
    if missing:
        raise ValueError(f"账号角色不存在：{', '.join(missing)}")
    return role_keys
