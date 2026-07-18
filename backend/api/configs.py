"""系统配置相关的API路由"""

from fastapi import APIRouter, HTTPException, Depends
from models import ConfigUpdate, ConfigResponse
from database import get_config, set_config
from .dependencies import get_current_user, require_super_admin

router = APIRouter(tags=["系统配置"])

@router.get("/api/configs/{key}", response_model=ConfigResponse)
def get_config_item(key: str, username: str = Depends(get_current_user)):
    """获取配置项（需登录）"""
    value = get_config(key)
    if value is None:
        raise HTTPException(status_code=404, detail="配置项不存在")
    return ConfigResponse(key=key, value=value)

@router.put("/api/configs", response_model=ConfigResponse)
def update_config_item(config: ConfigUpdate, _: dict = Depends(require_super_admin)):
    """更新配置项（仅超级管理员）"""
    success = set_config(config.key, config.value)
    if not success:
        raise HTTPException(status_code=500, detail="更新配置失败")
    return ConfigResponse(key=config.key, value=config.value)
