"""题目表相关的数据库操作"""

import json
from typing import Dict, List, Optional, Sequence
from models import Question
from .config import get_connection
from .contributors import (
    get_question_contributors,
    resolve_contributors_by_names,
    set_question_contributors,
)


def _parse_author(raw_value: Optional[str]) -> List[str]:
    if not raw_value:
        return []
    try:
        parsed = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        parsed = raw_value
    values = parsed if isinstance(parsed, list) else [parsed]
    return [str(value) for value in values if str(value).strip()]


def _row_to_question(row) -> Question:
    legacy_author = _parse_author(row[7] if len(row) > 7 else None)
    contributors = get_question_contributors(row[0])
    if contributors:
        author = [contributor.display_name for contributor in contributors]
    else:
        author = legacy_author
        contributors = resolve_contributors_by_names(legacy_author)
    return Question(
        id=row[0],
        question=row[1],
        answer=row[2],
        resources=json.loads(row[3]) if row[3] else [],
        tag=row[4],
        random_clicks=row[5] if len(row) > 5 and row[5] is not None else 0,
        hide_clicks=row[6] if len(row) > 6 and row[6] is not None else 0,
        author=author,
        contributors=contributors,
        created_at=row[8] if len(row) > 8 else None,
        updated_at=row[9] if len(row) > 9 else None,
    )


def _contributor_filter(
    contributor_id: Optional[int],
    legacy_names: Optional[Sequence[str]],
) -> tuple[str, List[object]]:
    if contributor_id is None and not legacy_names:
        return "", []

    legacy_conditions: List[str] = []
    legacy_params: List[object] = []
    for name in dict.fromkeys(name.strip() for name in legacy_names or [] if name.strip()):
        legacy_conditions.extend([
            "LOWER(TRIM(q.author)) = LOWER(?)",
            "q.author LIKE ? COLLATE NOCASE",
        ])
        legacy_params.extend([name, f"%{json.dumps(name, ensure_ascii=False)}%"])
    legacy_sql = " OR ".join(legacy_conditions) if legacy_conditions else "0"
    if contributor_id is None:
        return f" AND ({legacy_sql}) ", legacy_params

    return (
        f"""
        AND (
            EXISTS (
                SELECT 1 FROM question_contributors qc
                WHERE qc.question_id = q.id AND qc.admin_id = ?
            )
            OR (
                NOT EXISTS (
                    SELECT 1 FROM question_contributors qc_any
                    WHERE qc_any.question_id = q.id
                )
                AND ({legacy_sql})
            )
        )
        """,
        [contributor_id, *legacy_params],
    )


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


def get_questions_count(
    keyword: Optional[str] = None,
    tag: Optional[str] = None,
    contributor_id: Optional[int] = None,
    legacy_names: Optional[Sequence[str]] = None,
) -> int:
    """获取题目总数（支持筛选）"""
    conn = get_connection()
    cursor = conn.cursor()
    query = 'SELECT COUNT(*) FROM questions q WHERE 1=1'
    params = []

    if tag and tag != 'all':
        query += ' AND tag = ?'
        params.append(tag)
    if keyword:
        query += ' AND (id LIKE ? OR question LIKE ? OR answer LIKE ?)'
        wildcard = f'%{keyword}%'
        params.extend([wildcard, wildcard, wildcard])
    contributor_sql, contributor_params = _contributor_filter(
        contributor_id, legacy_names
    )
    query += contributor_sql
    params.extend(contributor_params)

    cursor.execute(query, params)
    count = cursor.fetchone()[0]
    conn.close()
    return count


def get_question_tag_counts(
    contributor_id: Optional[int] = None,
    legacy_names: Optional[Sequence[str]] = None,
) -> Dict[str, int]:
    """按标签统计题目数量，题目管理员仅统计自己的题目。"""
    conn = get_connection()
    try:
        query = 'SELECT q.tag, COUNT(*) FROM questions q WHERE 1=1'
        params: List[object] = []
        contributor_sql, contributor_params = _contributor_filter(
            contributor_id, legacy_names
        )
        query += contributor_sql
        params.extend(contributor_params)
        query += ' GROUP BY q.tag ORDER BY q.tag ASC'
        rows = conn.execute(query, params).fetchall()
        return {row[0]: int(row[1]) for row in rows}
    finally:
        conn.close()


def get_all_question_ids(
    contributor_id: Optional[int] = None,
    legacy_names: Optional[Sequence[str]] = None,
) -> List[dict]:
    """获取所有题目的ID和Tag（轻量级）"""
    conn = get_connection()
    cursor = conn.cursor()

    query = 'SELECT q.id, q.tag FROM questions q WHERE 1=1'
    params: List[object] = []

    contributor_sql, contributor_params = _contributor_filter(
        contributor_id, legacy_names
    )
    query += contributor_sql
    params.extend(contributor_params)

    query += ' ORDER BY CAST(id AS INTEGER) ASC'
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [{"id": row[0], "tag": row[1]} for row in rows]


def get_all_questions(
    page: int = 1,
    page_size: int = 10,
    keyword: Optional[str] = None,
    tag: Optional[str] = None,
    sort_order: str = 'asc',
    contributor_id: Optional[int] = None,
    legacy_names: Optional[Sequence[str]] = None,
) -> List[Question]:
    """获取所有题目（分页，支持筛选，page_size=0表示获取所有）"""
    conn = get_connection()
    cursor = conn.cursor()

    query = '''
        SELECT id, question, answer, resources, tag, random_clicks,
               hide_clicks, author, created_at, updated_at
        FROM questions q WHERE 1=1
    '''
    params = []

    if tag and tag != 'all':
        query += ' AND tag = ?'
        params.append(tag)
    if keyword:
        query += ' AND (id LIKE ? OR question LIKE ? OR answer LIKE ?)'
        wildcard = f'%{keyword}%'
        params.extend([wildcard, wildcard, wildcard])
    contributor_sql, contributor_params = _contributor_filter(
        contributor_id, legacy_names
    )
    query += contributor_sql
    params.extend(contributor_params)

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

    return [_row_to_question(row) for row in rows]


def get_question_by_id(question_id: str) -> Optional[Question]:
    """根据ID获取题目"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, question, answer, resources, tag, random_clicks,
               hide_clicks, author, created_at, updated_at
        FROM questions WHERE id = ?
    ''', (question_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return _row_to_question(row)
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


def create_question(
    question: Question,
    contributor_ids: Optional[Sequence[int]] = None,
) -> Question:
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
    if contributor_ids is not None:
        set_question_contributors(question.id, contributor_ids)
    return get_question_by_id(question.id) or question


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
        fields.append("updated_at = CURRENT_TIMESTAMP")
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
        conn.execute(
            'DELETE FROM question_contributors WHERE question_id = ?',
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
