import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.config import settings

router = APIRouter(prefix="/upload", tags=["Upload"])

UPLOAD_DIR = settings.UPLOAD_DIR
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_IMG_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_IMG_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/x-png",
    "image/webp",
    "image/gif",
    "application/octet-stream",
}

ALLOWED_DOC_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_DOC_MIME_TYPES = {
    "application/pdf",
    "application/x-pdf",
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/x-png",
    "image/webp",
    "application/octet-stream",
}

@router.post("/image")
async def upload_image(file: UploadFile = File(...)):
    """
    Safely upload a property, room, or experience image and return its local URL.
    Supports JPG, JPEG, PNG, WebP, and GIF.
    """
    raw_content_type = (file.content_type or "").split(";")[0].strip().lower()
    _, ext = os.path.splitext(file.filename or "")
    ext = ext.lower()

    # Validate by MIME type or extension
    is_valid_mime = raw_content_type in ALLOWED_IMG_MIME_TYPES
    is_valid_ext = ext in ALLOWED_IMG_EXTENSIONS

    if not (is_valid_mime or is_valid_ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Allowed formats: JPG, JPEG, PNG, WebP, GIF."
        )

    if ext not in ALLOWED_IMG_EXTENSIONS:
        if "png" in raw_content_type:
            ext = ".png"
        elif "webp" in raw_content_type:
            ext = ".webp"
        elif "gif" in raw_content_type:
            ext = ".gif"
        else:
            ext = ".jpg"

    unique_filename = f"{uuid.uuid4().hex}{ext}"
    destination_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(destination_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded file: {str(e)}"
        )

    return {
        "url": f"/uploads/{unique_filename}",
        "filename": unique_filename,
        "content_type": file.content_type or f"image/{ext.lstrip('.')}"
    }

@router.post("/document")
async def upload_document(file: UploadFile = File(...)):
    """
    Safely upload a property ownership or authorization proof document (PDF, JPEG, PNG, WebP).
    """
    raw_content_type = (file.content_type or "").split(";")[0].strip().lower()
    _, ext = os.path.splitext(file.filename or "")
    ext = ext.lower()

    is_valid_mime = raw_content_type in ALLOWED_DOC_MIME_TYPES
    is_valid_ext = ext in ALLOWED_DOC_EXTENSIONS

    if not (is_valid_mime or is_valid_ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document format. Allowed formats: PDF, JPG, JPEG, PNG, WebP."
        )

    if ext not in ALLOWED_DOC_EXTENSIONS:
        if "pdf" in raw_content_type:
            ext = ".pdf"
        elif "png" in raw_content_type:
            ext = ".png"
        elif "webp" in raw_content_type:
            ext = ".webp"
        else:
            ext = ".jpg"

    unique_filename = f"doc_{uuid.uuid4().hex}{ext}"
    destination_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(destination_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded document: {str(e)}"
        )

    return {
        "url": f"/uploads/{unique_filename}",
        "filename": unique_filename,
        "content_type": file.content_type or "application/pdf"
    }
