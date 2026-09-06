from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.jwt import decode_access_token
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile

security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Extract and validate current authenticated user from Bearer JWT."""
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
    
    if not user.is_active:
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
        if user and user.is_active:
            return user
        return None
    except Exception:
        return None

def get_current_customer(user: User = Depends(get_current_user)) -> User:
    """Ensure current user is authenticated (Customer, Provider, or Admin can act as Customer)."""
    return user

def get_current_provider(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ProviderProfile:
    """Ensure user is a Provider (or Admin) and returns ProviderProfile."""
    if user.role not in [UserRole.PROVIDER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to registered Accommodation & Experience Providers.",
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
