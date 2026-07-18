"""仅超级管理员可用的后台账号管理 API。"""

import sqlite3
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from .dependencies import require_super_admin
from database import (
    count_active_super_admins,
    create_admin,
    delete_admin,
    get_admin_by_id,
    get_admin_by_username,
    list_admins,
    reset_admin_password,
    update_admin,
)
from database.tokens import revoke_all_refresh_tokens
from models import AdminPasswordReset, AdminUser, AdminUserCreate, AdminUserUpdate


router = APIRouter(prefix="/api/admin/users", tags=["人员管理"])


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


def _ensure_not_last_active_super_admin(target: dict) -> None:
    if (
        target["role"] == "super_admin"
        and target["is_active"]
        and count_active_super_admins() <= 1
    ):
        raise HTTPException(
            status_code=400,
            detail="系统必须至少保留一个启用状态的超级管理员",
        )


@router.get("", response_model=List[AdminUser])
def get_admin_users(_: dict = Depends(require_super_admin)):
    return list_admins()


@router.post("", response_model=AdminUser, status_code=status.HTTP_201_CREATED)
def create_admin_user(
    request: AdminUserCreate,
    _: dict = Depends(require_super_admin),
):
    username = _validate_username(request.username)
    if get_admin_by_username(username):
        raise HTTPException(status_code=409, detail="用户名已存在")
    try:
        return create_admin(username, request.password, request.role)
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="用户名已存在") from exc


@router.patch("/{admin_id}", response_model=AdminUser)
def update_admin_user(
    admin_id: int,
    request: AdminUserUpdate,
    current_user: dict = Depends(require_super_admin),
):
    target = _get_admin_or_404(admin_id)
    updates = {
        key: value
        for key, value in request.model_dump(exclude_unset=True).items()
        if value is not None
    }
    if "username" in updates:
        updates["username"] = _validate_username(updates["username"])

    changed = {
        key: value
        for key, value in updates.items()
        if value != target.get(key)
    }
    if not changed:
        return target

    if current_user["id"] == admin_id:
        raise HTTPException(
            status_code=400,
            detail="不能在人员管理中修改当前登录账号",
        )

    removes_active_super = (
        target["role"] == "super_admin"
        and target["is_active"]
        and (
            changed.get("role", target["role"]) != "super_admin"
            or changed.get("is_active", target["is_active"]) is False
        )
    )
    if removes_active_super:
        _ensure_not_last_active_super_admin(target)

    if "username" in changed:
        existing = get_admin_by_username(changed["username"])
        if existing and existing["id"] != admin_id:
            raise HTTPException(status_code=409, detail="用户名已存在")

    try:
        updated = update_admin(admin_id, **changed)
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="用户名已存在") from exc
    if not updated:
        raise HTTPException(status_code=404, detail="管理员账号不存在")

    revoke_all_refresh_tokens(admin_id)
    return updated


@router.put("/{admin_id}/password", response_model=AdminUser)
def reset_admin_user_password(
    admin_id: int,
    request: AdminPasswordReset,
    _: dict = Depends(require_super_admin),
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
    current_user: dict = Depends(require_super_admin),
):
    target = _get_admin_or_404(admin_id)
    if current_user["id"] == admin_id:
        raise HTTPException(status_code=400, detail="不能删除当前登录账号")
    _ensure_not_last_active_super_admin(target)

    revoke_all_refresh_tokens(admin_id)
    if not delete_admin(admin_id):
        raise HTTPException(status_code=404, detail="管理员账号不存在")
    return {"message": "账号已删除"}
