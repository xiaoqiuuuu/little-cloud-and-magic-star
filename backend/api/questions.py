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
    increment_random_clicks, increment_hide_clicks,
    reset_question_stats, reset_all_questions_stats,
    check_duplicate_question
)
from database.producers import get_or_create_producer
from .dependencies import get_current_user

router = APIRouter(tags=["题目"])


# ============= 公开接口（需要登录） =============

@router.get("/api/questions/ids")
def list_question_ids(username: str = Depends(get_current_user)):
    """获取所有题目ID列表（轻量级）"""
    return get_all_question_ids()


@router.get("/api/questions", response_model=List[Question])
def list_questions(username: str = Depends(get_current_user)):
    """获取所有题目（包含答案，需登录）"""
    questions = get_all_questions(page_size=0)
    return questions


@router.get("/api/questions/{question_id}", response_model=Question)
def get_question(question_id: str, username: str = Depends(get_current_user)):
    """获取单个题目（包含答案，需登录）"""
    question = get_question_by_id(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    return question


@router.post("/api/answer", response_model=AnswerResponse)
def submit_answer(submit: AnswerSubmit, username: str = Depends(get_current_user)):
    """提交答案（需登录）"""
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
def track_random_click(question_id: str, username: str = Depends(get_current_user)):
    """记录随机按钮点击（需登录）"""
    success = increment_random_clicks(question_id)
    if not success:
        raise HTTPException(status_code=404, detail="题目不存在")

    return {"message": "记录成功", "question_id": question_id}


@router.post("/api/track/hide/{question_id}")
def track_hide_click(question_id: str, username: str = Depends(get_current_user)):
    """记录隐藏按钮点击（需登录）"""
    success = increment_hide_clicks(question_id)
    if not success:
        raise HTTPException(status_code=404, detail="题目不存在")

    return {"message": "记录成功", "question_id": question_id}


# ============= 管理员接口 =============

@router.get("/api/admin/stats")
def get_stats(username: str = Depends(get_current_user)):
    """获取题目统计信息"""
    return {
        "total": get_questions_count(),
        "concert": get_questions_count(tag="concert"),
        "vlog": get_questions_count(tag="vlog"),
        "common": get_questions_count(tag="common")
    }


@router.post("/api/admin/questions/{question_id}/reset_stats")
def reset_stats_single(question_id: str, username: str = Depends(get_current_user)):
    """单题归零"""
    success = reset_question_stats(question_id)
    if not success:
        raise HTTPException(status_code=404, detail="题目不存在")
    return {"message": "归零成功", "question_id": question_id}


@router.post("/api/admin/questions/reset_stats_all")
def reset_stats_all(username: str = Depends(get_current_user)):
    """全部归零"""
    count = reset_all_questions_stats()
    return {"message": f"已归零 {count} 道题目的统计"}


@router.get("/api/admin/questions", response_model=PaginatedQuestions)
def admin_list_questions(
    page: int = 1,
    page_size: int = 10,
    keyword: Optional[str] = None,
    tag: Optional[str] = None,
    sort_order: str = 'asc',
    username: str = Depends(get_current_user)
):
    """管理员获取所有题目（分页）"""
    questions = get_all_questions(page, page_size, keyword, tag, sort_order)
    total = get_questions_count(keyword, tag)
    return PaginatedQuestions(
        total=total,
        page=page,
        page_size=page_size,
        items=questions
    )


@router.get("/api/admin/questions/{question_id}", response_model=Question)
def admin_get_question(question_id: str, username: str = Depends(get_current_user)):
    """管理员获取单个题目（包含答案）"""
    question = get_question_by_id(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    return question


@router.post("/api/admin/questions", response_model=Question)
def admin_create_question(question_data: QuestionCreate, username: str = Depends(get_current_user)):
    """管理员创建题目"""
    # 生成自增ID
    question_id = get_next_question_id()
    question = Question(
        id=question_id,
        question=question_data.question,
        answer=question_data.answer,
        resources=question_data.resources,
        tag=question_data.tag,
        author=question_data.author
    )
    return create_question(question)


@router.put("/api/admin/questions/{question_id}", response_model=Question)
def admin_update_question(
    question_id: str,
    question_data: QuestionUpdate,
    username: str = Depends(get_current_user)
):
    """管理员更新题目"""
    existing = get_question_by_id(question_id)
    if not existing:
        raise HTTPException(status_code=404, detail="题目不存在")

    updates = question_data.dict(exclude_unset=True)
    updated = update_question(question_id, updates)
    return updated


@router.delete("/api/admin/questions/{question_id}")
def admin_delete_question(question_id: str, username: str = Depends(get_current_user)):
    """管理员删除题目"""
    if not delete_question(question_id):
        raise HTTPException(status_code=404, detail="题目不存在")
    return {"message": "删除成功"}


@router.post("/api/admin/questions/batch_import", response_model=QuestionBatchImportResult)
def admin_batch_import_questions(
    batch_data: QuestionBatchImport,
    username: str = Depends(get_current_user)
):
    """管理员批量导入题目"""
    success_count = 0
    fail_count = 0
    errors = []

    for index, item in enumerate(batch_data.questions):
        try:
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
                
                # 检查内容是否有变化（题目和答案都相同则认为无变化）
                if (existing.question == item.question and 
                    existing.answer.lower() == item.answer.lower()):
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
                    "tag": item.tag,
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
                    tag=item.tag,
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
