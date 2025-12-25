import sqlite3
from models import Material
from models import Question
from models import Producer
from typing import List, Optional
import os
import json


def reset_question_stats(question_id: str) -> bool:
    """将指定题目的随机和隐藏点击次数归零"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE questions SET random_clicks = 0, hide_clicks = 0 WHERE id = ?',
        (question_id,))
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated


def reset_all_questions_stats() -> int:
    """将所有题目的随机和隐藏点击次数归零，返回受影响行数"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute('UPDATE questions SET random_clicks = 0, hide_clicks = 0')
    count = cursor.rowcount
    conn.commit()
    conn.close()
    return count


DATABASE_FILE = "quiz.db"


def init_db():
    """初始化数据库"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    # 创建题目表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS questions (
            id TEXT PRIMARY KEY,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            resources TEXT,
            tag TEXT NOT NULL,
            random_clicks INTEGER DEFAULT 0,
            hide_clicks INTEGER DEFAULT 0
        )
    ''')

    # 创建管理员表（默认管理员 admin/admin123）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')

    # 创建物料表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS materials (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            creator TEXT,
            resources TEXT
        )
    ''')

    # 创建制作人表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS producers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            profile_url TEXT
        )
    ''')

    # 检查并添加新列（如果表已存在但没有这些列）
    cursor.execute("PRAGMA table_info(questions)")
    columns = [column[1] for column in cursor.fetchall()]

    if 'random_clicks' not in columns:
        cursor.execute(
            'ALTER TABLE questions ADD COLUMN random_clicks INTEGER DEFAULT 0')

    if 'hide_clicks' not in columns:
        cursor.execute(
            'ALTER TABLE questions ADD COLUMN hide_clicks INTEGER DEFAULT 0')

    if 'author' not in columns:
        cursor.execute(
            'ALTER TABLE questions ADD COLUMN author TEXT DEFAULT ""')

    conn.commit()
    conn.close()

# 题目相关数据库操作


def get_questions_count(keyword: str = None, tag: str = None) -> int:
    """获取题目总数（支持筛选）"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    query = 'SELECT COUNT(*) FROM questions WHERE 1=1'
    params = []

    if tag and tag != 'all':
        query += ' AND tag = ?'
        params.append(tag)
    if keyword:
        query += ' AND (id LIKE ? OR question LIKE ? OR answer LIKE ?)'
        wildcard = f'%{keyword}%'
        params.extend([wildcard, wildcard, wildcard])

    cursor.execute(query, params)
    count = cursor.fetchone()[0]
    conn.close()
    return count


