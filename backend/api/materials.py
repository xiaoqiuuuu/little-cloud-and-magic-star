"""物料相关的API路由"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from models import Material, MaterialCreate, MaterialUpdate, PaginatedMaterials
from database import (
    MATERIALS_MANAGE,
    get_all_materials, get_material_by_id, get_next_material_id,
    create_material, update_material, delete_material,
    get_admin_legacy_names,
    get_content_contributor,
    get_content_contributors,
    get_materials_count,
    resolve_contributors_by_names,
    set_material_contributors,
)
from .dependencies import has_role, require_materials_manage

router = APIRouter(prefix="/api/admin", tags=["物料管理"])


def _get_requested_contributors(admin_ids):
    unique_ids = list(dict.fromkeys(int(admin_id) for admin_id in admin_ids))
    if not unique_ids:
        raise HTTPException(status_code=422, detail="物料至少需要绑定一个账号")
    contributors = get_content_contributors(unique_ids, MATERIALS_MANAGE)
    if len(contributors) != len(unique_ids):
        raise HTTPException(
            status_code=422,
            detail="物料只能绑定拥有物料管理权限的账号",
        )
    return contributors


@router.get("/materials", response_model=PaginatedMaterials)
def admin_list_materials(
    page: int = 1,
    page_size: int = 10,
    contributor_id: Optional[int] = None,
    user_info: dict = Depends(require_materials_manage)
):
    """管理员获取所有物料（分页）"""
    if contributor_id is not None and not get_content_contributor(
        contributor_id, MATERIALS_MANAGE
    ):
        raise HTTPException(status_code=422, detail="筛选账号不存在")
    legacy_names = (
        get_admin_legacy_names(contributor_id)
        if contributor_id is not None
        else None
    )
    materials = get_all_materials(page, page_size, contributor_id, legacy_names)
    total = get_materials_count(contributor_id, legacy_names)
    return PaginatedMaterials(
        total=total,
        page=page,
        page_size=page_size,
        items=materials
    )


@router.get("/materials/{material_id}", response_model=Material)
def admin_get_material(material_id: str, _: dict = Depends(require_materials_manage)):
    """管理员获取单个物料"""
    material = get_material_by_id(material_id)
    if not material:
        raise HTTPException(status_code=404, detail="物料不存在")
    return material


@router.post("/materials", response_model=Material)
def admin_create_material(
    material_data: MaterialCreate,
    user_info: dict = Depends(require_materials_manage)
):
    """管理员创建物料"""
    material_id = get_next_material_id()
    requested_ids = (
        material_data.contributor_ids or [user_info["id"]]
        if has_role(user_info, "super_admin")
        else [user_info["id"]]
    )
    contributors = _get_requested_contributors(requested_ids)
    material = Material(
        id=material_id,
        name=material_data.name,
        description=material_data.description,
        creator=[contributor.display_name for contributor in contributors],
        resources=material_data.resources
    )
    return create_material(
        material, [contributor.id for contributor in contributors]
    )


@router.put("/materials/{material_id}", response_model=Material)
def admin_update_material(
    material_id: str,
    material_data: MaterialUpdate,
    user_info: dict = Depends(require_materials_manage)
):
    """管理员更新物料"""
    existing = get_material_by_id(material_id)
    if not existing:
        raise HTTPException(status_code=404, detail="物料不存在")

    updates = material_data.model_dump(exclude_unset=True)
    requested_contributor_ids = updates.pop("contributor_ids", None)
    legacy_creator_update = updates.pop("creator", None)
    contributors = None
    if has_role(user_info, "super_admin"):
        if requested_contributor_ids is None and legacy_creator_update is not None:
            resolved = resolve_contributors_by_names(
                legacy_creator_update, MATERIALS_MANAGE
            )
            if resolved:
                requested_contributor_ids = [contributor.id for contributor in resolved]
            else:
                updates["creator"] = legacy_creator_update
        if requested_contributor_ids is not None:
            contributors = _get_requested_contributors(requested_contributor_ids)
            updates["creator"] = [
                contributor.display_name for contributor in contributors
            ]
    updated = update_material(material_id, updates)
    if contributors is not None:
        set_material_contributors(
            material_id, [contributor.id for contributor in contributors]
        )
        updated = get_material_by_id(material_id)
    return updated


@router.delete("/materials/{material_id}")
def admin_delete_material(material_id: str, _: dict = Depends(require_materials_manage)):
    """管理员删除物料"""
    if not delete_material(material_id):
        raise HTTPException(status_code=404, detail="物料不存在")
    return {"message": "删除成功"}
