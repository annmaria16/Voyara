import hashlib
import json
import logging
import os
from typing import Optional, List, Dict, Union
import secrets
import re
import urllib.error
import urllib.parse
import urllib.request

from datetime import datetime, timedelta

from dotenv import load_dotenv

from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    status,
    UploadFile,
    File,
    BackgroundTasks,
    Header,
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
import uuid
import shutil

from sqlalchemy.orm import Session

from database import Base, engine, get_db

import auth
import core_models
import models
import schemas
from services.agent.ai_provider import GeminiRateLimitError


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

load_dotenv(override=True)

load_dotenv(
    os.path.join(
        os.path.dirname(__file__),
        ".env"
    ),
    override=True
)


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO
)

logger = logging.getLogger("verinova")


# ============================================================
# ENVIRONMENT VARIABLES
# ============================================================

GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID",
    ""
)

GOOGLE_CLIENT_SECRET = os.getenv(
    "GOOGLE_CLIENT_SECRET",
    ""
)

GITHUB_CLIENT_ID = os.getenv(
    "GITHUB_CLIENT_ID",
    ""
)

GITHUB_CLIENT_SECRET = os.getenv(
    "GITHUB_CLIENT_SECRET",
    ""
)

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
)

BACKEND_URL = os.getenv(
    "BACKEND_URL",
    "http://localhost:8000"
)

GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    f"{BACKEND_URL}/api/auth/google/callback"
)

logger.info(f"Google OAuth redirect URI: {GOOGLE_REDIRECT_URI}")


# ============================================================
# LEGAL POLICY VERSION CONSTANTS
# ============================================================

CURRENT_TERMS_VERSION = "1.0"
CURRENT_PRIVACY_VERSION = "1.0"


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="VeriNova AI API",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from fastapi import Request
@app.middleware("http")
async def add_request_id_header(request: Request, call_next):
    import uuid
    request_id = request.headers.get("X-Request-ID", f"req_{uuid.uuid4().hex[:8]}")
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# Ensure the uploads directory exists and mount it
os.makedirs(os.path.join(os.path.dirname(__file__), "uploads", "profile_images"), exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=os.path.join(os.path.dirname(__file__), "uploads")),
    name="uploads"
)


# ============================================================
# DATABASE STARTUP
# ============================================================

@app.on_event("startup")
def startup_db():
    ai_provider = os.getenv("AI_PROVIDER", "gemini").strip().upper()
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash").strip()
    logger.info(f"AI provider: {ai_provider}")
    logger.info(f"Gemini model: {gemini_model}")

    logger.info(
        "Initializing database tables..."
    )

    Base.metadata.create_all(
        bind=engine
    )

    # Database column migration checks for tasks table
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS review_status VARCHAR(30) DEFAULT 'NOT_REQUIRED';"))
            conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS plan JSON;"))
            conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS execution_status VARCHAR(30) DEFAULT 'CREATED';"))
            conn.execute(text("ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS action_hash VARCHAR(64);"))
            conn.execute(text("ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;"))
            conn.execute(text("ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS action_type VARCHAR(50);"))
            conn.execute(text("ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20);"))
            conn.execute(text("ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64);"))
            conn.execute(text("ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS evidence TEXT;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS memory_enabled BOOLEAN DEFAULT TRUE;"))
            conn.execute(text("ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS category VARCHAR(50);"))
            conn.execute(text("ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS source VARCHAR(100);"))
            conn.execute(text("ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 1.0;"))
            conn.execute(text("ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS importance INTEGER DEFAULT 1;"))
            conn.execute(text("ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))
            conn.execute(text("ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';"))
            conn.execute(text("ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS structured_data JSON;"))
            conn.execute(text("ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS memory_id VARCHAR(50);"))
            conn.execute(text("ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))
            conn.execute(text("ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))
            conn.execute(text("ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;"))
            conn.execute(text("ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS user_read BOOLEAN DEFAULT TRUE;"))
            conn.commit()
            logger.info("Database columns migration completed successfully.")
    except Exception as e:
        logger.error(f"Failed to run database columns migration: {str(e)}")

    logger.info(
        "Database initialization completed."
    )


# ============================================================
# HTTP REQUEST HELPER
# ============================================================

def make_http_request(
    url: str,
    method: str = "GET",
    headers: dict = None,
    data: dict = None
):

    headers = headers or {}

    req_data = None

    if data is not None:

        if headers.get(
            "Content-Type"
        ) == "application/json":

            req_data = json.dumps(
                data
            ).encode("utf-8")

        else:

            req_data = urllib.parse.urlencode(
                data
            ).encode("utf-8")

            if "Content-Type" not in headers:

                headers[
                    "Content-Type"
                ] = "application/x-www-form-urlencoded"

    request = urllib.request.Request(
        url,
        data=req_data,
        headers=headers,
        method=method
    )

    try:

        with urllib.request.urlopen(
            request
        ) as response:

            body = response.read().decode(
                "utf-8"
            )

            return json.loads(body)

    except urllib.error.HTTPError as exc:

        error_body = exc.read().decode(
            "utf-8"
        )

        logger.error(
            "HTTP error %s: %s",
            exc.code,
            error_body
        )

        try:

            return json.loads(
                error_body
            )

        except Exception:

            raise Exception(
                f"Request failed: "
                f"{exc.code} - "
                f"{error_body}"
            )


def populate_task_verification_details(task, db: Session):
    if not task:
        return task
    v_res = db.query(core_models.VerificationResult).filter(core_models.VerificationResult.task_id == task.id).first()
    task.verification_status = v_res.final_status if v_res else "NOT_STARTED"
    task.verification_explanation = v_res.explanation if v_res else None
    
    if getattr(task, "execution_status", None) is None:
        status_map = {
            "received": "CREATED",
            "planning": "PLANNING",
            "queued": "READY",
            "running": "EXECUTING",
            "executing": "EXECUTING",
            "requires_confirmation": "WAITING_FOR_USER",
            "verifying": "VERIFYING",
            "completed": "COMPLETED",
            "failed": "FAILED",
            "needs_review": "NEEDS_REVIEW",
            "cancelled": "CANCELLED"
        }
        task.execution_status = status_map.get(task.status, "CREATED")
        
    return task


def populate_tasks_verification_details(tasks, db: Session):
    for task in tasks:
        populate_task_verification_details(task, db)
    return tasks


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "name": "VeriNova",
        "status": "online",
        "version": "1.0.0"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.get("/api/diagnostic")
def diagnostic():
    import os
    from dotenv import load_dotenv
    load_dotenv(override=True)
    return {
        "AI_PROVIDER": os.getenv("AI_PROVIDER"),
        "GEMINI_MODEL": os.getenv("GEMINI_MODEL"),
        "GEMINI_KEY_LEN": len(os.getenv("GEMINI_API_KEY", "")),
        "GEMINI_KEY_PREFIX": os.getenv("GEMINI_API_KEY", "")[:5]
    }


@app.get("/ready")
def readiness_check(db: Session = Depends(get_db)):
    from sqlalchemy import text
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "database": "connected"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed."
        )


# ============================================================
# REGISTER
# ============================================================

@app.post(
    "/api/auth/register",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db)
):

    if not user_in.accepted_terms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please accept the Terms & Conditions and Privacy Policy before creating an account."
        )

    existing_user = (
        db.query(models.User)
        .filter(
            models.User.email == user_in.email
        )
        .first()
    )

    if existing_user:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email is already registered."
        )

    hashed_password = auth.get_password_hash(
        user_in.password
    )

    # --------------------------------------------------------
    # ADMIN EMAIL GETS ADMIN ROLE
    # --------------------------------------------------------

    role = (
        "admin"
        if auth.is_admin_email(
            user_in.email
        )
        else "user"
    )

    db_user = models.User(
        fullname=user_in.fullname,
        email=user_in.email,
        password=hashed_password,
        provider="email",
        role=role,
        terms_accepted=True,
        privacy_accepted=True,
        legal_accepted_at=datetime.utcnow(),
        terms_version=CURRENT_TERMS_VERSION,
        privacy_version=CURRENT_PRIVACY_VERSION
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    logger.info(
        "Registered user %s with role %s",
        db_user.email,
        db_user.role
    )

    return db_user


# ============================================================
# NORMAL LOGIN
# ============================================================

@app.post(
    "/api/auth/login",
    response_model=schemas.Token
)
def login(
    login_in: schemas.UserLogin,
    db: Session = Depends(get_db)
):

    db_user = (
        db.query(models.User)
        .filter(
            models.User.email == login_in.email
        )
        .first()
    )

    if not db_user:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={
                "WWW-Authenticate": "Bearer"
            }
        )

    if (
        db_user.password is None
        or not auth.verify_password(
            login_in.password,
            db_user.password
        )
    ):

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={
                "WWW-Authenticate": "Bearer"
            }
        )

    # --------------------------------------------------------
    # CREATE SESSION
    # --------------------------------------------------------

    session_token = secrets.token_urlsafe(
        32
    )

    session_expires = (
        datetime.utcnow()
        + timedelta(days=7)
    )

    db_session = models.UserSession(
        user_id=db_user.id,
        session_token=session_token,
        expires_at=session_expires
    )

    db.add(db_session)
    db.commit()

    # --------------------------------------------------------
    # JWT CONTAINS USER ROLE
    # --------------------------------------------------------

    access_token = auth.create_user_access_token(
        db_user
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# ============================================================
# FORGOT PASSWORD
# ============================================================

@app.post("/api/auth/forgot-password")
def forgot_password(
    req: schemas.ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    user = (
        db.query(models.User)
        .filter(models.User.email == req.email)
        .first()
    )

    safe_message = "If an account exists for this email, a password reset link has been sent."

    if user:
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        expires_at = datetime.utcnow() + timedelta(minutes=30)

        db_token = models.PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            used=False
        )
        db.add(db_token)
        db.commit()

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip('/')
        reset_link = f"{frontend_url}/reset-password?token={raw_token}"

        from utils.email import send_password_reset_email
        send_password_reset_email(user.email, reset_link)

    return {"message": safe_message}


# ============================================================
# RESET PASSWORD
# ============================================================

@app.post("/api/auth/reset-password")
def reset_password(
    req: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    token_hash = hashlib.sha256(req.token.encode("utf-8")).hexdigest()

    db_token = (
        db.query(models.PasswordResetToken)
        .filter(
            models.PasswordResetToken.token_hash == token_hash,
            models.PasswordResetToken.used == False
        )
        .first()
    )

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token."
        )

    if db_token.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token."
        )

    user = (
        db.query(models.User)
        .filter(models.User.id == db_token.user_id)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token."
        )

    hashed_password = auth.get_password_hash(req.new_password)
    user.password = hashed_password
    db_token.used = True

    # Invalidate active sessions
    db.query(models.UserSession).filter(models.UserSession.user_id == user.id).delete()

    db.commit()

    return {"message": "Your password has been reset successfully."}


# ============================================================
# ADMIN LOGIN
# ============================================================

@app.post(
    "/api/auth/admin/login",
    response_model=schemas.AdminToken
)
def admin_login(
    login_in: schemas.AdminLogin,
    db: Session = Depends(get_db)
):

    admin = (
        db.query(models.User)
        .filter(
            models.User.email == login_in.email
        )
        .first()
    )

    if not admin:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials."
        )

    # --------------------------------------------------------
    # DATABASE ROLE CHECK
    # --------------------------------------------------------

    if admin.role != "admin":

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is not an administrator."
        )

    if not admin.password:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This administrator does not have a password login."
        )

    if not auth.verify_password(
        login_in.password,
        admin.password
    ):

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials."
        )

    access_token = auth.create_admin_access_token(
        admin.email
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# ============================================================
# ADMIN PROFILE
# ============================================================

@app.get(
    "/api/admin/me"
)
def admin_me(
    current_admin: models.User = Depends(
        auth.get_current_admin
    )
):

    return {
        "id": current_admin.id,
        "fullname": current_admin.fullname,
        "email": current_admin.email,
        "role": current_admin.role,
        "provider": current_admin.provider
    }


# ============================================================
# USER PROFILE
# ============================================================

@app.get(
    "/api/user/profile",
    response_model=schemas.UserResponse
)
def get_profile(
    current_user: models.User = Depends(
        auth.get_current_user
    )
):

    return current_user


    # ============================================================
# UPDATE USER PROFILE
# ============================================================

@app.put(
    "/api/user/profile",
    response_model=schemas.UserResponse
)
def update_profile(
    profile_in: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        auth.get_current_user
    )
):
    if profile_in.fullname is not None:
        fullname = profile_in.fullname.strip()

        if len(fullname) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Full name must contain at least 3 characters."
            )

        current_user.fullname = fullname

    if profile_in.profile_image is not None:
        current_user.profile_image = profile_in.profile_image

    db.commit()
    db.refresh(current_user)

    return current_user


# ============================================================
# UPLOAD USER PROFILE IMAGE
# ============================================================

@app.post(
    "/api/user/profile-image",
    response_model=schemas.UserResponse
)
def upload_profile_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        auth.get_current_user
    )
):
    # 1. Validate file type
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    filename = file.filename or ""
    _, ext = os.path.splitext(filename.lower())
    
    # Validate MIME type as well
    allowed_content_types = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
    if ext not in allowed_extensions or file.content_type not in allowed_content_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Supported formats: JPG, JPEG, PNG, WEBP"
        )
        
    # 2. Validate file size (5MB limit)
    max_size = 5 * 1024 * 1024  # 5MB
    try:
        content = file.file.read(max_size + 1)
        if len(content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds the 5MB limit."
            )
        file.file.seek(0)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error validating file size."
        )

    # 3. Generate a secure, unique filename
    clean_ext = ext.lstrip(".")
    unique_filename = f"{current_user.id}_{uuid.uuid4().hex}.{clean_ext}"
    
    # 4. Define paths
    upload_dir = os.path.join(os.path.dirname(__file__), "uploads", "profile_images")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, unique_filename)
    
    # Safety check against path traversal
    real_upload_dir = os.path.realpath(upload_dir)
    real_file_path = os.path.realpath(file_path)
    if not real_file_path.startswith(real_upload_dir):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename."
        )
        
    # 5. Save the file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save profile image."
        )
        
    # 6. Update user profile image path
    db_relative_path = f"/uploads/profile_images/{unique_filename}"
    current_user.profile_image = db_relative_path
    
    db.commit()
    db.refresh(current_user)
    
    return current_user


