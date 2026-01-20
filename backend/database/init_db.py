"""数据库初始化"""

import os
from .config import get_connection


def init_db():
    """初始化数据库，创建所有表"""
    conn = get_connection()
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
            hide_clicks INTEGER DEFAULT 0,
            author TEXT DEFAULT ""
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

    # 插入默认管理员账号（仅在开发环境）
    env = os.getenv('ENVIRONMENT', 'development')
    if env == 'development':
        cursor.execute('SELECT COUNT(*) FROM admins WHERE username = ?', ('admin',))
        if cursor.fetchone()[0] == 0:
            # 使用更安全的默认密码（开发环境）
            cursor.execute(
                'INSERT INTO admins (username, password) VALUES (?, ?)',
                ('admin', 'CloudStar@2026!')
            )
            print("✅ [开发环境] 已创建默认管理员账号: admin / CloudStar@2026!")
    else:
        print("ℹ️  [生产环境] 跳过默认管理员账号创建，请手动创建管理员")

    conn.commit()
    conn.close()
