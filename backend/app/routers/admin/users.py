from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_admin
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.schemas.user import UserResponse, ProviderProfileResponse
from app.schemas.auth import MessageResponse

router = APIRouter()

@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    role: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all platform users (Travelers & Hosts). Excludes administrators."""
    query = db.query(User).filter(User.role != UserRole.ADMIN)
    if role and role.upper() != "ALL":
        query = query.filter(User.role == role.upper())
    return query.order_by(User.created_at.desc()).all()

@router.get("/providers")
def get_all_providers(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all registered providers and business profiles."""
    providers = db.query(ProviderProfile).all()
    results = []
    for p in providers:
        results.append({
            "id": p.id,
            "user_id": p.user_id,
            "name": p.user.name if p.user else "N/A",
            "email": p.user.email if p.user else "N/A",
            "business_name": p.business_name,
            "contact_phone": p.contact_phone,
            "contact_email": p.contact_email,
            "verification_status": p.verification_status,
            "properties_count": len(p.properties),
            "created_at": p.created_at
        })
    return results

@router.put("/users/{user_id}/toggle-status", response_model=MessageResponse)
def toggle_user_status(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Toggle user active / suspended status."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify administrator accounts from this endpoint.")

    user.is_active = not user.is_active
    db.commit()
    status_str = "activated" if user.is_active else "deactivated"
    return {"message": f"User {user.name} has been {status_str}.", "success": True}

