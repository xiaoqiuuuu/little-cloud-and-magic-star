from database import reset_question_stats, reset_all_questions_stats

import os
from upload import router as upload_router
from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from models import (
    Question, QuestionCreate, QuestionUpdate,
    AnswerSubmit, AnswerResponse, AdminLogin, Token,
    Material, MaterialCreate, MaterialUpdate,
    Producer, ProducerCreate, ProducerUpdate,
    PaginatedQuestions, PaginatedMaterials, PaginatedProducers
)
from database import (
    init_db, get_all_questions, get_question_by_id, get_all_question_ids,
    create_question, update_question, delete_question,
    verify_admin, get_next_question_id,
    get_all_materials, get_material_by_id, get_next_material_id,
    create_material, update_material, delete_material,
    get_all_producers, get_producer_by_id, create_producer,
    update_producer, delete_producer,
    get_questions_count, get_materials_count, get_producers_count
)
from auth import create_access_token, verify_token

# 初始化数据库
init_db()

app = FastAPI(title="答题系统 API")

# 注册上传接口
app.include_router(upload_router)

# 静态文件服务（用于访问上传的文件）
app.mount("/uploads", StaticFiles(directory=os.path.join(
    os.path.dirname(__file__), "uploads")), name="uploads")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= 公开接口（不需要登录） =============


@app.get("/")
def read_root():
    return {"message": "答题系统 API"}


@app.get("/api/questions/ids")
def list_question_ids(username: str = Depends(verify_token)):
    """获取所有题目ID列表（轻量级）"""
    return get_all_question_ids()


@app.get("/api/questions", response_model=List[Question])
def list_questions(username: str = Depends(verify_token)):
    """获取所有题目（包含答案，需登录）"""
    questions = get_all_questions(page_size=0)
    return questions


