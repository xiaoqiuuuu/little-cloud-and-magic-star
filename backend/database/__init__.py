"""数据库操作模块 - 分模块管理不同的表"""

from .config import DATABASE_FILE, get_connection
from .questions import (
    get_questions_count,
    get_question_tag_counts,
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
from .admins import (
    count_active_super_admins,
    create_admin,
    delete_admin,
    get_admin_by_id,
    get_admin_by_username,
    increment_admin_token_version,
    list_admins,
    reset_admin_password,
    update_admin,
    verify_admin,
)
from .activities import (
    active_activity_contains_question,
    create_activity,
    delete_activity,
    end_activity,
    get_active_activity,
    get_active_activity_question_ids,
    get_active_activity_questions,
    get_activity,
    get_started_activity_using_question,
    increment_active_activity_stat,
    list_activities,
    pause_activity,
    start_activity,
    update_activity,
)
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
from .site_events import (
    activate_site_event,
    archive_site_event,
    create_site_event,
    delete_site_event,
    duplicate_site_event,
    get_current_site_event,
    get_public_site_event,
    get_site_event,
    list_site_events,
    update_site_event,
)

__all__ = [
    # 配置
    'DATABASE_FILE',
    'get_connection',
    # 初始化
    'init_db',
    # 题目相关
    'get_questions_count',
    'get_question_tag_counts',
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
    'get_admin_by_username',
    'get_admin_by_id',
    'list_admins',
    'create_admin',
    'update_admin',
    'reset_admin_password',
    'increment_admin_token_version',
    'delete_admin',
    'count_active_super_admins',
    # 答题活动相关
    'list_activities',
    'get_activity',
    'get_started_activity_using_question',
    'get_active_activity',
    'create_activity',
    'update_activity',
    'start_activity',
    'pause_activity',
    'end_activity',
    'delete_activity',
    'get_active_activity_question_ids',
    'get_active_activity_questions',
    'active_activity_contains_question',
    'increment_active_activity_stat',
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
    # 官网活动相关
    'list_site_events',
    'get_site_event',
    'get_public_site_event',
    'get_current_site_event',
    'create_site_event',
    'update_site_event',
    'duplicate_site_event',
    'activate_site_event',
    'archive_site_event',
    'delete_site_event',
]
from .configs import get_config, set_config
