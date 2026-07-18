import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# 所有运行方式统一从项目根目录加载环境变量。
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

# 导入 auth 模块（必须在 api 之前，确保 parent auth 被加载）
import auth

from database import init_db
from upload import router as upload_router
from api import (
    auth_router,
    questions_router,
    materials_router,
    producers_router,
    configs_router,
    roles_router,
    stats_router,
    users_router,
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
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# 注册所有路由 - 注意：API路由必须在静态也路由之前注册
app.include_router(upload_router)  # 上传接口
app.include_router(auth_router)  # 认证接口
app.include_router(questions_router)  # 题目接口
app.include_router(materials_router)  # 物料接口
app.include_router(producers_router)  # 制作人接口
app.include_router(configs_router)  # 系统配置接口
app.include_router(roles_router)  # 角色接口
app.include_router(stats_router)  # 统计接口
app.include_router(users_router)  # 人员管理接口


@app.get("/api/health")
def health_check():
    """供负载均衡和自动部署使用的健康检查。"""
    return {"status": "ok", "message": "Backend is running"}

# 生产环境：挂载前端静态文件
# 假设前端构建后的 dist 目录被放置在 backend/dist 下
dist_dir = os.path.join(os.path.dirname(__file__), "dist")

if os.path.exists(dist_dir):
    # 挂载静态资源 assets
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    
    # 挂载 favicon 等根目录静态文件 (排除 index.html以免冲突)
    # 这里简单起见，主要处理 SPA 的路由
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str, request: Request):
        # 如果是 API 路径，前面的 include_router 已经处理了，这里不会走到
        # 如果是 uploads，上面 mount 也处理了
        
        # 检查文件是否存在于 dist 根目录 (例如 favicon.ico, logo.png)
        potential_file_path = os.path.join(dist_dir, full_path)
        if os.path.isfile(potential_file_path):
             return FileResponse(potential_file_path)
             
        # 其余所有路径返回 index.html (SPA 支持)
        return FileResponse(os.path.join(dist_dir, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("ENVIRONMENT", "development") == "development",
    )
