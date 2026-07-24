"""账号资料与题目/物料贡献者关系。

新关系始终使用 admins.id。旧的 questions.author 和 materials.creator
字符串数组仅用于兼容读取。
"""

import json
from typing import Dict, Iterable, List, Optional, Sequence

from models import ContentContributor

from .config import get_connection
from .rbac import MATERIALS_MANAGE, QUESTIONS_MANAGE, get_admin_access_roles


CONTRIBUTOR_COLUMNS = """
    a.id, a.username, COALESCE(NULLIF(a.display_name, ''), a.username),
    a.profile_url, a.role, a.is_active
"""


def _row_to_contributor(row) -> ContentContributor:
    roles = get_admin_access_roles(int(row[0]))
    return ContentContributor(
        id=int(row[0]),
        username=row[1],
        display_name=row[2],
        profile_url=row[3],
        role=row[4],
        role_keys=[role["key"] for role in roles],
        is_active=bool(row[5]),
    )


def _parse_legacy_names(raw_value: Optional[str]) -> List[str]:
    if not raw_value:
        return []
    try:
        parsed = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        parsed = raw_value
    values = parsed if isinstance(parsed, list) else [parsed]
    return [str(value).strip() for value in values if str(value).strip()]


def list_content_contributors(
    include_inactive: bool = True,
    permission_key: str = QUESTIONS_MANAGE,
) -> List[ContentContributor]:
    conn = get_connection()
    try:
        query = f"""
            SELECT {CONTRIBUTOR_COLUMNS}
            FROM admins a
            WHERE EXISTS (
                SELECT 1
                FROM admin_access_roles ar
                JOIN access_role_permissions rp ON rp.role_key = ar.role_key
                WHERE ar.admin_id = a.id AND rp.permission_key = ?
            )
        """
        params: List[object] = [permission_key]
        if not include_inactive:
            query += " AND a.is_active = 1"
        query += " ORDER BY a.is_active DESC, a.username COLLATE NOCASE"
        rows = conn.execute(query, params).fetchall()
        return [_row_to_contributor(row) for row in rows]
    finally:
        conn.close()


def get_content_contributor(
    admin_id: int,
    permission_key: str = QUESTIONS_MANAGE,
) -> Optional[ContentContributor]:
    conn = get_connection()
    try:
        row = conn.execute(
            f"""
            SELECT {CONTRIBUTOR_COLUMNS}
            FROM admins a
            WHERE a.id = ? AND EXISTS (
                SELECT 1
                FROM admin_access_roles ar
                JOIN access_role_permissions rp ON rp.role_key = ar.role_key
                WHERE ar.admin_id = a.id AND rp.permission_key = ?
            )
            """,
            (admin_id, permission_key),
        ).fetchone()
        return _row_to_contributor(row) if row else None
    finally:
        conn.close()


def get_content_contributors(
    admin_ids: Sequence[int],
    permission_key: str = QUESTIONS_MANAGE,
) -> List[ContentContributor]:
    ordered_ids = list(dict.fromkeys(int(admin_id) for admin_id in admin_ids))
    if not ordered_ids:
        return []
    placeholders = ",".join("?" for _ in ordered_ids)
    conn = get_connection()
    try:
        rows = conn.execute(
            f"""
            SELECT {CONTRIBUTOR_COLUMNS}
            FROM admins a
            WHERE a.id IN ({placeholders}) AND EXISTS (
                SELECT 1
                FROM admin_access_roles ar
                JOIN access_role_permissions rp ON rp.role_key = ar.role_key
                WHERE ar.admin_id = a.id AND rp.permission_key = ?
            )
            """,
            [*ordered_ids, permission_key],
        ).fetchall()
    finally:
        conn.close()
    contributors = {}
    for row in rows:
        contributor = _row_to_contributor(row)
        contributors[contributor.id] = contributor
    return [contributors[admin_id] for admin_id in ordered_ids if admin_id in contributors]


