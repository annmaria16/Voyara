import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_admin
from app.models.user import User, UserRole
from app.models.property import Property, PropertyVerificationStatus
from app.models.room import Room
from app.models.experience import Experience
from app.models.verinova_models import VeriNovaPropertyAssessment, VeriNovaAuditLog
from app.schemas.auth import MessageResponse
from app.schemas.property import PropertyVerificationAction, PropertyVerificationResponse
from app.services.verinova.property_trust_service import PropertyTrustService
from app.services.ai.stayguide_service import StayGuideService

from app.services.notifications.notification_service import NotificationService

router = APIRouter()

@router.get("/properties")
def get_all_properties(
    verification_status: Optional[str] = Query(None, description="Filter: ALL, PENDING_VERIFICATION, VERIFIED, NEEDS_REVIEW, REJECTED, SUSPENDED"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all properties with verification status, trust score, fingerprint, and host verification states."""
    query = db.query(Property).order_by(Property.created_at.desc())
    if verification_status and verification_status.upper() != "ALL":
        query = query.filter(Property.verification_status == verification_status.upper())

    properties = query.all()
    results = []
    for p in properties:
        host_user = p.provider.user if p.provider and p.provider.user else None
        phone_verified = getattr(host_user, "phone_verified", False) if host_user else False
        email_verified = getattr(host_user, "email_verified", False) if host_user else False

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
            "host_name": host_user.name if host_user else "N/A",
            "provider_email": host_user.email if host_user else None,
            "provider_phone": host_user.phone if host_user else None,
            "phone_verified": phone_verified,
            "email_verified": email_verified,
            "is_active": p.is_active,
            "verification_status": p.verification_status or "PENDING_VERIFICATION",
            "verification_reason": p.verification_reason,
            "trust_score": p.trust_score,
            "trust_assessment_status": p.trust_assessment_status,
            "property_identity_fingerprint": p.property_identity_fingerprint,
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
    """Admin deep inspection of a property including host verification, trust assessment, location map, photos, and rooms."""
    p = db.query(Property).filter(Property.id == property_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found.")

    host_user = p.provider.user if p.provider and p.provider.user else None
    phone_verified = getattr(host_user, "phone_verified", False) if host_user else False
    email_verified = getattr(host_user, "email_verified", False) if host_user else False

    # Get latest trust assessment
    assessment = db.query(VeriNovaPropertyAssessment).filter(
        VeriNovaPropertyAssessment.property_id == p.id
    ).order_by(VeriNovaPropertyAssessment.created_at.desc()).first()

    if not assessment:
        assessment = PropertyTrustService.assess_property(db, p.id, actor_id=admin.id, actor_role="ADMIN")

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
        "host_name": host_user.name if host_user else "N/A",
        "provider_email": host_user.email if host_user else None,
        "provider_phone": host_user.phone if host_user else None,
        "phone_verified": phone_verified,
        "email_verified": email_verified,
        "is_active": p.is_active,
        "verification_status": p.verification_status or "PENDING_VERIFICATION",
        "verification_reason": p.verification_reason,
        "trust_score": assessment.trust_score,
        "trust_assessment_status": assessment.assessment_status.value,
        "property_identity_fingerprint": p.property_identity_fingerprint,
        "duplicate_detected": assessment.duplicate_detected,
        "duplicate_property_id": assessment.duplicate_property_id,
        "duplicate_explanation": assessment.duplicate_explanation,
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
        "home_rules": StayGuideService.serialize_property_rules(p.home_rules) if getattr(p, 'home_rules', None) else None,
        "rule_consistency_warnings": StayGuideService.validate_rules_consistency(p),
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
                "amenities": [{"id": a.id, "amenity_name": a.amenity_name} for a in r.amenities],
                "rules": StayGuideService.serialize_room_rules(r.rules, r) if getattr(r, 'rules', None) else None
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
    Admin moderation endpoint to APPROVE, REJECT, NEEDS_REVIEW, SUSPEND, or REACTIVATE a property.
    Only approved properties transition to VERIFIED and become customer-visible.
    """
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found.")

    raw_action = (data.action or "").upper().strip()
    action = raw_action
    if action == "REQUEST_REVIEW":
        action = "NEEDS_REVIEW"
    elif action == "SUSPEND_PROPERTY":
        action = "SUSPEND"
    elif action == "REACTIVATE_PROPERTY":
        action = "REACTIVATE"

    now = datetime.utcnow()
    reason = (data.reason or "").strip()

    if action in ["REJECT", "NEEDS_REVIEW", "SUSPEND"] and not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Please provide a reason when selecting {action}."
        )

    if action == "APPROVE":
        prop.verification_status = PropertyVerificationStatus.VERIFIED.value
        prop.is_active = True
        prop.verified_by = admin.id
        prop.verified_at = now
        prop.verification_reason = reason or "Approved by Administrator after platform trust evaluation."
        message = f"Property '{prop.name}' has been APPROVED and is now live."
    elif action == "REJECT":
        prop.verification_status = PropertyVerificationStatus.REJECTED.value
        prop.is_active = False
        prop.reviewed_by = admin.id
        prop.reviewed_at = now
        prop.verification_reason = reason
        message = f"Property '{prop.name}' has been REJECTED."
    elif action == "NEEDS_REVIEW":
        prop.verification_status = PropertyVerificationStatus.NEEDS_REVIEW.value
        prop.is_active = False
        prop.reviewed_by = admin.id
        prop.reviewed_at = now
        prop.verification_reason = reason
        message = f"Property '{prop.name}' has been marked as NEEDS_REVIEW."
    elif action == "SUSPEND":
        prop.verification_status = "SUSPENDED"
        prop.is_active = False
        prop.reviewed_by = admin.id
        prop.reviewed_at = now
        prop.verification_reason = reason
        message = f"Property '{prop.name}' has been SUSPENDED."
    elif action == "REACTIVATE":
        prop.verification_status = PropertyVerificationStatus.VERIFIED.value
        prop.is_active = True
        prop.verified_by = admin.id
        prop.verified_at = now
        prop.verification_reason = reason or "Property reactivated by administrator."
        message = f"Property '{prop.name}' has been REACTIVATED and is live."
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Allowed actions: APPROVE, REJECT, NEEDS_REVIEW, SUSPEND, REACTIVATE."
        )

    # Record Audit Log
    log = VeriNovaAuditLog(
        entity_type="PROPERTY",
        entity_id=prop.id,
        event_type="DECISION_APPLIED",
        actor_id=admin.id,
        actor_role="ADMIN",
        summary=f"Property '{prop.name}' status set to {prop.verification_status} by Admin {admin.name or admin.email}. Reason: {prop.verification_reason}",
        details_json=json.dumps({
            "action": action,
            "reason": prop.verification_reason,
            "verification_status": prop.verification_status
        })
    )
    db.add(log)
    db.commit()
    db.refresh(prop)

    # In-App Notification to Host
    try:
        host_user_id = prop.provider.user_id if prop.provider else None
        if host_user_id:
            if action in ["APPROVE", "REACTIVATE"]:
                NotificationService.create_notification(
                    db=db,
                    user_id=host_user_id,
                    title="Property Approved",
                    message=f"Your property '{prop.name}' has been approved and is now live for bookings.",
                    type="PROPERTY_APPROVED",
                    link="/provider/properties"
                )
            elif action == "REJECT":
                NotificationService.create_notification(
                    db=db,
                    user_id=host_user_id,
                    title="Property Submission Rejected",
                    message=f"Your property '{prop.name}' was rejected. Reason: {prop.verification_reason}",
                    type="PROPERTY_REJECTED",
                    link="/provider/properties"
                )
            elif action == "NEEDS_REVIEW":
                NotificationService.create_notification(
                    db=db,
                    user_id=host_user_id,
                    title="Property Review Requested",
                    message=f"Action required for '{prop.name}': {prop.verification_reason}",
                    type="PROPERTY_NEEDS_REVIEW",
                    link="/provider/properties"
                )
            elif action == "SUSPEND":
                NotificationService.create_notification(
                    db=db,
                    user_id=host_user_id,
                    title="Property Suspended",
                    message=f"Your property '{prop.name}' has been suspended. Reason: {prop.verification_reason}",
                    type="PROPERTY_SUSPENDED",
                    link="/provider/properties"
                )
    except Exception as notif_err:
        print("Error notifying host:", notif_err)

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
