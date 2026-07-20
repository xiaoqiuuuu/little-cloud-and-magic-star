"""数据库初始化"""

import json
import os

from .config import get_connection
from .stats import backfill_page_visit_dimensions
from .site_events import DEFAULT_SITE_EVENT
from passwords import hash_password, is_password_hash


DEFAULT_EMPTY_QUESTION_OWNER = "fylgcyzlm"


def _parse_legacy_names(raw_value):
    if not raw_value:
        return []
    try:
        parsed = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        parsed = raw_value
    values = parsed if isinstance(parsed, list) else [parsed]
    return [str(value).strip() for value in values if str(value).strip()]


def _backfill_account_contributors(cursor):
    """
    生产旧数据中题目出题人使用账号 username，因此可以精确回填账号关系。
    物料只回填能精确匹配 username 的历史值，不猜测其他署名。
    """
    admin_rows = cursor.execute(
        """
        SELECT id, username
        FROM admins
        WHERE role IN ('super_admin', 'question_admin')
        """
    ).fetchall()
    admin_matches = {}
    for admin_id, username in admin_rows:
        admin_matches.setdefault(username.strip().casefold(), []).append(int(admin_id))

    fallback_matches = admin_matches.get(DEFAULT_EMPTY_QUESTION_OWNER.casefold(), [])
    fallback_admin_id = fallback_matches[0] if len(fallback_matches) == 1 else None
    missing_fallback_count = 0

    for question_id, raw_author in cursor.execute(
        """
        SELECT q.id, q.author
        FROM questions q
        WHERE NOT EXISTS (
            SELECT 1 FROM question_contributors qc WHERE qc.question_id = q.id
        )
        """
    ).fetchall():
        names = _parse_legacy_names(raw_author)
        if not names:
            if fallback_admin_id is None:
                missing_fallback_count += 1
                continue
            names = [DEFAULT_EMPTY_QUESTION_OWNER]
            cursor.execute(
                "UPDATE questions SET author = ? WHERE id = ?",
                (json.dumps(names, ensure_ascii=False), question_id),
            )
        for position, name in enumerate(names):
            matches = admin_matches.get(name.casefold(), [])
            if len(matches) == 1:
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO question_contributors
                        (question_id, admin_id, position)
                    VALUES (?, ?, ?)
                    """,
                    (question_id, matches[0], position),
                )

    for material_id, raw_creator in cursor.execute(
        """
        SELECT m.id, m.creator
        FROM materials m
        WHERE NOT EXISTS (
            SELECT 1 FROM material_contributors mc WHERE mc.material_id = m.id
        )
        """
    ).fetchall():
        for position, name in enumerate(_parse_legacy_names(raw_creator)):
            matches = admin_matches.get(name.casefold(), [])
            if len(matches) == 1:
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO material_contributors
                        (material_id, admin_id, position)
                    VALUES (?, ?, ?)
                    """,
                    (material_id, matches[0], position),
                )

    if missing_fallback_count and os.getenv("ENVIRONMENT") == "production":
        print(
            f"WARNING: {missing_fallback_count} questions have no author, but "
            f"account '{DEFAULT_EMPTY_QUESTION_OWNER}' was not found uniquely; "
            "their ownership was left unchanged."
        )


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
            user_agent TEXT,
            path TEXT NOT NULL DEFAULT '/',
            visitor_key TEXT,
            session_key TEXT,
            source TEXT,
            device_type TEXT,
            browser TEXT,
            operating_system TEXT
        )
    ''')
    cursor.execute("PRAGMA table_info(page_visits)")
    visit_columns = {column[1] for column in cursor.fetchall()}
    visit_migrations = {
        "path": "TEXT NOT NULL DEFAULT '/'",
        "visitor_key": "TEXT",
        "session_key": "TEXT",
        "source": "TEXT",
        "device_type": "TEXT",
        "browser": "TEXT",
        "operating_system": "TEXT",
    }
    for column_name, definition in visit_migrations.items():
        if column_name not in visit_columns:
            cursor.execute(
                f"ALTER TABLE page_visits ADD COLUMN {column_name} {definition}"
            )
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_page_visits_time
        ON page_visits(visit_time)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_page_visits_session_path_time
        ON page_visits(session_key, path, visit_time)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_page_visits_visitor
        ON page_visits(visitor_key)
    ''')
    backfill_page_visit_dimensions(cursor)

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
            author TEXT DEFAULT "",
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 创建管理员表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'question_admin' CHECK(role IN ('super_admin', 'question_admin', 'quiz_operator')),
            is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
            token_version INTEGER NOT NULL DEFAULT 0,
            display_name TEXT,
            profile_url TEXT,
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

    # 制作人已由账号贡献关系取代，部署迁移时永久删除历史表。
    cursor.execute('DROP TABLE IF EXISTS producers')

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

    if 'created_at' not in columns:
        cursor.execute('ALTER TABLE questions ADD COLUMN created_at TEXT')

    if 'updated_at' not in columns:
        cursor.execute('ALTER TABLE questions ADD COLUMN updated_at TEXT')

    cursor.execute('''
        UPDATE questions
        SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
            updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
    ''')

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

    if 'display_name' not in admin_columns:
        cursor.execute('ALTER TABLE admins ADD COLUMN display_name TEXT')

    if 'profile_url' not in admin_columns:
        cursor.execute('ALTER TABLE admins ADD COLUMN profile_url TEXT')

    if 'created_at' not in admin_columns:
        cursor.execute('ALTER TABLE admins ADD COLUMN created_at TEXT')

    if 'updated_at' not in admin_columns:
        cursor.execute('ALTER TABLE admins ADD COLUMN updated_at TEXT')

    cursor.execute('''
        UPDATE admins
        SET display_name = COALESCE(NULLIF(TRIM(display_name), ''), username),
            created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
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

    # SQLite 不能直接修改 CHECK 约束；重建上一版本的双角色表以加入答题人员。
    cursor.execute(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'admins'"
    )
    admins_sql = (cursor.fetchone() or [""])[0] or ""
    if "CHECK" in admins_sql.upper() and "quiz_operator" not in admins_sql:
        cursor.execute('ALTER TABLE admins RENAME TO admins_legacy_roles')
        cursor.execute('''
            CREATE TABLE admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'question_admin'
                    CHECK(role IN ('super_admin', 'question_admin', 'quiz_operator')),
                is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
                token_version INTEGER NOT NULL DEFAULT 0,
                display_name TEXT,
                profile_url TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            INSERT INTO admins (
                id, username, password, role, is_active,
                token_version, display_name, profile_url,
                created_at, updated_at
            )
            SELECT
                id, username, password, role, is_active,
                token_version, display_name, profile_url,
                created_at, updated_at
            FROM admins_legacy_roles
        ''')
        cursor.execute('DROP TABLE admins_legacy_roles')

    # 题目和物料直接绑定账号。旧的 author/creator 字段保留作为回滚兼容数据。
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS question_contributors (
            question_id TEXT NOT NULL,
            admin_id INTEGER NOT NULL,
            position INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (question_id, admin_id)
        )
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_question_contributors_admin
        ON question_contributors(admin_id, question_id)
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS material_contributors (
            material_id TEXT NOT NULL,
            admin_id INTEGER NOT NULL,
            position INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (material_id, admin_id)
        )
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_material_contributors_admin
        ON material_contributors(admin_id, material_id)
    ''')
    _backfill_account_contributors(cursor)

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

    # 答题活动：同一时间只允许一个进行中的活动。
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS quiz_activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'draft'
                CHECK(status IN ('draft', 'active', 'paused', 'ended')),
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            started_at TEXT,
            ended_at TEXT
        )
    ''')
    cursor.execute('''
        CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_activities_single_active
        ON quiz_activities(status)
        WHERE status = 'active'
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS quiz_activity_questions (
            activity_id INTEGER NOT NULL,
            question_id TEXT NOT NULL,
            position INTEGER NOT NULL DEFAULT 0,
            question_snapshot TEXT NOT NULL,
            tag_snapshot TEXT NOT NULL,
            random_clicks INTEGER NOT NULL DEFAULT 0,
            hide_clicks INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (activity_id, question_id)
        )
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_quiz_activity_questions_question
        ON quiz_activity_questions(question_id)
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

    # 官网活动：首页只指向一个当前活动，旧活动保留固定 URL。
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS site_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            date_label TEXT NOT NULL DEFAULT '',
            location TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'draft'
                CHECK(status IN ('draft', 'published', 'archived')),
            is_current INTEGER NOT NULL DEFAULT 0 CHECK(is_current IN (0, 1)),
            content TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            published_at TEXT
        )
    ''')
    cursor.execute('''
        CREATE UNIQUE INDEX IF NOT EXISTS idx_site_events_single_current
        ON site_events(is_current)
        WHERE is_current = 1
    ''')
    cursor.execute('''
        INSERT OR IGNORE INTO site_events (
            slug, name, date_label, location, status, is_current,
            content, created_by, published_at
        ) VALUES (?, ?, ?, ?, 'published', 1, ?, 'system', CURRENT_TIMESTAMP)
    ''', (
        DEFAULT_SITE_EVENT['slug'],
        DEFAULT_SITE_EVENT['name'],
        DEFAULT_SITE_EVENT['date_label'],
        DEFAULT_SITE_EVENT['location'],
        json.dumps(DEFAULT_SITE_EVENT['content'], ensure_ascii=False),
    ))

    conn.commit()
    conn.close()
