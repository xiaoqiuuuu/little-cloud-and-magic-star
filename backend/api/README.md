# API 模块说明

## 目录结构

```
api/
├── __init__.py         # 导出所有路由器
├── dependencies.py     # 公共依赖项（如认证依赖）
├── auth.py            # 认证相关的API（登录等）
├── questions.py       # 题目相关的所有API
├── materials.py       # 物料相关的所有API
└── producers.py       # 制作人相关的所有API
```

## 各模块说明

### dependencies.py（公共依赖项）
- `get_current_user()`: 获取当前登录用户的依赖项

### auth.py（认证模块）
**前缀**: `/api/admin`

- `POST /login`: 管理员登录

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

### producers.py（制作人模块）
**前缀**: `/api/admin`

- `GET /producers`: 获取制作人列表（分页）
- `POST /producers`: 创建制作人
- `PUT /producers/{producer_id}`: 更新制作人
- `DELETE /producers/{producer_id}`: 删除制作人

## 使用方式

在 `main.py` 中注册路由：

```python
from api import (
    auth_router,
    questions_router,
    materials_router,
    producers_router
)

app.include_router(auth_router)      # 认证接口
app.include_router(questions_router) # 题目接口
app.include_router(materials_router) # 物料接口
app.include_router(producers_router) # 制作人接口
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
