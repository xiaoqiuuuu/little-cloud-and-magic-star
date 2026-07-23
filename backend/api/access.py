"""后台 RBAC 角色与权限管理 API。"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status

from database import (
    QUESTIONS_MANAGE,
    create_access_role,
    delete_access_role,
    get_access_role,
    invalidate_role_sessions,
    list_access_roles,
    list_permissions,
    role_has_bound_content,
    update_access_role,
)
from models import (
    AccessPermission,
    AccessRole,
    AccessRoleCreate,
    AccessRoleUpdate,
)

from .dependencies import require_accounts_manage


router = APIRouter(prefix="/api/admin/access", tags=["RBAC 权限管理"])


def _clean_text(value: str, field_name: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise HTTPException(status_code=422, detail=f"{field_name}不能为空")
    return cleaned


@router.get("/permissions", response_model=List[AccessPermission])
def get_permissions(_: dict = Depends(require_accounts_manage)):
    return list_permissions()


@router.get("/roles", response_model=List[AccessRole])
def get_roles(_: dict = Depends(require_accounts_manage)):
    return list_access_roles()


@router.post("/roles", response_model=AccessRole, status_code=status.HTTP_201_CREATED)
def create_role(
    payload: AccessRoleCreate,
    _: dict = Depends(require_accounts_manage),
):
    try:
        return create_access_role(
            _clean_text(payload.name, "角色名称"),
            payload.description.strip(),
            payload.permissions,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.patch("/roles/{role_key}", response_model=AccessRole)
def update_role(
    role_key: str,
    payload: AccessRoleUpdate,
    _: dict = Depends(require_accounts_manage),
):
    current = get_access_role(role_key)
    if not current:
        raise HTTPException(status_code=404, detail="权限角色不存在")

    next_permissions = set(payload.permissions)
    if (
        QUESTIONS_MANAGE in current["permissions"]
        and QUESTIONS_MANAGE not in next_permissions
        and role_has_bound_content(role_key)
    ):
        raise HTTPException(
            status_code=409,
            detail="该角色下仍有账号绑定题目或物料，不能移除题目管理权限",
        )

    try:
        updated = update_access_role(
            role_key,
            name=_clean_text(payload.name, "角色名称"),
            description=payload.description.strip(),
            permission_keys=payload.permissions,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    if not updated:
        raise HTTPException(status_code=404, detail="权限角色不存在")

    if set(current["permissions"]) != set(updated["permissions"]):
        invalidate_role_sessions(role_key)
    return updated


@router.delete("/roles/{role_key}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(role_key: str, _: dict = Depends(require_accounts_manage)):
    try:
        deleted = delete_access_role(role_key)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    if not deleted:
        raise HTTPException(status_code=404, detail="权限角色不存在")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
