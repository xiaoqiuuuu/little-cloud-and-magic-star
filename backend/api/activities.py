"""答题活动管理与现场活动上下文 API。"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from database import (
    create_activity,
    delete_activity,
    end_activity,
    get_active_activity,
    get_activity,
    get_all_questions,
    list_activities,
    pause_activity,
    start_activity,
    update_activity,
)
from models import (
    QuizActivity,
    QuizActivityCreate,
    QuizActivityDetail,
    QuizActivityUpdate,
    Question,
)

from .dependencies import get_current_user_info_dep, require_quiz_activities_manage


router = APIRouter(tags=["答题活动"])


def _activity_or_404(activity_id: int) -> dict:
    activity = get_activity(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="答题活动不存在")
    return activity


def _clean_name(name: str) -> str:
    cleaned = name.strip()
    if not cleaned:
        raise HTTPException(status_code=422, detail="活动名称不能为空")
    return cleaned


@router.get("/api/quiz/active-activity", response_model=Optional[QuizActivity])
def get_quiz_active_activity(_: dict = Depends(get_current_user_info_dep)):
    """供现场答题页面检查当前进行中的活动。"""
    return get_active_activity()


@router.get("/api/admin/activities", response_model=List[QuizActivity])
def get_quiz_activities(_: dict = Depends(require_quiz_activities_manage)):
    return list_activities()


@router.get(
    "/api/admin/activities/question-options",
    response_model=List[Question],
)
def get_quiz_activity_question_options(
    _: dict = Depends(require_quiz_activities_manage),
):
    """活动管理员可选择全部现有题目，但不因此获得题目编辑权限。"""
    return get_all_questions(page_size=0)


@router.post(
    "/api/admin/activities",
    response_model=QuizActivityDetail,
    status_code=status.HTTP_201_CREATED,
)
def create_quiz_activity(
    request: QuizActivityCreate,
    current_user: dict = Depends(require_quiz_activities_manage),
):
    try:
        return create_activity(
            _clean_name(request.name),
            request.description.strip(),
            request.question_ids,
            current_user["username"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/api/admin/activities/{activity_id}", response_model=QuizActivityDetail)
def get_quiz_activity(
    activity_id: int,
    _: dict = Depends(require_quiz_activities_manage),
):
    return _activity_or_404(activity_id)


@router.put("/api/admin/activities/{activity_id}", response_model=QuizActivityDetail)
def update_quiz_activity(
    activity_id: int,
    request: QuizActivityUpdate,
    _: dict = Depends(require_quiz_activities_manage),
):
    _activity_or_404(activity_id)
    updates = request.model_dump(exclude_unset=True)
    if "name" in updates and updates["name"] is not None:
        updates["name"] = _clean_name(updates["name"])
    if "description" in updates and updates["description"] is not None:
        updates["description"] = updates["description"].strip()
    try:
        updated = update_activity(activity_id, **updates)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=404, detail="答题活动不存在")
    return updated


@router.post("/api/admin/activities/{activity_id}/start", response_model=QuizActivityDetail)
def start_quiz_activity(
    activity_id: int,
    _: dict = Depends(require_quiz_activities_manage),
):
    _activity_or_404(activity_id)
    try:
        started = start_activity(activity_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not started:
        raise HTTPException(status_code=404, detail="答题活动不存在")
    return started


@router.post("/api/admin/activities/{activity_id}/pause", response_model=QuizActivityDetail)
def pause_quiz_activity(
    activity_id: int,
    _: dict = Depends(require_quiz_activities_manage),
):
    activity = _activity_or_404(activity_id)
    if activity["status"] != "active":
        raise HTTPException(status_code=400, detail="只有进行中的活动可以暂停")
    paused = pause_activity(activity_id)
    if not paused:
        raise HTTPException(status_code=409, detail="活动状态已经变化，请刷新后重试")
    return paused


@router.post("/api/admin/activities/{activity_id}/end", response_model=QuizActivityDetail)
def end_quiz_activity(
    activity_id: int,
    _: dict = Depends(require_quiz_activities_manage),
):
    activity = _activity_or_404(activity_id)
    if activity["status"] not in {"active", "paused"}:
        raise HTTPException(status_code=400, detail="只有已开始的活动可以结束")
    ended = end_activity(activity_id)
    if not ended:
        raise HTTPException(status_code=409, detail="活动状态已经变化，请刷新后重试")
    return ended


@router.delete("/api/admin/activities/{activity_id}")
def delete_quiz_activity(
    activity_id: int,
    _: dict = Depends(require_quiz_activities_manage),
):
    _activity_or_404(activity_id)
    try:
        deleted = delete_activity(activity_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="答题活动不存在")
    return {"message": "活动已删除"}
