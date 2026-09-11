from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.auth.dependencies import get_current_provider
from app.models.provider import ProviderProfile
from app.models.property import Property
from app.models.booking import Booking, BookingStatus
from app.models.verinova_models import VeriNovaPropertyAssessment
from app.schemas.user import HostTrustResponse
from app.services.verinova.property_trust_service import PropertyTrustService

router = APIRouter(tags=["Provider - Trust Framework"])

@router.get("/trust", response_model=HostTrustResponse)
def get_host_overall_trust(
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """
    Returns the host's overall trust dossier calculated from PostgreSQL data.
    Includes phone & email verification status, profile completeness, property trust scores,
    and history without fake numbers.
    """
    user = provider.user
    properties = db.query(Property).filter(Property.provider_id == provider.id).all()
    
    phone_verified = getattr(user, "phone_verified", False)
    email_verified = getattr(user, "email_verified", False)
    
    if phone_verified and email_verified:
        host_verif_status = "FULLY_VERIFIED"
    elif phone_verified:
        host_verif_status = "PHONE_VERIFIED"
    elif email_verified:
        host_verif_status = "EMAIL_VERIFIED"
    else:
        host_verif_status = "UNVERIFIED"

    # Profile completeness
    profile_fields = [
        bool(user.name),
        bool(user.email),
        bool(user.phone),
        bool(user.bio),
        bool(user.location),
        bool(provider.business_name),
        bool(provider.description),
    ]
    completeness_pct = int((sum(1 for f in profile_fields if f) / len(profile_fields)) * 100)

    # Bookings history
    completed_bookings = 0
    if properties:
        prop_ids = [p.id for p in properties]
        completed_bookings = db.query(Booking).filter(
            Booking.property_id.in_(prop_ids),
            Booking.status.in_([BookingStatus.COMPLETED, BookingStatus.CHECKED_IN])
        ).count()

    is_new_host = (completed_bookings == 0)
    history_label = "New Host – Limited Platform History" if is_new_host else "Established Host"

    # Property trust list
    properties_trust = []
    trust_scores = []
    verified_count = 0

    for p in properties:
        if p.verification_status == "VERIFIED":
            verified_count += 1

        assessment = db.query(VeriNovaPropertyAssessment).filter(
            VeriNovaPropertyAssessment.property_id == p.id
        ).order_by(VeriNovaPropertyAssessment.created_at.desc()).first()

        if not assessment:
            assessment = PropertyTrustService.assess_property(
                db, p.id, actor_id=provider.user_id, actor_role="PROVIDER"
            )

        trust_scores.append(assessment.trust_score)
        properties_trust.append({
            "property_id": p.id,
            "property_name": p.name,
            "trust_score": assessment.trust_score,
            "trust_assessment_status": assessment.assessment_status.value,
            "verification_status": p.verification_status,
            "property_fingerprint": assessment.property_fingerprint,
            "duplicate_detected": assessment.duplicate_detected,
            "created_at": p.created_at
        })

    avg_score = int(sum(trust_scores) / len(trust_scores)) if trust_scores else (85 if (phone_verified and email_verified) else 50)

    if avg_score >= 80:
        trust_tier = "HIGH TRUST"
    elif avg_score >= 60:
        trust_tier = "MEDIUM TRUST"
    elif avg_score >= 40:
        trust_tier = "LOW TRUST"
    else:
        trust_tier = "HIGH RISK"

    return {
        "host_id": provider.user_id,
        "host_name": user.name,
        "phone_verified": phone_verified,
        "phone_verified_at": getattr(user, "phone_verified_at", None),
        "email_verified": email_verified,
        "email_verified_at": getattr(user, "email_verified_at", None),
        "host_verification_status": host_verif_status,
        "profile_completeness_pct": completeness_pct,
        "account_status": getattr(user, "account_status", "ACTIVE"),
        "is_new_host": is_new_host,
        "platform_history_label": history_label,
        "total_properties": len(properties),
        "verified_properties": verified_count,
        "completed_bookings": completed_bookings,
        "average_trust_score": avg_score,
        "trust_tier": trust_tier,
        "properties_trust": properties_trust
    }

@router.get("/properties/{property_id}/trust")
@router.get("/verinova/properties/{property_id}")
def get_provider_property_trust(
    property_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """
    Host provider view of their property's Trust Score,
    signal evaluation breakdown, duplicate status, and fingerprint.
    """
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.provider_id == provider.id
    ).first()

    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found or you do not have permission to view it."
        )

    assessment = db.query(VeriNovaPropertyAssessment).filter(
        VeriNovaPropertyAssessment.property_id == prop.id
    ).order_by(VeriNovaPropertyAssessment.created_at.desc()).first()

    if not assessment:
        assessment = PropertyTrustService.assess_property(
            db, prop.id, actor_id=provider.user_id, actor_role="PROVIDER"
        )

    provider_checks = []
    for c in assessment.checks:
        provider_checks.append({
            "category": c.check_category,
            "name": c.check_name,
            "status": c.status.value,
            "message": c.message,
            "details": c.details
        })

    return {
        "property_id": prop.id,
        "property_name": prop.name,
        "trust_score": assessment.trust_score,
        "assessment_status": assessment.assessment_status.value,
        "verification_status": prop.verification_status,
        "verification_reason": prop.verification_reason,
        "property_fingerprint": assessment.property_fingerprint,
        "duplicate_detected": assessment.duplicate_detected,
        "summary": assessment.summary,
        "checks": provider_checks,
        "reviewed_at": prop.reviewed_at or prop.verified_at,
        "created_at": assessment.created_at,
        "updated_at": assessment.updated_at
    }
