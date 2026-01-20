"""依赖项 - 公共的依赖注入"""

from fastapi import Depends
from auth import verify_token

# 公共依赖项
def get_current_user(username: str = Depends(verify_token)) -> str:
    """获取当前登录用户"""
    return username
