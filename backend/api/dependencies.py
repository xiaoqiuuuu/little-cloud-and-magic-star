"""依赖项 - 公共的依赖注入"""

from fastapi import Depends, HTTPException, status
from typing import Tuple
from auth import verify_token, get_current_user_info
from database.rbac import (
    ACCOUNTS_MANAGE,
    CONTENT_ROLES_MANAGE,
    HOMEPAGE_MANAGE,
    MATERIALS_MANAGE,
    QUESTIONS_MANAGE,
    QUIZ_ACTIVITIES_MANAGE,
    QUIZ_OPERATE,
    VISIT_STATS_VIEW,
)


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
    if not has_role(user_info, "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有超级管理员可以执行此操作",
        )
    return user_info


def has_permission(user_info: dict, permission: str) -> bool:
    return permission in set(user_info.get("permissions") or [])


def has_role(user_info: dict, role_key: str) -> bool:
    role_keys = user_info.get("role_keys") or []
    if role_keys:
        return role_key in set(role_keys)
    return user_info.get("role") == role_key


def require_permission(permission: str):
    def dependency(user_info: dict = Depends(get_current_user_info)) -> dict:
        if not has_permission(user_info, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="当前账号没有执行此操作所需的权限",
            )
        return user_info

    return dependency


def require_any_permission(*permissions: str):
    required = set(permissions)

    def dependency(user_info: dict = Depends(get_current_user_info)) -> dict:
        if not required.intersection(user_info.get("permissions") or []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="当前账号没有访问此功能所需的权限",
            )
        return user_info

    return dependency


require_questions_manage = require_permission(QUESTIONS_MANAGE)
require_materials_manage = require_permission(MATERIALS_MANAGE)
require_content_roles_manage = require_permission(CONTENT_ROLES_MANAGE)
require_quiz_activities_manage = require_permission(QUIZ_ACTIVITIES_MANAGE)
require_visit_stats_view = require_permission(VISIT_STATS_VIEW)
require_accounts_manage = require_permission(ACCOUNTS_MANAGE)
require_homepage_manage = require_permission(HOMEPAGE_MANAGE)
require_quiz_operate = require_permission(QUIZ_OPERATE)

# 兼容旧模块名称，含义已升级为题目与答题活动管理权限。
require_content_admin = require_questions_manage
