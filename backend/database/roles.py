"""角色表相关的数据库操作"""

import json
from typing import List, Optional
from models import Role, RoleCreate, RoleUpdate, RoleSkillDetail
from .config import get_connection

def get_all_roles() -> List[Role]:
    """获取所有角色"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM roles ORDER BY id ASC')
    rows = cursor.fetchall()
    roles = []
    for row in rows:
        skill_details_json = row[7] if row[7] else "[]"
        try:
            skill_details_data = json.loads(skill_details_json)
            skill_details = [RoleSkillDetail(**item) for item in skill_details_data]
        except:
            skill_details = []

        roles.append(Role(
            id=row[0],
            name=row[1],
            desc=row[2],
            skill=row[3],
            camp=row[4],
            identity=row[5],
            color=row[6],
            skillDetails=skill_details,
            image_url=row[8]
        ))
    conn.close()
    return roles

def get_role(role_id: int) -> Optional[Role]:
    """获取指定角色"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM roles WHERE id = ?', (role_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        skill_details_json = row[7] if row[7] else "[]"
        try:
            skill_details_data = json.loads(skill_details_json)
            skill_details = [RoleSkillDetail(**item) for item in skill_details_data]
        except:
            skill_details = []

        return Role(
            id=row[0],
            name=row[1],
            desc=row[2],
            skill=row[3],
            camp=row[4],
            identity=row[5],
            color=row[6],
            skillDetails=skill_details,
            image_url=row[8]
        )
    return None

def create_role(role: RoleCreate) -> int:
    """创建角色"""
    conn = get_connection()
    cursor = conn.cursor()
    
    skill_details_json = json.dumps([item.dict() for item in role.skillDetails], ensure_ascii=False)
    
    cursor.execute(
        'INSERT INTO roles (name, desc, skill, camp, identity, color, skillDetails, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        (role.name, role.desc, role.skill, role.camp, role.identity, role.color, skill_details_json, role.image_url)
    )
    role_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return role_id or 0

def update_role(role_id: int, role: RoleUpdate) -> bool:
    """更新角色"""
    conn = get_connection()
    cursor = conn.cursor()
    
    fields = []
    values = []
    
    if role.name is not None:
        fields.append("name = ?")
        values.append(role.name)
    if role.desc is not None:
        fields.append("desc = ?")
        values.append(role.desc)
    if role.skill is not None:
        fields.append("skill = ?")
        values.append(role.skill)
    if role.camp is not None:
        fields.append("camp = ?")
        values.append(role.camp)
    if role.identity is not None:
        fields.append("identity = ?")
        values.append(role.identity)
    if role.color is not None:
        fields.append("color = ?")
        values.append(role.color)
    if role.skillDetails is not None:
        fields.append("skillDetails = ?")
        values.append(json.dumps([item.dict() for item in role.skillDetails], ensure_ascii=False))
    if role.image_url is not None:
        fields.append("image_url = ?")
        values.append(role.image_url)
        
    if not fields:
        return False
        
    values.append(role_id)
    query = f"UPDATE roles SET {', '.join(fields)} WHERE id = ?"
    cursor.execute(query, values)
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated

def delete_role(role_id: int) -> bool:
    """删除角色"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM roles WHERE id = ?', (role_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted
