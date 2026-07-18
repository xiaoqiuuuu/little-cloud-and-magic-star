"""题目表相关的数据库操作"""

import json
from typing import List, Optional
from models import Question
from .config import get_connection


def reset_question_stats(question_id: str) -> bool:
    """将指定题目的随机和隐藏点击次数归零"""
    conn = get_connection()
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
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE questions SET random_clicks = 0, hide_clicks = 0')
    count = cursor.rowcount
    conn.commit()
    conn.close()
    return count


def get_questions_count(keyword: Optional[str] = None, tag: Optional[str] = None, author: Optional[str] = None) -> int:
    """获取题目总数（支持筛选）"""
    conn = get_connection()
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
    if author:
        # 题目管理员只能看到自己创建的题目
        query += ' AND author LIKE ?'
        params.append(f'%{author}%')

    cursor.execute(query, params)
    count = cursor.fetchone()[0]
    conn.close()
    return count


def get_all_question_ids(author: Optional[str] = None) -> List[dict]:
    """获取所有题目的ID和Tag（轻量级）"""
    conn = get_connection()
    cursor = conn.cursor()

    query = 'SELECT id, tag FROM questions WHERE 1=1'
    params = []

    if author:
        # 作者筛选：使用 JSON 数组包含该作者
        query += ' AND author LIKE ?'
        params.append(f'%{author}%')

    query += ' ORDER BY CAST(id AS INTEGER) ASC'
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [{"id": row[0], "tag": row[1]} for row in rows]


def get_all_questions(page: int = 1, page_size: int = 10, keyword: Optional[str] = None, tag: Optional[str] = None, sort_order: str = 'asc', author: Optional[str] = None) -> List[Question]:
    """获取所有题目（分页，支持筛选，page_size=0表示获取所有）"""
    conn = get_connection()
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
    if author:
        # 题目管理员只能看到自己创建的题目
        query += ' AND author LIKE ?'
        params.append(f'%{author}%')

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
    conn = get_connection()
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


def check_duplicate_question(question: str, answer: str) -> Optional[str]:
    """检查是否存在相同题目和答案的题目，返回题目ID或None
    题目需完全匹配，答案不区分大小写"""
    conn = get_connection()
    cursor = conn.cursor()
    # 使用 LOWER() 函数进行不区分大小写的比较
    cursor.execute(
        'SELECT id FROM questions WHERE question = ? AND LOWER(answer) = LOWER(?)',
        (question, answer)
    )
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None


def get_next_question_id() -> str:
    """获取下一个题目ID，避免复用仍被历史活动引用的ID。"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT MAX(numeric_id) FROM (
            SELECT CAST(id AS INTEGER) AS numeric_id FROM questions
            UNION ALL
            SELECT CAST(question_id AS INTEGER) AS numeric_id
            FROM quiz_activity_questions
        )
    ''')
    result = cursor.fetchone()
    conn.close()

    if result[0] is None:
        return "0"
    return str(int(result[0]) + 1)


def create_question(question: Question) -> Question:
    """创建题目"""
    conn = get_connection()
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
    conn = get_connection()
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
    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        draft_rows = conn.execute(
            """
            SELECT DISTINCT aq.activity_id
            FROM quiz_activity_questions aq
            JOIN quiz_activities a ON a.id = aq.activity_id
            WHERE aq.question_id = ? AND a.status = 'draft'
            """,
            (question_id,),
        ).fetchall()
        draft_activity_ids = [int(row[0]) for row in draft_rows]
        conn.execute(
            """
            DELETE FROM quiz_activity_questions
            WHERE question_id = ? AND activity_id IN (
                SELECT id FROM quiz_activities WHERE status = 'draft'
            )
            """,
            (question_id,),
        )
        if draft_activity_ids:
            placeholders = ",".join("?" for _ in draft_activity_ids)
            conn.execute(
                f"""
                UPDATE quiz_activities
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id IN ({placeholders})
                """,
                draft_activity_ids,
            )

        cursor = conn.execute('DELETE FROM questions WHERE id = ?', (question_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        return deleted
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def increment_random_clicks(question_id: str) -> bool:
    """增加随机点击次数"""
    conn = get_connection()
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
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE questions SET hide_clicks = hide_clicks + 1 WHERE id = ?',
        (question_id,))
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated
