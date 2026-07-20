"""制作人表相关的数据库操作"""

from typing import List, Optional
from models import Producer
from .config import get_connection


def get_producers_count() -> int:
    """获取制作人总数"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM producers')
    count = cursor.fetchone()[0]
    conn.close()
    return count


def get_all_producers(page: int = 1, page_size: int = 20) -> List[Producer]:
    """获取所有制作人（支持分页，page_size=0表示获取所有）"""
    conn = get_connection()
    cursor = conn.cursor()

    if page_size > 0:
        offset = (page - 1) * page_size
        cursor.execute(
            '''
            SELECT p.id, p.name, p.profile_url, a.id, a.username
            FROM producers p
            LEFT JOIN admins a ON a.legacy_producer_id = p.id
            ORDER BY p.id DESC LIMIT ? OFFSET ?
            ''',
            (page_size, offset))
    else:
        cursor.execute(
            '''
            SELECT p.id, p.name, p.profile_url, a.id, a.username
            FROM producers p
            LEFT JOIN admins a ON a.legacy_producer_id = p.id
            ORDER BY p.id DESC
            ''')

    rows = cursor.fetchall()
    conn.close()
    return [
        Producer(
            id=row[0],
            name=row[1],
            profile_url=row[2],
            bound_admin_id=row[3],
            bound_username=row[4],
        )
        for row in rows
    ]


def get_producer_by_id(producer_id: int) -> Optional[Producer]:
    """根据ID获取制作人"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        '''
        SELECT p.id, p.name, p.profile_url, a.id, a.username
        FROM producers p
        LEFT JOIN admins a ON a.legacy_producer_id = p.id
        WHERE p.id = ?
        ''', (producer_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return Producer(
            id=row[0],
            name=row[1],
            profile_url=row[2],
            bound_admin_id=row[3],
            bound_username=row[4],
        )
    return None


def get_producer_by_name(name: str) -> Optional[Producer]:
    """根据名称获取制作人"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        '''
        SELECT p.id, p.name, p.profile_url, a.id, a.username
        FROM producers p
        LEFT JOIN admins a ON a.legacy_producer_id = p.id
        WHERE p.name = ?
        ''', (name,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return Producer(
            id=row[0],
            name=row[1],
            profile_url=row[2],
            bound_admin_id=row[3],
            bound_username=row[4],
        )
    return None


def get_or_create_producer(name: str) -> Producer:
    """根据名称获取制作人，如果不存在则创建"""
    # 先尝试获取
    producer = get_producer_by_name(name)
    if producer:
        return producer
    
    # 不存在则创建
    return create_producer(name, None)


def create_producer(name: str, profile_url: Optional[str]) -> Producer:
    """创建制作人"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO producers (name, profile_url) VALUES (?, ?)', (name, profile_url))
    producer_id = cursor.lastrowid
    conn.commit()
    conn.close()
    if producer_id is None:
        raise ValueError("无法创建制作人")
    return Producer(id=producer_id, name=name, profile_url=profile_url)


def update_producer(producer_id: int, updates: dict) -> Optional[Producer]:
    """更新制作人"""
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in updates.items():
        if value is not None:
            fields.append(f"{key} = ?")
            values.append(value)

    if fields:
        values.append(producer_id)
        cursor.execute(
            f"UPDATE producers SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()

    conn.close()
    return get_producer_by_id(producer_id)


def delete_producer(producer_id: int) -> bool:
    """删除制作人"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM producers WHERE id = ?', (producer_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted
