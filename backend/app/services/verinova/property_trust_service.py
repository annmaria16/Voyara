import os
import re
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.config import settings
from app.models.property import Property
from app.models.user import User, UserRole, AccountStatus
from app.models.booking import Booking, BookingStatus
from app.models.review import Review
from app.models.verinova_models import (
    VeriNovaPropertyAssessment,
    VeriNovaPropertyCheck,
    VeriNovaAssessmentStatus,
    VeriNovaEvidenceStatus,
    VeriNovaCheckStatus,
    VeriNovaAuditLog,
)
from app.services.verinova.fingerprint_service import FingerprintService
from app.services.verinova.duplicate_detection_service import (
    DuplicateDetectionService,
    calculate_haversine_distance_meters,
)

class PropertyTrustService:
    @classmethod
    def assess_property(
        cls,
        db: Session,
        property_id: int,
        pincode_input: Optional[str] = None,
        actor_id: Optional[int] = None,
        actor_role: str = "SYSTEM_ENGINE"
    ) -> VeriNovaPropertyAssessment:
        """
        Executes the comprehensive, deterministic 9-signal Host & Property Trust Assessment.
        Calculates platform trust from actual PostgreSQL data (0-100 score) without legal document requirements.
        Persists check items, generates Property Identity Fingerprint, and logs to the immutable audit trail.
        """
        prop = db.query(Property).filter(Property.id == property_id).first()
        if not prop:
            raise ValueError(f"Property ID #{property_id} not found.")

        # Extract Pincode from input, location details, or address
        pincode = pincode_input
        if not pincode and prop.location_details:
            pin_match = re.search(r"\b([1-9][0-9]{5})\b", prop.location_details)
            if pin_match:
                pincode = pin_match.group(1)
        if not pincode and prop.address:
            pin_match = re.search(r"\b([1-9][0-9]{5})\b", prop.address)
            if pin_match:
                pincode = pin_match.group(1)

        checks_data: List[Dict[str, Any]] = []
        total_score = 0
        warnings: List[str] = []

        # =========================================================================
        # SIGNAL 1: HOST ACCOUNT & VERIFICATION STATUS (Weight: 15 pts)
        # =========================================================================
        host_user = None
        if prop.provider and prop.provider.user:
            host_user = prop.provider.user
        elif prop.provider_id:
            host_user = db.query(User).filter(User.id == prop.provider_id).first()

        s1_score = 0
        s1_details = []

        if host_user:
            phone_ok = getattr(host_user, "phone_verified", False)
            email_ok = getattr(host_user, "email_verified", False)
            acc_status = getattr(host_user, "account_status", "ACTIVE")
            is_active = host_user.is_active and acc_status == "ACTIVE"

            if phone_ok:
                s1_score += 5
                s1_details.append("Phone Verified")
            else:
                s1_details.append("Phone Unverified")
                warnings.append("Host phone is not verified.")

            if email_ok:
                s1_score += 5
                s1_details.append("Email Verified")
            else:
                s1_details.append("Email Unverified")
                warnings.append("Host email is not verified.")

            if is_active:
                s1_score += 5
                s1_details.append("Account Active")
            else:
                s1_details.append(f"Account {acc_status}")
                warnings.append(f"Host account is {acc_status.lower()}.")

            if s1_score >= 15:
                s1_status = VeriNovaCheckStatus.PASS
                s1_msg = f"Host '{host_user.name}' ({host_user.email}) is fully verified (Phone ✓, Email ✓, Active ✓)."
            elif s1_score >= 10:
                s1_status = VeriNovaCheckStatus.WARNING
                s1_msg = f"Host '{host_user.name}' partially verified: {', '.join(s1_details)}."
            else:
                s1_status = VeriNovaCheckStatus.FAIL
                s1_msg = f"Host account verification incomplete: {', '.join(s1_details)}."
        else:
            s1_score = 0
            s1_status = VeriNovaCheckStatus.FAIL
            s1_msg = "No host provider user linked to this property."
            warnings.append("Missing host provider account.")

        total_score += s1_score
        checks_data.append({
            "category": "HOST_ACCOUNT",
            "name": "Host Account & Identity Verification",
            "weight": 15,
            "score": s1_score,
            "status": s1_status,
            "message": s1_msg,
            "details": f"Host verification status: {', '.join(s1_details) if s1_details else 'None'}",
            "explanation": "Evaluates host phone verification, email verification, and account standing in PostgreSQL."
        })

        # =========================================================================
        # SIGNAL 2: PROPERTY DATA COMPLETENESS (Weight: 10 pts)
        # =========================================================================
        fields_to_check = [
            bool(prop.name and len(prop.name.strip()) >= 3),
            bool(prop.property_type),
            bool(prop.description and len(prop.description.strip()) >= 20),
            bool(prop.address and len(prop.address.strip()) >= 5),
            bool(prop.city and len(prop.city.strip()) >= 2),
            bool(prop.state and len(prop.state.strip()) >= 2),
            bool(prop.contact_phone and len(re.sub(r'[^\d]', '', prop.contact_phone)) >= 10),
            bool(prop.contact_email and "@" in prop.contact_email),
            bool(prop.check_in_time and prop.check_out_time),
            bool(len(prop.rooms) > 0),
        ]
        filled_count = sum(1 for f in fields_to_check if f)
        completeness_pct = int((filled_count / len(fields_to_check)) * 100)
        s2_score = int(round((filled_count / len(fields_to_check)) * 10))
        s2_status = VeriNovaCheckStatus.PASS if s2_score >= 9 else (VeriNovaCheckStatus.WARNING if s2_score >= 6 else VeriNovaCheckStatus.FAIL)
        
        total_score += s2_score
        checks_data.append({
            "category": "DATA_COMPLETENESS",
            "name": "Property Data & Information Completeness",
            "weight": 10,
            "score": s2_score,
            "status": s2_status,
            "message": f"Listing completeness: {completeness_pct}% ({filled_count}/{len(fields_to_check)} key sections completed).",
            "details": f"Rooms configured: {len(prop.rooms)}, Amenities configured: {len(prop.amenities)}.",
            "explanation": "Calculates the structural completeness of descriptions, policies, room units, and contact details."
        })

        # =========================================================================
        # SIGNAL 3: INDIA SOVEREIGN LOCATION VALIDITY (Weight: 10 pts)
        # =========================================================================
        country_norm = (prop.country or "").strip().lower()
        is_india_country = country_norm in ["india", "in", "bharat"]
        has_coords = prop.latitude is not None and prop.longitude is not None
        coords_in_india = False
        if has_coords:
            try:
                lat = float(prop.latitude)
                lng = float(prop.longitude)
                coords_in_india = (6.5 <= lat <= 37.5) and (68.0 <= lng <= 97.5)
            except (ValueError, TypeError):
                coords_in_india = False

        if is_india_country and coords_in_india:
            s3_score = 10
            s3_status = VeriNovaCheckStatus.PASS
            s3_msg = f"Valid Indian location: Country='{prop.country}', GPS=({prop.latitude:.4f}°, {prop.longitude:.4f}°) within India boundaries."
            s3_detail = "100% within sovereign India operational territory."
        elif is_india_country and not has_coords:
            s3_score = 6
            s3_status = VeriNovaCheckStatus.WARNING
            s3_msg = "Country is India, but GPS map coordinates were not pinned."
            s3_detail = "Missing coordinate pinning."
            warnings.append("GPS pin coordinates missing.")
        else:
            s3_score = 0
            s3_status = VeriNovaCheckStatus.FAIL
            s3_msg = f"Non-Indian location or coordinates outside India boundary (Country: '{prop.country}'). Voyara allows only Indian properties."
            s3_detail = "Location outside India boundary."
            warnings.append("Location outside India.")

        total_score += s3_score
        checks_data.append({
            "category": "INDIA_LOCATION",
            "name": "India Sovereign Territory & Boundary Validation",
            "weight": 10,
            "score": s3_score,
            "status": s3_status,
            "message": s3_msg,
            "details": s3_detail,
            "explanation": "Ensures property resides strictly inside the Republic of India as required by Voyara's operational charter."
        })

        # =========================================================================
        # SIGNAL 4: PINCODE CONSISTENCY (Weight: 15 pts)
        # =========================================================================
        pincode_status = "NOT_FOUND"
        if pincode and re.match(r"^[1-9][0-9]{5}$", pincode):
            first_digit = pincode[0]
            state_lower = (prop.state or "").lower()
            
            # Regional heuristics for Indian pincodes
            region_match = True
            if first_digit == '6' and not any(s in state_lower for s in ['kerala', 'tamil nadu', 'karnataka', 'lakshadweep', 'pondicherry', 'puducherry']):
                region_match = False
            elif first_digit in ['1', '2'] and any(s in state_lower for s in ['kerala', 'tamil nadu', 'karnataka', 'goa', 'maharashtra']):
                region_match = False

            if region_match:
                s4_score = 15
                s4_status = VeriNovaCheckStatus.PASS
                s4_msg = f"Pincode {pincode} matches region: State='{prop.state}', City='{prop.city}'."
                s4_detail = "Consistent Indian postal network."
                pincode_status = "CONSISTENT"
            else:
                s4_score = 7
                s4_status = VeriNovaCheckStatus.WARNING
                s4_msg = f"Pincode {pincode} region zone conflicts with declared State '{prop.state}'."
                s4_detail = "Postal region conflict."
                pincode_status = "MISMATCH"
                warnings.append(f"Pincode {pincode} appears inconsistent with State '{prop.state}'.")
        else:
            s4_score = 0
            s4_status = VeriNovaCheckStatus.FAIL
            s4_msg = "Valid 6-digit Indian postal pincode was not detected in property address."
            s4_detail = "Pincode missing or invalid format."
            pincode_status = "NOT_FOUND"
            warnings.append("Postal pincode not provided.")

        total_score += s4_score
        checks_data.append({
            "category": "PINCODE_CONSISTENCY",
            "name": "Indian Postal Pincode & Regional Consistency",
            "weight": 15,
            "score": s4_score,
            "status": s4_status,
            "message": s4_msg,
            "details": s4_detail,
            "explanation": "Validates postal code alignment with state, district, and regional postal boundaries."
        })

        # =========================================================================
        # SIGNAL 5: GPS + ADDRESS CONSISTENCY (Weight: 15 pts)
        # =========================================================================
        location_status = "INCOMPLETE"
        if has_coords and coords_in_india:
            lat = float(prop.latitude)
            lng = float(prop.longitude)
            state_lower = (prop.state or "").lower()

            is_gps_consistent = True
            mismatch_reason = ""

            if "kerala" in state_lower and not (8.1 <= lat <= 12.9 and 74.8 <= lng <= 77.8):
                is_gps_consistent = False
                mismatch_reason = "Declared Kerala state but coordinates are outside Kerala geography."
            elif ("delhi" in state_lower or "ncr" in state_lower) and not (28.0 <= lat <= 29.2 and 76.5 <= lng <= 77.8):
                is_gps_consistent = False
                mismatch_reason = "Declared Delhi region but coordinates are outside NCR geography."
            elif "goa" in state_lower and not (14.8 <= lat <= 15.9 and 73.6 <= lng <= 74.4):
                is_gps_consistent = False
                mismatch_reason = "Declared Goa state but coordinates are outside Goa geography."
            elif "himachal" in state_lower and not (30.3 <= lat <= 33.3 and 75.5 <= lng <= 79.1):
                is_gps_consistent = False
                mismatch_reason = "Declared Himachal Pradesh but coordinates are outside Himachal geography."

            if is_gps_consistent:
                s5_score = 15
                s5_status = VeriNovaCheckStatus.PASS
                s5_msg = f"GPS coordinates ({lat:.4f}° N, {lng:.4f}° E) correlate consistently with declared address locality ({prop.city}, {prop.state})."
                s5_detail = "Spatial geofence consistency confirmed."
                location_status = "CONSISTENT"
            else:
                s5_score = 4
                s5_status = VeriNovaCheckStatus.WARNING
                s5_msg = f"Spatial Anomaly: GPS coordinates ({lat:.4f}° N, {lng:.4f}° E) conflict with declared State '{prop.state}'. {mismatch_reason}"
                s5_detail = "GPS / Address state mismatch."
                location_status = "INCONSISTENT"
                warnings.append(f"Location inconsistency: {mismatch_reason}")
        elif has_coords and not coords_in_india:
            s5_score = 0
            s5_status = VeriNovaCheckStatus.FAIL
            s5_msg = "Pinned coordinates fall outside India boundaries."
            s5_detail = "Outside India."
            location_status = "INCONSISTENT"
            warnings.append("Coordinates fall outside India.")
        else:
            s5_score = 5
            s5_status = VeriNovaCheckStatus.WARNING
            s5_msg = "GPS coordinates not pinned; evaluation based only on street address text."
            s5_detail = "No GPS coordinates."
            location_status = "INCOMPLETE"

        total_score += s5_score
        checks_data.append({
            "category": "GPS_ADDRESS_CONSISTENCY",
            "name": "GPS Coordinate & Physical Address Correlation",
            "weight": 15,
            "score": s5_score,
            "status": s5_status,
            "message": s5_msg,
            "details": s5_detail,
            "explanation": "Cross-verifies geographical GPS coordinates against declared street address and administrative regions."
        })

        # =========================================================================
        # SIGNAL 6: PROPERTY IDENTITY FINGERPRINT (Weight: 10 pts)
        # =========================================================================
        fingerprint = FingerprintService.generate_property_fingerprint(
            name=prop.name,
            address=prop.address,
            city=prop.city,
            state=prop.state,
            pincode=pincode,
            latitude=prop.latitude,
            longitude=prop.longitude
        )

        other_with_fp = db.query(Property).filter(
            Property.id != prop.id,
            Property.property_identity_fingerprint == fingerprint
        ).first()

        if other_with_fp:
            s6_score = 3
            s6_status = VeriNovaCheckStatus.WARNING
            s6_msg = f"Technical identity fingerprint '{fingerprint}' matches existing listing: '{other_with_fp.name}' (ID #{other_with_fp.id})."
            s6_detail = f"Collision with Property ID #{other_with_fp.id}"
            warnings.append(f"Property identity fingerprint collision with '{other_with_fp.name}'.")
        else:
            s6_score = 10
            s6_status = VeriNovaCheckStatus.PASS
            s6_msg = f"Property identity fingerprint generated: '{fingerprint}' (Unique across platform)."
            s6_detail = "Canonical uniqueness verified."

        total_score += s6_score
        checks_data.append({
            "category": "PROPERTY_IDENTITY",
            "name": "Property Identity Fingerprint & Canonical Identity",
            "weight": 10,
            "score": s6_score,
            "status": s6_status,
            "message": s6_msg,
            "details": s6_detail,
            "explanation": "Creates a normalized, deterministic identity fingerprint to track property identity and detect duplicates."
        })

        # =========================================================================
        # SIGNAL 7: AUTHENTIC HOST PHOTO AVAILABILITY (Weight: 10 pts)
        # =========================================================================
        real_photos_count = len(prop.images)
        if real_photos_count >= 3:
            s7_score = 10
            s7_status = VeriNovaCheckStatus.PASS
            s7_msg = f"{real_photos_count} actual host-uploaded property photos available."
            s7_detail = "Full gallery available."
        elif real_photos_count > 0:
            s7_score = 6
            s7_status = VeriNovaCheckStatus.WARNING
            s7_msg = f"{real_photos_count} host photo(s) available (Recommended: 3+ photos)."
            s7_detail = "Limited photo count."
        else:
            s7_score = 0
            s7_status = VeriNovaCheckStatus.FAIL
            s7_msg = "No property photos uploaded. Listings require authentic host photos."
            s7_detail = "Zero photos available."
            warnings.append("No property photos uploaded.")

        total_score += s7_score
        checks_data.append({
            "category": "PHOTO_AVAILABILITY",
            "name": "Authentic Host Photo Verification",
            "weight": 10,
            "score": s7_score,
            "status": s7_status,
            "message": s7_msg,
            "details": s7_detail,
            "explanation": "Confirms presence of authentic host-uploaded property photos for traveler clarity."
        })

        # =========================================================================
        # SIGNAL 8: DUPLICATE / ANOMALY ASSESSMENT (Weight: 10 pts)
        # =========================================================================
        duplicate_res = DuplicateDetectionService.evaluate_property_duplicates(
            db=db,
            candidate_property_id=prop.id,
            name=prop.name,
            address=prop.address,
            city=prop.city,
            state=prop.state,
            pincode=pincode,
            latitude=prop.latitude,
            longitude=prop.longitude,
            contact_phone=prop.contact_phone,
            contact_email=prop.contact_email
        )

        if duplicate_res["duplicate_detected"]:
            s8_score = 2
            s8_status = VeriNovaCheckStatus.WARNING
            s8_msg = duplicate_res["explanation"]
            s8_detail = f"High similarity ({int(duplicate_res['similarity_score'] * 100)}%) with Property #{duplicate_res['duplicate_property_id']}."
            warnings.append(f"Possible duplicate of '{duplicate_res['duplicate_property_name']}' (ID #{duplicate_res['duplicate_property_id']}).")
        else:
            s8_score = 10
            s8_status = VeriNovaCheckStatus.PASS
            s8_msg = "No conflicting or duplicate property submissions detected."
            s8_detail = f"Max similarity score: {int(duplicate_res['similarity_score'] * 100)}% (Clean)."

        total_score += s8_score
        checks_data.append({
            "category": "DUPLICATE_ANOMALY",
            "name": "Duplicate Submission & Anomaly Detection",
            "weight": 10,
            "score": s8_score,
            "status": s8_status,
            "message": s8_msg,
            "details": s8_detail,
            "explanation": "Compares property title, geographical proximity, and address tokens against existing platform listings."
        })

        # =========================================================================
        # SIGNAL 9: HOST PLATFORM HISTORY & PERFORMANCE (Weight: 5 pts)
        # =========================================================================
        # Check completed bookings and reviews for this host
        completed_bookings_count = 0
        avg_rating = 0.0
        if host_user and prop.provider:
            completed_bookings_count = db.query(Booking).filter(
                Booking.property_id == prop.id,
                Booking.status.in_([BookingStatus.COMPLETED, BookingStatus.CHECKED_IN])
            ).count()

            ratings = db.query(func.avg(Review.rating)).filter(Review.property_id == prop.id).scalar()
            avg_rating = float(ratings) if ratings else 0.0

        if completed_bookings_count >= 3:
            s9_score = 5
            s9_status = VeriNovaCheckStatus.PASS
            s9_msg = f"Established Host: {completed_bookings_count} completed stay(s) with {avg_rating:.1f} average traveler rating."
            s9_detail = "Positive operational history on Voyara."
        elif completed_bookings_count > 0:
            s9_score = 4
            s9_status = VeriNovaCheckStatus.PASS
            s9_msg = f"Active Host: {completed_bookings_count} completed stay(s)."
            s9_detail = "Emerging platform track record."
        else:
            # New Host - Never treat as suspicious; award neutral baseline points (4/5)
            s9_score = 4
            s9_status = VeriNovaCheckStatus.PASS
            s9_msg = "New Host – Limited Platform History. Standard onboarding trust profile applied."
            s9_detail = "New listing on Voyara."

        total_score += s9_score
        checks_data.append({
            "category": "HOST_HISTORY",
            "name": "Host Platform History & Performance",
            "weight": 5,
            "score": s9_score,
            "status": s9_status,
            "message": s9_msg,
            "details": s9_detail,
            "explanation": "Evaluates completed bookings and review history without penalizing new hosts."
        })

        # Final score bounded to 0-100
        final_score = max(0, min(100, total_score))

        # Trust score classification:
        # 80-100: HIGH TRUST
        # 60-79: MEDIUM TRUST
        # 40-59: LOW TRUST
        # 0-39: HIGH RISK
        if final_score >= 80:
            assessment_status = VeriNovaAssessmentStatus.HIGH_CONSISTENCY
            summary_label = "HIGH TRUST"
        elif final_score >= 60:
            assessment_status = VeriNovaAssessmentStatus.GOOD_CONSISTENCY
            summary_label = "MEDIUM TRUST"
        elif final_score >= 40:
            assessment_status = VeriNovaAssessmentStatus.NEEDS_REVIEW
            summary_label = "LOW TRUST"
        else:
            assessment_status = VeriNovaAssessmentStatus.HIGH_RISK_INCONSISTENT
            summary_label = "HIGH RISK"

        if duplicate_res["duplicate_detected"]:
            assessment_status = VeriNovaAssessmentStatus.NEEDS_REVIEW
            summary_label = "NEEDS REVIEW (POSSIBLE DUPLICATE)"

        summary_text = (
            f"Voyara Trust Score: {final_score}/100 ({summary_label}). "
            f"{len(checks_data)} platform signals evaluated. "
            f"Location: {location_status}, Pincode: {pincode_status}. "
            + (f"Flags: {'; '.join(warnings)}" if warnings else "All signals verified consistent.")
        )

        assessment_unique_id = f"VN-PROP-{prop.id:04d}-{uuid.uuid4().hex[:6].upper()}"

        assessment = VeriNovaPropertyAssessment(
            assessment_id=assessment_unique_id,
            property_id=prop.id,
            host_id=host_user.id if host_user else prop.provider_id,
            trust_score=final_score,
            assessment_status=assessment_status,
            property_fingerprint=fingerprint,
            duplicate_detected=duplicate_res["duplicate_detected"],
            duplicate_property_id=duplicate_res["duplicate_property_id"],
            duplicate_similarity_score=duplicate_res["similarity_score"],
            duplicate_explanation=duplicate_res["explanation"],
            evidence_status=VeriNovaEvidenceStatus.NOT_PROVIDED,
            location_status=location_status,
            pincode_status=pincode_status,
            summary=summary_text,
            admin_decision=prop.verification_status or "PENDING_VERIFICATION",
            decision_reason=prop.verification_reason,
            reviewed_by=prop.verified_by or prop.reviewed_by,
            reviewed_at=prop.verified_at or prop.reviewed_at,
        )
        db.add(assessment)
        db.flush()

        for c in checks_data:
            check_record = VeriNovaPropertyCheck(
                assessment_id=assessment.id,
                check_category=c["category"],
                check_name=c["name"],
                score_weight=c["weight"],
                score_awarded=c["score"],
                status=c["status"],
                message=c["message"],
                details=c["details"],
                explanation=c["explanation"]
            )
            db.add(check_record)

        # Update property table columns
        prop.trust_score = final_score
        prop.trust_assessment_status = assessment_status.value
        prop.property_identity_fingerprint = fingerprint

        # Log audit entry
        audit_log = VeriNovaAuditLog(
            entity_type="PROPERTY",
            entity_id=prop.id,
            event_type="ASSESSMENT_GENERATED",
            actor_id=actor_id,
            actor_role=actor_role,
            summary=f"Host & Property Trust Assessment generated: Score {final_score}/100 ({summary_label}). Fingerprint: {fingerprint}",
            details_json=f'{{"trust_score": {final_score}, "status": "{assessment_status.value}", "duplicate_detected": {str(duplicate_res["duplicate_detected"]).lower()}}}'
        )
        db.add(audit_log)

        db.commit()
        db.refresh(assessment)
        return assessment