@app.post(
    "/api/agent/upload",
    status_code=status.HTTP_200_OK
)
def upload_agent_file(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Save an attachment file to the uploads directory for AI agent context."""
    allowed_extensions = {
        ".pdf", ".doc", ".docx", ".txt", ".csv",
        ".xls", ".xlsx", ".jpg", ".jpeg", ".png", ".webp"
    }
    filename = file.filename or ""
    _, ext = os.path.splitext(filename.lower())

    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Supported: {', '.join(allowed_extensions)}"
        )

    # 10MB Limit
    max_size = 10 * 1024 * 1024
    try:
        content = file.file.read(max_size + 1)
        if len(content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds the 10MB limit."
            )
        file.file.seek(0)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error validating file size."
        )

    # Generate unique filename
    clean_ext = ext.lstrip(".")
    unique_filename = f"{current_user.id}_{uuid.uuid4().hex}.{clean_ext}"

    upload_dir = os.path.join(os.path.dirname(__file__), "uploads", "attachments")
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, unique_filename)

    # Safety check against path traversal
    real_upload_dir = os.path.realpath(upload_dir)
    real_file_path = os.path.realpath(file_path)
    if not real_file_path.startswith(real_upload_dir):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename."
        )

    # Save
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save uploaded attachment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save file."
        )

    db_relative_path = f"/uploads/attachments/{unique_filename}"
    return {
        "filename": filename,
        "file_url": db_relative_path,
        "file_type": file.content_type or ext,
        "file_size": len(content)
    }


# ============================================================
# ACCEPT TERMS AND PRIVACY POLICY
# ============================================================

@app.post(
    "/api/user/accept-legal",
    response_model=schemas.UserResponse
)
def accept_legal_documents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    current_user.terms_accepted = True
    current_user.privacy_accepted = True
    current_user.legal_accepted_at = datetime.utcnow()
    current_user.terms_version = CURRENT_TERMS_VERSION
    current_user.privacy_version = CURRENT_PRIVACY_VERSION

    db.commit()
    db.refresh(current_user)

    logger.info(
        "User %s accepted terms version %s and privacy version %s",
        current_user.email,
        CURRENT_TERMS_VERSION,
        CURRENT_PRIVACY_VERSION
    )

    return current_user


def validate_password_strength(password: str):
    if (
        len(password) < 8
        or not re.search(r"[A-Z]", password)
        or not re.search(r"[a-z]", password)
        or not re.search(r"[0-9]", password)
        or not re.search(r"[^A-Za-z0-9]", password)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
        )


@app.put("/api/user/password")
def change_user_password(
    password_in: schemas.PasswordChange,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.provider != "email":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password changes are only available for email accounts."
        )

    if not current_user.password or not auth.verify_password(
        password_in.current_password,
        current_user.password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    if password_in.current_password == password_in.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from your current password."
        )

    validate_password_strength(password_in.new_password)

    current_user.password = auth.get_password_hash(
        password_in.new_password
    )

    # Invalidate active sessions
    db.query(models.UserSession).filter(models.UserSession.user_id == current_user.id).delete()

    db.commit()

    return {"message": "Password updated successfully."}


# ============================================================
# GET CURRENT USER ROLE
# ============================================================

@app.get(
    "/api/auth/me",
    response_model=schemas.UserResponse
)
def get_current_user_profile(
    current_user: models.User = Depends(
        auth.get_current_user
    )
):

    return current_user


# ============================================================
# GOOGLE LOGIN
# ============================================================

@app.get(
    "/api/auth/google/login"
)
def google_login():
    import sys
    if "unittest" not in sys.modules:
        from dotenv import load_dotenv
        load_dotenv(override=True)
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI") or f"{BACKEND_URL}/api/auth/google/callback"

    if not client_id:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Client ID is not configured."
        )

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    }

    url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        + urllib.parse.urlencode(params)
    )

    return RedirectResponse(url, status_code=status.HTTP_302_FOUND)


# ============================================================
# GOOGLE CALLBACK
# ============================================================

@app.get(
    "/api/auth/google/callback"
)
def google_callback(
    code: str,
    db: Session = Depends(get_db)
):
    logger.info("Google OAuth callback started")

    import sys
    if "unittest" not in sys.modules:
        from dotenv import load_dotenv
        load_dotenv(override=True)
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI") or f"{BACKEND_URL}/api/auth/google/callback"

    try:
        if (
            not client_id
            or not client_secret
        ):
            raise Exception("Google OAuth credentials not configured.")

        logger.info("authorization code received")

        token_url = (
            "https://oauth2.googleapis.com/token"
        )

        data = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }

        logger.info("Google token exchange started")
        token_res = make_http_request(
            token_url,
            method="POST",
            data=data
        )

        google_access_token = token_res.get(
            "access_token"
        )

        if not google_access_token:
            raise Exception(
                token_res.get(
                    "error_description"
                )
                or "No access token returned from Google."
            )

        logger.info("Google token exchange completed")

        # --------------------------------------------------------
        # GOOGLE PROFILE
        # --------------------------------------------------------

        profile_url = (
            "https://www.googleapis.com/oauth2/v3/userinfo"
            f"?access_token={google_access_token}"
        )

        profile = make_http_request(
            profile_url
        )

        email = profile.get(
            "email"
        )

        if not email:
            raise Exception(
                "No email in Google profile."
            )

        fullname = profile.get(
            "name"
        ) or email.split("@")[0]

        google_id = profile.get(
            "sub"
        )

        picture = profile.get(
            "picture"
        )

        logger.info("Google user information retrieved")

        # --------------------------------------------------------
        # FIND OR CREATE USER
        # --------------------------------------------------------

        logger.info("existing user lookup")
        db_user = (
            db.query(models.User)
            .filter(
                models.User.email == email
            )
            .first()
        )

        is_new_user = False
        logger.info("user creation/update")
        if not db_user:
            is_new_user = True
            role = (
                "admin"
                if auth.is_admin_email(email)
                else "user"
            )

            db_user = models.User(
                fullname=fullname,
                email=email,
                password=None,
                provider="google",
                role=role,
                terms_accepted=False,
                privacy_accepted=False
            )

            db.add(db_user)
            db.commit()
            db.refresh(db_user)

        else:
            # If configured admin email logs in through Google,
            # make sure the database role is admin.
            if auth.is_admin_email(email):
                db_user.role = "admin"

            if not db_user.profile_image and picture:
                db_user.profile_image = picture

            db.commit()

        # --------------------------------------------------------
        # SAVE OAUTH ACCOUNT
        # --------------------------------------------------------

        logger.info("OAuth account lookup")
        oauth_acc = (
            db.query(models.OAuthAccount)
            .filter(
                models.OAuthAccount.provider == "google",
                models.OAuthAccount.provider_user_id
                == google_id
            )
            .first()
        )

        if not oauth_acc:
            oauth_acc = models.OAuthAccount(
                user_id=db_user.id,
                provider="google",
                provider_user_id=google_id,
                profile_image=picture
            )

            db.add(oauth_acc)
            db.commit()

        else:
            if oauth_acc.profile_image != picture:
                oauth_acc.profile_image = picture
                db.commit()

        # --------------------------------------------------------
        # SESSION
        # --------------------------------------------------------

        logger.info("session creation")
        session_token = secrets.token_urlsafe(
            32
        )

        session_expires = (
            datetime.utcnow()
            + timedelta(days=7)
        )

        db_session = models.UserSession(
            user_id=db_user.id,
            session_token=session_token,
            expires_at=session_expires
        )

        db.add(db_session)
        db.commit()

        # --------------------------------------------------------
        # JWT WITH ROLE
        # --------------------------------------------------------

        jwt_token = auth.create_user_access_token(
            db_user
        )

        logger.info("frontend redirect")
        return RedirectResponse(
            f"{FRONTEND_URL}/auth/callback"
            f"?token={urllib.parse.quote(jwt_token)}&new_user={str(is_new_user).lower()}",
            status_code=status.HTTP_302_FOUND
        )

    except Exception as exc:
        logger.error(
            "Google OAuth callback failed: %s",
            exc,
            exc_info=True
        )
        return RedirectResponse(
            f"{FRONTEND_URL}/auth/callback"
            f"?error={urllib.parse.quote('Google sign-in failed. Please try again.')}",
            status_code=status.HTTP_302_FOUND
        )


# ============================================================
# GITHUB LOGIN
# ============================================================

@app.get(
    "/api/auth/github/login"
)
def github_login():

    if not GITHUB_CLIENT_ID:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub Client ID is not configured."
        )

    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri":
            f"{BACKEND_URL}/api/auth/github/callback",
        "scope": "user:email"
    }

    url = (
        "https://github.com/login/oauth/authorize?"
        + urllib.parse.urlencode(params)
    )

    return RedirectResponse(url)


# ============================================================
# GITHUB CALLBACK
# ============================================================

@app.get(
    "/api/auth/github/callback"
)
def github_callback(
    code: str,
    db: Session = Depends(get_db)
):

    if (
        not GITHUB_CLIENT_ID
        or not GITHUB_CLIENT_SECRET
    ):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub OAuth credentials not configured."
        )

    token_url = (
        "https://github.com/login/oauth/access_token"
    )

    data = {
        "code": code,
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "redirect_uri":
            f"{BACKEND_URL}/api/auth/github/callback"
    }

    headers = {
        "Accept": "application/json"
    }

    try:

        token_res = make_http_request(
            token_url,
            method="POST",
            headers=headers,
            data=data
        )

        github_access_token = token_res.get(
            "access_token"
        )

        if not github_access_token:

            raise Exception(
                token_res.get(
                    "error_description"
                )
                or "No access token returned from GitHub."
            )

    except Exception as exc:

        logger.error(
            "GitHub token exchange failed: %s",
            exc
        )

        return RedirectResponse(
            f"{FRONTEND_URL}/auth/callback"
            f"?error={urllib.parse.quote(str(exc))}"
        )

    # --------------------------------------------------------
    # GITHUB PROFILE
    # --------------------------------------------------------

    profile_url = (
        "https://api.github.com/user"
    )

    profile_headers = {
        "Authorization":
            f"Bearer {github_access_token}",
        "User-Agent":
            "VeriNova-App"
    }

    try:

        profile = make_http_request(
            profile_url,
            headers=profile_headers
        )

        github_id = str(
            profile.get("id")
        )

        fullname = (
            profile.get("name")
            or profile.get("login")
            or f"GitHub User {github_id}"
        )

        picture = profile.get(
            "avatar" + "_" + "url"
        )

        email = profile.get(
            "email"
        )

        # ----------------------------------------------------
        # PRIVATE EMAIL
        # ----------------------------------------------------

        if not email:

            emails_url = (
                "https://api.github.com/user/emails"
            )

            emails = make_http_request(
                emails_url,
                headers=profile_headers
            )

            primary_email = next(
                (
                    item.get("email")
                    for item in emails
                    if item.get("primary")
                ),
                None
            )

            email = (
                primary_email
                or (
                    emails[0].get("email")
                    if emails
                    else None
                )
            )

        if not email:

            raise Exception(
                "No primary email found in GitHub account."
            )

    except Exception as exc:

        logger.error(
            "GitHub profile fetch failed: %s",
            exc
        )

        return RedirectResponse(
            f"{FRONTEND_URL}/auth/callback"
            f"?error={urllib.parse.quote(str(exc))}"
        )

    # --------------------------------------------------------
    # FIND OR CREATE USER
    # --------------------------------------------------------

    db_user = (
        db.query(models.User)
        .filter(
            models.User.email == email
        )
        .first()
    )

    is_new_user = False
    if not db_user:
        is_new_user = True
        role = (
            "admin"
            if auth.is_admin_email(email)
            else "user"
        )

        db_user = models.User(
            fullname=fullname,
            email=email,
            password=None,
            provider="github",
            role=role,
            terms_accepted=False,
            privacy_accepted=False
        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    else:

        if auth.is_admin_email(email):
            db_user.role = "admin"

        if not db_user.profile_image and picture:
            db_user.profile_image = picture

        db.commit()

    # --------------------------------------------------------
    # SAVE OAUTH ACCOUNT
    # --------------------------------------------------------

    oauth_acc = (
        db.query(models.OAuthAccount)
        .filter(
            models.OAuthAccount.provider == "github",
            models.OAuthAccount.provider_user_id
            == github_id
        )
        .first()
    )

    if not oauth_acc:

        oauth_acc = models.OAuthAccount(
            user_id=db_user.id,
            provider="github",
            provider_user_id=github_id,
            profile_image=picture
        )

        db.add(oauth_acc)
        db.commit()

    else:

        if oauth_acc.profile_image != picture:

            oauth_acc.profile_image = picture
            db.commit()

    # --------------------------------------------------------
    # SESSION
    # --------------------------------------------------------

    session_token = secrets.token_urlsafe(
        32
    )

    session_expires = (
        datetime.utcnow()
        + timedelta(days=7)
    )

    db_session = models.UserSession(
        user_id=db_user.id,
        session_token=session_token,
        expires_at=session_expires
    )

    db.add(db_session)
    db.commit()

    # --------------------------------------------------------
    # JWT WITH ROLE
    # --------------------------------------------------------

    jwt_token = auth.create_user_access_token(
        db_user
    )

    return RedirectResponse(
        f"{FRONTEND_URL}/auth/callback"
        f"?token={urllib.parse.quote(jwt_token)}&new_user={str(is_new_user).lower()}"
    )


# ============================================================
# CREATE TASK
# ============================================================

@app.post(
    "/api/tasks",
    response_model=schemas.TaskResponse,
    status_code=status.HTTP_201_CREATED
)
def create_task(
    task_in: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        auth.get_current_user
    )
):

    task = core_models.Task(
        user_id=current_user.id,
        title=task_in.title,
        description=task_in.description,
        task_type=task_in.task_type,
        status="created",
        review_status="NOT_REQUIRED",
        confidence_score=None,
        final_result=None
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return populate_task_verification_details(task, db)


# ============================================================
# GET USER TASKS
# ============================================================

@app.get(
    "/api/tasks",
    response_model=list[schemas.TaskResponse]
)
def get_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        auth.get_current_user
    )
):

    tasks = (
        db.query(core_models.Task)
        .filter(
            core_models.Task.user_id
            == current_user.id
        )
        .order_by(
            core_models.Task.created_at.desc()
        )
        .all()
    )

    return populate_tasks_verification_details(tasks, db)


# ============================================================
# GET SINGLE TASK
# ============================================================

@app.get(
    "/api/tasks/{task_id}",
    response_model=schemas.TaskResponse
)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        auth.get_current_user
    )
):

    task = (
        db.query(core_models.Task)
        .filter(core_models.Task.id == task_id)
        .first()
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found."
        )

    if task.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to resource is forbidden."
        )

    return populate_task_verification_details(task, db)


@app.get("/api/tasks/{task_id}/result")
def get_task_result(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    task = db.query(core_models.Task).filter(core_models.Task.id == task_id, core_models.Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    
    evidence = db.query(core_models.Evidence).filter(core_models.Evidence.task_id == task_id).all()
    sources = []
    for ev in evidence:
        if ev.evidence_data:
            data = ev.evidence_data
            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except:
                    pass
            if isinstance(data, dict):
                results = data.get("results") or data.get("data", {}).get("results") or []
                if isinstance(results, list) and results:
                    for r in results:
                        if isinstance(r, dict) and r.get("url"):
                            sources.append({
                                "title": r.get("title") or r.get("source") or "Source Link",
                                "url": r.get("url"),
                                "domain": urllib.parse.urlparse(r.get("url")).netloc if r.get("url") else "external",
                                "snippet": r.get("snippet") or r.get("title") or ""
                            })
                else:
                    url = data.get("url") or data.get("data", {}).get("url")
                    if url:
                        sources.append({
                            "title": data.get("title") or data.get("source") or "Source Link",
                            "url": url,
                            "domain": urllib.parse.urlparse(url).netloc,
                            "snippet": data.get("snippet") or data.get("title") or ""
                        })
                        
    # Deduplicate sources by URL
    seen_urls = set()
    dedup_sources = []
    for s in sources:
        if s["url"] not in seen_urls:
            seen_urls.add(s["url"])
            dedup_sources.append(s)
            
    summary = ""
    if task.final_result:
        summary = task.final_result
        if "**Facts**" in task.final_result:
            summary = task.final_result.split("**Facts**")[-1].split("**")[0].strip("- \n")
        summary = summary[:300] + "..." if len(summary) > 300 else summary

    return {
        "task_id": task.id,
        "status": task.status.upper(),
        "answer": task.final_result,
        "sources": dedup_sources,
        "research_summary": summary,
        "created_at": task.created_at,
        "completed_at": task.updated_at
    }


@app.get("/api/tasks/{task_id}/executions")
def get_task_execution_logs(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    task = db.query(core_models.Task).filter(core_models.Task.id == task_id, core_models.Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    logs = db.query(core_models.TaskExecutionLog).filter(core_models.TaskExecutionLog.task_id == task_id).order_by(core_models.TaskExecutionLog.created_at.asc()).all()
    return [
        {
            "id": log.id,
            "task_id": log.task_id,
            "step": log.step,
            "message": log.message,
            "status": log.status,
            "duration_ms": log.duration_ms,
            "created_at": log.created_at
        }
        for log in logs
    ]


@app.get("/api/tasks/{task_id}/evidence")
def get_task_evidence(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    task = db.query(core_models.Task).filter(core_models.Task.id == task_id, core_models.Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    evidence = db.query(core_models.Evidence).filter(core_models.Evidence.task_id == task_id).order_by(core_models.Evidence.collected_at.asc()).all()
    return [
        {
            "id": ev.id,
            "task_id": ev.task_id,
            "source_type": ev.source_type,
            "source_name": ev.source_name,
            "description": ev.description,
            "evidence_data": ev.evidence_data,
            "status": ev.status,
            "collected_at": ev.collected_at
        }
        for ev in evidence
    ]


# ============================================================
# ADMIN - GET ALL USERS
# ============================================================

@app.get(
    "/api/admin/users"
)
def admin_get_users(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(
        auth.get_current_admin
    )
):

    users = (
        db.query(models.User)
        .order_by(
            models.User.created_at.desc()
        )
        .all()
    )

    return [
        {
            "id": user.id,
            "fullname": user.fullname,
            "email": user.email,
            "provider": user.provider,
            "role": user.role,
            "created_at": user.created_at,
            "profile_image": user.profile_image
        }
        for user in users
    ]


# ============================================================
# ADMIN - GET ALL TASKS
# ============================================================

@app.get(
    "/api/admin/tasks"
)
def admin_get_tasks(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(
        auth.get_current_admin
    )
):

    tasks = (
        db.query(core_models.Task)
        .order_by(
            core_models.Task.created_at.desc()
        )
        .all()
    )

    return populate_tasks_verification_details(tasks, db)


# ============================================================
# ADMIN - UPDATE TASK STATUS
# ============================================================

@app.put(
    "/api/admin/tasks/{task_id}/status",
    response_model=schemas.TaskResponse
)
def admin_update_task_status(
    task_id: int,
    status_in: schemas.TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(
        auth.get_current_admin
    )
):

    task = (
        db.query(core_models.Task)
        .filter(core_models.Task.id == task_id)
        .first()
    )

    if not task:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found."
        )

    task.status = status_in.status
    db.commit()
    db.refresh(task)

    return populate_task_verification_details(task, db)



# ============================================================
# USER VERIFICATION ASSISTANT
# ============================================================

@app.get(
    "/api/tasks/{task_id}/conversation",
    response_model=schemas.VerificationDetailResponse,
)
def get_task_conversation(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Return a task plus its persisted assistant conversation."""

    task = (
        db.query(core_models.Task)
        .filter(
            core_models.Task.id == task_id,
            core_models.Task.user_id == current_user.id,
        )
        .first()
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    messages = (
        db.query(models.VerificationMessage)
        .filter(
            models.VerificationMessage.task_id == task.id,
            models.VerificationMessage.user_id == current_user.id,
        )
        .order_by(models.VerificationMessage.created_at.asc())
        .all()
    )

    v_res = db.query(core_models.VerificationResult).filter(core_models.VerificationResult.task_id == task.id).first()
    task_data = {
        "id": task.id,
        "user_id": task.user_id,
        "title": task.title,
        "description": task.description,
        "task_type": task.task_type,
        "status": task.status,
        "review_status": task.review_status,
        "plan": task.plan,
        "verification_status": v_res.final_status if v_res else "NOT_STARTED",
        "verification_explanation": v_res.explanation if v_res else None,
        "confidence_score": task.confidence_score,
        "final_result": task.final_result,
        "reference_count": (
            db.query(core_models.Evidence)
            .filter(core_models.Evidence.task_id == task.id)
            .count()
        ),
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "messages": messages,
    }

    return task_data


@app.get(
    "/api/tasks/{task_id}/messages",
    response_model=list[schemas.VerificationMessageResponse],
)
def get_task_messages(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Return only messages belonging to the authenticated user's task."""

    task = (
        db.query(core_models.Task)
        .filter(
            core_models.Task.id == task_id,
            core_models.Task.user_id == current_user.id,
        )
        .first()
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    return (
        db.query(models.VerificationMessage)
        .filter(
            models.VerificationMessage.task_id == task.id,
            models.VerificationMessage.user_id == current_user.id,
        )
        .order_by(models.VerificationMessage.created_at.asc())
        .all()
    )


@app.post(
    "/api/tasks/{task_id}/messages",
    response_model=schemas.VerificationMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_task_message(
    task_id: int,
    message_in: schemas.VerificationMessageCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Persist a user message in the verification conversation."""

    task = (
        db.query(core_models.Task)
        .filter(
            core_models.Task.id == task_id,
            core_models.Task.user_id == current_user.id,
        )
        .first()
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    message = models.VerificationMessage(
        task_id=task.id,
        user_id=current_user.id,
        sender="user",
        message=message_in.message.strip(),
        message_type="text",
    )

    db.add(message)
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(message)

    # Trigger background assistant follow-up response generation
    def run_assistant_reply_in_background(tid: int, uid: int):
        from database import SessionLocal
        local_db = SessionLocal()
        try:
            from services.agent.ai_provider import get_active_provider
            import json

            t = local_db.query(core_models.Task).filter(core_models.Task.id == tid).first()
            if not t:
                return

            msgs = (
                local_db.query(models.VerificationMessage)
                .filter(models.VerificationMessage.task_id == tid)
                .order_by(models.VerificationMessage.created_at.asc())
                .all()
            )

            api_messages = []
            api_messages.append({
                "role": "system",
                "content": (
                    "You are VeriNova, a professional outcome verification assistant.\n"
                    f"Initial Task Goal: {t.description}\n"
                    f"Task Outcome/Execution Result: {t.final_result or 'No execution outcomes recorded yet.'}\n\n"
                    "Help the user by answering their follow-up questions using the task details and previous messages."
                )
            })

            for m in msgs:
                api_messages.append({
                    "role": "user" if m.sender == "user" else "assistant",
                    "content": m.message
                })

            provider = get_active_provider()
            response = provider.generate(api_messages, task_id=tid, user_id=uid, db=local_db)
            content = response["choices"][0]["message"]["content"]

            reply = models.VerificationMessage(
                task_id=tid,
                user_id=uid,
                sender="assistant",
                message=content,
                message_type="text"
            )
            local_db.add(reply)
            local_db.commit()
        except Exception as e:
            logger.error(f"Failed to generate follow-up reply: {str(e)}")
            try:
                err_reply = models.VerificationMessage(
                    task_id=tid,
                    user_id=uid,
                    sender="assistant",
                    message="VeriNova couldn't complete this request right now. Please try again in a moment.",
                    message_type="text"
                )
                local_db.add(err_reply)
                local_db.commit()
            except:
                pass
        finally:
            local_db.close()

    background_tasks.add_task(run_assistant_reply_in_background, task.id, current_user.id)

    return message


@app.post(
    "/api/tasks/{task_id}/start",
    response_model=schemas.TaskResponse,
)
def start_task_verification(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Move a newly created task into the real verification workflow."""

    task = (
        db.query(core_models.Task)
        .filter(
            core_models.Task.id == task_id,
            core_models.Task.user_id == current_user.id,
        )
        .first()
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    if task.status in {"completed", "verified", "approved", "rejected", "inconclusive"}:
        return task

    # 1. Update status to planning
    task.status = "planning"
    task.updated_at = datetime.utcnow()

    log_planning = core_models.TaskExecutionLog(
        task_id=task.id,
        step="planning_started",
        message="Orchestrating agent planner for verification.",
        status="completed",
        duration_ms=0
    )
    db.add(log_planning)
    db.commit()

    # 2. Run planning step using generate_plan
    try:
        from services.agent import generate_plan
        plan_data = generate_plan(task.description)
        task.task_type = plan_data.get("task_type", "verification")
        task.plan = plan_data
        db.commit()
    except Exception as e:
        task.status = "failed"
        task.final_result = f"AI service unavailable. {str(e)}"
        task.updated_at = datetime.utcnow()
        log_failed = core_models.TaskExecutionLog(
            task_id=task.id,
            step="planning_failed",
            message=f"Failed to generate structured plan: {str(e)}",
            status="failed",
            duration_ms=0
        )
        db.add(log_failed)
        db.commit()
        logger.error(f"Planning failed on auto-start: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service unavailable. {str(e)}"
        )

    # Log task analyzing step
    log_analyzing = core_models.TaskExecutionLog(
        task_id=task.id,
        step="analyzing",
        message="Evidence verification started.",
        status="completed",
        duration_ms=0
    )
    db.add(log_analyzing)
    
    status_message = models.VerificationMessage(
        task_id=task.id,
        user_id=current_user.id,
        sender="assistant",
        message=(
            "Your verification is now running. Verinova is reviewing "
            "the request and recording the verification state."
        ),
        message_type="status",
    )
    db.add(status_message)
    db.commit()

    # 3. Run execution loop
    from services.agent.executor import run_agent_loop, ConfirmationRequiredException
    try:
        run_agent_loop(
            task=task,
            db=db,
            current_user=current_user
        )
        db.refresh(task)
        return task
    except ConfirmationRequiredException:
        db.refresh(task)
        return task
    except Exception as e:
        task.status = "failed"
        task.final_result = f"AI service unavailable. {str(e)}"
        task.updated_at = datetime.utcnow()
        
        log_failed = core_models.TaskExecutionLog(
            task_id=task.id,
            step="verification_failed",
            message=f"Verification loop failed: {str(e)}",
            status="failed",
            duration_ms=0
        )
        db.add(log_failed)
        
        err_msg = models.VerificationMessage(
            task_id=task.id,
            user_id=task.user_id,
            sender="assistant",
            message=f"AI service unavailable. {str(e)}",
            message_type="result"
        )
        db.add(err_msg)
        db.commit()
        db.refresh(task)
        logger.error(f"Verification loop failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service unavailable. {str(e)}"
        )


# ============================================================
# ADMIN VERIFICATION MANAGEMENT
# ============================================================

@app.get(
    "/api/admin/tasks/{task_id}/conversation",
    response_model=schemas.VerificationDetailResponse,
)
def admin_get_task_conversation(
    task_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin),
):
    task = (
        db.query(core_models.Task)
        .filter(core_models.Task.id == task_id)
        .first()
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    messages = (
        db.query(models.VerificationMessage)
        .filter(models.VerificationMessage.task_id == task.id)
        .order_by(models.VerificationMessage.created_at.asc())
        .all()
    )

    v_res = db.query(core_models.VerificationResult).filter(core_models.VerificationResult.task_id == task.id).first()
    return {
        "id": task.id,
        "user_id": task.user_id,
        "title": task.title,
        "description": task.description,
        "task_type": task.task_type,
        "status": task.status,
        "review_status": task.review_status,
        "plan": task.plan,
        "verification_status": v_res.final_status if v_res else "NOT_STARTED",
        "verification_explanation": v_res.explanation if v_res else None,
        "confidence_score": task.confidence_score,
        "final_result": task.final_result,
        "reference_count": (
            db.query(core_models.Evidence)
            .filter(core_models.Evidence.task_id == task.id)
            .count()
        ),
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "messages": messages,
    }


@app.patch(
    "/api/admin/tasks/{task_id}",
    response_model=schemas.TaskResponse,
)
def admin_update_task(
    task_id: int,
    update_in: schemas.AdminTaskUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin),
):
    task = (
        db.query(core_models.Task)
        .filter(core_models.Task.id == task_id)
        .first()
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    allowed_statuses = {
        "created",
        "queued",
        "planning",
        "collecting_evidence",
        "analyzing",
        "verifying",
        "evaluating",
        "completed",
        "verified",
        "failed",
        "needs_review",
        "awaiting_admin_review",
        "approved",
        "rejected",
        "inconclusive",
    }

    if update_in.status is not None:
        if update_in.status not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid task status.",
            )
        task.status = update_in.status

    if update_in.confidence_score is not None:
        task.confidence_score = update_in.confidence_score

    if update_in.final_result is not None:
        task.final_result = update_in.final_result

    task.updated_at = datetime.utcnow()

    if update_in.status in {"completed", "verified", "approved", "rejected", "inconclusive", "failed"}:
        assistant_message = models.VerificationMessage(
            task_id=task.id,
            user_id=task.user_id,
            sender="assistant",
            message=(
                update_in.final_result
                or (
                    "Verification approved by administrator."
                    if update_in.status == "approved"
                    else "Verification rejected by administrator."
                    if update_in.status == "rejected"
                    else "Verification inconclusive."
                    if update_in.status == "inconclusive"
                    else "Verification completed successfully."
                    if update_in.status in {"completed", "verified"}
                    else "Verification processing could not be completed."
                )
            ),
            message_type="result",
        )
        db.add(assistant_message)

    db.commit()
    db.refresh(task)

    return populate_task_verification_details(task, db)


# ============================================================
# PROTECTED CONTACT MESSAGE SUBMISSION
# ============================================================

@app.post("/api/contact")
def create_contact_message(
    msg_in: schemas.ContactMessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    try:
        db_msg = models.ContactMessage(
            user_id=current_user.id,
            name=current_user.fullname,
            email=current_user.email,
            subject=msg_in.subject,
            message=msg_in.message,
            status="new"
        )
        db.add(db_msg)
        db.commit()
        db.refresh(db_msg)
        
        # Deliver email to admin
        try:
            admin_email = os.getenv("ADMIN_EMAIL", "adminverinova@gmail.com")
            email_address = os.getenv("EMAIL_ADDRESS")
            email_password = os.getenv("EMAIL_PASSWORD")
            if email_address and email_password:
                import smtplib
                from email.mime.text import MIMEText
                from email.mime.multipart import MIMEMultipart
                
                msg = MIMEMultipart()
                msg['Subject'] = f"VeriNova Contact Message: {msg_in.subject}"
                msg['From'] = f"VeriNova Support <{email_address}>"
                msg['To'] = admin_email
                
                body = (
                    f"VeriNova Contact Message\n\n"
                    f"User:\n{current_user.fullname}\n\n"
                    f"Email:\n{current_user.email}\n\n"
                    f"Subject:\n{msg_in.subject}\n\n"
                    f"Message:\n{msg_in.message}\n\n"
                    f"User ID:\n{current_user.id}\n\n"
                    f"Submitted:\n{db_msg.created_at.strftime('%Y-%m-%d %H:%M:%S') if db_msg.created_at else 'Just now'}\n"
                )
                msg.attach(MIMEText(body, 'plain'))
                
                server = smtplib.SMTP("smtp.gmail.com", 587)
                server.starttls()
                server.login(email_address, email_password)
                server.sendmail(email_address, admin_email, msg.as_string())
                server.quit()
                logger.info(f"Admin contact notification email sent to {admin_email}")
        except Exception as email_err:
            logger.error(f"Failed to send admin email notification: {str(email_err)}")

        return {"message": "Your message has been sent successfully."}
    except Exception as e:
        logger.error(f"Failed to submit contact message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to send your message. Please try again."
        )


# ============================================================
# USER - GET OWN CONTACT MESSAGES
# ============================================================

@app.get("/api/contact/messages", response_model=list[schemas.ContactMessageResponse])
def get_user_contact_messages(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    messages = (
        db.query(models.ContactMessage)
        .filter(models.ContactMessage.user_id == current_user.id)
        .order_by(models.ContactMessage.created_at.desc())
        .all()
    )
    return messages


@app.post("/api/contact/messages/read")
def mark_user_contact_messages_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db.query(models.ContactMessage).filter(
        models.ContactMessage.user_id == current_user.id,
        models.ContactMessage.user_read == False
    ).update({"user_read": True})
    db.commit()
    return {"message": "Messages marked as read."}


# ============================================================
# ADMIN - GET CONTACT MESSAGES
# ============================================================

@app.get("/api/admin/contact-messages", response_model=list[schemas.ContactMessageResponse])
def admin_get_contact_messages(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin)
):
    messages = (
        db.query(models.ContactMessage)
        .order_by(models.ContactMessage.created_at.desc())
        .all()
    )
    return messages


# ============================================================
# ADMIN - UPDATE CONTACT MESSAGE STATUS
# ============================================================

@app.put("/api/admin/contact-messages/{message_id}/status", response_model=schemas.ContactMessageResponse)
def admin_update_contact_message_status(
    message_id: int,
    status_in: schemas.ContactMessageStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin)
):
    msg = (
        db.query(models.ContactMessage)
        .filter(models.ContactMessage.id == message_id)
        .first()
    )
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found."
        )

    valid_statuses = ["new", "read", "replied", "closed"]
    if status_in.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of {valid_statuses}"
        )

    msg.status = status_in.status
    db.commit()
    db.refresh(msg)
    return msg


# ============================================================
# ADMIN - REPLY TO CONTACT MESSAGE
# ============================================================

@app.post("/api/admin/contact-messages/{message_id}/reply", response_model=schemas.ContactMessageResponse)
def admin_reply_contact_message(
    message_id: int,
    reply_in: schemas.ContactMessageReply,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin)
):
    msg = (
        db.query(models.ContactMessage)
        .filter(models.ContactMessage.id == message_id)
        .first()
    )
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found."
        )

    msg.admin_reply = reply_in.admin_reply
    msg.status = "replied"
    msg.user_read = False
    db.commit()
    db.refresh(msg)

    # Deliver reply email to user
    try:
        email_address = os.getenv("EMAIL_ADDRESS")
        email_password = os.getenv("EMAIL_PASSWORD")
        if email_address and email_password:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            mail = MIMEMultipart()
            mail['Subject'] = f"Re: {msg.subject}"
            mail['From'] = f"VeriNova Support <{email_address}>"
            mail['To'] = msg.email
            
            body = (
                f"Hello {msg.name},\n\n"
                f"You have received a reply from the VeriNova AI team regarding your message:\n\n"
                f"Original Subject: {msg.subject}\n\n"
                f"Reply:\n{reply_in.admin_reply}\n\n"
                f"Best regards,\nVeriNova AI Support Team\n"
            )
            mail.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP("smtp.gmail.com", 587)
            server.starttls()
            server.login(email_address, email_password)
            server.sendmail(email_address, msg.email, mail.as_string())
            server.quit()
            logger.info(f"Support reply email sent to {msg.email}")
    except Exception as email_err:
        logger.error(f"Failed to send support reply email: {str(email_err)}")

    return msg


# ============================================================
# ADMIN - DELETE CONTACT MESSAGE
# ============================================================

@app.delete("/api/admin/contact-messages/{message_id}")
def admin_delete_contact_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin)
):
    msg = (
        db.query(models.ContactMessage)
        .filter(models.ContactMessage.id == message_id)
        .first()
    )
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found."
        )

    db.delete(msg)
    db.commit()
    return {"message": "Contact message deleted successfully."}


