import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_admin
from app.models.user import User, UserRole, AccountStatus
from app.models.provider import ProviderProfile
from app.models.property import Property
from app.models.booking import Booking
from app.models.verinova_models import VeriNovaAuditLog
from app.schemas.user import UserResponse, ProviderProfileResponse
from app.schemas.auth import (
    MessageResponse,
    UserSuspensionRequest,
    UserDeactivationRequest,
    UserAccountActionResponse,
)

router = APIRouter()

@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    role: Optional[str] = None,
    account_status: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all platform users (Travelers & Hosts) with verification & safety states."""
    query = db.query(User).filter(User.role != UserRole.ADMIN)
    if role and role.upper().strip() != "ALL":
        clean_role = role.upper().strip()
        if clean_role == "HOST":
            clean_role = "PROVIDER"
        elif clean_role == "TRAVELER":
            clean_role = "CUSTOMER"
        if hasattr(UserRole, clean_role):
            query = query.filter(User.role == UserRole[clean_role])

    if account_status and account_status.upper().strip() != "ALL":
        query = query.filter(User.account_status == account_status.upper().strip())

    return query.order_by(User.created_at.desc()).all()

@router.get("/users/{user_id}")
def get_user_detail(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin deep inspection dossier for a specific user (host properties, bookings, verification, audit history)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    properties_summary = []
    if user.role == UserRole.PROVIDER and user.provider_profile:
        for p in user.provider_profile.properties:
            properties_summary.append({
                "id": p.id,
                "name": p.name,
                "city": p.city,
                "state": p.state,
                "verification_status": p.verification_status,
                "trust_score": p.trust_score,
                "is_active": p.is_active,
                "fingerprint": p.property_identity_fingerprint,
                "created_at": p.created_at
            })

    bookings_count = db.query(Booking).filter(Booking.user_id == user.id).count()

    # User audit history
    audit_logs = db.query(VeriNovaAuditLog).filter(
        VeriNovaAuditLog.entity_type == "USER",
        VeriNovaAuditLog.entity_id == user.id
    ).order_by(VeriNovaAuditLog.created_at.desc()).limit(20).all()

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role.value,
        "is_active": user.is_active,
        "account_status": getattr(user, "account_status", "ACTIVE"),
        "phone_verified": getattr(user, "phone_verified", False),
        "phone_verified_at": getattr(user, "phone_verified_at", None),
        "email_verified": getattr(user, "email_verified", False),
        "email_verified_at": getattr(user, "email_verified_at", None),
        "suspended_at": getattr(user, "suspended_at", None),
        "suspended_by": getattr(user, "suspended_by", None),
        "suspension_reason": getattr(user, "suspension_reason", None),
        "deactivated_at": getattr(user, "deactivated_at", None),
        "deactivated_by": getattr(user, "deactivated_by", None),
        "deactivation_reason": getattr(user, "deactivation_reason", None),
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "location": user.location,
        "created_at": user.created_at,
        "bookings_count": bookings_count,
        "properties": properties_summary,
        "audit_logs": [
            {
                "id": log.id,
                "event_type": log.event_type,
                "actor_name": log.actor.name if log.actor else "System",
                "summary": log.summary,
                "created_at": log.created_at
            }
            for log in audit_logs
        ]
    }

@router.post("/users/{user_id}/suspend", response_model=UserAccountActionResponse)
def suspend_user(
    user_id: int,
    data: UserSuspensionRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin suspends a user (Host or Customer) with a mandatory explanation reason.
    Prevents the suspended user from logging in, booking, or managing properties.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot suspend administrator accounts.")

    reason = (data.reason or "").strip()
    if not reason:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please provide a suspension reason.")

    now = datetime.utcnow()
    user.account_status = AccountStatus.SUSPENDED.value
    user.is_active = False
    user.suspended_at = now
    user.suspended_by = admin.id
    user.suspension_reason = reason
    user.token_version = (getattr(user, "token_version", 1) or 1) + 1

    # If provider, deactivate their active properties to protect travelers
    if user.role == UserRole.PROVIDER and user.provider_profile:
        for prop in user.provider_profile.properties:
            prop.is_active = False

    # Create immutable Audit Log
    log = VeriNovaAuditLog(
        entity_type="USER",
        entity_id=user.id,
        event_type="USER_SUSPENDED",
        actor_id=admin.id,
        actor_role="ADMIN",
        summary=f"User {user.name} ({user.email}) suspended by Admin {admin.name or admin.email}. Reason: {reason}",
        details_json=json.dumps({
            "action": "SUSPEND",
            "target_user_id": user.id,
            "target_user_role": user.role.value,
            "reason": reason
        })
    )
    db.add(log)
    db.commit()

    return {
        "message": f"User '{user.name}' has been SUSPENDED.",
        "success": True,
        "user_id": user.id,
        "account_status": "SUSPENDED",
        "is_active": False,
        "reason": reason
    }

@router.post("/users/{user_id}/reactivate", response_model=UserAccountActionResponse)
def reactivate_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin reactivates a suspended user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.account_status = AccountStatus.ACTIVE.value
    user.is_active = True
    user.suspended_at = None
    user.suspended_by = None
    user.suspension_reason = None
    user.deactivated_at = None
    user.deactivated_by = None
    user.deactivation_reason = None

    log = VeriNovaAuditLog(
        entity_type="USER",
        entity_id=user.id,
        event_type="USER_REACTIVATED",
        actor_id=admin.id,
        actor_role="ADMIN",
        summary=f"User {user.name} ({user.email}) reactivated by Admin {admin.name or admin.email}.",
        details_json=json.dumps({
            "action": "REACTIVATE",
            "target_user_id": user.id,
            "target_user_role": user.role.value
        })
    )
    db.add(log)
    db.commit()

    return {
        "message": f"User '{user.name}' has been REACTIVATED and is now ACTIVE.",
        "success": True,
        "user_id": user.id,
        "account_status": "ACTIVE",
        "is_active": True,
        "reason": None
    }

@router.post("/users/{user_id}/deactivate", response_model=UserAccountActionResponse)
def deactivate_user(
    user_id: int,
    data: Optional[UserDeactivationRequest] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin safely deactivates a user account (soft deactivation preserving booking and audit records).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot deactivate administrator accounts.")

    reason = data.reason.strip() if data and data.reason else "Account deactivated by administrator."
    now = datetime.utcnow()

    user.account_status = AccountStatus.DEACTIVATED.value
    user.is_active = False
    user.deactivated_at = now
    user.deactivated_by = admin.id
    user.deactivation_reason = reason
    user.token_version = (getattr(user, "token_version", 1) or 1) + 1

    if user.role == UserRole.PROVIDER and user.provider_profile:
        for prop in user.provider_profile.properties:
            prop.is_active = False

    log = VeriNovaAuditLog(
        entity_type="USER",
        entity_id=user.id,
        event_type="USER_DEACTIVATED",
        actor_id=admin.id,
        actor_role="ADMIN",
        summary=f"User {user.name} ({user.email}) DEACTIVATED by Admin {admin.name or admin.email}. Reason: {reason}",
        details_json=json.dumps({
            "action": "DEACTIVATE",
            "target_user_id": user.id,
            "reason": reason
        })
    )
    db.add(log)
    db.commit()

    return {
        "message": f"User '{user.name}' has been safely DEACTIVATED.",
        "success": True,
        "user_id": user.id,
        "account_status": "DEACTIVATED",
        "is_active": False,
        "reason": reason
    }

@router.put("/users/{user_id}/toggle-status", response_model=MessageResponse)
def toggle_user_status(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Legacy toggle helper: toggles between ACTIVE and SUSPENDED."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify administrator accounts from this endpoint.")

    if user.is_active:
        user.is_active = False
        user.account_status = AccountStatus.SUSPENDED.value
        user.suspended_at = datetime.utcnow()
        user.suspended_by = admin.id
        user.suspension_reason = "Quick suspension via admin toggle"
        status_str = "suspended"
    else:
        user.is_active = True
        user.account_status = AccountStatus.ACTIVE.value
        user.suspended_at = None
        user.suspended_by = None
        user.suspension_reason = None
        status_str = "activated"

    db.commit()
    return {"message": f"User {user.name} has been {status_str}.", "success": True}

@router.get("/providers")
def get_all_providers(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all registered providers and business profiles."""
    providers = db.query(ProviderProfile).all()
    results = []
    for p in providers:
        user = p.user
        results.append({
            "id": p.id,
            "user_id": p.user_id,
            "name": user.name if user else "N/A",
            "email": user.email if user else "N/A",
            "business_name": p.business_name,
            "contact_phone": p.contact_phone,
            "contact_email": p.contact_email,
            "verification_status": p.verification_status,
            "phone_verified": getattr(user, "phone_verified", False) if user else False,
            "email_verified": getattr(user, "email_verified", False) if user else False,
            "account_status": getattr(user, "account_status", "ACTIVE") if user else "ACTIVE",
            "properties_count": len(p.properties),
            "created_at": p.created_at
        })
    return results
