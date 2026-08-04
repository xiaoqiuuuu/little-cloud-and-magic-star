# API 模块说明

## 目录结构

```
api/
├── __init__.py         # 导出所有路由器
├── dependencies.py     # 公共依赖项（如认证依赖）
├── admin.py           # 双 Token 认证 API
├── access.py          # RBAC 角色与权限管理 API
├── users.py           # 人员管理与个人资料 API
├── activities.py      # 答题活动、题目范围与活动状态 API
├── questions.py       # 题目相关的所有API
├── question_submissions.py # 出题问卷链接与公开提交 API
├── question_answer_invites.py # 随机单题邀请答题 API
└── materials.py       # 物料相关的所有API
```

## 各模块说明

### dependencies.py（公共依赖项）
- `get_current_user()`: 获取当前登录用户的依赖项
- `require_permission()`: 按数据库实时角色权限校验单项权限
- `require_any_permission()`: 校验多项权限中的任意一项

### auth.py（认证模块）
**前缀**: `/api/admin`

- `POST /login`: 登录并签发 Access Token（1 天）和 Refresh Token（30 天）
- `POST /refresh`: 轮换 Refresh Token 并签发新的双 Token
- `POST /logout`: 注销账号当前全部 Token
- `GET /me`: 获取数据库中的实时账号、角色和权限列表

### access.py（RBAC 权限管理模块）
**前缀**: `/api/admin/access`

- `GET /permissions`: 获取系统权限点
- `GET/POST /roles`: 查询或创建权限角色
- `PATCH/DELETE /roles/{role_key}`: 更新或删除权限角色

后台模块使用独立权限点：

- `questions.manage`: 题目管理与题目统计
- `materials.manage`: 物料管理
- `content_roles.manage`: 内容角色管理
- `quiz_activities.manage`: 答题活动与现场倒计时管理
- `homepage.manage`: 官网活动管理
- `visit_stats.view`: 访问分析查看
- `accounts.manage`: 账号与权限管理
- `quiz.operate`: 现场答题操作

一个账号可以绑定多个角色，最终权限为所有角色权限的并集。

### users.py（人员管理模块）
**前缀**: `/api/admin/users`

- `GET /`: 获取后台账号列表
- `GET /contributors?scope=questions|materials`: 获取对应模块可绑定的贡献账号
- `PATCH /me/profile`: 当前账号修改自己的署名名称和个人主页
- `POST /`: 创建后台账号
- `PATCH /{admin_id}`: 修改账号、名片、角色或启停状态
- `PUT /{admin_id}/password`: 重置密码
- `DELETE /{admin_id}`: 删除账号

### activities.py（答题活动模块）

- `GET /api/quiz/active-activity`: 获取当前进行中的活动
- `GET/POST /api/admin/activities`: 查询或创建活动（需要 `quiz_activities.manage`）
- `GET /api/admin/activities/question-options`: 获取活动可选题目
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

### question_submissions.py（公开出题问卷）

- `GET /api/admin/question-submission-link`: 获取当前账号的问卷链接
- `POST /api/admin/question-submission-link`: 生成或轮换问卷链接
- `DELETE /api/admin/question-submission-link`: 撤销问卷链接
- `GET /api/question-submissions`: 获取公开问卷信息
- `POST /api/question-submissions`: 提交题目并直接加入题库
- `POST /api/question-submissions/upload`: 上传问卷题目资源

公开接口通过 `X-Question-Submission-Token` 请求头携带分享令牌。前端分享地址使用
`/submit-question#令牌`，避免令牌进入普通页面访问日志和 Referer。

### question_answer_invites.py（随机邀请答题）

- `GET /api/admin/question-answer-invites`: 获取当前账号的邀请链接
- `POST /api/admin/question-answer-invites`: 从账号可管理的题库随机抽题并生成新链接
- `DELETE /api/admin/question-answer-invites`: 停用当前邀请链接
- `GET /api/question-answer-invites`: 获取公开题目，不返回答案
- `POST /api/question-answer-invites/reveal`: 主动揭晓答案并记录查看次数

公开接口通过 `X-Question-Answer-Invite-Token` 请求头携带随机令牌。前端分享地址使用
`/answer-invite#令牌`；重新生成、停用、账号禁用或失去题目权限后，旧令牌立即失效。

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