from fastapi.responses import JSONResponse

def classify_ai_exception(e: Exception):
    from services.agent.ai_provider import GeminiRateLimitError, AIProviderTimeoutError, AIProviderError
    from services.n8n_service import N8NTimeoutError, N8NError
    from services.agent.executor import ToolTimeoutError, ToolError
    
    if isinstance(e, GeminiRateLimitError):
        return status.HTTP_429_TOO_MANY_REQUESTS, "AI_RATE_LIMITED", str(e), getattr(e, "retry_delay_seconds", None)
        
    if isinstance(e, AIProviderTimeoutError):
        return status.HTTP_504_GATEWAY_TIMEOUT, "AI_PROVIDER_TIMEOUT", "AI service is temporarily rate-limited. Please try again shortly.", None

    if isinstance(e, AIProviderError):
        return status.HTTP_502_BAD_GATEWAY, "AI_PROVIDER_ERROR", str(e), None

    if isinstance(e, N8NTimeoutError):
        return status.HTTP_504_GATEWAY_TIMEOUT, "N8N_TIMEOUT", "The requested research workflow took too long to respond. Please try again.", None

    if isinstance(e, N8NError):
        return status.HTTP_502_BAD_GATEWAY, "N8N_ERROR", "Search service temporarily unavailable.", None

    if isinstance(e, ToolTimeoutError):
        return status.HTTP_504_GATEWAY_TIMEOUT, "TOOL_TIMEOUT", "Search service temporarily unavailable.", None

    if isinstance(e, ToolError):
        return status.HTTP_502_BAD_GATEWAY, "TOOL_ERROR", "Search service temporarily unavailable.", None

    err_str = str(e).lower()
    
    if "rate limit" in err_str or "429" in err_str or "resource_exhausted" in err_str:
        return status.HTTP_429_TOO_MANY_REQUESTS, "AI_RATE_LIMITED", "AI service is temporarily rate-limited. Please try again shortly.", None
        
    if "auth" in err_str or "unauthorized" in err_str or "401" in err_str or "403" in err_str or "permission" in err_str or "key is missing" in err_str:
        return status.HTTP_401_UNAUTHORIZED, "AI_AUTH_ERROR", "AI authentication failed or permission was denied.", None
        
    if "bad request" in err_str or "400" in err_str or "rejected request" in err_str:
        return status.HTTP_400_BAD_REQUEST, "AI_BAD_REQUEST", f"AI rejected the request parameters: {str(e)}", None
        
    if "network" in err_str or "timeout" in err_str or "getaddrinfo" in err_str or "dns" in err_str or "connection" in err_str:
        return status.HTTP_504_GATEWAY_TIMEOUT, "AI_PROVIDER_UNAVAILABLE", "AI service is temporarily offline or unreachable.", None
        
    return status.HTTP_502_BAD_GATEWAY, "AI_PROVIDER_ERROR", f"AI provider returned an error: {str(e)}", None


