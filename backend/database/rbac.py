"""后台 RBAC 角色与权限数据访问。"""

from typing import Dict, Iterable, List, Optional, Sequence
from uuid import uuid4

from .config import get_connection


QUESTIONS_MANAGE = "questions.manage"
ACCOUNTS_MANAGE = "accounts.manage"
HOMEPAGE_MANAGE = "homepage.manage"
QUIZ_OPERATE = "quiz.operate"

PERMISSION_DEFINITIONS = (
    (
        QUESTIONS_MANAGE,
        "题目与答题活动管理",
        "管理题目、物料、内容角色、统计、倒计时和答题活动。",
        "内容管理",
        10,
    ),
    (
        HOMEPAGE_MANAGE,
        "主页活动管理",
        "创建、编辑、发布、归档和删除主页活动。",
        "内容管理",
        20,
    ),
    (
        ACCOUNTS_MANAGE,
        "账号与权限管理",
        "管理后台账号、角色及角色拥有的权限。",
        "系统管理",
        30,
    ),
    (
        QUIZ_OPERATE,
        "现场答题",
        "进入现场答题页面并操作当前进行中的答题活动。",
        "现场操作",
        40,
    ),
)

DEFAULT_ACCESS_ROLES = (
    (
        "super_admin",
        "超级管理员",
        "系统兜底角色，始终拥有全部权限。",
        True,
        True,
        tuple(item[0] for item in PERMISSION_DEFINITIONS),
    ),
    (
        "question_admin",
        "题目管理员",
        "管理自己负责的题目内容，并管理答题活动。",
        True,
        False,
        (QUESTIONS_MANAGE,),
    ),
    (
        "quiz_operator",
        "答题人员",
        "仅用于现场答题操作。",
        True,
        False,
        (QUIZ_OPERATE,),
    ),
)


def initialize_rbac(cursor) -> None:
    """创建 RBAC 表，并为旧的三个固定角色写入兼容权限。"""
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS access_permissions (
            key TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            category TEXT NOT NULL DEFAULT '',
            position INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS access_roles (
            key TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            is_system INTEGER NOT NULL DEFAULT 0 CHECK(is_system IN (0, 1)),
            is_locked INTEGER NOT NULL DEFAULT 0 CHECK(is_locked IN (0, 1)),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS access_role_permissions (
            role_key TEXT NOT NULL,
            permission_key TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (role_key, permission_key)
        )
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_access_role_permissions_permission
        ON access_role_permissions(permission_key, role_key)
        """
    )

    cursor.executemany(
        """
        INSERT INTO access_permissions (key, name, description, category, position)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            category = excluded.category,
            position = excluded.position
        """,
        PERMISSION_DEFINITIONS,
    )

    for role_key, name, description, is_system, is_locked, permissions in DEFAULT_ACCESS_ROLES:
        created = cursor.execute(
            """
            INSERT OR IGNORE INTO access_roles (
                key, name, description, is_system, is_locked
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (role_key, name, description, int(is_system), int(is_locked)),
        ).rowcount
        if created:
            cursor.executemany(
                """
                INSERT OR IGNORE INTO access_role_permissions (role_key, permission_key)
                VALUES (?, ?)
                """,
                [(role_key, permission) for permission in permissions],
            )

    # 超级管理员是系统恢复入口，权限不可被移除。
    cursor.executemany(
        """
        INSERT OR IGNORE INTO access_role_permissions (role_key, permission_key)
        VALUES ('super_admin', ?)
        """,
        [(item[0],) for item in PERMISSION_DEFINITIONS],
    )


def _permission_row(row) -> Dict[str, object]:
    return {
        "key": row[0],
        "name": row[1],
        "description": row[2],
        "category": row[3],
        "position": int(row[4]),
    }


def list_permissions() -> List[Dict[str, object]]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT key, name, description, category, position
            FROM access_permissions
            ORDER BY position, key
            """
        ).fetchall()
        return [_permission_row(row) for row in rows]
    finally:
        conn.close()


def get_role_permission_keys(role_key: str) -> List[str]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT rp.permission_key
            FROM access_role_permissions rp
            JOIN access_permissions p ON p.key = rp.permission_key
            WHERE rp.role_key = ?
            ORDER BY p.position, p.key
            """,
            (role_key,),
        ).fetchall()
        return [row[0] for row in rows]
    finally:
        conn.close()


def role_has_permission(role_key: str, permission_key: str) -> bool:
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT 1 FROM access_role_permissions
            WHERE role_key = ? AND permission_key = ?
            LIMIT 1
            """,
            (role_key, permission_key),
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def _role_row(row) -> Dict[str, object]:
    role_key = row[0]
    return {
        "key": role_key,
        "name": row[1],
        "description": row[2],
        "is_system": bool(row[3]),
        "is_locked": bool(row[4]),
        "permissions": get_role_permission_keys(role_key),
        "user_count": int(row[5] or 0),
    }


def list_access_roles() -> List[Dict[str, object]]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT r.key, r.name, r.description, r.is_system, r.is_locked,
                   COUNT(a.id) AS user_count
            FROM access_roles r
            LEFT JOIN admins a ON a.role = r.key
            GROUP BY r.key, r.name, r.description, r.is_system, r.is_locked
            ORDER BY r.is_locked DESC, r.is_system DESC, r.created_at, r.key
            """
        ).fetchall()
    finally:
        conn.close()
    return [_role_row(row) for row in rows]


