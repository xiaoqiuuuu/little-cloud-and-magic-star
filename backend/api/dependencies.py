"""依赖项 - 公共的依赖注入"""

from fastapi import Depends, HTTPException, status
from typing import Tuple
from auth import verify_token, get_current_user_info


# 公共依赖项 - 兼容旧的用法（返回单个用户名）
def get_current_user(user_info: Tuple[str, str] = Depends(verify_token)) -> str:
    """获取当前登录用户"""
    return user_info[0]


def get_current_user_with_role(
    user_info: Tuple[str, str] = Depends(verify_token),
) -> Tuple[str, str]:
    """获取当前登录用户和角色"""
    return user_info


# 正确的依赖注入方式：直接作为函数参数使用 Depends
def get_current_user_info_dep(user_info: dict = Depends(get_current_user_info)) -> dict:
    """获取当前登录用户完整信息"""
    return user_info


def require_super_admin(user_info: dict = Depends(get_current_user_info)) -> dict:
    """仅允许超级管理员访问。"""
    if user_info["role"] != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有超级管理员可以执行此操作",
        )
    return user_info
