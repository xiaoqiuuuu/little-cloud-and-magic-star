"""管理员表相关的数据库操作"""

from typing import Optional, Tuple
from .config import get_connection


def verify_admin(username: str, password: str) -> Optional[Tuple[str, str]]:
    """验证管理员，返回(用户名, 角色)或None"""
    conn = get_connection()
    cursor = conn.cursor()
    print(f"🔍 数据库查询 - 用户名: '{username}'")
    cursor.execute('SELECT username, role FROM admins WHERE username = ? AND password = ?',
                   (username, password))
    result = cursor.fetchone()
    conn.close()
    print(f"📊 查询结果: {result}")
    if result:
        return (result[0], result[1])  # (username, role)
    return None


def get_admin_by_username(username: str) -> Optional[Tuple[str, str]]:
    """根据用户名获取管理员信息"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT username, role FROM admins WHERE username = ?',
                   (username,))
    result = cursor.fetchone()
    conn.close()
    if result:
        return (result[0], result[1])
    return None
