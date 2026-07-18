"""管理员 JWT 双 Token 认证。"""

import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from database.admins import get_admin_by_username
from database.tokens import get_refresh_token_admin_id


PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if ENVIRONMENT == "production":
        raise RuntimeError("生产环境必须通过 SECRET_KEY 配置 JWT 密钥")
    SECRET_KEY = "development-only-secret-key"

ALGORITHM = "HS256"
TOKEN_ISSUER = "little-cloud-admin"
TOKEN_AUDIENCE = "little-cloud-admin-api"
ACCESS_TOKEN_EXPIRES = timedelta(days=1)
REFRESH_TOKEN_EXPIRES = timedelta(days=30)
ACCESS_TOKEN_EXPIRES_IN = int(ACCESS_TOKEN_EXPIRES.total_seconds())
REFRESH_TOKEN_EXPIRES_IN = int(REFRESH_TOKEN_EXPIRES.total_seconds())

security = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class TokenPair:
    access_token: str
    refresh_token: str
    refresh_jti: str
    refresh_expires_at: datetime


def _unauthorized(detail: str = "无效或已过期的认证凭据") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _create_token(
    admin: Dict[str, Any],
    token_type: str,
    expires_delta: timedelta,
    *,
    jti: Optional[str] = None,
) -> Tuple[str, str, datetime]:
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + expires_delta
    token_jti = jti or uuid4().hex
    payload = {
        "sub": admin["username"],
        "role": admin["role"],
        "type": token_type,
        "ver": admin["token_version"],
        "jti": token_jti,
        "iss": TOKEN_ISSUER,
        "aud": TOKEN_AUDIENCE,
        "iat": issued_at,
        "exp": expires_at,
    }
    encoded = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return encoded, token_jti, expires_at


def create_token_pair(admin: Dict[str, Any]) -> TokenPair:
    access_token, _, _ = _create_token(
        admin,
        "access",
        ACCESS_TOKEN_EXPIRES,
    )
    refresh_token, refresh_jti, refresh_expires_at = _create_token(
        admin,
        "refresh",
        REFRESH_TOKEN_EXPIRES,
    )
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        refresh_jti=refresh_jti,
        refresh_expires_at=refresh_expires_at,
    )


def _decode_token(token: str, expected_type: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            audience=TOKEN_AUDIENCE,
            issuer=TOKEN_ISSUER,
        )
    except JWTError as exc:
        raise _unauthorized() from exc

    if payload.get("type") != expected_type:
        raise _unauthorized("Token 类型不正确")
    if not payload.get("sub") or not payload.get("jti"):
        raise _unauthorized()
    return payload


def _load_token_admin(payload: Dict[str, Any]) -> Dict[str, Any]:
    admin = get_admin_by_username(str(payload["sub"]))
    if not admin or not admin["is_active"]:
        raise _unauthorized("账号不存在或已被停用")

    try:
        token_version = int(payload.get("ver", -1))
    except (TypeError, ValueError) as exc:
        raise _unauthorized() from exc
    if token_version != admin["token_version"]:
        raise _unauthorized("登录状态已失效，请重新登录")
    return admin


def validate_refresh_token(token: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    payload = _decode_token(token, "refresh")
    admin = _load_token_admin(payload)
    registered_admin_id = get_refresh_token_admin_id(str(payload["jti"]))
    if registered_admin_id != admin["id"]:
        raise _unauthorized("Refresh Token 已失效或已被使用")
    return admin, payload


def get_current_user_info_from_token(token: str) -> Dict[str, Any]:
    payload = _decode_token(token, "access")
    admin = _load_token_admin(payload)
    return {
        "id": admin["id"],
        "username": admin["username"],
        "role": admin["role"],
        "is_active": admin["is_active"],
    }


def get_current_user_info(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    """验证 Access Token，并返回数据库中的实时账号与角色信息。"""
    if not credentials:
        raise _unauthorized("缺少认证凭据")
    return get_current_user_info_from_token(credentials.credentials)


def verify_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Tuple[str, str]:
    """兼容现有接口：返回（用户名，数据库实时角色）。"""
    if not credentials:
        raise _unauthorized("缺少认证凭据")
    user_info = get_current_user_info_from_token(credentials.credentials)
    return user_info["username"], user_info["role"]
