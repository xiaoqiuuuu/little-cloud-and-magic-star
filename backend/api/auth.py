"""认证相关的API路由"""

from fastapi import APIRouter, HTTPException
from models import AdminLogin, Token
from database import verify_admin
from auth import create_access_token

router = APIRouter(prefix="/api/admin", tags=["认证"])


@router.post("/login", response_model=Token)
def admin_login(login: AdminLogin):
    """管理员登录"""
    print(f"🔐 登录尝试 - 用户名: '{login.username}', 密码: '{login.password}'")
    
    if not verify_admin(login.username, login.password):
        print(f"❌ 登录失败 - 用户名或密码错误")
        raise HTTPException(
            status_code=401,
            detail="用户名或密码错误"
        )

    print(f"✅ 登录成功 - 用户: {login.username}")
    access_token = create_access_token(data={"sub": login.username})
    return Token(access_token=access_token, token_type="bearer")
