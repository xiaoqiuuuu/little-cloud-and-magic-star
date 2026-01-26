"""API 路由模块 - 导出所有路由器"""

from .auth import router as auth_router
from .questions import router as questions_router
from .materials import router as materials_router
from .producers import router as producers_router

__all__ = [
    'auth_router',
    'questions_router',
    'materials_router',
    'producers_router',
]
from .configs import router as configs_router
from .roles import router as roles_router

__all__.append('configs_router')
__all__.append('roles_router')
