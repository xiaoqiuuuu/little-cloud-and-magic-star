"""官网活动公开接口与后台管理接口。"""

import sqlite3
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status

from database import (
    activate_site_event,
    archive_site_event,
    create_site_event,
    delete_site_event,
    duplicate_site_event,
    get_current_site_event,
    get_public_site_event,
    get_site_event,
    list_site_events,
    update_site_event,
)
from models import (
    SiteEvent,
    SiteEventCreate,
    SiteEventSummary,
    SiteEventUpdate,
)
from .dependencies import require_super_admin


public_router = APIRouter(prefix="/api/site-events", tags=["官网活动"])
admin_router = APIRouter(prefix="/api/admin/site-events", tags=["官网活动管理"])


def _conflict_from_integrity(error: sqlite3.IntegrityError):
    if "slug" in str(error).lower() or "unique" in str(error).lower():
        raise HTTPException(status_code=409, detail="活动网址标识已存在") from error
    raise error


@public_router.get("", response_model=List[SiteEventSummary])
def public_site_events():
    """列出可浏览的当前和往期官网活动。"""
    return list_site_events(public_only=True)


@public_router.get("/current", response_model=SiteEvent)
def public_current_site_event():
    event = get_current_site_event()
    if not event:
        raise HTTPException(status_code=404, detail="当前没有已发布的主页活动")
    return event


@public_router.get("/{slug}", response_model=SiteEvent)
def public_site_event(slug: str):
    event = get_public_site_event(slug)
    if not event:
        raise HTTPException(status_code=404, detail="活动不存在或尚未发布")
    return event


@admin_router.get("", response_model=List[SiteEvent])
def admin_site_events(_: dict = Depends(require_super_admin)):
    return list_site_events()


@admin_router.post("", response_model=SiteEvent, status_code=status.HTTP_201_CREATED)
def admin_create_site_event(
    payload: SiteEventCreate,
    user: dict = Depends(require_super_admin),
):
    try:
        return create_site_event(payload.model_dump(mode="json"), user["username"])
    except sqlite3.IntegrityError as error:
        _conflict_from_integrity(error)


@admin_router.get("/{event_id}", response_model=SiteEvent)
def admin_site_event(event_id: int, _: dict = Depends(require_super_admin)):
    event = get_site_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="官网活动不存在")
    return event


@admin_router.put("/{event_id}", response_model=SiteEvent)
def admin_update_site_event(
    event_id: int,
    payload: SiteEventUpdate,
    _: dict = Depends(require_super_admin),
):
    try:
        event = update_site_event(
            event_id,
            payload.model_dump(exclude_unset=True, mode="json"),
        )
    except sqlite3.IntegrityError as error:
        _conflict_from_integrity(error)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    if not event:
        raise HTTPException(status_code=404, detail="官网活动不存在")
    return event


@admin_router.post("/{event_id}/duplicate", response_model=SiteEvent, status_code=201)
def admin_duplicate_site_event(
    event_id: int,
    user: dict = Depends(require_super_admin),
):
    event = duplicate_site_event(event_id, user["username"])
    if not event:
        raise HTTPException(status_code=404, detail="官网活动不存在")
    return event


@admin_router.post("/{event_id}/activate", response_model=SiteEvent)
def admin_activate_site_event(event_id: int, _: dict = Depends(require_super_admin)):
    event = activate_site_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="官网活动不存在")
    return event


@admin_router.post("/{event_id}/archive", response_model=SiteEvent)
def admin_archive_site_event(event_id: int, _: dict = Depends(require_super_admin)):
    try:
        event = archive_site_event(event_id)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    if not event:
        raise HTTPException(status_code=404, detail="官网活动不存在")
    return event


@admin_router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_site_event(event_id: int, _: dict = Depends(require_super_admin)):
    if not delete_site_event(event_id):
        existing = get_site_event(event_id)
        if not existing:
            raise HTTPException(status_code=404, detail="官网活动不存在")
        raise HTTPException(status_code=409, detail="只有草稿活动可以删除")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