def get_all_question_ids() -> List[dict]:
    """获取所有题目的ID和Tag（轻量级）"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id, tag FROM questions ORDER BY CAST(id AS INTEGER) ASC')
    rows = cursor.fetchall()
    conn.close()
    return [{"id": row[0], "tag": row[1]} for row in rows]


def get_all_questions(page: int = 1, page_size: int = 10, keyword: str = None, tag: str = None, sort_order: str = 'asc') -> List[Question]:
    """获取所有题目（分页，支持筛选，page_size=0表示获取所有）"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    query = 'SELECT id, question, answer, resources, tag, random_clicks, hide_clicks, author FROM questions WHERE 1=1'
    params = []

    if tag and tag != 'all':
        query += ' AND tag = ?'
        params.append(tag)
    if keyword:
        query += ' AND (id LIKE ? OR question LIKE ? OR answer LIKE ?)'
        wildcard = f'%{keyword}%'
        params.extend([wildcard, wildcard, wildcard])

    # 确保分页顺序一致
    order = 'DESC' if sort_order.lower() == 'desc' else 'ASC'
    query += f' ORDER BY CAST(id AS INTEGER) {order}'

    if page_size > 0:
        query += ' LIMIT ? OFFSET ?'
        offset = (page - 1) * page_size
        params.extend([page_size, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    questions = []
    for row in rows:
        # 处理author字段：如果是旧数据（字符串），转换为列表
        author_data = row[7] if len(row) > 7 and row[7] else None
        if author_data:
            try:
                author = json.loads(author_data) if isinstance(author_data, str) and author_data.startswith(
                    '[') else [author_data] if author_data else []
            except:
                author = [author_data] if author_data else []
        else:
            author = []

        questions.append(Question(
            id=row[0],
            question=row[1],
            answer=row[2],
            resources=json.loads(row[3]) if row[3] else [],
            tag=row[4],
            random_clicks=row[5] if len(row) > 5 and row[5] is not None else 0,
            hide_clicks=row[6] if len(row) > 6 and row[6] is not None else 0,
            author=author
        ))
    return questions


def get_question_by_id(question_id: str) -> Optional[Question]:
    """根据ID获取题目"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT id, question, answer, resources, tag, random_clicks, hide_clicks, author FROM questions WHERE id = ?',
                   (question_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        # 处理author字段：如果是旧数据（字符串），转换为列表
        author_data = row[7] if len(row) > 7 and row[7] else None
        if author_data:
            try:
                author = json.loads(author_data) if isinstance(author_data, str) and author_data.startswith(
                    '[') else [author_data] if author_data else []
            except:
                author = [author_data] if author_data else []
        else:
            author = []

        return Question(
            id=row[0],
            question=row[1],
            answer=row[2],
            resources=json.loads(row[3]) if row[3] else [],
            tag=row[4],
            random_clicks=row[5] if len(row) > 5 and row[5] is not None else 0,
            hide_clicks=row[6] if len(row) > 6 and row[6] is not None else 0,
            author=author
        )
    return None


def get_next_question_id() -> str:
    """获取下一个题目ID（自增）"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT MAX(CAST(id AS INTEGER)) FROM questions')
    result = cursor.fetchone()
    conn.close()

    if result[0] is None:
        return "0"
    return str(int(result[0]) + 1)


def create_question(question: Question) -> Question:
    """创建题目"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO questions (id, question, answer, resources, tag, author)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (question.id, question.question, question.answer,
          json.dumps(question.resources), question.tag, json.dumps(question.author)))
    conn.commit()
    conn.close()
    return question


def update_question(question_id: str, updates: dict) -> Optional[Question]:
    """更新题目"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    # 构建更新语句
    fields = []
    values = []
    for key, value in updates.items():
        if value is not None:
            if key == 'resources' or key == 'author':
                fields.append(f"{key} = ?")
                values.append(json.dumps(value))
            else:
                fields.append(f"{key} = ?")
                values.append(value)

    if fields:
        values.append(question_id)
        cursor.execute(
            f"UPDATE questions SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()

    conn.close()
    return get_question_by_id(question_id)


def delete_question(question_id: str) -> bool:
    """删除题目"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM questions WHERE id = ?', (question_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def increment_random_clicks(question_id: str) -> bool:
    """增加随机点击次数"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE questions SET random_clicks = random_clicks + 1 WHERE id = ?',
        (question_id,))
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated


def increment_hide_clicks(question_id: str) -> bool:
    """增加隐藏点击次数"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE questions SET hide_clicks = hide_clicks + 1 WHERE id = ?',
        (question_id,))
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated


# 管理员相关数据库操作


def verify_admin(username: str, password: str) -> bool:
    """验证管理员"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM admins WHERE username = ? AND password = ?',
                   (username, password))
    result = cursor.fetchone()
    conn.close()
    return result is not None


# 物料相关数据库操作

def get_materials_count() -> int:
    """获取物料总数"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM materials')
    count = cursor.fetchone()[0]
    conn.close()
    return count


def get_all_materials(page: int = 1, page_size: int = 10) -> List[Material]:
    """获取所有物料（分页，page_size=0表示获取所有）"""
    conn = sqlite3.connect(DATABASE_FILE)
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
    conn = sqlite3.connect(DATABASE_FILE)
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
    conn = sqlite3.connect(DATABASE_FILE)
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
    conn = sqlite3.connect(DATABASE_FILE)
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
    conn = sqlite3.connect(DATABASE_FILE)
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
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM materials WHERE id = ?', (material_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

# 制作人相关数据库操作


def get_producers_count() -> int:
    """获取制作人总数"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM producers')
    count = cursor.fetchone()[0]
    conn.close()
    return count


def get_all_producers(page: int = 1, page_size: int = 20) -> List[Producer]:
    """获取所有制作人（支持分页，page_size=0表示获取所有）"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    if page_size > 0:
        offset = (page - 1) * page_size
        cursor.execute(
            'SELECT id, name, profile_url FROM producers ORDER BY id DESC LIMIT ? OFFSET ?',
            (page_size, offset))
    else:
        cursor.execute(
            'SELECT id, name, profile_url FROM producers ORDER BY id DESC')

    rows = cursor.fetchall()
    conn.close()
    return [Producer(id=row[0], name=row[1], profile_url=row[2]) for row in rows]


def get_producer_by_id(producer_id: int) -> Optional[Producer]:
    """根据ID获取制作人"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id, name, profile_url FROM producers WHERE id = ?', (producer_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return Producer(id=row[0], name=row[1], profile_url=row[2])
    return None


def create_producer(name: str, profile_url: Optional[str]) -> Producer:
    """创建制作人"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO producers (name, profile_url) VALUES (?, ?)', (name, profile_url))
    producer_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return Producer(id=producer_id, name=name, profile_url=profile_url)


def update_producer(producer_id: int, updates: dict) -> Optional[Producer]:
    """更新制作人"""
    conn = sqlite3.connect(DATABASE_FILE)
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
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM producers WHERE id = ?', (producer_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def delete_material(material_id: str) -> bool:
    """删除物料"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM materials WHERE id = ?', (material_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted
