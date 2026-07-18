import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from uuid import uuid4

from auth import get_current_user_info

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter()

ALLOWED_EXTS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
                '.mp4', '.mov', '.avi', '.mkv', '.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a'}
MAX_SIZE = 10 * 1024 * 1024  # 10MB


@router.post('/api/upload')
async def upload_file(
    file: UploadFile = File(...),
    user_info: dict = Depends(get_current_user_info),
):
    if user_info["role"] == "quiz_operator":
        raise HTTPException(status_code=403, detail="答题人员不能上传文件")
    if not file.filename:
        raise HTTPException(status_code=400, detail='文件名不存在')
    ext = os.path.splitext(file.filename)[-1].lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail='文件类型不支持')
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail='文件大小不能超过10M')
    fname = f"{uuid4().hex}{ext}"
    fpath = os.path.join(UPLOAD_DIR, fname)
    with open(fpath, 'wb') as f:
        f.write(contents)
    # 这里假设静态文件服务路径为 /uploads/
    url = f"/uploads/{fname}"
    return JSONResponse({'url': url, 'name': file.filename})