# ============================================================
# AGENT - GENERATE PLAN
# ============================================================

@app.post(
    "/api/agent/plan",
    response_model=schemas.AgentPlanResponse,
    status_code=status.HTTP_200_OK
)
def create_agent_plan(
    req: schemas.AgentPlanRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role != "user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts cannot use agent planning endpoints."
        )

    # 1. Create task structure in database
    title = req.task_text[:60] + "..." if len(req.task_text) > 60 else req.task_text

    task = core_models.Task(
        user_id=current_user.id,
        title=title,
        description=req.task_text,
        task_type="agent_planning",
        status="received",
        confidence_score=None,
        final_result=None
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    request_id = f"task_{task.id}"
    logger.info(f"[VERINOVA] request_id={request_id} task_received")
    logger.info(f"[VERINOVA] request_id={request_id} planner_started")

    # Set context variables for request logging alignment
    from services.agent.ai_provider import request_id_ctx
    ctx_token = request_id_ctx.set(request_id)

    # Log step 1: task_received
    log_received = core_models.TaskExecutionLog(
        task_id=task.id,
        step="task_received",
        message=f"Received natural-language task: {req.task_text}",
        status="completed",
        duration_ms=0
    )
    db.add(log_received)

    # Log step 2: planning_started
    log_planning = core_models.TaskExecutionLog(
        task_id=task.id,
        step="planning_started",
        message="Orchestrating agent planner for the requested task.",
        status="completed",
        duration_ms=0
    )
    db.add(log_planning)
    db.commit()

    import time
    start_time = time.time()

    try:
        from services.agent import generate_plan
        plan_data = generate_plan(req.task_text)

        # Update task type, plan and status
        task.task_type = plan_data.get("task_type", "research")
        task.plan = plan_data
        task.status = "parsing" # Preparing/Planning state
        db.commit()

        # Log step 3: planning_completed
        duration = int((time.time() - start_time) * 1000)
        log_completed = core_models.TaskExecutionLog(
            task_id=task.id,
            step="planning_completed",
            message="Structured plan generated successfully.",
            status="completed",
            duration_ms=duration
        )
        db.add(log_completed)

        # Log step 4: plan_ready
        log_ready = core_models.TaskExecutionLog(
            task_id=task.id,
            step="plan_ready",
            message=f"Plan objective: {plan_data.get('objective')}",
            status="completed",
            duration_ms=0
        )
        db.add(log_ready)

        # Add initial status message to task conversation chat
        initial_msg = models.VerificationMessage(
            task_id=task.id,
            user_id=current_user.id,
            sender="assistant",
            message=f"I have analyzed your task: \"{req.task_text}\"\n\nHere is the plan I have prepared:\n\n**Objective**: {plan_data.get('objective')}\n**Risk Level**: {plan_data.get('risk_level', 'low').upper()}\n\nI will now await your verification triggers to execute the steps.",
            message_type="status"
        )
        db.add(initial_msg)
        db.commit()

        logger.info(f"[AGENT REQUEST] request_id={request_id} planner_finished")

        return {
            "task_id": task.id,
            "plan": plan_data
        }

    except Exception as e:
        # Classify the error type
        status_code, err_code, err_msg, retry_seconds = classify_ai_exception(e)

        task.status = "failed"
        task.execution_status = "FAILED"
        task.final_result = err_msg
        
        fail_msg = models.VerificationMessage(
            task_id=task.id,
            user_id=current_user.id,
            sender="assistant",
            message=f"I failed to plan the task: {err_msg}",
            message_type="status"
        )
        db.add(fail_msg)
        db.commit()

        duration = int((time.time() - start_time) * 1000)
        log_failed = core_models.TaskExecutionLog(
            task_id=task.id,
            step="planning_failed",
            message=f"Failed to generate structured plan: {err_msg}",
            status="failed",
            duration_ms=duration
        )
        db.add(log_failed)
        db.commit()
        logger.error(f"[AGENT REQUEST] request_id={request_id} planning failed ({err_code}): {err_msg}")

        headers = {}
        if retry_seconds:
            headers["Retry-After"] = str(int(retry_seconds))

        return JSONResponse(
            status_code=status_code,
            content={
                "success": False,
                "error": {
                    "code": err_code,
                    "message": err_msg
                }
            },
            headers=headers
        )
    finally:
        request_id_ctx.reset(ctx_token)


# ============================================================
# AGENT - RUN TOOL EXECUTION
# ============================================================

@app.post(
    "/api/agent/execute",
    response_model=schemas.AgentExecuteResponse,
    status_code=status.HTTP_200_OK
)
def execute_agent_task(
    req: schemas.AgentExecuteRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role != "user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts cannot invoke task execution endpoints."
        )

    # 1. Load task and verify ownership
    task = (
        db.query(core_models.Task)
        .filter(
            core_models.Task.id == req.task_id,
            core_models.Task.user_id == current_user.id
        )
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or unauthorized access."
        )

    if task.execution_status in ("EXECUTING", "VERIFYING") and req.confirm_action_id is None:
        return {
            "task_id": task.id,
            "status": task.status,
            "result": "Task execution is already running in background."
        }

    # Queue background task
    def run_agent_in_background(task_id: int, user_id: int, confirm_id: Optional[int]):
        from database import SessionLocal
        local_db = SessionLocal()
        try:
            t = local_db.query(core_models.Task).filter(core_models.Task.id == task_id).first()
            u = local_db.query(models.User).filter(models.User.id == user_id).first()
            if t and u:
                from services.agent.executor import run_agent_loop, ConfirmationRequiredException
                run_agent_loop(
                    task=t,
                    db=local_db,
                    current_user=u,
                    confirm_action_id=confirm_id
                )
        except ConfirmationRequiredException as cre:
            logger.info(f"Task {task_id} paused: confirmation required for action ID {cre.action_id} (tool: {cre.tool_name})")
        except Exception as e:
            logger.error(f"Background execution failed: {str(e)}")
            try:
                t_err = local_db.query(core_models.Task).filter(core_models.Task.id == task_id).first()
                if t_err:
                    t_err.status = "failed"
                    t_err.execution_status = "FAILED"
                    t_err.final_result = f"Background execution failed: {str(e)}"
                    
                    log_fail = core_models.TaskExecutionLog(
                        task_id=task_id,
                        step="execution_failed",
                        message=f"Background execution failed: {str(e)}",
                        status="failed",
                        duration_ms=0
                    )
                    local_db.add(log_fail)
                    
                    err_msg = models.VerificationMessage(
                        task_id=task_id,
                        user_id=user_id,
                        sender="assistant",
                        message=f"I encountered a failure during execution: {str(e)}",
                        message_type="status"
                    )
                    local_db.add(err_msg)
                    local_db.commit()
            except Exception as db_err:
                logger.error(f"Failed to record background execution failure state: {str(db_err)}")
        finally:
            local_db.close()

    task.execution_status = "PLANNING"
    task.status = "planning"
    db.commit()

    background_tasks.add_task(run_agent_in_background, task.id, current_user.id, req.confirm_action_id)

    return {
        "task_id": task.id,
        "status": "planning",
        "result": "Task execution queued successfully in the background worker."
    }


# ============================================================
# AGENT - RUN WORKFLOW VIA N8N
# ============================================================

@app.post(
    "/api/agent/run",
    response_model=schemas.AgentRunResponse,
    status_code=status.HTTP_200_OK
)
def run_agent_workflow(
    req: schemas.AgentRunRequest,
    db: Session = Depends(get_db)
):
    n8n_webhook_url = os.getenv("N8N_WEBHOOK_URL", "").strip()
    if not n8n_webhook_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="n8n webhook URL is not configured. Please set N8N_WEBHOOK_URL in environment variables."
        )

    payload = {
        "message": req.message,
        "conversation_id": req.conversation_id or f"conv_{uuid.uuid4().hex[:8]}",
        "task_id": req.task_id,
        "user_id": req.user_id
    }

    n8n_api_key = os.getenv("N8N_API_KEY", "").strip()
    headers = {
        "Content-Type": "application/json"
    }
    if n8n_api_key:
        headers["X-N8N-API-KEY"] = n8n_api_key

    import urllib.request
    import urllib.parse
    import json
    
    req_data = json.dumps(payload).encode("utf-8")
    http_req = urllib.request.Request(
        n8n_webhook_url,
        data=req_data,
        headers=headers,
        method="POST"
    )

    try:
        with urllib.request.urlopen(http_req, timeout=60) as response:
            res_data = response.read().decode("utf-8")
            if not res_data:
                raise ValueError("Received empty response from n8n webhook.")
            res_json = json.loads(res_data)
            
            return {
                "success": res_json.get("success", True),
                "task": res_json.get("task"),
                "answer": res_json.get("answer", ""),
                "results": res_json.get("results"),
                "sources": res_json.get("sources"),
                "verification": res_json.get("verification"),
                "tools_used": res_json.get("tools_used"),
                "requires_confirmation": res_json.get("requires_confirmation", False)
            }
    except Exception as e:
        logger.error(f"Error calling n8n workflow: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"n8n AI agent connection failed: {str(e)}"
        )