def get_access_role(role_key: str) -> Optional[Dict[str, object]]:
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT r.key, r.name, r.description, r.is_system, r.is_locked,
                   COUNT(a.id) AS user_count
            FROM access_roles r
            LEFT JOIN admins a ON a.role = r.key
            WHERE r.key = ?
            GROUP BY r.key, r.name, r.description, r.is_system, r.is_locked
            """,
            (role_key,),
        ).fetchone()
    finally:
        conn.close()
    return _role_row(row) if row else None


def _validate_permission_keys(permission_keys: Iterable[str]) -> List[str]:
    requested = list(dict.fromkeys(str(key) for key in permission_keys))
    known = {item["key"] for item in list_permissions()}
    unknown = [key for key in requested if key not in known]
    if unknown:
        raise ValueError(f"未知权限：{', '.join(unknown)}")
    return requested


def create_access_role(
    name: str,
    description: str,
    permission_keys: Sequence[str],
) -> Dict[str, object]:
    role_key = f"custom_{uuid4().hex[:12]}"
    permissions = _validate_permission_keys(permission_keys)
    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        conn.execute(
            """
            INSERT INTO access_roles (key, name, description)
            VALUES (?, ?, ?)
            """,
            (role_key, name, description),
        )
        conn.executemany(
            """
            INSERT INTO access_role_permissions (role_key, permission_key)
            VALUES (?, ?)
            """,
            [(role_key, key) for key in permissions],
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return get_access_role(role_key) or {}


def update_access_role(
    role_key: str,
    *,
    name: str,
    description: str,
    permission_keys: Sequence[str],
) -> Optional[Dict[str, object]]:
    role = get_access_role(role_key)
    if not role:
        return None
    permissions = _validate_permission_keys(permission_keys)
    if role["is_locked"]:
        permissions = [item["key"] for item in list_permissions()]

    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        conn.execute(
            """
            UPDATE access_roles
            SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE key = ?
            """,
            (name, description, role_key),
        )
        conn.execute(
            "DELETE FROM access_role_permissions WHERE role_key = ?",
            (role_key,),
        )
        conn.executemany(
            """
            INSERT INTO access_role_permissions (role_key, permission_key)
            VALUES (?, ?)
            """,
            [(role_key, key) for key in permissions],
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return get_access_role(role_key)


def delete_access_role(role_key: str) -> bool:
    role = get_access_role(role_key)
    if not role:
        return False
    if role["is_system"]:
        raise ValueError("系统内置角色不能删除")
    if role["user_count"]:
        raise ValueError("该角色仍有账号使用，不能删除")

    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        conn.execute(
            "DELETE FROM access_role_permissions WHERE role_key = ?",
            (role_key,),
        )
        cursor = conn.execute("DELETE FROM access_roles WHERE key = ?", (role_key,))
        conn.commit()
        return cursor.rowcount == 1
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def role_has_bound_content(role_key: str) -> bool:
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT 1
            FROM admins a
            WHERE a.role = ? AND (
                EXISTS (
                    SELECT 1 FROM question_contributors qc WHERE qc.admin_id = a.id
                ) OR EXISTS (
                    SELECT 1 FROM material_contributors mc WHERE mc.admin_id = a.id
                )
            )
            LIMIT 1
            """,
            (role_key,),
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def invalidate_role_sessions(role_key: str) -> None:
    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        conn.execute(
            """
            UPDATE admins
            SET token_version = token_version + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE role = ?
            """,
            (role_key,),
        )
        conn.execute(
            """
            UPDATE admin_refresh_tokens
            SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
            WHERE admin_id IN (SELECT id FROM admins WHERE role = ?)
            """,
            (role_key,),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
