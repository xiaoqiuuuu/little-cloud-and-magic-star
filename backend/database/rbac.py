"""后台 RBAC 角色与权限数据访问。"""

from typing import Dict, Iterable, List, Optional, Sequence
from uuid import uuid4

from .config import get_connection


QUESTIONS_MANAGE = "questions.manage"
MATERIALS_MANAGE = "materials.manage"
CONTENT_ROLES_MANAGE = "content_roles.manage"
QUIZ_ACTIVITIES_MANAGE = "quiz_activities.manage"
VISIT_STATS_VIEW = "visit_stats.view"
ACCOUNTS_MANAGE = "accounts.manage"
HOMEPAGE_MANAGE = "homepage.manage"
QUIZ_OPERATE = "quiz.operate"

LEGACY_QUESTION_ADMIN_PERMISSIONS = (
    MATERIALS_MANAGE,
    CONTENT_ROLES_MANAGE,
    QUIZ_ACTIVITIES_MANAGE,
    VISIT_STATS_VIEW,
)

PERMISSION_DEFINITIONS = (
    (
        QUESTIONS_MANAGE,
        "题目管理",
        "创建、编辑、导入、删除题目并查看题目统计。",
        "内容管理",
        10,
    ),
    (
        MATERIALS_MANAGE,
        "物料管理",
        "创建、编辑、删除图片、视频和音频物料。",
        "内容管理",
        20,
    ),
    (
        CONTENT_ROLES_MANAGE,
        "内容角色管理",
        "维护游戏规则中展示的角色、阵营和技能资料。",
        "内容管理",
        30,
    ),
    (
        QUIZ_ACTIVITIES_MANAGE,
        "答题活动管理",
        "创建、切换、暂停和结束答题活动，并管理现场倒计时。",
        "活动运营",
        40,
    ),
    (
        HOMEPAGE_MANAGE,
        "主页活动管理",
        "创建、编辑、发布、归档和删除主页活动。",
        "活动运营",
        50,
    ),
    (
        VISIT_STATS_VIEW,
        "访问分析查看",
        "查看网站访问量、访客、来源、设备和浏览器分析。",
        "数据分析",
        60,
    ),
    (
        ACCOUNTS_MANAGE,
        "账号与权限管理",
        "管理后台账号、角色及角色拥有的权限。",
        "系统管理",
        70,
    ),
    (
        QUIZ_OPERATE,
        "现场答题",
        "进入现场答题页面并操作当前进行中的答题活动。",
        "现场操作",
        80,
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
        "管理题目、物料、内容角色、答题活动和访问分析。",
        True,
        False,
        (QUESTIONS_MANAGE, *LEGACY_QUESTION_ADMIN_PERMISSIONS),
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

    existing_permission_keys = {
        row[0] for row in cursor.execute("SELECT key FROM access_permissions").fetchall()
    }
    expand_legacy_question_roles = (
        QUESTIONS_MANAGE in existing_permission_keys
        and any(
            permission not in existing_permission_keys
            for permission in LEGACY_QUESTION_ADMIN_PERMISSIONS
        )
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

    # 旧版 questions.manage 曾包含物料、内容角色、活动和访问统计。
    # 新权限首次出现时，将这些能力一次性展开到现有角色，后续不再自动补回。
    if expand_legacy_question_roles:
        for permission_key in LEGACY_QUESTION_ADMIN_PERMISSIONS:
            cursor.execute(
                """
                INSERT OR IGNORE INTO access_role_permissions (role_key, permission_key)
                SELECT role_key, ?
                FROM access_role_permissions
                WHERE permission_key = ?
                """,
                (permission_key, QUESTIONS_MANAGE),
            )

    # 超级管理员是系统恢复入口，权限不可被移除。
    cursor.executemany(
        """
        INSERT OR IGNORE INTO access_role_permissions (role_key, permission_key)
        VALUES ('super_admin', ?)
        """,
        [(item[0],) for item in PERMISSION_DEFINITIONS],
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS admin_access_roles (
            admin_id INTEGER NOT NULL,
            role_key TEXT NOT NULL,
            position INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (admin_id, role_key)
        )
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_admin_access_roles_role
        ON admin_access_roles(role_key, admin_id)
        """
    )
    cursor.execute(
        """
        DELETE FROM admin_access_roles
        WHERE admin_id NOT IN (SELECT id FROM admins)
        """
    )

    # 首次升级时将旧的单角色字段迁移为用户与角色的多对多关系。
    cursor.execute(
        """
        INSERT OR IGNORE INTO admin_access_roles (admin_id, role_key, position)
        SELECT a.id, a.role, 0
        FROM admins a
        JOIN access_roles r ON r.key = a.role
        WHERE NOT EXISTS (
            SELECT 1 FROM admin_access_roles ar WHERE ar.admin_id = a.id
        )
        """
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


def role_keys_have_permission(
    role_keys: Iterable[str],
    permission_key: str,
) -> bool:
    keys = list(dict.fromkeys(str(key) for key in role_keys))
    if not keys:
        return False
    placeholders = ",".join("?" for _ in keys)
    conn = get_connection()
    try:
        row = conn.execute(
            f"""
            SELECT 1 FROM access_role_permissions
            WHERE role_key IN ({placeholders}) AND permission_key = ?
            LIMIT 1
            """,
            [*keys, permission_key],
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def get_admin_access_roles(admin_id: int) -> List[Dict[str, object]]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT r.key, r.name
            FROM admin_access_roles ar
            JOIN access_roles r ON r.key = ar.role_key
            WHERE ar.admin_id = ?
            ORDER BY ar.position, ar.created_at, r.key
            """,
            (admin_id,),
        ).fetchall()
        return [{"key": row[0], "name": row[1]} for row in rows]
    finally:
        conn.close()


def get_admin_permission_keys(admin_id: int) -> List[str]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT DISTINCT p.key, p.position
            FROM admin_access_roles ar
            JOIN access_role_permissions rp ON rp.role_key = ar.role_key
            JOIN access_permissions p ON p.key = rp.permission_key
            WHERE ar.admin_id = ?
            ORDER BY p.position, p.key
            """,
            (admin_id,),
        ).fetchall()
        return [row[0] for row in rows]
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
                   COUNT(DISTINCT ar.admin_id) AS user_count
            FROM access_roles r
            LEFT JOIN admin_access_roles ar ON ar.role_key = r.key
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
                   COUNT(DISTINCT ar.admin_id) AS user_count
            FROM access_roles r
            LEFT JOIN admin_access_roles ar ON ar.role_key = r.key
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


def role_has_bound_content(role_key: str, permission_key: str) -> bool:
    relation = {
        QUESTIONS_MANAGE: "question_contributors",
        MATERIALS_MANAGE: "material_contributors",
    }.get(permission_key)
    if not relation:
        return False
    conn = get_connection()
    try:
        row = conn.execute(
            f"""
            SELECT 1
            FROM admins a
            JOIN admin_access_roles target_role
              ON target_role.admin_id = a.id AND target_role.role_key = ?
            WHERE EXISTS (
                SELECT 1 FROM {relation} content WHERE content.admin_id = a.id
            )
            AND NOT EXISTS (
                SELECT 1
                FROM admin_access_roles other_role
                JOIN access_role_permissions rp
                  ON rp.role_key = other_role.role_key
                WHERE other_role.admin_id = a.id
                  AND other_role.role_key != ?
                  AND rp.permission_key = ?
            )
            LIMIT 1
            """,
            (role_key, role_key, permission_key),
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
            WHERE id IN (
                SELECT admin_id FROM admin_access_roles WHERE role_key = ?
            )
            """,
            (role_key,),
        )
        conn.execute(
            """
            UPDATE admin_refresh_tokens
            SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
            WHERE admin_id IN (
                SELECT admin_id FROM admin_access_roles WHERE role_key = ?
            )
            """,
            (role_key,),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
