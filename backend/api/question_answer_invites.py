"""管理员单题邀请链接与公开答题接口。"""

import secrets
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status

from database import (
    QUESTIONS_MANAGE_ALL,
    InvalidQuestionAnswerInvite,
    get_admin_legacy_names,
    get_active_question_answer_invite,
    get_all_question_ids,
    get_question_answer_invite_for_admin,
    revoke_question_answer_invite,
    rotate_question_answer_invite,
    reveal_question_answer_invite,
)
from models import (
    PublicQuestionAnswerInvite,
    QuestionAnswerInviteLink,
    QuestionAnswerInviteResult,
)

from .dependencies import has_permission, has_role, require_questions_manage


admin_router = APIRouter(
    prefix="/api/admin/question-answer-invites",
    tags=["邀请答题链接"],
)
public_router = APIRouter(
    prefix="/api/question-answer-invites",
    tags=["公开邀请答题"],
)


def _manageable_question_ids(user_info: dict) -> list[str]:
    can_manage_all = has_role(user_info, "super_admin") or has_permission(
        user_info,
        QUESTIONS_MANAGE_ALL,
    )
    question_options = (
        get_all_question_ids()
        if can_manage_all
        else get_all_question_ids(
            contributor_id=user_info["id"],
            legacy_names=get_admin_legacy_names(user_info["id"]),
        )
    )
    return [str(option["id"]) for option in question_options]


def _to_link_response(invite: dict) -> QuestionAnswerInviteLink:
    return QuestionAnswerInviteLink(
        question_id=invite["question_id"],
        question=invite["question"],
        tag=invite["tag"],
        token=invite["token"],
        reveal_count=invite["reveal_count"],
        last_revealed_at=invite["last_revealed_at"],
        created_at=invite["created_at"],
        updated_at=invite["updated_at"],
    )


def _invite_token(
    token: str = Header(
        ...,
        alias="X-Question-Answer-Invite-Token",
        min_length=20,
        max_length=128,
    ),
) -> str:
    return token


@admin_router.get("", response_model=Optional[QuestionAnswerInviteLink])
def get_admin_question_answer_invite(
    user_info: dict = Depends(require_questions_manage),
):
    invite = get_question_answer_invite_for_admin(user_info["id"])
    if invite and invite["question_id"] not in set(_manageable_question_ids(user_info)):
        revoke_question_answer_invite(user_info["id"])
        return None
    return _to_link_response(invite) if invite else None


@admin_router.post("", response_model=QuestionAnswerInviteLink)
def rotate_admin_question_answer_invite(
    user_info: dict = Depends(require_questions_manage),
):
    question_ids = _manageable_question_ids(user_info)
    if not question_ids:
        raise HTTPException(status_code=409, detail="当前没有可邀请作答的题目")
    current = get_question_answer_invite_for_admin(user_info["id"])
    if current and len(question_ids) > 1:
        question_ids = [
            question_id
            for question_id in question_ids
            if question_id != current["question_id"]
        ]
    question_id = secrets.choice(question_ids)
    return _to_link_response(
        rotate_question_answer_invite(question_id, user_info["id"])
    )


@admin_router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_question_answer_invite(
    user_info: dict = Depends(require_questions_manage),
):
    revoke_question_answer_invite(user_info["id"])
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@public_router.get("", response_model=PublicQuestionAnswerInvite)
def get_public_question_answer_invite(
    token: str = Depends(_invite_token),
):
    invite = get_active_question_answer_invite(token)
    if not invite:
        raise HTTPException(status_code=404, detail="邀请答题链接不存在或已失效")
    return PublicQuestionAnswerInvite(
        question_id=invite["question_id"],
        question=invite["question"],
        resources=invite["resources"],
        tag=invite["tag"],
        invited_by=invite["display_name"],
    )


@public_router.post("/reveal", response_model=QuestionAnswerInviteResult)
def reveal_public_question_answer(
    token: str = Depends(_invite_token),
):
    try:
        result = reveal_question_answer_invite(token)
    except InvalidQuestionAnswerInvite as error:
        raise HTTPException(
            status_code=404,
            detail="邀请答题链接不存在或已失效",
        ) from error
    return QuestionAnswerInviteResult(**result)
