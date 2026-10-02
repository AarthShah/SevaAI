"""
File Upload Endpoints with Strict Validation and Size Limits
"""

import os
import uuid
import httpx
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Form
from ..config import (UPLOAD_DIR, MAX_FILE_SIZE_BYTES, SPEECH_TO_TEXT_API_KEY,
                      SPEECH_TO_TEXT_BASE_URL, SPEECH_TO_TEXT_MODEL)

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
async def upload_audio(file: UploadFile = File(...), language: str = Form("")):
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

    transcript = None
    normalized_text = None
    transcription_error = None
    if SPEECH_TO_TEXT_API_KEY:
        try:
            headers = {"Authorization": f"Bearer {SPEECH_TO_TEXT_API_KEY}"}
            data = {"model": SPEECH_TO_TEXT_MODEL}
            if language:
                data["language"] = language.split("-")[0].lower()
            async with httpx.AsyncClient(timeout=90) as client:
                response = await client.post(
                    f"{SPEECH_TO_TEXT_BASE_URL}/audio/transcriptions",
                    headers=headers,
                    data=data,
                    files={"file": (safe_name, content, file.content_type or "audio/webm")},
                )
            response.raise_for_status()
            transcript = response.json().get("text", "").strip() or None
            normalized_text = transcript
            if language and not language.lower().startswith("en"):
                try:
                    translation_response = await client.post(
                        f"{SPEECH_TO_TEXT_BASE_URL}/audio/translations",
                        headers=headers,
                        data={"model": SPEECH_TO_TEXT_MODEL},
                        files={"file": (safe_name, content, file.content_type or "audio/webm")},
                    )
                    translation_response.raise_for_status()
                    normalized_text = translation_response.json().get("text", "").strip() or None
                    if not normalized_text:
                        transcription_error = "Speech was captured, but translation to English returned no text. Enter the complaint in English to continue."
                except (httpx.HTTPError, ValueError) as exc:
                    normalized_text = None
                    transcription_error = "Speech was captured, but translation to English failed. Enter the complaint in English to continue."
                    print(f"[SpeechToText] Translation request failed: {exc}")
        except (httpx.HTTPError, ValueError) as exc:
            transcription_error = "Server transcription failed; browser transcription may still be used."
            print(f"[SpeechToText] Transcription request failed: {exc}")
    else:
        transcription_error = (
            "Server transcription is not configured; enter the complaint in English or configure speech transcription for native-language reports."
            if language and not language.lower().startswith("en")
            else "Server transcription is not configured; browser speech recognition may be used."
        )

    return {
        "file_url": f"/uploads/{safe_name}",
        "filename": safe_name,
        "size_bytes": len(content),
        "type": "audio",
        "transcript": transcript,
        "normalized_text": normalized_text,
        "transcription_error": transcription_error
    }
