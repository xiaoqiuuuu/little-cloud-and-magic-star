"""认证相关的API路由"""

from fastapi import APIRouter, HTTPException, Depends
from models import AdminLogin, Token
from database import verify_admin
from auth import create_access_token, get_current_user_info

router = APIRouter(prefix="/api/admin", tags=["认证"])


@router.post("/login", response_model=Token)
def admin_login(login: AdminLogin):
    """管理员登录"""
    print(f"🔐 登录尝试 - 用户名: '{login.username}', 密码: '{login.password}'")

    admin_info = verify_admin(login.username, login.password)
    if not admin_info:
        print(f"❌ 登录失败 - 用户名或密码错误")
        raise HTTPException(
            status_code=401,
            detail="用户名或密码错误"
        )

    username, role = admin_info
    print(f"✅ 登录成功 - 用户: {username}, 角色: {role}")
    access_token = create_access_token(data={"sub": username}, role=role)
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me")
def get_current_user(user_info: dict = Depends(get_current_user_info)):
    """获取当前登录用户信息"""
    return user_info
