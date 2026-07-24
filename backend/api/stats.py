"""访问统计 API。"""

from __future__ import annotations

import ipaddress
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from database.stats import add_visit, get_visit_stats
from .dependencies import require_visit_stats_view


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/stats", tags=["stats"])


class VisitRequest(BaseModel):
    path: str = Field(default="/", max_length=512)
    referrer: Optional[str] = Field(default="", max_length=1024)
    visitor_id: str = Field(default="", max_length=128)
    session_id: str = Field(default="", max_length=128)


def _valid_ip(value: str | None) -> str | None:
    try:
        return str(ipaddress.ip_address((value or "").strip()))
    except ValueError:
        return None


def _client_ip(request: Request) -> str:
    """生产服务仅监听本机端口，因此优先采用 Nginx 写入的真实地址头。"""
    real_ip = _valid_ip(request.headers.get("x-real-ip"))
    if real_ip:
        return real_ip
    forwarded_ip = _valid_ip((request.headers.get("x-forwarded-for") or "").split(",")[0])
    if forwarded_ip:
        return forwarded_ip
    return _valid_ip(request.client.host if request.client else "") or "unknown"


@router.post("/visit")
async def record_visit(request: Request, visit: VisitRequest):
    try:
        recorded = add_visit(
            ip_address=_client_ip(request),
            referrer=visit.referrer or "",
            user_agent=request.headers.get("user-agent", ""),
            path=visit.path,
            visitor_id=visit.visitor_id,
            session_id=visit.session_id,
            site_host=request.url.hostname or "",
        )
        return {"status": "recorded" if recorded else "duplicate"}
    except Exception:
        logger.exception("Failed to record page visit")
        return {"status": "error"}


@router.get("/")
async def get_stats(
    days: int = Query(default=30, ge=7, le=90),
    _: dict = Depends(require_visit_stats_view),
):
    try:
        return get_visit_stats(days)
    except Exception as exc:
        logger.exception("Failed to load visit statistics")
        raise HTTPException(status_code=500, detail="访问统计加载失败") from exc
