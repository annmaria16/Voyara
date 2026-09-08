import os
import mimetypes
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_admin, get_current_user, security
from app.auth.jwt import decode_access_token
from app.models.user import User, UserRole
from app.models.property import Property, PropertyVerificationStatus
from app.models.room import Room
from app.models.experience import Experience
from app.config import settings
from app.schemas.auth import MessageResponse
from app.schemas.property import PropertyVerificationAction, AdminPropertyResponse, PropertyVerificationResponse

router = APIRouter()

@router.get("/properties")
def get_all_properties(
    verification_status: Optional[str] = Query(None, description="Filter: ALL, PENDING_VERIFICATION, VERIFIED, NEEDS_REVIEW, REJECTED"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all properties with verification status, location coordinates, and audit history."""
    query = db.query(Property).order_by(Property.created_at.desc())
    if verification_status and verification_status.upper() != "ALL":
        query = query.filter(Property.verification_status == verification_status.upper())

    properties = query.all()
    results = []
    for p in properties:
        results.append({
            "id": p.id,
            "name": p.name,
            "property_type": p.property_type,
            "description": p.description,
            "address": p.address,
            "city": p.city,
            "state": p.state,
            "country": p.country,
            "location_details": p.location_details,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "contact_phone": p.contact_phone,
            "contact_email": p.contact_email,
            "check_in_time": p.check_in_time,
            "check_out_time": p.check_out_time,
            "provider_id": p.provider_id,
            "provider_name": p.provider.business_name if p.provider else "N/A",
            "provider_email": p.provider.user.email if p.provider and p.provider.user else None,
            "provider_phone": p.provider.contact_phone if p.provider else None,
            "is_active": p.is_active,
            "verification_status": p.verification_status or "PENDING_VERIFICATION",
            "ownership_proof_url": p.ownership_proof_url,
            "verification_reason": p.verification_reason,
            "verified_by": p.verified_by,
            "verified_at": p.verified_at,
            "reviewed_by": p.reviewed_by,
            "reviewed_at": p.reviewed_at,
            "rating": p.rating,
            "rooms_count": len(p.rooms),
            "experiences_count": len(p.experiences),
            "created_at": p.created_at,
            "images": [{"id": img.id, "image_url": img.image_url, "is_primary": img.is_primary} for img in p.images],
            "amenities": [{"id": a.id, "amenity_name": a.amenity_name} for a in p.amenities]
        })
    return results

@router.get("/properties/{property_id}")
def get_admin_property_detail(
    property_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin deep inspection of a property including ownership proof, Google map location, images, and host contact."""
    p = db.query(Property).filter(Property.id == property_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found.")

    return {
        "id": p.id,
        "name": p.name,
        "property_type": p.property_type,
        "description": p.description,
        "address": p.address,
        "city": p.city,
        "state": p.state,
        "country": p.country,
        "location_details": p.location_details,
        "latitude": p.latitude,
        "longitude": p.longitude,
        "contact_phone": p.contact_phone,
        "contact_email": p.contact_email,
        "check_in_time": p.check_in_time,
        "check_out_time": p.check_out_time,
        "provider_id": p.provider_id,
        "provider_name": p.provider.business_name if p.provider else "N/A",
        "provider_email": p.provider.user.email if p.provider and p.provider.user else None,
        "provider_phone": p.provider.contact_phone if p.provider else None,
        "is_active": p.is_active,
        "verification_status": p.verification_status or "PENDING_VERIFICATION",
        "ownership_proof_url": p.ownership_proof_url,
        "verification_reason": p.verification_reason,
        "verified_by": p.verified_by,
        "verified_at": p.verified_at,
        "reviewed_by": p.reviewed_by,
        "reviewed_at": p.reviewed_at,
        "rating": p.rating,
        "rooms_count": len(p.rooms),
        "experiences_count": len(p.experiences),
        "created_at": p.created_at,
        "images": [{"id": img.id, "image_url": img.image_url, "caption": img.caption, "is_primary": img.is_primary} for img in p.images],
        "amenities": [{"id": a.id, "amenity_name": a.amenity_name} for a in p.amenities],
        "rooms": [
            {
                "id": r.id,
                "property_id": r.property_id,
                "name": r.name,
                "room_type": r.room_type,
                "description": r.description,
                "capacity": r.capacity,
                "quantity": r.quantity,
                "base_price": r.base_price,
                "is_active": r.is_active,
                "created_at": r.created_at,
                "images": [{"id": img.id, "image_url": img.image_url, "is_primary": img.is_primary} for img in r.images],
                "amenities": [{"id": a.id, "amenity_name": a.amenity_name} for a in r.amenities]
            }
            for r in p.rooms
        ]
    }

@router.post("/properties/{property_id}/verify", response_model=PropertyVerificationResponse)
def verify_property_action(
    property_id: int,
    data: PropertyVerificationAction,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin moderation endpoint to APPROVE, REJECT, or REQUEST_REVIEW for a property.
    Only approved properties transition to VERIFIED and become customer-visible.
    """
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found.")

    action = (data.action or "").upper().strip()
    now = datetime.utcnow()

    if action == "APPROVE":
        prop.verification_status = PropertyVerificationStatus.VERIFIED.value
        prop.verified_by = admin.id
        prop.verified_at = now
        prop.verification_reason = data.reason.strip() if data.reason else "Approved by Administrator"
        message = f"Property '{prop.name}' has been APPROVED and is now live and customer-visible."
    elif action == "REJECT":
        prop.verification_status = PropertyVerificationStatus.REJECTED.value
        prop.reviewed_by = admin.id
        prop.reviewed_at = now
        prop.verification_reason = data.reason.strip() if data.reason else "Property submission rejected by administrator."
        message = f"Property '{prop.name}' has been REJECTED."
    elif action in ["REQUEST_REVIEW", "NEEDS_REVIEW"]:
        prop.verification_status = PropertyVerificationStatus.NEEDS_REVIEW.value
        prop.reviewed_by = admin.id
        prop.reviewed_at = now
        prop.verification_reason = data.reason.strip() if data.reason else "Additional details or corrections requested."
        message = f"Property '{prop.name}' has been marked as NEEDS_REVIEW."
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Allowed actions: APPROVE, REJECT, REQUEST_REVIEW."
        )

    db.commit()
    db.refresh(prop)

    # Trigger In-App Notification to Host
    try:
        from app.services.notifications.notification_service import NotificationService
        host_user_id = prop.provider.user_id if prop.provider else None
        if host_user_id:
            if action == "APPROVE":
                NotificationService.create_notification(
                    db=db,
                    user_id=host_user_id,
                    title="Property Approved",
                    message=f"Your property {prop.name} has been approved and is now visible to customers.",
                    type="PROPERTY_APPROVED",
                    link="/provider/properties"
                )
            elif action == "REJECT":
                reason_str = data.reason.strip() if data.reason else "Not specified"
                NotificationService.create_notification(
                    db=db,
                    user_id=host_user_id,
                    title="Property Submission Rejected",
                    message=f"Your property {prop.name} was rejected. Reason: {reason_str}.",
                    type="PROPERTY_REJECTED",
                    link="/provider/properties"
                )
            elif action in ["REQUEST_REVIEW", "NEEDS_REVIEW"]:
                reason_str = data.reason.strip() if data.reason else "Review required"
                NotificationService.create_notification(
                    db=db,
                    user_id=host_user_id,
                    title="Property Review Requested",
                    message=f"Your property {prop.name} needs review. Reason: {reason_str}.",
                    type="PROPERTY_NEEDS_REVIEW",
                    link="/provider/properties"
                )
    except Exception as notif_err:
        print("Error notifying host of property verification action:", notif_err)

    return {
        "message": message,
        "success": True,
        "property_id": prop.id,
        "verification_status": prop.verification_status,
        "verification_reason": prop.verification_reason,
        "verified_by": prop.verified_by,
        "verified_at": prop.verified_at,
        "reviewed_by": prop.reviewed_by,
        "reviewed_at": prop.reviewed_at,
    }

@router.get("/properties/{property_id}/ownership-proof")
def get_property_ownership_proof(
    property_id: int,
    token: Optional[str] = Query(None, description="Admin access token for browser tab viewing"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Secure Admin-only endpoint to access and view/download the uploaded ownership or authorization proof document.
    Authenticates via either HTTP Bearer header or token query parameter.
    Never accessible to customers or unauthorized users.
    """
    admin = None
    if credentials:
        try:
            admin = get_current_user(credentials=credentials, db=db)
        except HTTPException:
            pass

    if not admin and token:
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("sub") or payload.get("user_id")
            if user_id:
                user = db.query(User).filter(User.id == int(user_id)).first()
                if user and user.is_active:
                    admin = user

    if not admin or admin.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin authorization required to access ownership documents."
        )

    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop or not prop.ownership_proof_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ownership proof document not found for this property.")

    filename = os.path.basename(prop.ownership_proof_url)
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document file does not exist on server storage.")

    media_type, _ = mimetypes.guess_type(file_path)
    if not media_type:
        ext = os.path.splitext(filename)[1].lower()
        if ext == ".pdf":
            media_type = "application/pdf"
        elif ext in [".jpg", ".jpeg"]:
            media_type = "image/jpeg"
        elif ext == ".png":
            media_type = "image/png"
        elif ext == ".webp":
            media_type = "image/webp"
        else:
            media_type = "application/octet-stream"

    return FileResponse(
        file_path,
        media_type=media_type,
        filename=filename,
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )

@router.put("/properties/{property_id}/toggle-status", response_model=MessageResponse)
def toggle_property_status(
    property_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Toggle property active status."""
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found.")
    
    prop.is_active = not prop.is_active
    db.commit()
    status_str = "activated" if prop.is_active else "deactivated"
    return {"message": f"Property '{prop.name}' has been {status_str}.", "success": True}

@router.get("/rooms")
def get_all_rooms(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all rooms across properties."""
    rooms = db.query(Room).all()
    results = []
    for r in rooms:
        results.append({
            "id": r.id,
            "property_id": r.property_id,
            "property_name": r.property.name if r.property else "",
            "name": r.name,
            "room_type": r.room_type,
            "capacity": r.capacity,
            "quantity": r.quantity,
            "base_price": r.base_price,
            "is_active": r.is_active
        })
    return results

@router.get("/experiences")
def get_all_experiences(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all experiences."""
    experiences = db.query(Experience).all()
    results = []
    for e in experiences:
        results.append({
            "id": e.id,
            "property_id": e.property_id,
            "property_name": e.property.name if e.property else "",
            "title": e.title,
            "experience_type": e.experience_type,
            "price": e.price,
            "pricing_model": e.pricing_model,
            "capacity": e.capacity,
            "duration": e.duration,
            "is_active": e.is_active
        })
    return results
