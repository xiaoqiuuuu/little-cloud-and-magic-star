"""数据库操作模块 - 分模块管理不同的表"""

from .config import DATABASE_FILE, get_connection
from .questions import (
    get_questions_count,
    get_all_question_ids,
    get_all_questions,
    get_question_by_id,
    check_duplicate_question,
    get_next_question_id,
    create_question,
    update_question,
    delete_question,
    increment_random_clicks,
    increment_hide_clicks,
    reset_question_stats,
    reset_all_questions_stats
)
from .admins import verify_admin
from .materials import (
    get_materials_count,
    get_all_materials,
    get_material_by_id,
    get_next_material_id,
    create_material,
    update_material,
    delete_material
)
from .producers import (
    get_producers_count,
    get_all_producers,
    get_producer_by_id,
    create_producer,
    update_producer,
    delete_producer
)
from .init_db import init_db

__all__ = [
    # 配置
    'DATABASE_FILE',
    'get_connection',
    # 初始化
    'init_db',
    # 题目相关
    'get_questions_count',
    'get_all_question_ids',
    'get_all_questions',
    'get_question_by_id',
    'get_next_question_id',
    'create_question',
    'update_question',
    'delete_question',
    'increment_random_clicks',
    'increment_hide_clicks',
    'reset_question_stats',
    'reset_all_questions_stats',
    # 管理员相关
    'verify_admin',
    # 物料相关
    'get_materials_count',
    'get_all_materials',
    'get_material_by_id',
    'get_next_material_id',
    'create_material',
    'update_material',
    'delete_material',
    # 制作人相关
    'get_producers_count',
    'get_all_producers',
    'get_producer_by_id',
    'create_producer',
    'update_producer',
    'delete_producer',
]
