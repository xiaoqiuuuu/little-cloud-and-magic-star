# API 模块说明

## 目录结构

```
api/
├── __init__.py         # 导出所有路由器
├── dependencies.py     # 公共依赖项（如认证依赖）
├── admin.py           # 双 Token 认证 API
├── users.py           # 人员管理与个人资料 API
├── activities.py      # 答题活动、题目范围与活动状态 API
├── questions.py       # 题目相关的所有API
└── materials.py       # 物料相关的所有API
```

## 各模块说明

### dependencies.py（公共依赖项）
- `get_current_user()`: 获取当前登录用户的依赖项
- `require_super_admin()`: 强制要求数据库实时角色为超级管理员

### auth.py（认证模块）
**前缀**: `/api/admin`

- `POST /login`: 登录并签发 Access Token（1 天）和 Refresh Token（30 天）
- `POST /refresh`: 轮换 Refresh Token 并签发新的双 Token
- `POST /logout`: 注销账号当前全部 Token
- `GET /me`: 获取数据库中的实时账号和角色信息

### users.py（人员管理模块）
**前缀**: `/api/admin/users`

- `GET /`: 获取后台账号列表
- `GET /contributors`: 获取题目/物料可绑定的内容账号
- `PATCH /me/profile`: 当前账号修改自己的署名名称和个人主页
- `POST /`: 创建后台账号
- `PATCH /{admin_id}`: 修改账号、名片、角色或启停状态
- `PUT /{admin_id}/password`: 重置密码
- `DELETE /{admin_id}`: 删除账号

### activities.py（答题活动模块）

- `GET /api/quiz/active-activity`: 获取当前进行中的活动
- `GET/POST /api/admin/activities`: 查询或创建活动（仅超级管理员）
- `GET/PUT/DELETE /api/admin/activities/{id}`: 活动详情、编辑或删除草稿
- `POST /api/admin/activities/{id}/start`: 开始活动；自动暂停其他活动
- `POST /api/admin/activities/{id}/pause`: 暂停并保留统计
- `POST /api/admin/activities/{id}/end`: 结束活动并转为只读

### questions.py（题目模块）
**前缀**: 无（直接使用 `/api/...`）

#### 公开接口（需登录）
- `GET /api/questions/ids`: 获取所有题目ID列表
- `GET /api/questions`: 获取所有题目
- `GET /api/questions/{question_id}`: 获取单个题目
- `POST /api/answer`: 提交答案
- `POST /api/track/random/{question_id}`: 记录随机按钮点击
- `POST /api/track/hide/{question_id}`: 记录隐藏按钮点击

#### 管理员接口
- `GET /api/admin/stats`: 获取题目统计信息
- `POST /api/admin/questions/{question_id}/reset_stats`: 单题归零
- `POST /api/admin/questions/reset_stats_all`: 全部归零
- `GET /api/admin/questions`: 获取题目列表（分页）
- `GET /api/admin/questions/{question_id}`: 获取单个题目
- `POST /api/admin/questions`: 创建题目
- `PUT /api/admin/questions/{question_id}`: 更新题目
- `DELETE /api/admin/questions/{question_id}`: 删除题目

### materials.py（物料模块）
**前缀**: `/api/admin`

- `GET /materials`: 获取物料列表（分页）
- `GET /materials/{material_id}`: 获取单个物料
- `POST /materials`: 创建物料
- `PUT /materials/{material_id}`: 更新物料
- `DELETE /materials/{material_id}`: 删除物料

## 使用方式

在 `main.py` 中注册路由：

```python
from api import (
    auth_router,
    questions_router,
    materials_router
)

app.include_router(auth_router)      # 认证接口
app.include_router(questions_router) # 题目接口
app.include_router(materials_router) # 物料接口
```

## 添加新的API模块

1. 在 `api/` 目录下创建新的 Python 文件（例如 `new_module.py`）
2. 创建 APIRouter 并定义路由：

```python
from fastapi import APIRouter, Depends
from .dependencies import get_current_user

router = APIRouter(prefix="/api/new", tags=["新模块"])

@router.get("/items")
def get_items(username: str = Depends(get_current_user)):
    """获取项目列表"""
    return {"items": []}
```

3. 在 `__init__.py` 中导入并导出：

```python
from .new_module import router as new_router

__all__ = [
    # ... 现有路由
    'new_router',
]
```

4. 在 `main.py` 中注册路由：

```python
from api import new_router
app.include_router(new_router)
```

## 优势

1. **模块化**：每个业务模块一个文件，职责清晰
2. **易维护**：修改某个模块不影响其他模块
3. **易扩展**：添加新API模块非常简单
4. **统一认证**：通过 `dependencies.py` 提供统一的认证依赖
5. **清晰的main.py**：应用入口文件简洁明了，只负责初始化和路由注册
