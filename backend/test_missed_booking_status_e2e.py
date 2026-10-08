import os
import sys
from datetime import date, datetime, timedelta
import zoneinfo

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.property import Property, PropertyType
from app.models.room import Room
from app.models.booking import Booking, BookingStatus
from app.services.bookings.booking_service import BookingService

def run_e2e_tests():
    db = SessionLocal()
    try:
        ist = zoneinfo.ZoneInfo("Asia/Kolkata")
        today = datetime.now(ist).date()
        print(f"==================================================")
        print(f"Running Voyara Missed & Expired Booking Test Suite")
        print(f"Current System Date (Asia/Kolkata): {today}")
        print(f"==================================================")

        # 1. Get or create a test traveler and provider
        traveler = db.query(User).filter(User.role == UserRole.CUSTOMER).first()
        if not traveler:
            traveler = User(
                name="Test Traveler",
                email=f"traveler_{int(datetime.now().timestamp())}@voyara.com",
                role=UserRole.CUSTOMER,
                hashed_password="hashed_pw_test",
                is_active=True
            )
            db.add(traveler)
            db.commit()
            db.refresh(traveler)

        provider = db.query(User).filter(User.role == UserRole.PROVIDER).first()
        if not provider:
            provider = User(
                name="Test Provider",
                email=f"provider_{int(datetime.now().timestamp())}@voyara.com",
                role=UserRole.PROVIDER,
                hashed_password="hashed_pw_test",
                is_active=True
            )
            db.add(provider)
            db.commit()
            db.refresh(provider)

        prop = db.query(Property).first()
        if not prop:
            prop = Property(
                host_id=provider.id,
                name="Serene Munnar Sanctuary",
                property_type=PropertyType.RESORT,
                city="Munnar",
                state="Kerala",
                country="India",
                address="Pothamedu Viewpoint",
                base_price=5000.0,
                max_guests=4,
                check_in_time="14:00",
                check_out_time="11:00",
                is_active=True
            )
            db.add(prop)
            db.commit()
            db.refresh(prop)

        # Test Case 1: Before check-in date (Future check-in) -> UPCOMING
        future_checkin = today + timedelta(days=5)
        future_checkout = today + timedelta(days=7)
        b1 = Booking(
            user_id=traveler.id,
            property_id=prop.id,
            check_in=future_checkin,
            check_out=future_checkout,
            total_nights=2,
            total_guests=2,
            total_amount=10000.0,
            original_total_amount=10000.0,
            status=BookingStatus.CONFIRMED,
            booking_number=f"TEST-FUT-{int(datetime.now().timestamp())}"
        )
        db.add(b1)
        db.commit()
        db.refresh(b1)

        BookingService.enrich_booking(b1)
        print("\n[TEST 1] Future Booking Check:")
        print(f"  Check-in: {b1.check_in}, Status: {b1.status}, Display: {b1.display_status}, Warning: {b1.checkin_warning}")
        assert b1.display_status == "UPCOMING", f"Expected UPCOMING, got {b1.display_status}"
        assert b1.checkin_warning is None, f"Expected no warning, got {b1.checkin_warning}"
        assert b1.is_missed is False
        assert b1.is_checkin_today is False
        assert b1.is_checkin_missed is False
        print("  -> PASSED: Normal upcoming status shown, no warning.")

        # Test Case 2: On check-in date (today == check_in, checked_in_at IS NULL)
        b2 = Booking(
            user_id=traveler.id,
            property_id=prop.id,
            check_in=today,
            check_out=today + timedelta(days=2),
            total_nights=2,
            total_guests=2,
            total_amount=10000.0,
            original_total_amount=10000.0,
            status=BookingStatus.CONFIRMED,
            booking_number=f"TEST-TODAY-{int(datetime.now().timestamp())}"
        )
        db.add(b2)
        db.commit()
        db.refresh(b2)

        BookingService.enrich_booking(b2)
        print("\n[TEST 2] Check-in Today:")
        print(f"  Check-in: {b2.check_in}, Status: {b2.status}, Display: {b2.display_status}, Warning: {b2.checkin_warning}")
        assert b2.is_checkin_today is True, "Expected is_checkin_today True"
        assert b2.is_checkin_missed is False, "Expected is_checkin_missed False"
        assert b2.is_missed is False, "Expected is_missed False"
        warning_msg = b2.checkin_warning['message'] if isinstance(b2.checkin_warning, dict) else str(b2.checkin_warning)
        assert "starts today" in warning_msg.lower(), f"Warning unexpected: {b2.checkin_warning}"
        assert b2.status == BookingStatus.CONFIRMED, "Booking must remain active/CONFIRMED"
        print("  -> PASSED: Check-in Today warning displayed, booking stays active.")

        # Test Case 3: After check-in date, before checkout (check_in < today <= check_out, checked_in_at IS NULL)
        b3 = Booking(
            user_id=traveler.id,
            property_id=prop.id,
            check_in=today - timedelta(days=1),
            check_out=today + timedelta(days=1),
            total_nights=2,
            total_guests=2,
            total_amount=10000.0,
            original_total_amount=10000.0,
            status=BookingStatus.CONFIRMED,
            booking_number=f"TEST-MISSED-CHECKIN-{int(datetime.now().timestamp())}"
        )
        db.add(b3)
        db.commit()
        db.refresh(b3)

        BookingService.enrich_booking(b3)
        print("\n[TEST 3] Check-in Missed (Stay In Progress, Guest Not Checked In):")
        print(f"  Check-in: {b3.check_in}, Status: {b3.status}, Display: {b3.display_status}, Warning: {b3.checkin_warning}")
        assert b3.is_checkin_missed is True, "Expected is_checkin_missed True"
        assert b3.is_missed is False, "Expected is_missed False before checkout"
        warning_msg3 = b3.checkin_warning['message'] if isinstance(b3.checkin_warning, dict) else str(b3.checkin_warning)
        assert "not checked in" in warning_msg3.lower(), f"Warning unexpected: {b3.checkin_warning}"
        assert b3.status == BookingStatus.CONFIRMED, "Booking must remain CONFIRMED until checkout passes"
        print("  -> PASSED: Check-in Missed warning displayed, booking not marked completed.")

        # Test Case 4: After checkout date, not checked in (check_out < today, checked_in_at IS NULL) -> NO_SHOW
        b4 = Booking(
            user_id=traveler.id,
            property_id=prop.id,
            check_in=today - timedelta(days=4),
            check_out=today - timedelta(days=1),
            total_nights=3,
            total_guests=2,
            total_amount=15000.0,
            original_total_amount=15000.0,
            status=BookingStatus.CONFIRMED,
            booking_number=f"TEST-EXPIRED-{int(datetime.now().timestamp())}"
        )
        db.add(b4)
        db.commit()
        db.refresh(b4)

        # Run automated evaluation
        BookingService.auto_evaluate_past_and_expired_bookings(db)
        db.refresh(b4)
        BookingService.enrich_booking(b4)

        print("\n[TEST 4] Expired / Missed Stay Evaluation:")
        print(f"  Check-out: {b4.check_out}, Status: {b4.status}, Display: {b4.display_status}")
        print(f"  Warning: {b4.checkin_warning}")
        print(f"  Refund Amount: {b4.refund_amount}, Retained Amount: {b4.retained_amount}")
        print(f"  Provider Settlement: {b4.provider_settlement_amount}, Commission: {b4.commission_amount}")
        
        assert b4.status == BookingStatus.NO_SHOW, f"Expected NO_SHOW, got {b4.status}"
        assert b4.display_status in ["NO_SHOW", "MISSED"], f"Expected display_status NO_SHOW or MISSED, got {b4.display_status}"
        assert b4.is_missed is True, "Expected is_missed True"
        assert b4.refund_amount == 0.0, f"Expected 0 refund, got {b4.refund_amount}"
        assert b4.retained_amount == 15000.0, f"Expected 15000 retained, got {b4.retained_amount}"
        assert b4.provider_settlement_amount == 13500.0, f"Expected 13500 settlement (90%), got {b4.provider_settlement_amount}"
        assert b4.commission_amount == 1500.0, f"Expected 1500 commission (10%), got {b4.commission_amount}"
        assert b4.commission_status == "FINALIZED"
        assert b4.payout_status in ["READY", "SETTLED_NO_SHOW"], f"Unexpected payout_status: {b4.payout_status}"
        assert b4.is_cancellable is False, "NO_SHOW booking must not be cancellable"
        print("  -> PASSED: Marked NO_SHOW, 0 refund, 90% partner settlement, 10% commission, non-cancellable.")

        # Test Case 5: Traveler Checked In (checked_in_at IS NOT NULL) -> Never marked missed
        b5 = Booking(
            user_id=traveler.id,
            property_id=prop.id,
            check_in=today - timedelta(days=2),
            check_out=today + timedelta(days=1),
            checked_in_at=datetime.now(ist) - timedelta(days=2),
            total_nights=3,
            total_guests=2,
            total_amount=15000.0,
            original_total_amount=15000.0,
            status=BookingStatus.CHECKED_IN,
            booking_number=f"TEST-CHECKEDIN-{int(datetime.now().timestamp())}"
        )
        db.add(b5)
        db.commit()
        db.refresh(b5)

        BookingService.auto_evaluate_past_and_expired_bookings(db)
        db.refresh(b5)
        BookingService.enrich_booking(b5)
        print("\n[TEST 5] Checked-in Stay (In Progress):")
        print(f"  Status: {b5.status}, Display: {b5.display_status}, Checked In At: {b5.checked_in_at}")
        assert b5.status == BookingStatus.CHECKED_IN, f"Expected CHECKED_IN, got {b5.status}"
        assert b5.is_missed is False, "Checked in guest must NEVER be marked missed"
        assert b5.checkin_warning is None, "Checked in guest should have no warning"
        print("  -> PASSED: Checked in stay is active and never marked missed.")

        # Test Case 6: Traveler Checked In & Checkout Passed -> Marked COMPLETED
        b6 = Booking(
            user_id=traveler.id,
            property_id=prop.id,
            check_in=today - timedelta(days=4),
            check_out=today - timedelta(days=1),
            checked_in_at=datetime.now(ist) - timedelta(days=4),
            total_nights=3,
            total_guests=2,
            total_amount=15000.0,
            original_total_amount=15000.0,
            status=BookingStatus.CHECKED_IN,
            booking_number=f"TEST-COMPLETED-{int(datetime.now().timestamp())}"
        )
        db.add(b6)
        db.commit()
        db.refresh(b6)

        BookingService.auto_evaluate_past_and_expired_bookings(db)
        db.refresh(b6)
        BookingService.enrich_booking(b6)
        print("\n[TEST 6] Checked-in Stay with Past Checkout:")
        print(f"  Status: {b6.status}, Display: {b6.display_status}")
        assert b6.status == BookingStatus.COMPLETED, f"Expected COMPLETED, got {b6.status}"
        assert b6.display_status == "COMPLETED"
        assert b6.is_missed is False
        print("  -> PASSED: Completed stay transitioned to COMPLETED, not missed.")

        # Test Case 7: Cancelled Booking -> Stays CANCELLED
        b7 = Booking(
            user_id=traveler.id,
            property_id=prop.id,
            check_in=today - timedelta(days=4),
            check_out=today - timedelta(days=1),
            total_nights=3,
            total_guests=2,
            total_amount=15000.0,
            original_total_amount=15000.0,
            status=BookingStatus.CANCELLED,
            booking_number=f"TEST-CANCELLED-{int(datetime.now().timestamp())}"
        )
        db.add(b7)
        db.commit()
        db.refresh(b7)

        BookingService.auto_evaluate_past_and_expired_bookings(db)
        db.refresh(b7)
        BookingService.enrich_booking(b7)
        print("\n[TEST 7] Cancelled Booking:")
        print(f"  Status: {b7.status}, Display: {b7.display_status}")
        assert b7.status == BookingStatus.CANCELLED, f"Expected CANCELLED, got {b7.status}"
        assert b7.is_missed is False
        print("  -> PASSED: Cancelled booking remains CANCELLED.")

        # Test Case 8: Idempotency Check (Run evaluation 5 times in a row)
        print("\n[TEST 8] Idempotency Verification:")
        for i in range(5):
            BookingService.auto_evaluate_past_and_expired_bookings(db)
        
        db.refresh(b4)
        db.refresh(b6)
        assert b4.status == BookingStatus.NO_SHOW
        assert b4.refund_amount == 0.0
        assert b4.provider_settlement_amount == 13500.0
        assert b6.status == BookingStatus.COMPLETED
        print("  -> PASSED: Multiple evaluation cycles produced identical state with 0 side effects.")

        # Clean up test records
        test_ids = [b1.id, b2.id, b3.id, b4.id, b5.id, b6.id, b7.id]
        db.query(Booking).filter(Booking.id.in_(test_ids)).delete(synchronize_session=False)
        db.commit()
        print("\n[CLEANUP] Successfully removed temporary test booking rows.")
        print("\nALL 8 TEST SUITE ASSERTIONS PASSED SUCCESSFULLY!")

    finally:
        db.close()

if __name__ == "__main__":
    run_e2e_tests()
