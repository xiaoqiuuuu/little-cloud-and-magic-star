"""物料表相关的数据库操作"""

import json
from typing import List, Optional, Sequence
from models import Material
from .config import get_connection
from .contributors import (
    get_material_contributors,
    resolve_contributors_by_names,
    set_material_contributors,
)


def _parse_creator(raw_value: Optional[str]) -> List[str]:
    if not raw_value:
        return []
    try:
        parsed = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        parsed = raw_value
    values = parsed if isinstance(parsed, list) else [parsed]
    return [str(value) for value in values if str(value).strip()]


def _row_to_material(row) -> Material:
    legacy_creator = _parse_creator(row[3])
    contributors = get_material_contributors(row[0])
    if contributors:
        creator = [contributor.display_name for contributor in contributors]
    else:
        creator = legacy_creator
        contributors = resolve_contributors_by_names(legacy_creator)
    return Material(
        id=row[0],
        name=row[1],
        description=row[2] or "",
        creator=creator,
        contributors=contributors,
        resources=json.loads(row[4]) if row[4] else [],
    )


def _contributor_filter(
    contributor_id: Optional[int],
    legacy_names: Optional[Sequence[str]],
) -> tuple[str, List[object]]:
    if contributor_id is None:
        return "", []

    legacy_conditions: List[str] = []
    legacy_params: List[object] = []
    for name in dict.fromkeys(name.strip() for name in legacy_names or [] if name.strip()):
        legacy_conditions.extend([
            "LOWER(TRIM(m.creator)) = LOWER(?)",
            "m.creator LIKE ? COLLATE NOCASE",
        ])
        legacy_params.extend([name, f"%{json.dumps(name, ensure_ascii=False)}%"])
    legacy_sql = " OR ".join(legacy_conditions) if legacy_conditions else "0"
    return (
        f"""
        WHERE (
            EXISTS (
                SELECT 1 FROM material_contributors mc
                WHERE mc.material_id = m.id AND mc.admin_id = ?
            )
            OR (
                NOT EXISTS (
                    SELECT 1 FROM material_contributors mc_any
                    WHERE mc_any.material_id = m.id
                )
                AND ({legacy_sql})
            )
        )
        """,
        [contributor_id, *legacy_params],
    )


def get_materials_count(
    contributor_id: Optional[int] = None,
    legacy_names: Optional[Sequence[str]] = None,
) -> int:
    """获取物料总数"""
    conn = get_connection()
    cursor = conn.cursor()
    contributor_sql, params = _contributor_filter(contributor_id, legacy_names)
    cursor.execute(f'SELECT COUNT(*) FROM materials m {contributor_sql}', params)
    count = cursor.fetchone()[0]
    conn.close()
    return count


def get_all_materials(
    page: int = 1,
    page_size: int = 10,
    contributor_id: Optional[int] = None,
    legacy_names: Optional[Sequence[str]] = None,
) -> List[Material]:
    """获取所有物料（分页，page_size=0表示获取所有）"""
    conn = get_connection()
    cursor = conn.cursor()

    contributor_sql, params = _contributor_filter(contributor_id, legacy_names)
    query = f'''
        SELECT m.id, m.name, m.description, m.creator, m.resources
        FROM materials m
        {contributor_sql}
    '''
    if page_size > 0:
        offset = (page - 1) * page_size
        query += ' LIMIT ? OFFSET ?'
        params.extend([page_size, offset])
    cursor.execute(query, params)

    rows = cursor.fetchall()
    conn.close()

    return [_row_to_material(row) for row in rows]


def get_material_by_id(material_id: str) -> Optional[Material]:
    """根据ID获取物料"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, description, creator, resources FROM materials WHERE id = ?',
                   (material_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return _row_to_material(row)
    return None


def get_next_material_id() -> str:
    """生成下一个物料ID（自增）"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id FROM materials ORDER BY CAST(id AS INTEGER) DESC LIMIT 1')
    row = cursor.fetchone()
    conn.close()

    if row:
        return str(int(row[0]) + 1)
    return "0"


def create_material(
    material: Material,
    contributor_ids: Optional[Sequence[int]] = None,
) -> Material:
    """创建物料"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO materials (id, name, description, creator, resources)
        VALUES (?, ?, ?, ?, ?)
    ''', (material.id, material.name, material.description,
          json.dumps(material.creator), json.dumps(material.resources)))
    conn.commit()
    conn.close()
    if contributor_ids is not None:
        set_material_contributors(material.id, contributor_ids)
    return get_material_by_id(material.id) or material


def update_material(material_id: str, updates: dict) -> Optional[Material]:
    """更新物料"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in updates.items():
        if value is not None:
            if key == 'resources' or key == 'creator':
                fields.append(f"{key} = ?")
                values.append(json.dumps(value))
            else:
                fields.append(f"{key} = ?")
                values.append(value)

    if fields:
        values.append(material_id)
        cursor.execute(
            f"UPDATE materials SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()

    conn.close()
    return get_material_by_id(material_id)


def delete_material(material_id: str) -> bool:
    """删除物料"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        'DELETE FROM material_contributors WHERE material_id = ?', (material_id,)
    )
    cursor.execute('DELETE FROM materials WHERE id = ?', (material_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted
