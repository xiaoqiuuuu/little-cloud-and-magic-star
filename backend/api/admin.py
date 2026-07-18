"""管理员认证相关 API。"""

from fastapi import APIRouter, Depends, HTTPException, status

from auth import (
    ACCESS_TOKEN_EXPIRES_IN,
    REFRESH_TOKEN_EXPIRES_IN,
    TokenPair,
    create_token_pair,
    get_current_user_info,
    validate_refresh_token,
)
from database import increment_admin_token_version, verify_admin
from database.tokens import (
    create_refresh_token,
    revoke_all_refresh_tokens,
    rotate_refresh_token,
)
from models import AdminLogin, RefreshTokenRequest, Token


router = APIRouter(prefix="/api/admin", tags=["认证"])


def _token_response(pair: TokenPair) -> Token:
    return Token(
        access_token=pair.access_token,
        refresh_token=pair.refresh_token,
        access_token_expires_in=ACCESS_TOKEN_EXPIRES_IN,
        refresh_token_expires_in=REFRESH_TOKEN_EXPIRES_IN,
    )


@router.post("/login", response_model=Token)
def admin_login(login: AdminLogin):
    """登录并签发有效期 1 天/30 天的 Access 与 Refresh Token。"""
    admin = verify_admin(login.username.strip(), login.password)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误，或账号已停用",
        )

    pair = create_token_pair(admin)
    create_refresh_token(
        pair.refresh_jti,
        admin["id"],
        pair.refresh_expires_at,
    )
    return _token_response(pair)


@router.post("/refresh", response_model=Token)
def refresh_access_token(request: RefreshTokenRequest):
    """轮换 Refresh Token，并签发新的双 Token。"""
    admin, old_payload = validate_refresh_token(request.refresh_token)
    pair = create_token_pair(admin)
    rotated = rotate_refresh_token(
        str(old_payload["jti"]),
        pair.refresh_jti,
        admin["id"],
        pair.refresh_expires_at,
    )
    if not rotated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh Token 已失效或已被使用",
        )
    return _token_response(pair)


@router.post("/logout")
def admin_logout(user_info: dict = Depends(get_current_user_info)):
    """退出当前账号，并使该账号现有 Token 全部失效。"""
    revoke_all_refresh_tokens(user_info["id"])
    increment_admin_token_version(user_info["id"])
    return {"message": "已退出登录"}


@router.get("/me")
def get_current_user(user_info: dict = Depends(get_current_user_info)):
    """获取数据库中的实时登录账号信息。"""
    return user_info
