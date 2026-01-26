"""系统配置表相关的数据库操作"""

from typing import Optional
from .config import get_connection

def get_config(key: str, default_value: str = None) -> Optional[str]:
    """获取配置项"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT value FROM configs WHERE key = ?', (key,))
    result = cursor.fetchone()
    conn.close()
    
    if result:
        return result[0]
    return default_value

def set_config(key: str, value: str) -> bool:
    """设置配置项（如果不存在则插入，存在则更新）"""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO configs (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = ?
        ''', (key, value, value))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error setting config: {e}")
        return False
    finally:
        conn.close()