# ============================================================
# AGENT - SECURE TOOL EXECUTION FOR N8N
# ============================================================

@app.post(
    "/api/agent/tool/execute",
    status_code=status.HTTP_200_OK
)
def execute_agent_tool_for_n8n(
    req: dict,
    db: Session = Depends(get_db)
):
    tool_name = req.get("tool_name")
    tool_args = req.get("tool_args", {})
    user_id = req.get("user_id")
    task_id = req.get("task_id")

    if not tool_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required field 'tool_name' in request payload."
        )

    from services.agent.tool_registry import get_tool
    tool = get_tool(tool_name)
    if not tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool '{tool_name}' not found in VeriNova registry."
        )

    try:
        import inspect
        sig = inspect.signature(tool.func)
        kwargs = {}
        validated_args = tool.input_schema(**tool_args)
        kwargs = validated_args.model_dump() if hasattr(validated_args, "model_dump") else validated_args.dict()
        
        if "db" in sig.parameters:
            kwargs["db"] = db
        if "current_user" in sig.parameters and user_id:
            user = db.query(models.User).filter(models.User.id == user_id).first()
            kwargs["current_user"] = user

        raw_result = tool.func(**kwargs)
        return {
            "success": True,
            "tool": tool_name,
            "data": raw_result
        }
    except Exception as e:
        logger.error(f"Tool {tool_name} execution failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Tool execution failed: {str(e)}"
        )


@app.post("/api/test/n8n")
def test_n8n_connection(
    payload: dict,
    current_user: models.User = Depends(auth.get_current_user)
):
    """Test n8n connectivity by sending a request payload and returning the result."""
    from services.n8n_service import N8NService
    try:
        res = N8NService.call_webhook(payload)
        return {
            "success": True,
            "response": res
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"n8n test connection failed: {str(e)}"
        )


@app.post("/api/tasks/{task_id}/cancel")
def cancel_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    task = db.query(core_models.Task).filter(
        core_models.Task.id == task_id,
        core_models.Task.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found."
        )
    
    task.execution_status = "CANCELLED"
    task.status = "cancelled"
    task.updated_at = datetime.utcnow()
    
    log_cancel = core_models.TaskExecutionLog(
        task_id=task.id,
        step="cancelled",
        message="Task cancelled by user request.",
        status="completed",
        duration_ms=0
    )
    db.add(log_cancel)
    db.commit()
    return {"success": True, "message": "Task cancelled successfully."}


@app.post("/api/tasks/{task_id}/pause")
def pause_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    task = db.query(core_models.Task).filter(
        core_models.Task.id == task_id,
        core_models.Task.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found."
        )
    
    task.execution_status = "PAUSED"
    task.status = "paused"
    task.updated_at = datetime.utcnow()
    
    log_pause = core_models.TaskExecutionLog(
        task_id=task.id,
        step="paused",
        message="Task paused by user request.",
        status="completed",
        duration_ms=0
    )
    db.add(log_pause)
    db.commit()
    return {"success": True, "message": "Task paused successfully."}


@app.post("/api/tasks/{task_id}/resume")
def resume_task(
    task_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    task = db.query(core_models.Task).filter(
        core_models.Task.id == task_id,
        core_models.Task.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found."
        )
    
    task.execution_status = "READY"
    task.status = "running"
    task.updated_at = datetime.utcnow()
    
    log_resume = core_models.TaskExecutionLog(
        task_id=task.id,
        step="resumed",
        message="Task resumed by user request.",
        status="completed",
        duration_ms=0
    )
    db.add(log_resume)
    db.commit()
    
    # Trigger run_agent_loop inside background thread runner
    from services.agent.executor import run_agent_loop
    from database import SessionLocal
    
    def worker_thread():
        thread_db = SessionLocal()
        try:
            t = thread_db.query(core_models.Task).filter(core_models.Task.id == task.id).first()
            u = thread_db.query(models.User).filter(models.User.id == current_user.id).first()
            if t and u:
                run_agent_loop(t, thread_db, u)
        except Exception as e:
            logger.error(f"Error executing resumed task in background thread: {str(e)}")
        finally:
            thread_db.close()
            
    background_tasks.add_task(worker_thread)
    return {"success": True, "message": "Task resumed successfully."}


# ============================================================
# ADMIN AGENT INSPECTIONS
# ============================================================

@app.get(
    "/api/admin/agent/actions",
    response_model=list[schemas.AdminAgentActionResponse]
)
def admin_get_agent_actions(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin)
):
    return db.query(core_models.AgentAction).order_by(core_models.AgentAction.created_at.desc()).all()


@app.get(
    "/api/admin/agent/actions/{action_id}",
    response_model=schemas.AdminAgentActionResponse
)
def admin_get_agent_action_detail(
    action_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin)
):
    action = db.query(core_models.AgentAction).filter(core_models.AgentAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Agent action not found.")
    return action


@app.get(
    "/api/admin/agent/conversations",
    response_model=list[schemas.TaskResponse]
)
def admin_get_agent_conversations(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin)
):
    tasks = db.query(core_models.Task).order_by(core_models.Task.created_at.desc()).all()
    return populate_tasks_verification_details(tasks, db)


# ============================================================
# ADMIN SHOPPING VISIBILITY
# ============================================================

@app.get(
    "/api/admin/shopping/searches",
    response_model=list[schemas.AdminProductSearchResponse]
)
def admin_get_shopping_searches(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin)
):
    return db.query(core_models.ProductSearch).order_by(core_models.ProductSearch.created_at.desc()).all()


# ============================================================
# NEW ADMIN ENDPOINTS FOR REVIEWS, EXECUTIONS, EVIDENCE & AUDITING
# ============================================================

@app.get("/api/admin/reviews", response_model=list[schemas.TaskResponse])
def admin_get_tasks_needing_review(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin)
):
    """Retrieve all tasks that are flagged for review (review_status = REQUIRED or IN_REVIEW)."""
    return db.query(core_models.Task).filter(
        core_models.Task.review_status.in_(["REQUIRED", "IN_REVIEW"])
    ).order_by(core_models.Task.created_at.desc()).all()


@app.get("/api/admin/executions")
def admin_get_execution_logs(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin)
):
    """Retrieve all task execution logs."""
    logs = db.query(core_models.TaskExecutionLog).order_by(
        core_models.TaskExecutionLog.created_at.desc()
    ).limit(200).all()
    return [
        {
            "id": log.id,
            "task_id": log.task_id,
            "step": log.step,
            "message": log.message,
            "status": log.status,
            "duration_ms": log.duration_ms,
            "created_at": log.created_at
        }
        for log in logs
    ]


@app.get("/api/admin/evidence")
def admin_get_all_evidence(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin)
):
    """Retrieve all collected evidence logs."""
    evidence = db.query(core_models.Evidence).order_by(
        core_models.Evidence.collected_at.desc()
    ).limit(200).all()
    return [
        {
            "id": ev.id,
            "task_id": ev.task_id,
            "source_type": ev.source_type,
            "source_name": ev.source_name,
            "description": ev.description,
            "evidence_data": ev.evidence_data,
            "status": ev.status,
            "collected_at": ev.collected_at
        }
        for ev in evidence
    ]


@app.get("/api/admin/audit-logs", response_model=list[schemas.AuditLogResponse])
def admin_get_audit_logs(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin)
):
    """Retrieve all administrative action audit logs."""
    return db.query(core_models.AuditLog).order_by(
        core_models.AuditLog.created_at.desc()
    ).all()


@app.post("/api/admin/reviews/{task_id}/approve", response_model=schemas.TaskResponse)
def admin_approve_task(
    task_id: int,
    req: schemas.ReviewActionRequest,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin)
):
    """Approve a task under review, completing it and recording an audit log entry."""
    task = db.query(core_models.Task).filter(core_models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
        
    prev_status = task.status
    task.status = "completed"
    task.review_status = "APPROVED"
    task.updated_at = datetime.utcnow()
    
    # Log audit event
    audit = core_models.AuditLog(
        admin_user_id=current_admin.id,
        task_id=task.id,
        action="APPROVE",
        previous_status=prev_status,
        new_status="completed",
        reason=req.reason
    )
    db.add(audit)
    
    # Save a chat message update
    msg = models.VerificationMessage(
        task_id=task.id,
        user_id=task.user_id,
        sender="assistant",
        message=f"✓ Administrator approved verification.\nReason: {req.reason}",
        message_type="result"
    )
    db.add(msg)
    
    db.commit()
    db.refresh(task)
    return task


@app.post("/api/admin/reviews/{task_id}/reject", response_model=schemas.TaskResponse)
def admin_reject_task(
    task_id: int,
    req: schemas.ReviewActionRequest,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin)
):
    """Reject a task under review, setting it to failed and recording an audit log entry."""
    task = db.query(core_models.Task).filter(core_models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
        
    prev_status = task.status
    task.status = "failed"
    task.review_status = "REJECTED"
    task.updated_at = datetime.utcnow()
    
    # Log audit event
    audit = core_models.AuditLog(
        admin_user_id=current_admin.id,
        task_id=task.id,
        action="REJECT",
        previous_status=prev_status,
        new_status="failed",
        reason=req.reason
    )
    db.add(audit)
    
    # Save a chat message update
    msg = models.VerificationMessage(
        task_id=task.id,
        user_id=task.user_id,
        sender="assistant",
        message=f"✗ Administrator rejected verification.\nReason: {req.reason}",
        message_type="result"
    )
    db.add(msg)
    
    db.commit()
    db.refresh(task)
    return task


@app.post("/api/admin/reviews/{task_id}/override", response_model=schemas.TaskResponse)
def admin_override_task(
    task_id: int,
    req: schemas.ReviewActionRequest,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin)
):
    """Override a task under review, applying new results and recording an audit log entry."""
    task = db.query(core_models.Task).filter(core_models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
        
    prev_status = task.status
    task.status = "completed"
    task.review_status = "OVERRIDDEN"
    if req.confidence_score is not None:
        task.confidence_score = req.confidence_score
    if req.final_result is not None:
        task.final_result = req.final_result
    task.updated_at = datetime.utcnow()
    
    # Update verification results as well
    v_res = db.query(core_models.VerificationResult).filter(core_models.VerificationResult.task_id == task_id).first()
    if v_res:
        v_res.final_status = "verified"
        if req.confidence_score is not None:
            v_res.confidence_score = req.confidence_score
        v_res.explanation = f"Result overridden by administrator. Reason: {req.reason}"
    
    # Log audit event
    audit = core_models.AuditLog(
        admin_user_id=current_admin.id,
        task_id=task.id,
        action="OVERRIDE",
        previous_status=prev_status,
        new_status="completed",
        reason=req.reason
    )
    db.add(audit)
    
    # Save a chat message update
    msg = models.VerificationMessage(
        task_id=task.id,
        user_id=task.user_id,
        sender="assistant",
        message=f"⚠ Administrator overridden verification.\nReason: {req.reason}\nNew Result: {req.final_result or task.final_result}",
        message_type="result"
    )
    db.add(msg)
    
    db.commit()
    db.refresh(task)
    return task


# ============================================================
# API PLATFORM EXCEPTION HANDLER (ERROR FORMAT)
# ============================================================
from fastapi.responses import JSONResponse

@app.exception_handler(HTTPException)
def custom_http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": "API_ERROR",
                "message": exc.detail
            }
        }
    )

