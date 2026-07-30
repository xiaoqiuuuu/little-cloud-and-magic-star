"""星辰大海公开留言与后台管理接口。"""

from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from database import (
    create_xcdh_message,
    delete_xcdh_message,
    increment_xcdh_message_click,
    list_admin_xcdh_messages,
    list_xcdh_messages,
    set_xcdh_message_hidden,
)
from models import (
    PaginatedXcdhMessages,
    XcdhAdminMessage,
    XcdhMessage,
    XcdhMessageCreate,
    XcdhMessageVisibilityUpdate,
)
from .dependencies import require_xcdh_messages_manage


public_router = APIRouter(prefix="/api/xcdh", tags=["星辰大海"])
admin_router = APIRouter(prefix="/api/admin/xcdh", tags=["星愿管理"])
# 兼容现有测试及旧导入名称。
router = public_router


@public_router.get("/messages", response_model=List[XcdhMessage])
def get_messages():
    return list_xcdh_messages()


@public_router.post(
    "/messages",
    response_model=XcdhMessage,
    status_code=status.HTTP_201_CREATED,
)
def post_message(payload: XcdhMessageCreate):
    username = payload.username.strip()
    content = payload.content.strip()
    if not username or not content:
        raise HTTPException(status_code=422, detail="昵称和星愿内容不能为空")
    return create_xcdh_message(username, content)


@public_router.post("/messages/{message_id}/click", response_model=XcdhMessage)
def click_message(message_id: int):
    message = increment_xcdh_message_click(message_id)
    if not message:
        raise HTTPException(status_code=404, detail="这颗星愿不存在")
    return message


@admin_router.get("/messages", response_model=PaginatedXcdhMessages)
def admin_messages(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    keyword: Optional[str] = Query(default=None, max_length=100),
    visibility: Literal["all", "visible", "hidden"] = "all",
    sort_by: Literal["id", "click_count", "created_at"] = "created_at",
    sort_order: Literal["asc", "desc"] = "desc",
    _: dict = Depends(require_xcdh_messages_manage),
):
    result = list_admin_xcdh_messages(
        page=page,
        page_size=page_size,
        keyword=keyword,
        visibility=visibility,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return PaginatedXcdhMessages(
        total=result["total"],
        page=page,
        page_size=page_size,
        items=result["items"],
        summary=result["summary"],
    )


@admin_router.patch("/messages/{message_id}/visibility", response_model=XcdhAdminMessage)
def admin_update_message_visibility(
    message_id: int,
    payload: XcdhMessageVisibilityUpdate,
    _: dict = Depends(require_xcdh_messages_manage),
):
    message = set_xcdh_message_hidden(message_id, payload.hidden)
    if not message:
        raise HTTPException(status_code=404, detail="这颗星愿不存在")
    return message


@admin_router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_message(
    message_id: int,
    _: dict = Depends(require_xcdh_messages_manage),
):
    if not delete_xcdh_message(message_id):
        raise HTTPException(status_code=404, detail="这颗星愿不存在")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
