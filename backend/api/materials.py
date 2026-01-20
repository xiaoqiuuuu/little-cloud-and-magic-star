"""物料相关的API路由"""

from fastapi import APIRouter, HTTPException, Depends
from models import Material, MaterialCreate, MaterialUpdate, PaginatedMaterials
from database import (
    get_all_materials, get_material_by_id, get_next_material_id,
    create_material, update_material, delete_material,
    get_materials_count
)
from .dependencies import get_current_user

router = APIRouter(prefix="/api/admin", tags=["物料管理"])


@router.get("/materials", response_model=PaginatedMaterials)
def admin_list_materials(
    page: int = 1,
    page_size: int = 10,
    username: str = Depends(get_current_user)
):
    """管理员获取所有物料（分页）"""
    materials = get_all_materials(page, page_size)
    total = get_materials_count()
    return PaginatedMaterials(
        total=total,
        page=page,
        page_size=page_size,
        items=materials
    )


@router.get("/materials/{material_id}", response_model=Material)
def admin_get_material(material_id: str, username: str = Depends(get_current_user)):
    """管理员获取单个物料"""
    material = get_material_by_id(material_id)
    if not material:
        raise HTTPException(status_code=404, detail="物料不存在")
    return material


@router.post("/materials", response_model=Material)
def admin_create_material(
    material_data: MaterialCreate,
    username: str = Depends(get_current_user)
):
    """管理员创建物料"""
    material_id = get_next_material_id()
    material = Material(
        id=material_id,
        name=material_data.name,
        description=material_data.description,
        creator=material_data.creator,
        resources=material_data.resources
    )
    return create_material(material)


@router.put("/materials/{material_id}", response_model=Material)
def admin_update_material(
    material_id: str,
    material_data: MaterialUpdate,
    username: str = Depends(get_current_user)
):
    """管理员更新物料"""
    existing = get_material_by_id(material_id)
    if not existing:
        raise HTTPException(status_code=404, detail="物料不存在")

    updates = material_data.dict(exclude_unset=True)
    updated = update_material(material_id, updates)
    return updated


@router.delete("/materials/{material_id}")
def admin_delete_material(material_id: str, username: str = Depends(get_current_user)):
    """管理员删除物料"""
    if not delete_material(material_id):
        raise HTTPException(status_code=404, detail="物料不存在")
    return {"message": "删除成功"}
