"""
File Upload Endpoints with Strict Validation and Size Limits
"""

import os
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from ..config import UPLOAD_DIR, MAX_FILE_SIZE_BYTES

router = APIRouter(prefix="/api/upload", tags=["Uploads"])

ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_AUDIO_EXTS = {".wav", ".mp3", ".webm", ".ogg", ".m4a"}

@router.post("/image")
async def upload_image(file: UploadFile = File(...)):
    """
    Validates and stores photographic evidence.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image format '{ext}'. Allowed: {', '.join(ALLOWED_IMAGE_EXTS)}"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum allowable limit of 10MB."
        )

    safe_name = f"evidence_{uuid.uuid4().hex[:12]}{ext}"
    dest_path = UPLOAD_DIR / safe_name
    with open(dest_path, "wb") as f:
        f.write(content)

    return {
        "file_url": f"/uploads/{safe_name}",
        "filename": safe_name,
        "original_name": file.filename,
        "size_bytes": len(content),
        "type": "image"
    }

@router.post("/audio")
async def upload_audio(file: UploadFile = File(...)):
    """
    Validates and stores audio evidence / voice recordings.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_AUDIO_EXTS:
        # Fallback if audio recorder sent webm without extension
        ext = ".webm"

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio file size exceeds limit of 10MB."
        )

    safe_name = f"voice_{uuid.uuid4().hex[:12]}{ext}"
    dest_path = UPLOAD_DIR / safe_name
    with open(dest_path, "wb") as f:
        f.write(content)

    return {
        "file_url": f"/uploads/{safe_name}",
        "filename": safe_name,
        "size_bytes": len(content),
        "type": "audio"
    }