def get_admin_legacy_names(admin_id: int) -> List[str]:
    """获取旧字符串字段中可能代表该账号的精确名称。"""
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT a.username, COALESCE(NULLIF(a.display_name, ''), a.username)
            FROM admins a
            WHERE a.id = ?
            """,
            (admin_id,),
        ).fetchone()
    finally:
        conn.close()
    if not row:
        return []
    return list(dict.fromkeys(value.strip() for value in row if value and value.strip()))


def resolve_contributors_by_names(
    names: Iterable[str],
    permission_key: str = QUESTIONS_MANAGE,
) -> List[ContentContributor]:
    """仅对唯一精确匹配的历史署名返回账号，避免同名误绑。"""
    normalized_names = [name.strip().casefold() for name in names if name and name.strip()]
    if not normalized_names:
        return []

    conn = get_connection()
    try:
        rows = conn.execute(
            f"""
            SELECT {CONTRIBUTOR_COLUMNS}
            FROM admins a
            WHERE EXISTS (
                SELECT 1
                FROM admin_access_roles ar
                JOIN access_role_permissions rp ON rp.role_key = ar.role_key
                WHERE ar.admin_id = a.id AND rp.permission_key = ?
            )
            """,
            (permission_key,),
        ).fetchall()
    finally:
        conn.close()

    matches: Dict[str, List[ContentContributor]] = {}
    for row in rows:
        contributor = _row_to_contributor(row)
        aliases = {contributor.username, contributor.display_name}
        for alias in aliases:
            if alias and alias.strip():
                matches.setdefault(alias.strip().casefold(), []).append(contributor)

    resolved: List[ContentContributor] = []
    seen_ids = set()
    for name in normalized_names:
        candidates = {candidate.id: candidate for candidate in matches.get(name, [])}
        if len(candidates) == 1:
            contributor = next(iter(candidates.values()))
            if contributor.id not in seen_ids:
                resolved.append(contributor)
                seen_ids.add(contributor.id)
    return resolved


def _get_relation_contributors(
    table: str,
    content_column: str,
    content_id: str,
    permission_key: str,
) -> List[ContentContributor]:
    conn = get_connection()
    try:
        rows = conn.execute(
            f"""
            SELECT {CONTRIBUTOR_COLUMNS}
            FROM {table} c
            JOIN admins a ON a.id = c.admin_id
            WHERE c.{content_column} = ? AND EXISTS (
                SELECT 1
                FROM admin_access_roles ar
                JOIN access_role_permissions rp ON rp.role_key = ar.role_key
                WHERE ar.admin_id = a.id AND rp.permission_key = ?
            )
            ORDER BY c.position ASC, a.id ASC
            """,
            (content_id, permission_key),
        ).fetchall()
        return [_row_to_contributor(row) for row in rows]
    finally:
        conn.close()


def get_question_contributors(question_id: str) -> List[ContentContributor]:
    return _get_relation_contributors(
        "question_contributors", "question_id", question_id, QUESTIONS_MANAGE
    )


def get_material_contributors(material_id: str) -> List[ContentContributor]:
    return _get_relation_contributors(
        "material_contributors", "material_id", material_id, MATERIALS_MANAGE
    )


def _set_relations(
    table: str,
    content_column: str,
    content_id: str,
    admin_ids: Sequence[int],
    permission_key: str,
    permission_label: str,
) -> List[ContentContributor]:
    contributors = get_content_contributors(admin_ids, permission_key)
    requested_ids = list(dict.fromkeys(int(admin_id) for admin_id in admin_ids))
    if len(contributors) != len(requested_ids):
        raise ValueError(f"只能绑定拥有{permission_label}权限的账号")

    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        conn.execute(
            f"DELETE FROM {table} WHERE {content_column} = ?", (content_id,)
        )
        conn.executemany(
            f"""
            INSERT INTO {table} ({content_column}, admin_id, position)
            VALUES (?, ?, ?)
            """,
            [
                (content_id, contributor.id, position)
                for position, contributor in enumerate(contributors)
            ],
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return contributors


def set_question_contributors(
    question_id: str, admin_ids: Sequence[int]
) -> List[ContentContributor]:
    return _set_relations(
        "question_contributors",
        "question_id",
        question_id,
        admin_ids,
        QUESTIONS_MANAGE,
        "题目管理",
    )


def set_material_contributors(
    material_id: str, admin_ids: Sequence[int]
) -> List[ContentContributor]:
    return _set_relations(
        "material_contributors",
        "material_id",
        material_id,
        admin_ids,
        MATERIALS_MANAGE,
        "物料管理",
    )


def add_question_contributor(question_id: str, admin_id: int) -> None:
    if not get_content_contributor(admin_id):
        raise ValueError("账号不能作为内容贡献者")
    conn = get_connection()
    try:
        next_position = conn.execute(
            """
            SELECT COALESCE(MAX(position), -1) + 1
            FROM question_contributors WHERE question_id = ?
            """,
            (question_id,),
        ).fetchone()[0]
        conn.execute(
            """
            INSERT OR IGNORE INTO question_contributors (question_id, admin_id, position)
            VALUES (?, ?, ?)
            """,
            (question_id, admin_id, next_position),
        )
        conn.commit()
    finally:
        conn.close()


def question_has_contributors(question_id: str) -> bool:
    return _relation_exists("question_contributors", "question_id", question_id)


def material_has_contributors(material_id: str) -> bool:
    return _relation_exists("material_contributors", "material_id", material_id)


def _relation_exists(table: str, content_column: str, content_id: str) -> bool:
    conn = get_connection()
    try:
        row = conn.execute(
            f"SELECT 1 FROM {table} WHERE {content_column} = ? LIMIT 1",
            (content_id,),
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def question_has_contributor(question_id: str, admin_id: int) -> bool:
    return _has_contributor(
        "question_contributors", "question_id", question_id, admin_id
    )


def _has_contributor(
    table: str, content_column: str, content_id: str, admin_id: int
) -> bool:
    conn = get_connection()
    try:
        row = conn.execute(
            f"""
            SELECT 1 FROM {table}
            WHERE {content_column} = ? AND admin_id = ? LIMIT 1
            """,
            (content_id, admin_id),
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def delete_question_contributors(question_id: str) -> None:
    _delete_relations("question_contributors", "question_id", question_id)


def delete_material_contributors(material_id: str) -> None:
    _delete_relations("material_contributors", "material_id", material_id)


def _delete_relations(table: str, content_column: str, content_id: str) -> None:
    conn = get_connection()
    try:
        conn.execute(
            f"DELETE FROM {table} WHERE {content_column} = ?", (content_id,)
        )
        conn.commit()
    finally:
        conn.close()


def count_content_for_admin(admin_id: int) -> Dict[str, int]:
    """用于防止物理删除仍被内容引用的账号。"""
    legacy_names = {name.casefold() for name in get_admin_legacy_names(admin_id)}
    conn = get_connection()
    try:
        question_ids = {
            row[0]
            for row in conn.execute(
                "SELECT question_id FROM question_contributors WHERE admin_id = ?",
                (admin_id,),
            ).fetchall()
        }
        material_ids = {
            row[0]
            for row in conn.execute(
                "SELECT material_id FROM material_contributors WHERE admin_id = ?",
                (admin_id,),
            ).fetchall()
        }
        if legacy_names:
            for row in conn.execute("SELECT id, author FROM questions").fetchall():
                if legacy_names.intersection(
                    name.casefold() for name in _parse_legacy_names(row[1])
                ):
                    question_ids.add(row[0])
            for row in conn.execute("SELECT id, creator FROM materials").fetchall():
                if legacy_names.intersection(
                    name.casefold() for name in _parse_legacy_names(row[1])
                ):
                    material_ids.add(row[0])
        return {"questions": len(question_ids), "materials": len(material_ids)}
    finally:
        conn.close()
