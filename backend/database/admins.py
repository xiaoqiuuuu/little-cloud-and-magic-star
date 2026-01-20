"""管理员表相关的数据库操作"""

from .config import get_connection


def verify_admin(username: str, password: str) -> bool:
    """验证管理员"""
    conn = get_connection()
    cursor = conn.cursor()
    print(f"🔍 数据库查询 - 用户名: '{username}', 密码: '{password}'")
    cursor.execute('SELECT * FROM admins WHERE username = ? AND password = ?',
                   (username, password))
    result = cursor.fetchone()
    conn.close()
    print(f"📊 查询结果: {result}")
    return result is not None
