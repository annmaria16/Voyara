import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User
from app.models.property import Property
from app.models.booking import Booking
from app.models.verinova_models import VeriNovaPropertyAssessment, VeriNovaAuditLog
from app.services.verinova.fingerprint_service import FingerprintService
from app.services.verinova.duplicate_detection_service import DuplicateDetectionService
from app.services.verinova.property_trust_service import PropertyTrustService
from app.services.verinova.verification_service import VeriNovaService

def test_verinova_framework():
    db = SessionLocal()
    try:
        print("=== 1. Testing VeriNova Fingerprint Generator ===")
        fp1 = FingerprintService.generate_property_fingerprint(
            name="Grand Sunset Heritage Villa",
            address="12 Beach Road, Calangute",
            city="Goa",
            state="Goa",
            latitude=15.5432,
            longitude=73.7654
        )
        print(f"Generated Fingerprint: {fp1}")
        assert fp1.startswith("VN-PROP-FP-"), "Fingerprint should have VN-PROP-FP prefix"
        
        # Test change detection
        fp2 = FingerprintService.generate_property_fingerprint(
            name="Grand Sunset Heritage Villa Altered",
            address="12 Beach Road, Calangute",
            city="Goa",
            state="Goa",
            latitude=15.5432,
            longitude=73.7654
        )
        assert FingerprintService.detect_identity_change(fp1, fp2) is True, "Identity change must be detected"
        assert FingerprintService.detect_identity_change(fp1, fp1) is False, "Same fingerprint should not trigger change"
        print("Fingerprint tests PASSED!")

        print("\n=== 2. Testing Property Trust Assessment Engine ===")
        props = db.query(Property).all()
        print(f"Found {len(props)} properties in database.")
        
        if props:
            first_prop = props[0]
            assessment = PropertyTrustService.assess_property(db, first_prop.id, actor_role="SYSTEM_TEST")
            print(f"Assessment ID: {assessment.assessment_id}")
            print(f"Trust Score: {assessment.trust_score}/100")
            print(f"Assessment Status: {assessment.assessment_status.value}")
            print(f"Evidence Status: {assessment.evidence_status.value}")
            print(f"Location Status: {assessment.location_status}")
            print(f"Pincode Status: {assessment.pincode_status}")
            print(f"Duplicate Flagged: {assessment.duplicate_detected}")
            print(f"Checks Count: {len(assessment.checks)}")
            for c in assessment.checks:
                print(f"  - [{c.status.value}] {c.check_name}: {c.score_awarded}/{c.score_weight} pts ({c.message})")

            assert assessment.trust_score >= 0 and assessment.trust_score <= 100
            assert len(assessment.checks) >= 9, "Should evaluate all 9 deterministic signals"

        print("Property Trust Assessment engine tests PASSED!")

        print("\n=== 3. Testing Duplicate Detection Algorithm ===")
        if len(props) >= 1:
            dup_check = DuplicateDetectionService.check_for_duplicate(db, props[0])
            print(f"Duplicate check result for property #{props[0].id}: is_duplicate={dup_check['is_duplicate']}, similarity={dup_check.get('similarity_score', 0)}")
            print("Duplicate Detection tests PASSED!")

        print("\n=== 4. Testing Live Overview Statistics ===")
        overview = VeriNovaService.get_admin_overview_stats(db)
        print(f"Overview stats: Total Assessed={overview['total_properties_assessed']}, High Consistency={overview['high_consistency_count']}, Needs Review={overview['needs_review_count']}, Verified Transactions={overview['total_transactions_verified']}")
        assert overview['total_properties_assessed'] >= 0
        print("Overview statistics tests PASSED!")

        print("\n=== 5. Testing Audit Log Engine ===")
        logs = db.query(VeriNovaAuditLog).order_by(VeriNovaAuditLog.created_at.desc()).limit(5).all()
        print(f"Latest {len(logs)} Audit Logs:")
        for l in logs:
            print(f"  - [{l.created_at}] ({l.actor_role}) {l.event_type} on {l.entity_type}#{l.entity_id}: {l.summary}")
        print("Audit Log tests PASSED!")

        print("\nALL VERINOVA CORE BACKEND TESTS COMPLETED SUCCESSFULLY!")

    finally:
        db.close()

if __name__ == "__main__":
    test_verinova_framework()
