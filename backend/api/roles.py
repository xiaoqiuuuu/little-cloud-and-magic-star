from fastapi import APIRouter, HTTPException, Depends
from typing import List
from models import Role, RoleCreate, RoleUpdate
from database import roles as db_roles
from .dependencies import require_content_admin

router = APIRouter(prefix="/api", tags=["角色管理"])

@router.get("/roles", response_model=List[Role])
async def get_roles():
    """获取所有角色"""
    return db_roles.get_all_roles()

@router.get("/roles/{role_id}", response_model=Role)
async def get_role(role_id: int):
    """获取指定角色"""
    role = db_roles.get_role(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role

@router.post("/roles", response_model=Role, dependencies=[Depends(require_content_admin)])
async def create_role(role: RoleCreate):
    """创建角色（需要管理员权限）"""
    role_id = db_roles.create_role(role)
    return db_roles.get_role(role_id)

@router.put("/roles/{role_id}", response_model=Role, dependencies=[Depends(require_content_admin)])
async def update_role(role_id: int, role: RoleUpdate):
    """更新角色（需要管理员权限）"""
    updated = db_roles.update_role(role_id, role)
    if not updated:
        raise HTTPException(status_code=404, detail="Role not found")
    return db_roles.get_role(role_id)

@router.delete("/roles/{role_id}", response_model=dict, dependencies=[Depends(require_content_admin)])
async def delete_role(role_id: int):
    """删除角色（需要管理员权限）"""
    deleted = db_roles.delete_role(role_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Role not found")
    return {"message": "Role deleted successfully"}
