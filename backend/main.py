import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from upload import router as upload_router
from api import (
    auth_router,
    questions_router,
    materials_router,
    producers_router
)

# 初始化数据库
init_db()

# 创建FastAPI应用
app = FastAPI(title="答题系统 API")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件服务（用于访问上传的文件）
app.mount("/uploads", StaticFiles(directory=os.path.join(
    os.path.dirname(__file__), "uploads")), name="uploads")

# 注册所有路由
app.include_router(upload_router)  # 上传接口
app.include_router(auth_router)  # 认证接口
app.include_router(questions_router)  # 题目接口
app.include_router(materials_router)  # 物料接口
app.include_router(producers_router)  # 制作人接口


@app.get("/")
def read_root():
    """根路径"""
    return {"message": "答题系统 API"}


if __name__ == "__main__":
    import uvicorn
    # uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
    # m命令行启动
    # uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    # ENVIRONMENT=production uvicorn main:app --host 0.0.0.0 --port 8000
    pass
