"""数据库配置文件"""

import os
import sqlite3
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent
load_dotenv(PROJECT_ROOT / ".env")

# 本地默认使用 backend/quiz.db；生产环境通过根目录 .env 显式指定绝对路径。
DATABASE_FILE = os.getenv("DATABASE_FILE", str(BACKEND_DIR / "quiz.db"))


def get_connection() -> sqlite3.Connection:
    """获取数据库连接"""
    return sqlite3.connect(DATABASE_FILE)
