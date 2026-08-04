"""题目管理员分享链接与公开问卷提交接口。"""

from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Header,
    HTTPException,
    Response,
    UploadFile,
    status,
)

from database import (
    DuplicateSubmittedQuestion,
    InvalidQuestionSubmissionLink,
    create_question_from_submission,
    get_active_question_submission_link,
    get_admin_legacy_names,
    get_question_submission_link_for_admin,
    get_question_tag_counts,
    revoke_question_submission_link,
    rotate_question_submission_link,
)
from models import (
    PublicQuestionSubmission,
    QuestionSubmissionFormInfo,
    QuestionSubmissionLink,
    QuestionSubmissionResult,
)
from upload_storage import save_uploaded_file

from .dependencies import require_questions_manage


admin_router = APIRouter(
    prefix="/api/admin/question-submission-link",
    tags=["题目问卷链接"],
)
public_router = APIRouter(
    prefix="/api/question-submissions",
    tags=["公开题目问卷"],
)


def _to_link_response(link: dict) -> QuestionSubmissionLink:
    return QuestionSubmissionLink(
        token=link["token"],
        submission_count=link["submission_count"],
        last_submitted_at=link["last_submitted_at"],
        created_at=link["created_at"],
        updated_at=link["updated_at"],
    )


def _require_active_link(token: str) -> dict:
    link = get_active_question_submission_link(token)
    if not link:
        raise HTTPException(status_code=404, detail="出题链接不存在或已失效")
    return link


def _submission_token(
    token: str = Header(
        ...,
        alias="X-Question-Submission-Token",
        min_length=20,
        max_length=128,
    ),
) -> str:
    return token


def _clean_public_resources(resources: list[str]) -> list[str]:
    cleaned = []
    for resource in resources:
        value = resource.strip()
        if not value:
            continue
        if len(value) > 2048:
            raise HTTPException(status_code=422, detail="资源链接过长")
        if not (
            value.startswith("/uploads/")
            or value.startswith("https://")
            or value.startswith("http://")
        ):
            raise HTTPException(
                status_code=422,
                detail="资源仅支持上传文件或 HTTP/HTTPS 链接",
            )
        if value not in cleaned:
            cleaned.append(value)
    return cleaned


@admin_router.get("", response_model=Optional[QuestionSubmissionLink])
def get_admin_question_submission_link(
    user_info: dict = Depends(require_questions_manage),
):
    link = get_question_submission_link_for_admin(user_info["id"])
    return _to_link_response(link) if link else None


@admin_router.post("", response_model=QuestionSubmissionLink)
def rotate_admin_question_submission_link(
    user_info: dict = Depends(require_questions_manage),
):
    return _to_link_response(rotate_question_submission_link(user_info["id"]))


@admin_router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_question_submission_link(
    user_info: dict = Depends(require_questions_manage),
):
    revoke_question_submission_link(user_info["id"])
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@public_router.get("", response_model=QuestionSubmissionFormInfo)
def get_public_question_submission_form(
    token: str = Depends(_submission_token),
):
    link = _require_active_link(token)
    tag_counts = get_question_tag_counts(
        contributor_id=link["admin_id"],
        legacy_names=get_admin_legacy_names(link["admin_id"]),
    )
    return QuestionSubmissionFormInfo(
        owner_name=link["display_name"],
        tag_options=list(tag_counts),
    )


@public_router.post(
    "",
    response_model=QuestionSubmissionResult,
    status_code=status.HTTP_201_CREATED,
)
def submit_public_question(
    submission: PublicQuestionSubmission,
    token: str = Depends(_submission_token),
):
    question = submission.question.strip()
    answer = submission.answer.strip()
    tag = submission.tag.strip()
    if not question or not answer:
        raise HTTPException(status_code=422, detail="题目内容和答案不能为空")
    if not tag:
        raise HTTPException(status_code=422, detail="题目类型不能为空")

    try:
        created = create_question_from_submission(
            token,
            question=question,
            answer=answer,
            resources=_clean_public_resources(submission.resources),
            tag=tag,
        )
    except InvalidQuestionSubmissionLink as error:
        raise HTTPException(
            status_code=404,
            detail="出题链接不存在或已失效",
        ) from error
    except DuplicateSubmittedQuestion as error:
        raise HTTPException(
            status_code=409,
            detail=f"相同题目已经存在（题号 #{error.question_id}）",
        ) from error

    return QuestionSubmissionResult(
        question_id=created.id,
        message="题目已加入题库",
    )


@public_router.post("/upload")
async def upload_public_question_resource(
    file: UploadFile = File(...),
    token: str = Depends(_submission_token),
):
    _require_active_link(token)
    return await save_uploaded_file(file)
