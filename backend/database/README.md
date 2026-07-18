# Database 模块说明

## 目录结构

```
database/
├── __init__.py          # 模块初始化，导出所有公共接口
├── config.py            # 数据库配置（DATABASE_FILE, get_connection）
├── init_db.py           # 数据库初始化（创建所有表）
├── questions.py         # 题目表相关操作
├── admins.py            # 管理员表相关操作
├── tokens.py            # Refresh Token 轮换与撤销状态
├── materials.py         # 物料表相关操作
└── producers.py         # 制作人表相关操作
```

## 使用方式

从 `database` 包导入需要的函数：

```python
from database import (
    init_db,
    get_all_questions,
    create_question,
    get_all_materials,
    create_material,
    # ... 其他函数
)
```

## 各文件说明

### config.py
- `DATABASE_FILE`: 数据库文件名
- `get_connection()`: 获取数据库连接

### init_db.py
- `init_db()`: 初始化所有数据库表

### questions.py（题目表）
- `get_questions_count()`: 获取题目总数
- `get_all_question_ids()`: 获取所有题目ID
- `get_all_questions()`: 获取所有题目（支持分页和筛选）
- `get_question_by_id()`: 根据ID获取题目
- `get_next_question_id()`: 获取下一个题目ID
- `create_question()`: 创建题目
- `update_question()`: 更新题目
- `delete_question()`: 删除题目
- `increment_random_clicks()`: 增加随机点击次数
- `increment_hide_clicks()`: 增加隐藏点击次数
- `reset_question_stats()`: 重置指定题目统计
- `reset_all_questions_stats()`: 重置所有题目统计

### admins.py（管理员表）
- `verify_admin()`: 验证管理员账号密码
- `list_admins()` / `create_admin()` / `update_admin()`: 人员管理 CRUD
- `reset_admin_password()`: 重置哈希密码并使旧 Token 失效
- `increment_admin_token_version()`: 注销账号现有 JWT

### tokens.py（Refresh Token 表）
- `create_refresh_token()`: 登记登录时签发的 Refresh Token
- `rotate_refresh_token()`: 原子消费旧 Token 并登记新 Token
- `revoke_all_refresh_tokens()`: 撤销账号全部 Refresh Token

### materials.py（物料表）
- `get_materials_count()`: 获取物料总数
- `get_all_materials()`: 获取所有物料（支持分页）
- `get_material_by_id()`: 根据ID获取物料
- `get_next_material_id()`: 获取下一个物料ID
- `create_material()`: 创建物料
- `update_material()`: 更新物料
- `delete_material()`: 删除物料

### producers.py（制作人表）
- `get_producers_count()`: 获取制作人总数
- `get_all_producers()`: 获取所有制作人（支持分页）
- `get_producer_by_id()`: 根据ID获取制作人
- `create_producer()`: 创建制作人
- `update_producer()`: 更新制作人
- `delete_producer()`: 删除制作人

## 添加新表

当需要添加新表时，按以下步骤操作：

1. 在 `database/` 目录下创建新的 Python 文件（例如 `new_table.py`）
2. 在新文件中实现表的所有操作函数
3. 在 `init_db.py` 的 `init_db()` 函数中添加表的创建语句
4. 在 `__init__.py` 中导入并导出新表的函数

示例：

```python
# database/new_table.py
from typing import List, Optional
from models import NewModel
from .config import get_connection

def get_all_items() -> List[NewModel]:
    """获取所有记录"""
    conn = get_connection()
    cursor = conn.cursor()
    # ... SQL 操作
    conn.close()
    return items
```

然后在 `__init__.py` 中添加：

```python
from .new_table import get_all_items

__all__ = [
    # ... 现有导出
    'get_all_items',
]
```

## 优势

1. **模块化**：每个表一个文件，职责清晰
2. **易维护**：修改某个表的操作不影响其他表
3. **可扩展**：添加新表非常简单
4. **统一接口**：通过 `__init__.py` 提供统一的导入接口
