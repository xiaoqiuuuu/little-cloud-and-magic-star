"""后台账号管理与当前账号资料 API。"""

import sqlite3
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from auth import get_current_user_info
from .dependencies import has_permission, require_accounts_manage
from database import (
    MATERIALS_MANAGE,
    QUESTIONS_MANAGE,
    count_active_super_admins,
    count_content_for_admin,
    create_admin,
    delete_admin,
    get_access_role,
    get_admin_by_id,
    get_admin_by_username,
    list_content_contributors,
    list_admins,
    reset_admin_password,
    role_keys_have_permission,
    update_admin,
)
from database.tokens import revoke_all_refresh_tokens
from models import (
    AdminPasswordReset,
    AdminProfileUpdate,
    AdminUser,
    AdminUserCreate,
    AdminUserUpdate,
    ContentContributor,
)


router = APIRouter(prefix="/api/admin/users", tags=["人员管理"])
AUTH_ACCOUNT_FIELDS = {"username", "role", "roles", "is_active"}


def _get_admin_or_404(admin_id: int) -> dict:
    admin = get_admin_by_id(admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="管理员账号不存在")
    return admin


def _validate_username(username: str) -> str:
    normalized = username.strip()
    if len(normalized) < 2:
        raise HTTPException(status_code=422, detail="用户名至少需要 2 个字符")
    return normalized


def _normalize_optional_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _ensure_not_last_active_super_admin(target: dict) -> None:
    if (
        "super_admin" in target["role_keys"]
        and target["is_active"]
        and count_active_super_admins() <= 1
    ):
        raise HTTPException(
            status_code=400,
            detail="系统必须至少保留一个启用状态的超级管理员",
        )


def _normalize_requested_roles(
    roles: Optional[List[str]],
    legacy_role: Optional[str],
    *,
    default: Optional[List[str]] = None,
) -> Optional[List[str]]:
    if roles is not None and legacy_role is not None:
        raise HTTPException(status_code=422, detail="不能同时提交 role 和 roles")
    requested = roles if roles is not None else ([legacy_role] if legacy_role else default)
    if requested is None:
        return None
    normalized = list(
        dict.fromkeys(str(role_key).strip() for role_key in requested if str(role_key).strip())
    )
    if not normalized:
        raise HTTPException(status_code=422, detail="账号至少需要一个角色")
    return normalized


@router.get("", response_model=List[AdminUser])
def get_admin_users(_: dict = Depends(require_accounts_manage)):
    return list_admins()


@router.get("/contributors", response_model=List[ContentContributor])
def get_content_accounts(
    scope: Literal["questions", "materials"] = "questions",
    current_user: dict = Depends(get_current_user_info),
):
    """题目和物料可绑定的账号，包含已停用账号以便查看历史内容。"""
    permission_key = (
        QUESTIONS_MANAGE if scope == "questions" else MATERIALS_MANAGE
    )
    if not has_permission(current_user, permission_key):
        raise HTTPException(status_code=403, detail="当前账号不能查看该模块贡献账号")
    return list_content_contributors(
        include_inactive=True,
        permission_key=permission_key,
    )


@router.patch("/me/profile", response_model=AdminUser)
def update_current_admin_profile(
    request: AdminProfileUpdate,
    current_user: dict = Depends(get_current_user_info),
):
    """当前内容账号编辑自己的署名资料，不改变权限或登录身份。"""
    display_name = _normalize_optional_text(request.display_name)
    if not display_name:
        raise HTTPException(status_code=422, detail="署名名称不能为空")
    updated = update_admin(
        current_user["id"],
        display_name=display_name,
        profile_url=_normalize_optional_text(request.profile_url),
    )
    if not updated:
        raise HTTPException(status_code=404, detail="管理员账号不存在")
    return updated


@router.post("", response_model=AdminUser, status_code=status.HTTP_201_CREATED)
def create_admin_user(
    request: AdminUserCreate,
    _: dict = Depends(require_accounts_manage),
):
    username = _validate_username(request.username)
    if get_admin_by_username(username):
        raise HTTPException(status_code=409, detail="用户名已存在")
    display_name = _normalize_optional_text(request.display_name)
    profile_url = _normalize_optional_text(request.profile_url)
    role_keys = _normalize_requested_roles(
        request.roles,
        request.role,
        default=["question_admin"],
    )
    try:
        created = create_admin(
            username,
            request.password,
            role_keys or ["question_admin"],
            display_name=display_name,
            profile_url=profile_url,
        )
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="用户名已存在") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return created


