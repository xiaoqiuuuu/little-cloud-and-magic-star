from fastapi import APIRouter, Depends, File, UploadFile

from api.dependencies import require_any_permission
from database.rbac import (
    CONTENT_ROLES_MANAGE,
    HOMEPAGE_MANAGE,
    MATERIALS_MANAGE,
    QUESTIONS_MANAGE,
)
from upload_storage import save_uploaded_file


router = APIRouter()

@router.post('/api/upload')
async def upload_file(
    file: UploadFile = File(...),
    _: dict = Depends(
        require_any_permission(
            QUESTIONS_MANAGE,
            MATERIALS_MANAGE,
            CONTENT_ROLES_MANAGE,
            HOMEPAGE_MANAGE,
        )
    ),
):
    return await save_uploaded_file(file)
