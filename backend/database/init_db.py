"""数据库初始化"""

from .config import get_connection
from passwords import hash_password, is_password_hash


def init_db():
    """初始化数据库，创建所有表"""
    conn = get_connection()
    cursor = conn.cursor()

    # Create page visits table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS page_visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            visit_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            referrer TEXT,
            user_agent TEXT
        )
    ''')

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

    # 创建管理员表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'question_admin' CHECK(role IN ('super_admin', 'question_admin')),
            is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
            token_version INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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

    # 创建角色表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            desc TEXT NOT NULL,
            skill TEXT,
            camp TEXT NOT NULL,
            identity TEXT NOT NULL,
            color TEXT NOT NULL,
            skillDetails TEXT,
            image_url TEXT
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

    # 检查并添加管理员新列（如果表已存在但没有这些列）
    cursor.execute("PRAGMA table_info(admins)")
    admin_columns = [column[1] for column in cursor.fetchall()]

    if 'role' not in admin_columns:
        cursor.execute(
            'ALTER TABLE admins ADD COLUMN role TEXT DEFAULT "question_admin"')

    if 'is_active' not in admin_columns:
        cursor.execute(
            'ALTER TABLE admins ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1')

    if 'token_version' not in admin_columns:
        cursor.execute(
            'ALTER TABLE admins ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0')

    if 'created_at' not in admin_columns:
        cursor.execute('ALTER TABLE admins ADD COLUMN created_at TEXT')

    if 'updated_at' not in admin_columns:
        cursor.execute('ALTER TABLE admins ADD COLUMN updated_at TEXT')

    cursor.execute('''
        UPDATE admins
        SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
            updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
    ''')

    # 将历史明文密码一次性迁移为不可逆哈希。
    cursor.execute('SELECT id, password FROM admins')
    for admin_id, stored_password in cursor.fetchall():
        if not is_password_hash(stored_password):
            cursor.execute(
                'UPDATE admins SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (hash_password(stored_password), admin_id),
            )

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admin_refresh_tokens (
            jti TEXT PRIMARY KEY,
            admin_id INTEGER NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            revoked_at TEXT,
            replaced_by TEXT
        )
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_admin_refresh_tokens_admin_id
        ON admin_refresh_tokens(admin_id)
    ''')

    # 创建系统配置表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS configs (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    ''')

    # 初始化配置项（如果不存在）
    cursor.execute('INSERT OR IGNORE INTO configs (key, value) VALUES (?, ?)', 
                  ('COUNTDOWN_SECONDS', '60'))

    conn.commit()
    conn.close()
