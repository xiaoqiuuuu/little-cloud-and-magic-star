"""物料表相关的数据库操作"""

import json
from typing import List, Optional
from models import Material
from .config import get_connection


def get_materials_count() -> int:
    """获取物料总数"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM materials')
    count = cursor.fetchone()[0]
    conn.close()
    return count


def get_all_materials(page: int = 1, page_size: int = 10) -> List[Material]:
    """获取所有物料（分页，page_size=0表示获取所有）"""
    conn = get_connection()
    cursor = conn.cursor()

    if page_size > 0:
        offset = (page - 1) * page_size
        cursor.execute(
            'SELECT id, name, description, creator, resources FROM materials LIMIT ? OFFSET ?',
            (page_size, offset))
    else:
        cursor.execute(
            'SELECT id, name, description, creator, resources FROM materials')

    rows = cursor.fetchall()
    conn.close()

    materials = []
    for row in rows:
        # 处理creator字段：如果是旧数据（字符串），转换为列表
        creator_data = row[3] if row[3] else None
        if creator_data:
            try:
                creator = json.loads(creator_data) if isinstance(creator_data, str) and creator_data.startswith(
                    '[') else [creator_data] if creator_data else []
            except:
                creator = [creator_data] if creator_data else []
        else:
            creator = []

        materials.append(Material(
            id=row[0],
            name=row[1],
            description=row[2] or "",
            creator=creator,
            resources=json.loads(row[4]) if row[4] else []
        ))
    return materials


def get_material_by_id(material_id: str) -> Optional[Material]:
    """根据ID获取物料"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, description, creator, resources FROM materials WHERE id = ?',
                   (material_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        # 处理creator字段：如果是旧数据（字符串），转换为列表
        creator_data = row[3] if row[3] else None
        if creator_data:
            try:
                creator = json.loads(creator_data) if isinstance(creator_data, str) and creator_data.startswith(
                    '[') else [creator_data] if creator_data else []
            except:
                creator = [creator_data] if creator_data else []
        else:
            creator = []

        return Material(
            id=row[0],
            name=row[1],
            description=row[2] or "",
            creator=creator,
            resources=json.loads(row[4]) if row[4] else []
        )
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


def create_material(material: Material) -> Material:
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
    return material


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
    cursor.execute('DELETE FROM materials WHERE id = ?', (material_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted
