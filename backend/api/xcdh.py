"""星辰大海公开留言接口。"""

from typing import List

from fastapi import APIRouter, HTTPException, status

from database import (
    create_xcdh_message,
    increment_xcdh_message_click,
    list_xcdh_messages,
)
from models import XcdhMessage, XcdhMessageCreate


router = APIRouter(prefix="/api/xcdh", tags=["星辰大海"])


@router.get("/messages", response_model=List[XcdhMessage])
def get_messages():
    return list_xcdh_messages()


@router.post(
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


@router.post("/messages/{message_id}/click", response_model=XcdhMessage)
def click_message(message_id: int):
    message = increment_xcdh_message_click(message_id)
    if not message:
        raise HTTPException(status_code=404, detail="这颗星愿不存在")
    return message