@router.patch("/{admin_id}", response_model=AdminUser)
def update_admin_user(
    admin_id: int,
    request: AdminUserUpdate,
    current_user: dict = Depends(require_accounts_manage),
):
    target = _get_admin_or_404(admin_id)
    updates = request.model_dump(exclude_unset=True)
    roles_were_submitted = "roles" in updates or "role" in updates
    if roles_were_submitted:
        role_keys = _normalize_requested_roles(
            updates.pop("roles", None),
            updates.pop("role", None),
        )
        if role_keys is None:
            raise HTTPException(status_code=422, detail="账号至少需要一个角色")
        updates["roles"] = role_keys
    if "username" in updates:
        if updates["username"] is None:
            raise HTTPException(status_code=422, detail="用户名不能为空")
        updates["username"] = _validate_username(updates["username"])
    if "display_name" in updates:
        updates["display_name"] = (
            _normalize_optional_text(updates["display_name"])
            or updates.get("username")
            or target["username"]
        )
    if "profile_url" in updates:
        updates["profile_url"] = _normalize_optional_text(updates["profile_url"])

    changed = {
        key: value
        for key, value in updates.items()
        if value != (target["role_keys"] if key == "roles" else target.get(key))
    }
    if not changed:
        return target

    if current_user["id"] == admin_id:
        raise HTTPException(
            status_code=400,
            detail="不能在人员管理中修改当前登录账号",
        )

    removes_active_super = (
        "super_admin" in target["role_keys"]
        and target["is_active"]
        and (
            "super_admin" not in changed.get("roles", target["role_keys"])
            or changed.get("is_active", target["is_active"]) is False
        )
    )
    if removes_active_super:
        _ensure_not_last_active_super_admin(target)

    next_roles = changed.get("roles", target["role_keys"])
    missing_roles = [role_key for role_key in next_roles if not get_access_role(role_key)]
    if missing_roles:
        raise HTTPException(
            status_code=422,
            detail=f"账号角色不存在：{', '.join(missing_roles)}",
        )
    content_counts = count_content_for_admin(admin_id)
    if (
        content_counts["questions"]
        and not role_keys_have_permission(next_roles, QUESTIONS_MANAGE)
    ):
        raise HTTPException(
            status_code=409,
            detail="该账号已绑定题目，不能移除全部题目管理权限",
        )
    if (
        content_counts["materials"]
        and not role_keys_have_permission(next_roles, MATERIALS_MANAGE)
    ):
        raise HTTPException(
            status_code=409,
            detail="该账号已绑定物料，不能移除全部物料管理权限",
        )

    if "username" in changed:
        existing = get_admin_by_username(changed["username"])
        if existing and existing["id"] != admin_id:
            raise HTTPException(status_code=409, detail="用户名已存在")

    try:
        updated = update_admin(admin_id, **changed)
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="用户名已存在") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=404, detail="管理员账号不存在")

    if AUTH_ACCOUNT_FIELDS.intersection(changed):
        revoke_all_refresh_tokens(admin_id)
    return updated


@router.put("/{admin_id}/password", response_model=AdminUser)
def reset_admin_user_password(
    admin_id: int,
    request: AdminPasswordReset,
    _: dict = Depends(require_accounts_manage),
):
    _get_admin_or_404(admin_id)
    updated = reset_admin_password(admin_id, request.password)
    if not updated:
        raise HTTPException(status_code=404, detail="管理员账号不存在")
    revoke_all_refresh_tokens(admin_id)
    return updated


@router.delete("/{admin_id}")
def delete_admin_user(
    admin_id: int,
    current_user: dict = Depends(require_accounts_manage),
):
    target = _get_admin_or_404(admin_id)
    if current_user["id"] == admin_id:
        raise HTTPException(status_code=400, detail="不能删除当前登录账号")
    _ensure_not_last_active_super_admin(target)

    content_counts = count_content_for_admin(admin_id)
    if content_counts["questions"] or content_counts["materials"]:
        raise HTTPException(
            status_code=409,
            detail=(
                f"该账号已绑定 {content_counts['questions']} 道题目和 "
                f"{content_counts['materials']} 个物料，请改为停用而不是删除"
            ),
        )

    revoke_all_refresh_tokens(admin_id)
    if not delete_admin(admin_id):
        raise HTTPException(status_code=404, detail="管理员账号不存在")
    return {"message": "账号已删除"}
