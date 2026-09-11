from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.jwt import decode_access_token
from app.models.user import User, UserRole, AccountStatus
from app.models.provider import ProviderProfile

security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Extract and validate current authenticated user from Bearer JWT with account safety enforcement."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: Optional[int] = payload.get("sub") or payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token identity is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Account Safety Check
    acc_status = getattr(user, "account_status", "ACTIVE")
    if not user.is_active or acc_status == AccountStatus.SUSPENDED.value or acc_status == "SUSPENDED":
        reason = getattr(user, "suspension_reason", None)
        detail_msg = f"Your account is currently suspended. Reason: {reason}" if reason else "Your account has been suspended by administration. Please contact support."
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail_msg,
        )
    
    if acc_status == AccountStatus.DEACTIVATED.value or acc_status == "DEACTIVATED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated. Please contact support.",
        )
    
    return user

def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Optionally returns the current user if authenticated, or None if public/guest."""
    if not credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        if not payload:
            return None
        user_id = payload.get("sub") or payload.get("user_id")
        if not user_id:
            return None
        user = db.query(User).filter(User.id == int(user_id)).first()
        if user and user.is_active and getattr(user, "account_status", "ACTIVE") == "ACTIVE":
            return user
        return None
    except Exception:
        return None

def get_current_customer(user: User = Depends(get_current_user)) -> User:
    """Ensure current user is authenticated and active (Customer, Provider, or Admin)."""
    return user

def get_current_provider(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ProviderProfile:
    """
    Ensure user is an authenticated and fully verified Provider (or Admin).
    Host accounts must complete required Phone and Email verification.
    """
    if user.role not in [UserRole.PROVIDER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to registered Accommodation & Experience Providers.",
        )
    
    # Check Host Verification (Phone & Email) for non-admin providers
    if user.role == UserRole.PROVIDER:
        phone_ok = getattr(user, "phone_verified", False)
        email_ok = getattr(user, "email_verified", False)
        if not phone_ok or not email_ok:
            missing = []
            if not phone_ok:
                missing.append("phone verification")
            if not email_ok:
                missing.append("email verification")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Host account verification incomplete. Please complete {' and '.join(missing)} before accessing host management features.",
            )
    
    profile = db.query(ProviderProfile).filter(ProviderProfile.user_id == user.id).first()
    if not profile:
        # Create a provider profile if missing
        profile = ProviderProfile(
            user_id=user.id,
            business_name=user.name + " Stays & Experiences",
            contact_phone=user.phone or "",
            contact_email=user.email,
            verification_status="VERIFIED"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    return profile

def get_current_admin(user: User = Depends(get_current_user)) -> User:
    """Ensure user has ADMIN privileges."""
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to platform Administrators.",
        )
    return user
