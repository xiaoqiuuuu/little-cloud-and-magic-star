"""上传文件的公共校验与落盘逻辑。"""

import os
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from fastapi.responses import JSONResponse


UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTS = {
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp",
    ".mp4", ".mov", ".avi", ".mkv",
    ".mp3", ".wav", ".ogg", ".aac", ".flac", ".m4a",
}
MAX_SIZE = 10 * 1024 * 1024


async def save_uploaded_file(file: UploadFile) -> JSONResponse:
    """校验并保存后台或问卷上传的媒体文件。"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名不存在")
    extension = os.path.splitext(file.filename)[-1].lower()
    if extension not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail="文件类型不支持")
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="文件大小不能超过10M")

    filename = f"{uuid4().hex}{extension}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as uploaded_file:
        uploaded_file.write(contents)
    return JSONResponse({"url": f"/uploads/{filename}", "name": file.filename})