@app.get("/api/questions/{question_id}", response_model=Question)
def get_question(question_id: str, username: str = Depends(verify_token)):
    """获取单个题目（包含答案，需登录）"""
    question = get_question_by_id(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    return question


@app.post("/api/answer", response_model=AnswerResponse)
def submit_answer(submit: AnswerSubmit, username: str = Depends(verify_token)):
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


@app.post("/api/track/random/{question_id}")
def track_random_click(question_id: str, username: str = Depends(verify_token)):
    """记录随机按钮点击（需登录）"""
    from database import increment_random_clicks

    success = increment_random_clicks(question_id)
    if not success:
        raise HTTPException(status_code=404, detail="题目不存在")

    return {"message": "记录成功", "question_id": question_id}


@app.post("/api/track/hide/{question_id}")
def track_hide_click(question_id: str, username: str = Depends(verify_token)):
    """记录隐藏按钮点击（需登录）"""
    from database import increment_hide_clicks

    success = increment_hide_clicks(question_id)
    if not success:
        raise HTTPException(status_code=404, detail="题目不存在")

    return {"message": "记录成功", "question_id": question_id}


# ============= 管理员接口（需要登录） =============

# 单题归零
@app.post("/api/admin/questions/{question_id}/reset_stats")
def reset_stats_single(question_id: str, username: str = Depends(verify_token)):
    success = reset_question_stats(question_id)
    if not success:
        raise HTTPException(status_code=404, detail="题目不存在")
    return {"message": "归零成功", "question_id": question_id}

# 全部归零


@app.post("/api/admin/questions/reset_stats_all")
def reset_stats_all(username: str = Depends(verify_token)):
    count = reset_all_questions_stats()
    return {"message": f"已归零 {count} 道题目的统计"}


@app.post("/api/admin/login", response_model=Token)
def admin_login(login: AdminLogin):
    """管理员登录"""
    if not verify_admin(login.username, login.password):
        raise HTTPException(
            status_code=401,
            detail="用户名或密码错误"
        )

    access_token = create_access_token(data={"sub": login.username})
    return Token(access_token=access_token, token_type="bearer")

# ============= 管理员接口（需要登录） =============


@app.get("/api/admin/stats")
def get_stats(username: str = Depends(verify_token)):
    """获取题目统计信息"""
    return {
        "total": get_questions_count(),
        "concert": get_questions_count(tag="concert"),
        "vlog": get_questions_count(tag="vlog"),
        "common": get_questions_count(tag="common")
    }


@app.get("/api/admin/questions", response_model=PaginatedQuestions)
def admin_list_questions(
    page: int = 1,
    page_size: int = 10,
    keyword: Optional[str] = None,
    tag: Optional[str] = None,
    sort_order: str = 'asc',
    username: str = Depends(verify_token)
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


@app.get("/api/admin/questions/{question_id}", response_model=Question)
def admin_get_question(question_id: str, username: str = Depends(verify_token)):
    """管理员获取单个题目（包含答案）"""
    question = get_question_by_id(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    return question


@app.post("/api/admin/questions", response_model=Question)
def admin_create_question(question_data: QuestionCreate, username: str = Depends(verify_token)):
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


@app.put("/api/admin/questions/{question_id}", response_model=Question)
def admin_update_question(
    question_id: str,
    question_data: QuestionUpdate,
    username: str = Depends(verify_token)
):
    """管理员更新题目"""
    existing = get_question_by_id(question_id)
    if not existing:
        raise HTTPException(status_code=404, detail="题目不存在")

    updates = question_data.dict(exclude_unset=True)
    updated = update_question(question_id, updates)
    return updated


@app.delete("/api/admin/questions/{question_id}")
def admin_delete_question(question_id: str, username: str = Depends(verify_token)):
    """管理员删除题目"""
    if not delete_question(question_id):
        raise HTTPException(status_code=404, detail="题目不存在")
    return {"message": "删除成功"}


# ============= 物料管理接口（需要登录） =============


@app.get("/api/admin/materials", response_model=PaginatedMaterials)
def admin_list_materials(page: int = 1, page_size: int = 10, username: str = Depends(verify_token)):
    """管理员获取所有物料（分页）"""
    materials = get_all_materials(page, page_size)
    total = get_materials_count()
    return PaginatedMaterials(
        total=total,
        page=page,
        page_size=page_size,
        items=materials
    )


@app.get("/api/admin/materials/{material_id}", response_model=Material)
def admin_get_material(material_id: str, username: str = Depends(verify_token)):
    """管理员获取单个物料"""
    material = get_material_by_id(material_id)
    if not material:
        raise HTTPException(status_code=404, detail="物料不存在")
    return material


@app.post("/api/admin/materials", response_model=Material)
def admin_create_material(material_data: MaterialCreate, username: str = Depends(verify_token)):
    """管理员创建物料"""
    material_id = get_next_material_id()
    material = Material(
        id=material_id,
        name=material_data.name,
        description=material_data.description,
        creator=material_data.creator,
        resources=material_data.resources
    )
    return create_material(material)


@app.put("/api/admin/materials/{material_id}", response_model=Material)
def admin_update_material(
    material_id: str,
    material_data: MaterialUpdate,
    username: str = Depends(verify_token)
):
    """管理员更新物料"""
    existing = get_material_by_id(material_id)
    if not existing:
        raise HTTPException(status_code=404, detail="物料不存在")

    updates = material_data.dict(exclude_unset=True)
    updated = update_material(material_id, updates)
    return updated


@app.delete("/api/admin/materials/{material_id}")
def admin_delete_material(material_id: str, username: str = Depends(verify_token)):
    """管理员删除物料"""
    if not delete_material(material_id):
        raise HTTPException(status_code=404, detail="物料不存在")
    return {"message": "删除成功"}

# ============= 制作人管理接口（需要登录） =============


@app.get("/api/admin/producers", response_model=PaginatedProducers)
def admin_list_producers(page: int = 1, page_size: int = 10, username: str = Depends(verify_token)):
    """管理员获取所有制作人（分页）"""
    producers = get_all_producers(page, page_size)
    total = get_producers_count()
    return PaginatedProducers(
        total=total,
        page=page,
        page_size=page_size,
        items=producers
    )


@app.post("/api/admin/producers", response_model=Producer)
def admin_create_producer(producer_data: ProducerCreate, username: str = Depends(verify_token)):
    """管理员创建制作人"""
    return create_producer(producer_data.name, producer_data.profile_url)


@app.put("/api/admin/producers/{producer_id}", response_model=Producer)
def admin_update_producer(
    producer_id: int,
    producer_data: ProducerUpdate,
    username: str = Depends(verify_token)
):
    """管理员更新制作人"""
    existing = get_producer_by_id(producer_id)
    if not existing:
        raise HTTPException(status_code=404, detail="制作人不存在")

    updates = producer_data.dict(exclude_unset=True)
    updated = update_producer(producer_id, updates)
    return updated


@app.delete("/api/admin/producers/{producer_id}")
def admin_delete_producer(producer_id: int, username: str = Depends(verify_token)):
    """管理员删除制作人"""
    if not delete_producer(producer_id):
        raise HTTPException(status_code=404, detail="制作人不存在")
    return {"message": "删除成功"}


if __name__ == "__main__":
    import uvicorn
    # uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
    # m命令行启动
    # uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    pass
