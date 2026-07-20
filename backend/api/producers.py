"""制作人相关的API路由"""

from fastapi import APIRouter, HTTPException, Depends
from models import Producer, ProducerCreate, ProducerUpdate, PaginatedProducers
from database import (
    get_all_producers, get_producer_by_id, create_producer,
    update_producer, delete_producer, get_producers_count
)
from .dependencies import require_content_admin

router = APIRouter(prefix="/api/admin", tags=["制作人管理"])


@router.get("/producers", response_model=PaginatedProducers)
def admin_list_producers(
    page: int = 1,
    page_size: int = 10,
    _: dict = Depends(require_content_admin)
):
    """管理员获取所有制作人（分页）"""
    producers = get_all_producers(page, page_size)
    total = get_producers_count()
    return PaginatedProducers(
        total=total,
        page=page,
        page_size=page_size,
        items=producers
    )


@router.post("/producers", response_model=Producer)
def admin_create_producer(
    producer_data: ProducerCreate,
    _: dict = Depends(require_content_admin)
):
    """管理员创建制作人"""
    return create_producer(producer_data.name, producer_data.profile_url)


@router.put("/producers/{producer_id}", response_model=Producer)
def admin_update_producer(
    producer_id: int,
    producer_data: ProducerUpdate,
    _: dict = Depends(require_content_admin)
):
    """管理员更新制作人"""
    existing = get_producer_by_id(producer_id)
    if not existing:
        raise HTTPException(status_code=404, detail="制作人不存在")

    updates = producer_data.dict(exclude_unset=True)
    updated = update_producer(producer_id, updates)
    return updated


@router.delete("/producers/{producer_id}")
def admin_delete_producer(producer_id: int, _: dict = Depends(require_content_admin)):
    """管理员删除制作人"""
    if not delete_producer(producer_id):
        raise HTTPException(status_code=404, detail="制作人不存在")
    return {"message": "删除成功"}