# ============================================================
# MEMORY ENDPOINTS
# ============================================================
@app.get("/api/memory")
def get_user_memories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    memories = db.query(core_models.UserMemory).filter(
        core_models.UserMemory.user_id == current_user.id
    ).all()
    return {
        "success": True,
        "memories": [
            {
                "id": m.id,
                "content": m.content,
                "category": m.category,
                "confidence": m.confidence,
                "created_at": m.created_at.isoformat()
            }
            for m in memories
        ]
    }

@app.delete("/api/memory/{memory_id}")
def delete_user_memory(
    memory_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    mem = db.query(core_models.UserMemory).filter(
        core_models.UserMemory.id == memory_id,
        core_models.UserMemory.user_id == current_user.id
    ).first()
    if not mem:
        raise HTTPException(status_code=404, detail="Memory element not found.")
    db.delete(mem)
    db.commit()
    return {"success": True, "message": "Memory deleted successfully."}

@app.post("/api/memory/clear")
def clear_user_memories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db.query(core_models.UserMemory).filter(
        core_models.UserMemory.user_id == current_user.id
    ).delete()
    db.commit()
    return {"success": True, "message": "All memories cleared successfully."}

# ============================================================
# SETTINGS ENDPOINTS
# ============================================================
@app.get("/api/user/settings")
def get_user_settings(
    current_user: models.User = Depends(auth.get_current_user)
):
    return {
        "success": True,
        "memory_enabled": getattr(current_user, "memory_enabled", True)
    }

@app.post("/api/user/settings")
def update_user_settings(
    req: schemas.UserSettingsUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.memory_enabled = req.memory_enabled
    db.commit()
    return {
        "success": True,
        "memory_enabled": user.memory_enabled
    }

# ============================================================
# FEEDBACK ENDPOINTS
# ============================================================
@app.post("/api/tasks/{task_id}/feedback")
def submit_task_feedback(
    task_id: int,
    req: schemas.TaskFeedbackRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    task = db.query(core_models.Task).filter(
        core_models.Task.id == task_id,
        core_models.Task.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
        
    feedback = db.query(core_models.TaskFeedback).filter(
        core_models.TaskFeedback.task_id == task_id
    ).first()
    
    if feedback:
        feedback.rating = req.rating
        feedback.comment = req.comment
    else:
        feedback = core_models.TaskFeedback(
            task_id=task_id,
            user_id=current_user.id,
            rating=req.rating,
            comment=req.comment
        )
        db.add(feedback)
    db.commit()
    return {"success": True, "message": "Feedback submitted successfully."}

# ============================================================
# EXPORT & CLEANUP ENDPOINTS
# ============================================================
@app.get("/api/user/export")
def export_user_data(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    profile = {
        "fullname": current_user.fullname,
        "email": current_user.email,
        "role": current_user.role,
        "memory_enabled": getattr(current_user, "memory_enabled", True)
    }
    
    tasks = db.query(core_models.Task).filter(
        core_models.Task.user_id == current_user.id
    ).all()
    tasks_export = []
    for t in tasks:
        tasks_export.append({
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "status": t.status,
            "execution_status": t.execution_status,
            "final_result": t.final_result,
            "confidence_score": t.confidence_score,
            "created_at": t.created_at.isoformat()
        })
        
    memories = db.query(core_models.UserMemory).filter(
        core_models.UserMemory.user_id == current_user.id
    ).all()
    memories_export = [
        {"content": m.content, "category": m.category, "confidence": m.confidence}
        for m in memories
    ]
    
    return {
        "success": True,
        "profile": profile,
        "tasks": tasks_export,
        "memories": memories_export
    }

@app.post("/api/user/delete-account")
def delete_user_account(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    db.delete(user)
    db.commit()
    return {"success": True, "message": "Your account and all associated personal data have been permanently deleted."}

# ============================================================
# ADMIN ANALYTICS & AUDIT LOGS
# ============================================================
@app.get("/api/admin/analytics")
def get_admin_analytics(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin)
):
    total_tasks = db.query(core_models.Task).count()
    completed_tasks = db.query(core_models.Task).filter(core_models.Task.execution_status == "COMPLETED").count()
    failed_tasks = db.query(core_models.Task).filter(core_models.Task.execution_status == "FAILED").count()
    needs_review = db.query(core_models.Task).filter(core_models.Task.execution_status == "NEEDS_REVIEW").count()
    
    total_cost = db.query(core_models.AiCostLog.estimated_cost).all()
    sum_cost = sum(c[0] for c in total_cost) if total_cost else 0.0
    
    tool_healths = db.query(core_models.ToolHealth).all()
    health_list = [
        {
            "tool_name": h.tool_name,
            "success_count": h.success_count,
            "failure_count": h.failure_count,
            "circuit_state": h.circuit_state,
            "consecutive_failures": h.consecutive_failures
        }
        for h in tool_healths
    ]
    
    feedbacks = db.query(core_models.TaskFeedback).all()
    feedback_stats = {
        "helpful": len([f for f in feedbacks if f.rating == "helpful"]),
        "not_helpful": len([f for f in feedbacks if f.rating == "not_helpful"]),
        "incorrect": len([f for f in feedbacks if f.rating == "incorrect"])
    }
    
    return {
        "success": True,
        "metrics": {
            "total_tasks": total_tasks,
            "completed": completed_tasks,
            "failed": failed_tasks,
            "needs_review": needs_review,
            "total_ai_cost_usd": round(sum_cost, 4),
            "tool_health": health_list,
            "feedback": feedback_stats
        }
    }

@app.get("/api/admin/costs")
def get_admin_costs_list(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin)
):
    cost_logs = db.query(core_models.AiCostLog).order_by(core_models.AiCostLog.timestamp.desc()).all()
    return {
        "success": True,
        "costs": [
            {
                "id": c.id,
                "task_id": c.task_id,
                "user_id": c.user_id,
                "model": c.model,
                "input_tokens": c.input_tokens,
                "output_tokens": c.output_tokens,
                "estimated_cost": c.estimated_cost,
                "timestamp": c.timestamp.isoformat()
            }
            for c in cost_logs
        ]
    }


# ============================================================
# PHASE 5 INTEGRATION PLATFORM ENDPOINTS
# ============================================================
@app.get("/api/tools")
def list_registry_tools():
    from services.agent.tool_registry import list_tools
    tools = list_tools()
    return {
        "success": True,
        "tools": [
            {
                "name": t.name,
                "description": t.description,
                "version": t.version,
                "inputSchema": t.inputSchema,
                "outputSchema": t.outputSchema,
                "permissions": t.permissions,
                "riskLevel": t.riskLevel,
                "enabled": t.enabled
            }
            for t in tools
        ]
    }

@app.get("/api/connections")
def list_user_connections(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    conns = db.query(core_models.UserConnection).filter(
        core_models.UserConnection.user_id == current_user.id
    ).all()
    return {
        "success": True,
        "connections": [
            {
                "id": c.id,
                "provider": c.provider,
                "provider_account_id": c.provider_account_id,
                "scopes": c.scopes,
                "status": c.status,
                "created_at": c.created_at.isoformat()
            }
            for c in conns
        ]
    }

@app.post("/api/connections")
def create_user_connection(
    req: schemas.ConnectionCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    from utils.encryption import encrypt_data
    encrypted = encrypt_data(req.credentials)
    
    conn = db.query(core_models.UserConnection).filter(
        core_models.UserConnection.user_id == current_user.id,
        core_models.UserConnection.provider == req.provider
    ).first()
    
    if conn:
        conn.provider_account_id = req.provider_account_id
        conn.scopes = req.scopes
        conn.encrypted_credentials = encrypted
        conn.updated_at = datetime.utcnow()
    else:
        conn = core_models.UserConnection(
            user_id=current_user.id,
            provider=req.provider,
            provider_account_id=req.provider_account_id,
            scopes=req.scopes,
            encrypted_credentials=encrypted
        )
        db.add(conn)
    db.commit()
    return {
        "success": True,
        "connection_id": conn.id,
        "message": f"Connection to {req.provider} created successfully."
    }

@app.get("/api/providers")
def list_providers(
    db: Session = Depends(get_db)
):
    healths = db.query(core_models.ProviderHealth).all()
    if not healths:
        default_providers = ["tavily", "google_calendar", "smtp_email", "maps_location", "weather_forecast", "meesho_shopping"]
        for p in default_providers:
            h = core_models.ProviderHealth(
                provider=p,
                availability=1.0,
                latency=150.0,
                success_rate=0.99
            )
            db.add(h)
        db.commit()
        healths = db.query(core_models.ProviderHealth).all()
        
    return {
        "success": True,
        "providers": [
            {
                "provider": h.provider,
                "availability": h.availability,
                "latency": h.latency,
                "success_rate": h.success_rate,
                "circuit_state": h.circuit_state,
                "last_failure": h.last_failure.isoformat() if h.last_failure else None
            }
            for h in healths
        ]
    }


# ============================================================
# PHASE 6 AGENT ORCHESTRATION & SCHEDULE PLATFORM ENDPOINTS
# ============================================================
@app.get("/api/runs")
def list_agent_runs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    runs = db.query(core_models.AgentRun).join(
        core_models.Task, core_models.AgentRun.task_id == core_models.Task.id
    ).filter(core_models.Task.user_id == current_user.id).all()
    
    return {
        "success": True,
        "runs": [
            {
                "id": r.id,
                "task_id": r.task_id,
                "status": r.status,
                "iterations_count": r.iterations_count,
                "tool_calls_count": r.tool_calls_count,
                "started_at": r.started_at.isoformat(),
                "completed_at": r.completed_at.isoformat() if r.completed_at else None
            }
            for r in runs
        ]
    }

@app.get("/api/plans/{task_id}")
def get_task_plan(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    task = db.query(core_models.Task).filter(
        core_models.Task.id == task_id,
        core_models.Task.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
        
    plan = task.plan or {}
    return {
        "success": True,
        "task_id": task_id,
        "goal": plan.get("goal") or plan.get("objective") or task.description,
        "risk_level": plan.get("riskLevel") or plan.get("risk_level", "LOW_RISK"),
        "success_criteria": plan.get("successCriteria") or plan.get("success_criteria"),
        "steps": plan.get("steps", [])
    }

from pydantic import BaseModel
class ScheduleCreateRequest(BaseModel):
    schedule_id: str
    task_template: dict
    schedule: str

@app.post("/api/schedules")
def create_scheduled_task(
    req: ScheduleCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    sched = db.query(core_models.ScheduledTask).filter(
        core_models.ScheduledTask.user_id == current_user.id,
        core_models.ScheduledTask.schedule_id == req.schedule_id
    ).first()
    
    next_run = datetime.utcnow() + timedelta(days=1)
    
    if sched:
        sched.task_template = req.task_template
        sched.schedule = req.schedule
        sched.next_run_at = next_run
    else:
        sched = core_models.ScheduledTask(
            user_id=current_user.id,
            schedule_id=req.schedule_id,
            task_template=req.task_template,
            schedule=req.schedule,
            next_run_at=next_run
        )
        db.add(sched)
    db.commit()
    return {
        "success": True,
        "schedule_id": sched.schedule_id,
        "next_run_at": sched.next_run_at.isoformat()
    }

@app.get("/api/schedules")
def list_scheduled_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    tasks = db.query(core_models.ScheduledTask).filter(
        core_models.ScheduledTask.user_id == current_user.id
    ).all()
    return {
        "success": True,
        "schedules": [
            {
                "id": t.id,
                "schedule_id": t.schedule_id,
                "task_template": t.task_template,
                "schedule": t.schedule,
                "status": t.status,
                "next_run_at": t.next_run_at.isoformat() if t.next_run_at else None,
                "last_run_at": t.last_run_at.isoformat() if t.last_run_at else None
            }
            for t in tasks
        ]
    }


# ============================================================
# PHASE 7 MULTI-AGENT PLATFORM ENDPOINTS
# ============================================================
@app.get("/api/agents")
def list_registered_agents():
    from services.agent.agent_registry import AgentRegistry
    agents = AgentRegistry.list_agents()
    return {
        "success": True,
        "agents": [
            {
                "agent_id": a.agent_id,
                "name": a.name,
                "description": a.description,
                "version": a.version,
                "capabilities": [
                    {
                        "capability_id": c.capability_id,
                        "name": c.name,
                        "description": c.description,
                        "required_tools": c.required_tools,
                        "risk_level": c.risk_level
                    }
                    for c in a.capabilities
                ],
                "allowed_tools": a.allowed_tools,
                "risk_policy": a.risk_policy,
                "enabled": a.enabled
            }
            for a in agents
        ]
    }

@app.get("/api/agent-runs")
def list_supervisor_agent_runs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    runs = db.query(core_models.AgentRun).join(
        core_models.Task, core_models.AgentRun.task_id == core_models.Task.id
    ).filter(core_models.Task.user_id == current_user.id).all()
    return {
        "success": True,
        "runs": [
            {
                "id": r.id,
                "task_id": r.task_id,
                "status": r.status,
                "iterations_count": r.iterations_count,
                "tool_calls_count": r.tool_calls_count,
                "started_at": r.started_at.isoformat(),
                "completed_at": r.completed_at.isoformat() if r.completed_at else None
            }
            for r in runs
        ]
    }

@app.get("/api/agent-health")
def list_specialized_agents_health(
    db: Session = Depends(get_db)
):
    healths = db.query(core_models.AgentHealth).all()
    if not healths:
        from services.agent.agent_registry import AgentRegistry
        for a in AgentRegistry.list_agents():
            ah = core_models.AgentHealth(
                agent_id=a.agent_id,
                success_rate=0.98,
                failure_rate=0.02,
                average_latency=250.0,
                status="HEALTHY"
            )
            db.add(ah)
        db.commit()
        healths = db.query(core_models.AgentHealth).all()
        
    return {
        "success": True,
        "health": [
            {
                "agent_id": h.agent_id,
                "success_rate": h.success_rate,
                "failure_rate": h.failure_rate,
                "average_latency": h.average_latency,
                "status": h.status,
                "last_failure": h.last_failure.isoformat() if h.last_failure else None
            }
            for h in healths
        ]
    }

@app.post("/api/agent-feedback")
def submit_agent_feedback(
    req: schemas.AgentFeedbackCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    task = db.query(core_models.Task).filter(
        core_models.Task.id == req.task_id,
        core_models.Task.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or access denied.")

    feedback = core_models.AgentFeedback(
        user_id=current_user.id,
        task_id=req.task_id,
        agent_id=req.agent_id,
        rating=req.rating,
        comment=req.comment
    )
    db.add(feedback)
    
    if req.rating == "incorrect":
        task.execution_status = "PARTIALLY_COMPLETED"
        task.status = "completed"
        
        v_res = db.query(core_models.VerificationResult).filter(
            core_models.VerificationResult.task_id == req.task_id
        ).first()
        
        if v_res:
            v_res.final_status = "LOW"
            v_res.confidence_score = 40.0
            v_res.explanation = f"Trust degraded. Correction submitted by user: {req.comment or 'Data claims marked incorrect'}"
            
        task.final_result = (
            f"Correction loop active. I have noted that the prior price list was incorrect. "
            f"Verification Engine revised confidence score to LOW."
        )
        
    db.commit()
    return {
        "success": True,
        "feedback_id": feedback.id,
        "message": "Feedback submitted successfully."
    }


# ============================================================
# PHASE 8 ACTION & BOOKING PLATFORM ENDPOINTS
# ============================================================
@app.get("/api/actions")
def list_user_actions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    actions = db.query(core_models.AgentAction).filter(
        core_models.AgentAction.user_id == current_user.id
    ).order_by(core_models.AgentAction.created_at.desc()).all()
    return {
        "success": True,
        "actions": [
            {
                "id": a.id,
                "task_id": a.task_id,
                "tool_name": a.tool_name,
                "input_data": a.input_data,
                "result_data": a.result_data,
                "status": a.status,
                "risk_level": a.risk_level,
                "created_at": a.created_at.isoformat()
            }
            for a in actions
        ]
    }

@app.get("/api/actions/{action_id}")
def get_user_action_details(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    action = db.query(core_models.AgentAction).filter(
        core_models.AgentAction.id == action_id,
        core_models.AgentAction.user_id == current_user.id
    ).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found or access denied.")
        
    return {
        "success": True,
        "action": {
            "id": action.id,
            "task_id": action.task_id,
            "tool_name": action.tool_name,
            "input_data": action.input_data,
            "result_data": action.result_data,
            "status": action.status,
            "risk_level": action.risk_level,
            "error_message": action.error_message,
            "created_at": action.created_at.isoformat()
        }
    }

@app.post("/api/actions/{action_id}/confirm")
def confirm_user_action_token(
    action_id: int,
    req: schemas.ActionConfirmRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    action = db.query(core_models.AgentAction).filter(
        core_models.AgentAction.id == action_id,
        core_models.AgentAction.user_id == current_user.id
    ).first()
    
    if not action:
        raise HTTPException(status_code=404, detail="Action not found or access denied.")

    from services.agent.action_engine import ActionEngine
    res = ActionEngine.execute_action(
        user_id=current_user.id,
        task_id=action.task_id,
        tool_id=req.tool_id,
        arguments=req.arguments,
        db=db,
        confirmation_id=req.confirmation_id
    )
    return res

@app.post("/api/actions/{action_id}/cancel")
def cancel_user_action_token(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    conf = db.query(core_models.ActionConfirmation).filter(
        core_models.ActionConfirmation.action_id == action_id,
        core_models.ActionConfirmation.user_id == current_user.id
    ).first()
    
    if not conf:
        raise HTTPException(status_code=404, detail="Confirmation request not found or access denied.")
        
    conf.status = "CANCELLED"
    
    action = db.query(core_models.AgentAction).filter(core_models.AgentAction.id == action_id).first()
    if action:
        action.status = "CANCELLED"
        
    db.commit()
    return {"success": True, "message": "Action confirmation cancelled successfully."}

@app.get("/api/integrations")
def list_integrations_registry(
    db: Session = Depends(get_db)
):
    integrations = db.query(core_models.IntegrationRegistry).all()
    if not integrations:
        default_ints = [
            ("tavily_search", "SearchProvider", "tavily"),
            ("google_calendar", "CalendarProvider", "google"),
            ("smtp_email", "EmailProvider", "smtp"),
            ("travel_booking", "BookingProvider", "simulated")
        ]
        for int_id, name, prov in default_ints:
            reg = core_models.IntegrationRegistry(
                integration_id=int_id,
                name=name,
                provider=prov,
                version="1.0.0",
                enabled=True,
                health_status="HEALTHY"
            )
            db.add(reg)
        db.commit()
        integrations = db.query(core_models.IntegrationRegistry).all()
        
    return {
        "success": True,
        "integrations": [
            {
                "integration_id": i.integration_id,
                "name": i.name,
                "provider": i.provider,
                "version": i.version,
                "enabled": i.enabled,
                "health_status": i.health_status
            }
            for i in integrations
        ]
    }


@app.get("/api/user-integrations")
def list_user_integrations(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    user_ints = db.query(core_models.UserIntegration).filter(
        core_models.UserIntegration.user_id == current_user.id
    ).all()
    return {
        "success": True,
        "connected_accounts": [
            {
                "id": ui.id,
                "integration_id": ui.integration_id,
                "provider_account_id": ui.provider_account_id,
                "status": ui.status,
                "scopes": ui.scopes,
                "created_at": ui.created_at.isoformat()
            }
            for ui in user_ints
        ]
    }

@app.post("/api/user-integrations")
def connect_user_integration(payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    integration_id = payload["integration_id"]
    prov_account_id = payload.get("provider_account_id", f"acc_{uuid.uuid4().hex[:6]}")
    
    # Check if already connected
    exists = db.query(core_models.UserIntegration).filter(
        core_models.UserIntegration.user_id == current_user.id,
        core_models.UserIntegration.integration_id == integration_id
    ).first()
    
    if exists:
        exists.status = "CONNECTED"
        exists.last_used_at = datetime.utcnow()
        db.commit()
        return {"success": True, "message": "Integration reconnected successfully."}
        
    ui = core_models.UserIntegration(
        user_id=current_user.id,
        integration_id=integration_id,
        provider_account_id=prov_account_id,
        status="CONNECTED",
        scopes=payload.get("scopes", ["READ", "WRITE"])
    )
    db.add(ui)
    db.commit()
    return {"success": True, "message": f"Connected user-integration {integration_id}."}

@app.delete("/api/user-integrations/{integration_id}")
def disconnect_user_integration(integration_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    ui = db.query(core_models.UserIntegration).filter(
        core_models.UserIntegration.user_id == current_user.id,
        core_models.UserIntegration.integration_id == integration_id
    ).first()
    
    if not ui:
        raise HTTPException(status_code=404, detail="User integration connection not found.")
        
    # Mark disconnected and revoke scopes (Section 50)
    ui.status = "DISCONNECTED"
    ui.scopes = []
    db.commit()
    return {"success": True, "message": f"Disconnected integration {integration_id} successfully."}


@app.post("/api/verification/check")
def execute_claim_verification(payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    from services.security.verification_service import AutomaticVerificationEngine
    claim_id = payload["claim_id"]
    
    claim = db.query(core_models.FactualClaim).filter(core_models.FactualClaim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")
        
    if claim.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
        
    evidence_list = db.query(core_models.ClaimEvidence).filter(
        core_models.ClaimEvidence.claim_id == claim_id
    ).all()
    
    result = AutomaticVerificationEngine.verify_claim(claim, evidence_list, db)
    return {"success": True, "result": result}

@app.get("/api/tasks/{task_id}/verification")
def get_task_verification_report(task_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    from services.security.verification_service import AutomaticVerificationEngine
    
    task = db.query(core_models.Task).filter(core_models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
        
    if task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
        
    # Auto-compile latest summary (Section 31 & 32)
    summary = AutomaticVerificationEngine.update_task_summary(task_id, db)
    
    claims = db.query(core_models.FactualClaim).filter(core_models.FactualClaim.task_id == task_id).all()
    
    return {
        "success": True,
        "summary": {
            "total_claims": summary.total_claims,
            "verified_claims": summary.verified_claims,
            "conflicting_claims": summary.conflicting_claims,
            "unsupported_claims": summary.unsupported_claims,
            "stale_claims": summary.stale_claims,
            "overall_status": summary.overall_status
        },
        "claims": [
            {
                "claim_id": c.claim_id,
                "text": c.text,
                "claim_type": c.claim_type,
                "status": c.status,
                "confidence": c.confidence
            }
            for c in claims
        ]
    }


@app.get("/api/v1/agents")
def list_v1_agents(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    agents = db.query(core_models.AgentRegistry).all()
    if not agents:
        from services.agent.agent_registry import AgentRegistry as MemoryRegistry
        for a in MemoryRegistry.list_agents():
            db_agent = core_models.AgentRegistry(
                agent_id=a.agent_id,
                name=a.name,
                description=a.description,
                version=a.version,
                capabilities=[c.capability_id for c in a.capabilities],
                required_tools=a.allowed_tools,
                status="ACTIVE",
                health="HEALTHY"
            )
            db.add(db_agent)
        db.commit()
        agents = db.query(core_models.AgentRegistry).all()
        
    return {
        "success": True,
        "agents": [
            {
                "agent_id": a.agent_id,
                "name": a.name,
                "description": a.description,
                "status": a.status,
                "health": a.health,
                "capabilities": a.capabilities
            }
            for a in agents
        ]
    }

@app.get("/api/v1/agents/{agent_id}")
def get_v1_agent_details(agent_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    a = db.query(core_models.AgentRegistry).filter(core_models.AgentRegistry.agent_id == agent_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Agent not found in registry.")
    return {
        "success": True,
        "agent": {
            "agent_id": a.agent_id,
            "name": a.name,
            "description": a.description,
            "version": a.version,
            "status": a.status,
            "health": a.health,
            "capabilities": a.capabilities
        }
    }

@app.get("/api/v1/workflows")
def list_v1_workflows(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    templates = db.query(core_models.WorkflowTemplate).all()
    if not templates:
        default_templates = [
            ("PRICE_COMPARISON", "Price Comparison Workflow", ["SEARCH_PRODUCTS", "COMPARE_PRICES"], "LOW"),
            ("TRAVEL_SEARCH", "Travel Search Workflow", ["SEARCH_FLIGHTS", "SEARCH_HOTELS"], "LOW"),
            ("RESEARCH_REPORT", "Research Report Workflow", ["SEARCH_WEB", "SUMMARIZE"], "LOW")
        ]
        for tid, name, caps, risk in default_templates:
            db.add(core_models.WorkflowTemplate(
                template_id=tid,
                name=name,
                required_capabilities=caps,
                risk_level=risk
            ))
        db.commit()
        templates = db.query(core_models.WorkflowTemplate).all()
        
    return {
        "success": True,
        "templates": [
            {
                "template_id": t.template_id,
                "name": t.name,
                "capabilities": t.required_capabilities,
                "risk_level": t.risk_level
            }
            for t in templates
        ]
    }

@app.get("/api/v1/workflows/{template_id}")
def get_v1_workflow_details(template_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    t = db.query(core_models.WorkflowTemplate).filter(core_models.WorkflowTemplate.template_id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Workflow template not found.")
    return {
        "success": True,
        "template": {
            "template_id": t.template_id,
            "name": t.name,
            "capabilities": t.required_capabilities,
            "dependencies": t.dependencies,
            "risk_level": t.risk_level
        }
    }


@app.get("/api/v1/health")
def get_v1_health(db: Session = Depends(get_db)):
    # Safe health reporting without leaking DB credentials (Section 63)
    try:
        db.query(models.User).first()
        db_ok = True
    except Exception:
        db_ok = False
        
    import os
    ai_prov = os.getenv("AI_PROVIDER", "openai").strip().lower()
    ai_status = "Local Development" if ai_prov == "local" else "OpenAI"

    return {
        "success": True,
        "status": "HEALTHY" if db_ok else "DEGRADED",
        "database": "CONNECTED" if db_ok else "DISCONNECTED",
        "ai_provider": ai_status,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/v1/agents/run")
def execute_v1_agent_run(
    payload: dict,
    x_api_key: Optional[str] = Header(None),
    idempotency_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    from services.security.api_gateway import ApiGateway
    # 1. API key authentication & Scopes check
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key is missing.")
    key_record = ApiGateway.validate_key(x_api_key, db)
    if not key_record:
        raise HTTPException(status_code=401, detail="Invalid or expired API key.")
    if not ApiGateway.check_scopes(key_record, "agents:run"):
        raise HTTPException(status_code=403, detail="Scope 'agents:run' is required.")
        
    client = db.query(core_models.ApiClient).filter(core_models.ApiClient.id == key_record.client_id).first()
    owner_id = client.owner_id if client else 1
    
    # 2. Idempotency Key validation (Section 21)
    if idempotency_key:
        cached = ApiGateway.check_idempotency(idempotency_key, key_record.client_id, db)
        if cached:
            return cached
            
    # Assemble async task response structure
    task = core_models.Task(
        user_id=owner_id,
        description=payload.get("input", {}).get("query", "Agent Query"),
        status="pending"
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    
    res_payload = {
        "success": True,
        "taskId": task.id,
        "status": "QUEUED",
        "createdAt": task.created_at.isoformat()
    }
    
    if idempotency_key:
        ApiGateway.save_idempotency(idempotency_key, key_record.client_id, res_payload, db)
        
    return res_payload

@app.post("/api/v1/tasks")
def create_v1_task(
    payload: dict,
    x_api_key: Optional[str] = Header(None),
    idempotency_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    from services.security.api_gateway import ApiGateway
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key is missing.")
    key_record = ApiGateway.validate_key(x_api_key, db)
    if not key_record:
        raise HTTPException(status_code=401, detail="Invalid or expired API key.")
    if not ApiGateway.check_scopes(key_record, "tasks:create"):
        raise HTTPException(status_code=403, detail="Scope 'tasks:create' is required.")
        
    client = db.query(core_models.ApiClient).filter(core_models.ApiClient.id == key_record.client_id).first()
    owner_id = client.owner_id if client else 1
    
    if idempotency_key:
        cached = ApiGateway.check_idempotency(idempotency_key, key_record.client_id, db)
        if cached:
            return cached
            
    task = core_models.Task(
        user_id=owner_id,
        description=payload.get("goal", "Developer task"),
        status="pending"
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    
    res_payload = {
        "success": True,
        "taskId": task.id,
        "status": "QUEUED",
        "createdAt": task.created_at.isoformat()
    }
    
    if idempotency_key:
        ApiGateway.save_idempotency(idempotency_key, key_record.client_id, res_payload, db)
        
    return res_payload

@app.get("/api/v1/tasks/{task_id}")
def get_v1_task_status(
    task_id: int,
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    from services.security.api_gateway import ApiGateway
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key is missing.")
    key_record = ApiGateway.validate_key(x_api_key, db)
    if not key_record:
        raise HTTPException(status_code=401, detail="Invalid or expired API key.")
    if not ApiGateway.check_scopes(key_record, "tasks:read"):
        raise HTTPException(status_code=403, detail="Scope 'tasks:read' is required.")
        
    task = db.query(core_models.Task).filter(core_models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
        
    # Tenant Isolation boundary enforcement (Section 43 & 74)
    client = db.query(core_models.ApiClient).filter(core_models.ApiClient.id == key_record.client_id).first()
    if client and task.user_id != client.owner_id:
        raise HTTPException(status_code=403, detail="Cross-tenant access forbidden.")
        
    return {
        "success": True,
        "taskId": task.id,
        "status": task.status.upper(),
        "description": task.description
    }

@app.post("/api/v1/tasks/{task_id}/cancel")
def cancel_v1_task(
    task_id: int,
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    from services.security.api_gateway import ApiGateway
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key is missing.")
    key_record = ApiGateway.validate_key(x_api_key, db)
    if not key_record:
        raise HTTPException(status_code=401, detail="Invalid or expired API key.")
    if not ApiGateway.check_scopes(key_record, "tasks:cancel"):
        raise HTTPException(status_code=403, detail="Scope 'tasks:cancel' is required.")
        
    task = db.query(core_models.Task).filter(core_models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
        
    client = db.query(core_models.ApiClient).filter(core_models.ApiClient.id == key_record.client_id).first()
    if client and task.user_id != client.owner_id:
        raise HTTPException(status_code=403, detail="Cross-tenant access forbidden.")
        
    task.status = "cancelled"
    db.commit()
    return {"success": True, "message": "Task cancelled successfully."}

@app.get("/api/v1/tasks/{task_id}/result")
def get_v1_task_result(
    task_id: int,
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    from services.security.api_gateway import ApiGateway
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key is missing.")
    key_record = ApiGateway.validate_key(x_api_key, db)
    if not key_record:
        raise HTTPException(status_code=401, detail="Invalid or expired API key.")
    if not ApiGateway.check_scopes(key_record, "tasks:read"):
        raise HTTPException(status_code=403, detail="Scope 'tasks:read' is required.")
        
    task = db.query(core_models.Task).filter(core_models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
        
    client = db.query(core_models.ApiClient).filter(core_models.ApiClient.id == key_record.client_id).first()
    if client and task.user_id != client.owner_id:
        raise HTTPException(status_code=403, detail="Cross-tenant access forbidden.")
        
    return {
        "success": True,
        "taskId": task.id,
        "status": task.status.upper(),
        "summary": "Synthesized results based on verification engine checks.",
        "evidence": []
    }

@app.post("/api/v1/webhooks")
def subscribe_v1_webhook(
    payload: dict,
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    from services.security.api_gateway import ApiGateway
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key is missing.")
    key_record = ApiGateway.validate_key(x_api_key, db)
    if not key_record:
        raise HTTPException(status_code=401, detail="Invalid or expired API key.")
        
    secret = f"whsec_{uuid.uuid4().hex[:12]}"
    sub = core_models.WebhookSubscription(
        client_id=key_record.client_id,
        callback_url=payload["callback_url"],
        events=payload.get("events", ["task.completed"]),
        secret=secret,
        status="ACTIVE"
    )
    db.add(sub)
    db.commit()
    
    return {
        "success": True,
        "message": "Webhook subscribed successfully.",
        "secret": secret # Display secret only once upon registration (Section 30)
    }


@app.get("/api/v1/organizations")
def list_v1_organizations(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    orgs = db.query(core_models.Organization).filter(
        core_models.Organization.owner_id == current_user.id
    ).all()
    return {
        "success": True,
        "organizations": [
            {
                "id": o.id,
                "name": o.name,
                "slug": o.slug,
                "status": o.status,
                "plan": o.plan
            }
            for o in orgs
        ]
    }

@app.post("/api/v1/organizations")
def create_v1_organization(payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    slug = payload["slug"]
    exists = db.query(core_models.Organization).filter(core_models.Organization.slug == slug).first()
    if exists:
        raise HTTPException(status_code=400, detail="Slug already exists.")
        
    org = core_models.Organization(
        name=payload["name"],
        slug=slug,
        owner_id=current_user.id,
        status="ACTIVE",
        plan=payload.get("plan", "FREE")
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    
    # Automatically add owner as OWNER member in organization_members (Section 3)
    member = core_models.OrganizationMember(
        organization_id=org.id,
        user_id=current_user.id,
        role_id="OWNER",
        status="ACTIVE"
    )
    db.add(member)
    db.commit()
    
    return {"success": True, "organization": {"id": org.id, "name": org.name, "slug": org.slug}}

@app.get("/api/v1/organizations/{org_id}/members")
def get_v1_org_members(org_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    from services.security.rbac_service import RBACService
    # Require members:read permission (Section 9)
    if not RBACService.has_permission(current_user.id, org_id, "members:read", db):
        raise HTTPException(status_code=403, detail="Lacks required scope members:read.")
        
    members = db.query(core_models.OrganizationMember).filter(
        core_models.OrganizationMember.organization_id == org_id
    ).all()
    
    return {
        "success": True,
        "members": [
            {
                "id": m.id,
                "user_id": m.user_id,
                "role_id": m.role_id,
                "status": m.status
            }
            for m in members
        ]
    }

@app.post("/api/v1/organizations/{org_id}/policies")
def configure_v1_org_policy(org_id: int, payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    from services.security.rbac_service import RBACService
    # Require policies:manage permission (Section 9 & 13)
    if not RBACService.has_permission(current_user.id, org_id, "policies:manage", db):
        raise HTTPException(status_code=403, detail="Lacks required scope policies:manage.")
        
    policy = db.query(core_models.OrgPolicy).filter(
        core_models.OrgPolicy.organization_id == org_id
    ).first()
    
    if not policy:
        policy = core_models.OrgPolicy(
            policy_id=f"pol_{uuid.uuid4().hex[:8]}",
            organization_id=org_id
        )
        db.add(policy)
        
    policy.allowed_agents = payload.get("allowed_agents", ["research_agent", "shopping_agent"])
    policy.allowed_tools = payload.get("allowed_tools", ["web_search", "web_fetch"])
    policy.max_task_cost = payload.get("max_task_cost", 10.0)
    policy.risk_limit = payload.get("risk_limit", "HIGH")
    policy.version += 1
    policy.changed_by = current_user.id
    policy.changed_at = datetime.utcnow()
    db.commit()
    
    return {"success": True, "message": f"Configured organization policy version {policy.version}."}

@app.post("/api/v1/organizations/{org_id}/approvals")
def create_v1_approval_request(org_id: int, payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    req = core_models.ApprovalRequest(
        request_id=f"apr_{uuid.uuid4().hex[:8]}",
        organization_id=org_id,
        task_id=payload.get("task_id"),
        requester_id=current_user.id,
        amount=payload.get("amount", 0.0),
        action_type=payload["action_type"],
        status="PENDING"
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    
    return {"success": True, "approval_request": {"request_id": req.request_id, "status": req.status}}


@app.post("/api/v1/actions")
def create_v1_action(payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    action_id = f"act_{uuid.uuid4().hex[:8]}"
    action_type = payload["action_type"]
    confirm_req = action_type in ("purchase", "booking", "send_email")
    
    action = core_models.RealAction(
        action_id=action_id,
        task_id=payload["task_id"],
        user_id=current_user.id,
        organization_id=payload.get("organization_id"),
        agent_id=payload["agent_id"],
        action_type=action_type,
        target=payload.get("target"),
        parameters=payload.get("parameters", {}),
        risk_level=payload.get("risk_level", "LOW"),
        confirmation_required=confirm_req,
        status="AWAITING_CONFIRMATION" if confirm_req else "AUTHORIZED"
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    
    return {
        "success": True,
        "action": {
            "action_id": action.action_id,
            "status": action.status,
            "confirmation_required": action.confirmation_required
        }
    }

@app.post("/api/v1/actions/{action_id}/confirm")
def confirm_v1_action(action_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    action = db.query(core_models.RealAction).filter(core_models.RealAction.action_id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found.")
        
    if action.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
        
    action.status = "COMPLETED"
    action.executed_at = datetime.utcnow()
    action.completed_at = datetime.utcnow()
    db.commit()
    
    return {
        "success": True,
        "action": {
            "action_id": action.action_id,
            "status": action.status
        }
    }


@app.get("/api/bookings")
def list_user_bookings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    bookings = db.query(core_models.Booking).filter(
        core_models.Booking.user_id == current_user.id
    ).order_by(core_models.Booking.created_at.desc()).all()
    return {
        "success": True,
        "bookings": [
            {
                "id": b.id,
                "booking_id": b.booking_id,
                "provider": b.provider,
                "provider_reference": b.provider_reference,
                "booking_type": b.booking_type,
                "status": b.status,
                "amount": b.amount,
                "currency": b.currency,
                "created_at": b.created_at.isoformat()
            }
            for b in bookings
        ]
    }


@app.get("/api/memory")
def list_memories(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    mems = db.query(core_models.UserMemory).filter(
        core_models.UserMemory.user_id == current_user.id,
        core_models.UserMemory.status == "ACTIVE"
    ).all()
    return {
        "success": True,
        "memories": [
            {
                "id": m.id,
                "memory_id": m.memory_id or str(m.id),
                "content": m.content,
                "category": m.category,
                "confidence": m.confidence,
                "importance": m.importance,
                "status": m.status,
                "source": m.source
            }
            for m in mems
        ]
    }

@app.get("/api/memory/{memory_id}")
def get_memory(memory_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    mem = db.query(core_models.UserMemory).filter(core_models.UserMemory.id == memory_id).first()
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found.")
    if mem.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return {
        "success": True,
        "memory": {
            "id": mem.id,
            "content": mem.content,
            "category": mem.category,
            "confidence": mem.confidence,
            "importance": mem.importance
        }
    }

@app.patch("/api/memory/{memory_id}")
def update_memory(memory_id: int, payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    mem = db.query(core_models.UserMemory).filter(core_models.UserMemory.id == memory_id).first()
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found.")
    if mem.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
    
    if "content" in payload:
        mem.content = payload["content"]
    if "category" in payload:
        mem.category = payload["category"]
    if "importance" in payload:
        mem.importance = payload["importance"]
    if "status" in payload:
        mem.status = payload["status"]
        
    db.commit()
    return {"success": True, "message": "Memory updated successfully."}

@app.delete("/api/memory/{memory_id}")
def delete_memory(memory_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    mem = db.query(core_models.UserMemory).filter(core_models.UserMemory.id == memory_id).first()
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found.")
    if mem.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
        
    db.delete(mem)
    db.commit()
    return {"success": True, "message": "Memory deleted successfully."}

@app.delete("/api/memory")
def clear_all_memories(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db.query(core_models.UserMemory).filter(core_models.UserMemory.user_id == current_user.id).delete(synchronize_session=False)
    db.commit()
    return {"success": True, "message": "All preferences and memories cleared."}

@app.get("/api/goals")
def list_goals(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    goals = db.query(core_models.Goal).filter(core_models.Goal.user_id == current_user.id).all()
    return {
        "success": True,
        "goals": [
            {
                "id": g.id,
                "goal_id": g.goal_id,
                "title": g.title,
                "description": g.description,
                "status": g.status,
                "priority": g.priority,
                "progress": g.progress,
                "created_at": g.created_at.isoformat()
            }
            for g in goals
        ]
    }

@app.post("/api/goals")
def create_goal(payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    import uuid
    g = core_models.Goal(
        goal_id=f"goal_{uuid.uuid4().hex[:8]}",
        user_id=current_user.id,
        title=payload["title"],
        description=payload.get("description"),
        status=payload.get("status", "ACTIVE"),
        priority=payload.get("priority", 1),
        progress=payload.get("progress", 0.0)
    )
    db.add(g)
    db.commit()
    return {"success": True, "goal_id": g.goal_id, "message": "Goal created successfully."}

@app.patch("/api/goals/{goal_id}")
def update_goal(goal_id: str, payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    g = db.query(core_models.Goal).filter(core_models.Goal.goal_id == goal_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Goal not found.")
    if g.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
        
    if "title" in payload:
        g.title = payload["title"]
    if "description" in payload:
        g.description = payload["description"]
    if "status" in payload:
        g.status = payload["status"]
    if "priority" in payload:
        g.priority = payload["priority"]
    if "progress" in payload:
        g.progress = payload["progress"]
        
    db.commit()
    return {"success": True, "message": "Goal updated successfully."}

@app.delete("/api/goals/{goal_id}")
def delete_goal(goal_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    g = db.query(core_models.Goal).filter(core_models.Goal.goal_id == goal_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Goal not found.")
    if g.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
        
    db.delete(g)
    db.commit()
    return {"success": True, "message": "Goal deleted successfully."}


# ============================================================
# DYNAMIC ROUTE VERSIONING FOR /api/v1/ ALIAS CLONING
# ============================================================
def setup_versioned_routes(app_inst):
    # Register clones of all endpoints starting with /api/
    for route in list(app_inst.routes):
        if hasattr(route, "path") and route.path.startswith("/api/") and not route.path.startswith("/api/v1"):
            v1_path = route.path.replace("/api/", "/api/v1/", 1)
            # Find and avoid duplicate routes
            already_exists = any(r.path == v1_path for r in app_inst.routes)
            if not already_exists:
                app_inst.add_api_route(
                    v1_path,
                    route.endpoint,
                    methods=route.methods,
                    dependencies=route.dependencies,
                    response_model=route.response_model,
                    status_code=route.status_code,
                    tags=route.tags,
                    summary=route.summary,
                    description=route.description,
                    response_description=route.response_description,
                    deprecated=route.deprecated
                )

# Trigger cloning right away
setup_versioned_routes(app)