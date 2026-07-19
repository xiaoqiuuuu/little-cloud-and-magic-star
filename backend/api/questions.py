"""题目相关的API路由"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from models import (
    Question, QuestionCreate, QuestionUpdate,
    AnswerSubmit, AnswerResponse, PaginatedQuestions,
    QuestionBatchImport, QuestionBatchImportResult
)
from database import (
    get_all_questions, get_question_by_id, get_all_question_ids,
    create_question, update_question, delete_question,
    get_next_question_id, get_questions_count,
    get_question_tag_counts,
    increment_random_clicks, increment_hide_clicks,
    reset_question_stats, reset_all_questions_stats,
    check_duplicate_question,
    active_activity_contains_question,
    get_active_activity,
    get_active_activity_question_ids,
    get_active_activity_questions,
    get_started_activity_using_question,
    increment_active_activity_stat,
)
from database.producers import get_or_create_producer
from .dependencies import (
    get_current_user_info_dep,
    require_content_admin,
    require_super_admin,
)

router = APIRouter(tags=["题目"])


LIVE_QUIZ_ROLES = {"super_admin", "quiz_operator"}


def _clean_tag(tag: str) -> str:
    cleaned = tag.strip()
    if not cleaned:
        raise HTTPException(status_code=422, detail="题目标签不能为空")
    return cleaned


def _ensure_quiz_operator_question(question_id: str, role: str) -> None:
    if role != "quiz_operator":
        return
    if not get_active_activity():
        raise HTTPException(status_code=409, detail="当前没有进行中的答题活动")
    if not active_activity_contains_question(question_id):
        raise HTTPException(status_code=403, detail="该题目不属于当前答题活动")


def _ensure_expected_live_activity(activity_id: int, role: str) -> None:
    if role not in LIVE_QUIZ_ROLES:
        raise HTTPException(status_code=403, detail="当前账号不能进入现场答题")
    active_activity = get_active_activity()
    if not active_activity or active_activity["id"] != activity_id:
        raise HTTPException(status_code=409, detail="当前活动已切换或结束")


def _ensure_question_not_in_started_activity(question_id: str) -> None:
    activity = get_started_activity_using_question(question_id)
    if activity:
        raise HTTPException(
            status_code=409,
            detail=f"题目正在被活动“{activity['name']}”使用，请先结束该活动",
        )


# ============= 公开接口（需要登录） =============

@router.get("/api/questions/ids")
def list_question_ids(user_info: dict = Depends(get_current_user_info_dep)):
    """获取所有题目ID列表（轻量级）"""
    username = user_info["username"]
    role = user_info["role"]
    if role == "quiz_operator":
        return get_active_activity_question_ids() if get_active_activity() else []
    # 题目管理员只能获取自己出的题目ID
    author_filter = None if role == "super_admin" else username
    return get_all_question_ids(author=author_filter)


@router.get("/api/questions", response_model=List[Question])
def list_questions(user_info: dict = Depends(get_current_user_info_dep)):
    """获取所有题目（包含答案，需登录）"""
    username = user_info["username"]
    role = user_info["role"]
    if role == "quiz_operator":
        if not get_active_activity():
            return []
        return [
            question
            for question_id in get_active_activity_questions()
            if (question := get_question_by_id(question_id)) is not None
        ]
    # 题目管理员只能获取自己出的题目
    author_filter = None if role == "super_admin" else username
    questions = get_all_questions(page_size=0, author=author_filter)
    return questions


@router.get("/api/quiz/questions/ids")
def list_live_question_ids(
    activity_id: int,
    user_info: dict = Depends(get_current_user_info_dep),
):
    """获取指定现场活动的题目范围，活动切换后拒绝旧请求。"""
    _ensure_expected_live_activity(activity_id, user_info["role"])
    return get_active_activity_question_ids(activity_id)


@router.get("/api/quiz/questions/{question_id}", response_model=Question)
def get_live_question(
    question_id: str,
    activity_id: int,
    user_info: dict = Depends(get_current_user_info_dep),
):
    """获取指定现场活动中的单题，供超级管理员和答题人员使用。"""
    _ensure_expected_live_activity(activity_id, user_info["role"])
    if not active_activity_contains_question(question_id, activity_id):
        raise HTTPException(status_code=403, detail="该题目不属于当前答题活动")
    question = get_question_by_id(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    return question


@router.get("/api/questions/{question_id}", response_model=Question)
def get_question(question_id: str, user_info: dict = Depends(get_current_user_info_dep)):
    """获取单个题目（包含答案，需登录）"""
    username = user_info["username"]
    role = user_info["role"]

    _ensure_quiz_operator_question(question_id, role)

    question = get_question_by_id(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    # 题目管理员只能查看自己创建的题目
    if role == "question_admin":
        author_list = question.author if isinstance(question.author, list) else []
        if username not in author_list:
            raise HTTPException(status_code=403, detail="只能查看自己创建的题目")

    return question


@router.post("/api/answer", response_model=AnswerResponse)
def submit_answer(submit: AnswerSubmit, user_info: dict = Depends(get_current_user_info_dep)):
    """提交答案（需登录）"""
    _ensure_quiz_operator_question(submit.question_id, user_info["role"])
    question = get_question_by_id(submit.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    # 简单的字符串比较，忽略大小写和前后空格
    user_answer = submit.answer.strip().lower()
    correct_answer = question.answer.strip().lower()
    is_correct = user_answer == correct_answer

    return AnswerResponse(
        correct=is_correct,
        correct_answer=question.answer
    )


@router.post("/api/track/random/{question_id}")
def track_random_click(
    question_id: str,
    activity_id: Optional[int] = None,
    user_info: dict = Depends(get_current_user_info_dep),
):
    """记录随机按钮点击（需登录）"""
    role = user_info["role"]
    if role == "quiz_operator" and activity_id is None:
        raise HTTPException(status_code=400, detail="缺少当前活动 ID")
    if role in LIVE_QUIZ_ROLES and activity_id is not None:
        recorded_activity_id = increment_active_activity_stat(
            question_id,
            "random",
            activity_id,
        )
        if recorded_activity_id is None:
            raise HTTPException(status_code=409, detail="当前活动已切换或题目不在活动中")
        return {
            "message": "记录成功",
            "question_id": question_id,
            "activity_id": recorded_activity_id,
        }
    success = increment_random_clicks(question_id)
    if not success:
        raise HTTPException(status_code=404, detail="题目不存在")

    return {"message": "记录成功", "question_id": question_id}


@router.post("/api/track/hide/{question_id}")
def track_hide_click(
    question_id: str,
    activity_id: Optional[int] = None,
    user_info: dict = Depends(get_current_user_info_dep),
):
    """记录隐藏按钮点击（需登录）"""
    role = user_info["role"]
    if role == "quiz_operator" and activity_id is None:
        raise HTTPException(status_code=400, detail="缺少当前活动 ID")
    if role in LIVE_QUIZ_ROLES and activity_id is not None:
        recorded_activity_id = increment_active_activity_stat(
            question_id,
            "hide",
            activity_id,
        )
        if recorded_activity_id is None:
            raise HTTPException(status_code=409, detail="当前活动已切换或题目不在活动中")
        return {
            "message": "记录成功",
            "question_id": question_id,
            "activity_id": recorded_activity_id,
        }
    success = increment_hide_clicks(question_id)
    if not success:
        raise HTTPException(status_code=404, detail="题目不存在")

    return {"message": "记录成功", "question_id": question_id}


# ============= 管理员接口 =============

@router.get("/api/admin/stats")
def get_stats(user_info: dict = Depends(require_content_admin)):
    """获取题目统计信息"""
    username = user_info["username"]
    role = user_info["role"]

    # 题目管理员只能看到自己创建的题目的统计
    author_filter = None if role == "super_admin" else username

    by_tag = get_question_tag_counts(author=author_filter)
    return {
        "total": get_questions_count(author=author_filter),
        "concert": by_tag.get("concert", 0),
        "vlog": by_tag.get("vlog", 0),
        "common": by_tag.get("common", 0),
        "by_tag": by_tag,
    }


@router.post("/api/admin/questions/{question_id}/reset_stats")
def reset_stats_single(question_id: str, user_info: dict = Depends(require_content_admin)):
    """单题归零"""
    # 题目管理员只能操作自己创建的题目
    role = user_info["role"]
    username = user_info["username"]

    if role != "super_admin":
        question = get_question_by_id(question_id)
        if not question:
            raise HTTPException(status_code=404, detail="题目不存在")
        # 检查是否是本人创建的题目
        author_list = question.author if isinstance(question.author, list) else []
        if username not in author_list:
            raise HTTPException(status_code=403, detail="只能操作自己创建的题目")

    success = reset_question_stats(question_id)
    if not success:
        raise HTTPException(status_code=404, detail="题目不存在")
    return {"message": "归零成功", "question_id": question_id}


@router.post("/api/admin/questions/reset_stats_all")
def reset_stats_all(_: dict = Depends(require_super_admin)):
    """全部归零 - 只有超级管理员可以使用"""
    count = reset_all_questions_stats()
    return {"message": f"已归零 {count} 道题目的统计"}


@router.get("/api/admin/questions", response_model=PaginatedQuestions)
def admin_list_questions(
    page: int = 1,
    page_size: int = 10,
    keyword: Optional[str] = None,
    tag: Optional[str] = None,
    sort_order: str = 'asc',
    author: Optional[str] = None,
    user_info: dict = Depends(require_content_admin)
):
    """管理员获取题目（分页）- 题目管理员只能看到自己创建的题目"""
    username = user_info["username"]
    role = user_info["role"]

    # 超级管理员可以看到所有题目，题目管理员只能看到自己创建的
    # 如果超级管理员指定了author筛选，则使用指定的作者
    if role == "super_admin":
        author_filter = author
    else:
        author_filter = username  # 题目管理员只能看到自己的

    questions = get_all_questions(page, page_size, keyword, tag, sort_order, author_filter)
    total = get_questions_count(keyword, tag, author_filter)
    return PaginatedQuestions(
        total=total,
        page=page,
        page_size=page_size,
        items=questions
    )


@router.get("/api/admin/questions/{question_id}", response_model=Question)
def admin_get_question(question_id: str, user_info: dict = Depends(require_content_admin)):
    """管理员获取单个题目（包含答案）"""
    username = user_info["username"]
    role = user_info["role"]

    question = get_question_by_id(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    # 题目管理员只能查看自己创建的题目
    if role != "super_admin":
        author_list = question.author if isinstance(question.author, list) else []
        if username not in author_list:
            raise HTTPException(status_code=403, detail="只能查看自己创建的题目")

    return question


@router.post("/api/admin/questions", response_model=Question)
def admin_create_question(question_data: QuestionCreate, user_info: dict = Depends(require_content_admin)):
    """管理员创建题目"""
    username = user_info["username"]
    role = user_info["role"]

    # 生成自增ID
    question_id = get_next_question_id()

    # 题目管理员不能伪造或追加其他出题人。
    author = [username] if role == "question_admin" else question_data.author

    question = Question(
        id=question_id,
        question=question_data.question,
        answer=question_data.answer,
        resources=question_data.resources,
        tag=_clean_tag(question_data.tag),
        author=author
    )
    return create_question(question)


@router.put("/api/admin/questions/{question_id}", response_model=Question)
def admin_update_question(
    question_id: str,
    question_data: QuestionUpdate,
    user_info: dict = Depends(require_content_admin)
):
    """管理员更新题目"""
    username = user_info["username"]
    role = user_info["role"]

    existing = get_question_by_id(question_id)
    if not existing:
        raise HTTPException(status_code=404, detail="题目不存在")

    # 题目管理员只能更新自己创建的题目
    if role != "super_admin":
        author_list = existing.author if isinstance(existing.author, list) else []
        if username not in author_list:
            raise HTTPException(status_code=403, detail="只能更新自己创建的题目")

    _ensure_question_not_in_started_activity(question_id)

    updates = question_data.model_dump(exclude_unset=True)
    if "tag" in updates and updates["tag"] is not None:
        updates["tag"] = _clean_tag(updates["tag"])
    if role != "super_admin" and "author" in updates:
        updates["author"] = [username]
    updated = update_question(question_id, updates)
    return updated


@router.delete("/api/admin/questions/{question_id}")
def admin_delete_question(question_id: str, user_info: dict = Depends(require_content_admin)):
    """管理员删除题目"""
    username = user_info["username"]
    role = user_info["role"]

    # 题目管理员只能删除自己创建的题目
    if role != "super_admin":
        question = get_question_by_id(question_id)
        if not question:
            raise HTTPException(status_code=404, detail="题目不存在")
        author_list = question.author if isinstance(question.author, list) else []
        if username not in author_list:
            raise HTTPException(status_code=403, detail="只能删除自己创建的题目")

    _ensure_question_not_in_started_activity(question_id)

    if not delete_question(question_id):
        raise HTTPException(status_code=404, detail="题目不存在")
    return {"message": "删除成功"}


@router.post("/api/admin/questions/batch_import", response_model=QuestionBatchImportResult)
def admin_batch_import_questions(
    batch_data: QuestionBatchImport,
    _: dict = Depends(require_super_admin),
):
    """仅超级管理员可以批量导入题目。"""
    success_count = 0
    fail_count = 0
    errors = []

    for index, item in enumerate(batch_data.questions):
        try:
            cleaned_tag = _clean_tag(item.tag)
            # 处理制作人：确保所有制作人都存在于数据库中
            if item.author:
                for author_name in item.author:
                    if author_name.strip():  # 跳过空字符串
                        get_or_create_producer(author_name.strip())
            
            if item.id:
                # 有ID，尝试更新
                existing = get_question_by_id(item.id)
                if not existing:
                    errors.append({
                        "index": index,
                        "id": item.id or "",
                        "error": f"题目ID {item.id} 不存在"
                    })
                    fail_count += 1
                    continue

                activity = get_started_activity_using_question(item.id)
                if activity:
                    errors.append({
                        "index": index,
                        "id": item.id,
                        "error": f"题目正在被活动“{activity['name']}”使用，跳过更新"
                    })
                    fail_count += 1
                    continue
                
                # 所有可编辑内容都相同时才跳过，标签变化也应正常更新。
                if (
                    existing.question == item.question
                    and existing.answer.lower() == item.answer.lower()
                    and existing.resources == item.resources
                    and existing.tag == cleaned_tag
                    and existing.author == item.author
                ):
                    errors.append({
                        "index": index,
                        "id": item.id,
                        "error": f"题目内容未变化，跳过更新"
                    })
                    fail_count += 1
                    continue
                
                # 更新题目
                updates = {
                    "question": item.question,
                    "answer": item.answer,
                    "resources": item.resources,
                    "tag": cleaned_tag,
                    "author": item.author
                }
                update_question(item.id, updates)
                success_count += 1
            else:
                # 无ID，检查是否存在重复题目
                duplicate_id = check_duplicate_question(item.question, item.answer)
                if duplicate_id:
                    errors.append({
                        "index": index,
                        "id": "",
                        "error": f"题目已存在（ID: {duplicate_id}），跳过创建"
                    })
                    fail_count += 1
                    continue
                
                # 创建新题目
                question_id = get_next_question_id()
                question = Question(
                    id=question_id,
                    question=item.question,
                    answer=item.answer,
                    resources=item.resources,
                    tag=cleaned_tag,
                    author=item.author,
                    random_clicks=0,
                    hide_clicks=0
                )
                create_question(question)
                success_count += 1
        except Exception as e:
            errors.append({
                "index": index,
                "id": item.id or "",
                "error": str(e)
            })
            fail_count += 1

    return QuestionBatchImportResult(
        success_count=success_count,
        fail_count=fail_count,
        errors=errors
    )
