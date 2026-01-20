"""数据库配置文件"""

import sqlite3
from typing import Any

DATABASE_FILE = "quiz.db"


def get_connection() -> sqlite3.Connection:
    """获取数据库连接"""
    return sqlite3.connect(DATABASE_FILE)
