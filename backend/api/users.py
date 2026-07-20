"""仅超级管理员可用的后台账号管理 API。"""

import sqlite3
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from .dependencies import require_content_admin, require_super_admin
from database import (
    claim_legacy_producer_content,
    count_active_super_admins,
    count_content_for_admin,
    create_admin,
    delete_admin,
    get_admin_by_id,
    get_admin_by_username,
    get_producer_by_id,
    list_content_contributors,
    list_admins,
    reset_admin_password,
    update_admin,
)
from database.tokens import revoke_all_refresh_tokens
from models import (
    AdminPasswordReset,
    AdminUser,
    AdminUserCreate,
    AdminUserUpdate,
    ContentContributor,
)


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


def _normalize_optional_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _validate_legacy_producer(
    producer_id: Optional[int],
    *,
    admin_id: Optional[int] = None,
):
    if producer_id is None:
        return None
    producer = get_producer_by_id(producer_id)
    if not producer:
        raise HTTPException(status_code=404, detail="历史制作人不存在")
    if producer.bound_admin_id and producer.bound_admin_id != admin_id:
        raise HTTPException(
            status_code=409,
            detail=f"历史制作人已绑定账号“{producer.bound_username}”",
        )
    return producer


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


@router.get("/contributors", response_model=List[ContentContributor])
def get_content_accounts(_: dict = Depends(require_content_admin)):
    """题目和物料可绑定的账号，包含已停用账号以便查看历史内容。"""
    return list_content_contributors(include_inactive=True)


@router.post("", response_model=AdminUser, status_code=status.HTTP_201_CREATED)
def create_admin_user(
    request: AdminUserCreate,
    _: dict = Depends(require_super_admin),
):
    username = _validate_username(request.username)
    if get_admin_by_username(username):
        raise HTTPException(status_code=409, detail="用户名已存在")
    if request.role == "quiz_operator" and request.legacy_producer_id is not None:
        raise HTTPException(status_code=422, detail="答题人员不能认领历史制作人")
    producer = _validate_legacy_producer(request.legacy_producer_id)
    display_name = _normalize_optional_text(request.display_name)
    profile_url = _normalize_optional_text(request.profile_url)
    if producer:
        display_name = display_name or producer.name
        profile_url = profile_url or producer.profile_url
    try:
        created = create_admin(
            username,
            request.password,
            request.role,
            display_name=display_name,
            profile_url=profile_url,
            legacy_producer_id=request.legacy_producer_id,
        )
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="用户名或历史制作人已被占用") from exc
    if producer:
        claim_legacy_producer_content(created["id"], producer.id)
    return created


@router.patch("/{admin_id}", response_model=AdminUser)
def update_admin_user(
    admin_id: int,
    request: AdminUserUpdate,
    current_user: dict = Depends(require_super_admin),
):
    target = _get_admin_or_404(admin_id)
    updates = request.model_dump(exclude_unset=True)
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

    claimed_producer = None
    if "legacy_producer_id" in updates:
        requested_producer_id = updates["legacy_producer_id"]
        if target["legacy_producer_id"] is not None and (
            requested_producer_id != target["legacy_producer_id"]
        ):
            raise HTTPException(
                status_code=409,
                detail="历史制作人已认领，为避免改写归属不允许直接更换",
            )
        claimed_producer = _validate_legacy_producer(
            requested_producer_id,
            admin_id=admin_id,
        )
        if claimed_producer:
            updates.setdefault("display_name", claimed_producer.name)
            updates.setdefault("profile_url", claimed_producer.profile_url)

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

    if changed.get("role") == "quiz_operator":
        content_counts = count_content_for_admin(admin_id)
        if content_counts["questions"] or content_counts["materials"]:
            raise HTTPException(
                status_code=409,
                detail="该账号已绑定题目或物料，不能改为答题人员",
            )

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

    if claimed_producer and target["legacy_producer_id"] is None:
        claim_legacy_producer_content(admin_id, claimed_producer.id)

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
