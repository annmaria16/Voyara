import sys
import uuid
import hmac
import hashlib
from datetime import date, datetime, timedelta, timezone

from app.database import SessionLocal
from app.config import settings
from app.models.user import User, UserRole
from app.models.property import Property, PropertyVerificationStatus
from app.models.room import Room
from app.models.booking import Booking, BookingStatus, BookingRoom
from app.models.payment import Payment, PaymentStatus
from app.models.ai_booking import AIBookingSession, AIBookingSessionStatus, AIBookingPreview, AIBookingPreviewStatus
from app.schemas.ai_booking import (
    AIBookingChatRequest,
    AIBookingCreatePaymentOrderRequest,
    AIBookingVerifyPaymentRequest,
    AIBookingConfirmRequest
)
from app.schemas.payment import PaymentFailureRequest
from app.services.ai.booking_agent_service import BookingAgentService
from app.services.ai.booking_agent_tools import BookingAgentToolsService
from app.services.ai.booking_execution_service import BookingExecutionService
from app.services.verinova.verinova_verification_service import VeriNovaVerificationService

def run_all_verinova_tests():
    sys.stdout.reconfigure(encoding='utf-8')
    db = SessionLocal()
    try:
        traveler = db.query(User).filter(User.role == UserRole.CUSTOMER).first()
        if not traveler:
            traveler = User(
                name="VeriNova Auditor",
                email="auditor@voyara.test",
                role=UserRole.CUSTOMER,
                password_hash="hashed_pw"
            )
            db.add(traveler)
            db.commit()
            db.refresh(traveler)

        # Get an active, verified property and room
        property_obj = db.query(Property).filter(
            Property.is_active == True,
            Property.verification_status == PropertyVerificationStatus.VERIFIED.value
        ).first()
        assert property_obj is not None, "No active verified property found in DB."

        room_obj = db.query(Room).filter(
            Room.property_id == property_obj.id,
            Room.is_active == True
        ).first()
        assert room_obj is not None, "No active room found in DB."

        target_c_in = date.today() + timedelta(days=35)
        target_c_out = target_c_in + timedelta(days=2)

        print("=================================================================")
        print("  VOYARA: COMPLETE VERINOVA VERIFICATION LAYER TEST SUITE")
        print("=================================================================")
        print(f"Traveler: {traveler.name} (ID: {traveler.id})")
        print(f"Property: {property_obj.name} ({property_obj.city})")
        print(f"Room: {room_obj.name} (Capacity: {room_obj.capacity}, Rate: ₹{room_obj.base_price:,.2f})")

        passed_count = 0
        total_count = 10

        # =====================================================================
        # TEST 1: Valid Booking -> Pre-check PASS -> Razorpay -> Post-check PASS
        # =====================================================================
        print("\n[TEST 1/10] Valid Booking Lifecycle & Pre/Post Verification...")
        pre_report = VeriNovaVerificationService.verify_pre_booking(
            db=db,
            requirements={
                "destination": property_obj.city,
                "check_in": target_c_in.isoformat(),
                "check_out": target_c_out.isoformat(),
                "adults": 2,
                "children": 0,
                "room_quantity": 1
            },
            property_id=property_obj.id,
            room_id=room_obj.id,
            check_in=target_c_in,
            check_out=target_c_out,
            adults=2,
            children=0,
            room_quantity=1
        )
        assert pre_report.status == "VERIFIED", f"Expected VERIFIED, got {pre_report.status}"
        assert pre_report.verinova_score == 100, f"Expected 100, got {pre_report.verinova_score}"
        print(f"  ✓ Pre-Booking Verification Passed: {pre_report.verification_id} (Score: {pre_report.verinova_score}/100)")

        # Create Preview
        preview_dict = BookingAgentToolsService.create_booking_preview(
            db=db,
            traveler_id=traveler.id,
            property_id=property_obj.id,
            room_id=room_obj.id,
            check_in=target_c_in,
            check_out=target_c_out,
            adults=2,
            children=0,
            room_quantity=1
        )
        assert preview_dict["verinova_status"] == "VERIFIED"

        # Create Payment Order
        idemp_key_1 = f"test-idemp-1-{uuid.uuid4().hex[:8]}"
        order_resp = BookingExecutionService.create_payment_order(
            db=db,
            traveler_id=traveler.id,
            request=AIBookingCreatePaymentOrderRequest(
                preview_id=preview_dict["preview_id"],
                idempotency_key=idemp_key_1,
                rules_accepted=True
            )
        )
        assert order_resp.order_id.startswith("order_")

        # Verify Payment with authentic HMAC
        mock_payment_id = f"pay_test_{uuid.uuid4().hex[:12]}"
        msg_payload = f"{order_resp.order_id}|{mock_payment_id}"
        valid_sig = hmac.new(
            key=settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
            msg=msg_payload.encode("utf-8"),
            digestmod=hashlib.sha256
        ).hexdigest()

        confirm_res = BookingExecutionService.verify_and_confirm_payment(
            db=db,
            traveler_id=traveler.id,
            request=AIBookingVerifyPaymentRequest(
                preview_id=preview_dict["preview_id"],
                booking_id=order_resp.booking_id,
                razorpay_order_id=order_resp.order_id,
                razorpay_payment_id=mock_payment_id,
                razorpay_signature=valid_sig,
                payment_method="upi",
                idempotency_key=idemp_key_1
            )
        )
        assert confirm_res.success == True
        assert confirm_res.status == "VERIFIED"
        assert confirm_res.verification["verinova_score"] == 100
        print(f"  ✓ Post-Booking VeriNova Verification Confirmed: {confirm_res.booking['booking_number']} (Score: 100/100)")
        passed_count += 1

        # =====================================================================
        # TEST 2: Unavailable Room -> ROOM_UNAVAILABLE Blocked
        # =====================================================================
        print("\n[TEST 2/10] VeriNova Blocks Unavailable Room (Inventory Overcapacity)...")
        unavail_res = VeriNovaVerificationService.verify_availability(
            db=db,
            room_id=room_obj.id,
            check_in=target_c_in,
            check_out=target_c_out,
            room_quantity=room_obj.quantity + 5
        )
        assert unavail_res["status"] == "FAIL"
        assert unavail_res["code"] == "ROOM_UNAVAILABLE"
        print(f"  ✓ Room Unavailable correctly caught: {unavail_res['code']} - {unavail_res['message']}")
        passed_count += 1

        # =====================================================================
        # TEST 3: Room Capacity Mismatch -> ROOM_CAPACITY_MISMATCH Blocked
        # =====================================================================
        print("\n[TEST 3/10] VeriNova Blocks Room Capacity Mismatch...")
        cap_res = VeriNovaVerificationService.verify_capacity(
            room=room_obj,
            adults=room_obj.capacity + 3,
            children=1,
            room_quantity=1
        )
        assert cap_res["status"] == "FAIL"
        assert cap_res["code"] == "ROOM_CAPACITY_MISMATCH"
        print(f"  ✓ Capacity Mismatch correctly caught: {cap_res['code']} - {cap_res['message']}")
        passed_count += 1

        # =====================================================================
        # TEST 4: Price Mismatch -> PRICE_MISMATCH Blocked
        # =====================================================================
        print("\n[TEST 4/10] VeriNova Blocks Price Mismatch...")
        price_res = VeriNovaVerificationService.verify_price(
            db=db,
            property_id=property_obj.id,
            room_id=room_obj.id,
            check_in=target_c_in,
            check_out=target_c_out,
            room_quantity=1,
            ai_quoted_price=10.0  # Artificially fake low quoted price
        )
        assert price_res["status"] == "FAIL"
        assert price_res["code"] == "PRICE_MISMATCH"
        print(f"  ✓ Price Mismatch correctly caught: {price_res['code']} - Expected ₹{price_res['expected_total']}, AI quoted ₹{price_res['ai_quoted_price']}")
        passed_count += 1

        # =====================================================================
        # TEST 5: Budget Exceeded -> BUDGET_EXCEEDED Blocked
        # =====================================================================
        print("\n[TEST 5/10] VeriNova Detects Budget Exceeded...")
        budget_res = VeriNovaVerificationService.verify_budget(
            final_payable_amount=15000.0,
            budget_max=8000.0,
            budget_type="TOTAL"
        )
        assert budget_res["status"] == "FAIL"
        assert budget_res["code"] == "BUDGET_EXCEEDED"
        print(f"  ✓ Budget Exceeded correctly caught: {budget_res['code']} - Payable ₹{budget_res['payable_amount']} > Budget ₹{budget_res['budget_max']}")
        passed_count += 1

        # =====================================================================
        # TEST 6: Invalid Dates -> DATE_MISMATCH Blocked
        # =====================================================================
        print("\n[TEST 6/10] VeriNova Detects Invalid Date Sequence...")
        date_res = VeriNovaVerificationService.verify_dates(
            check_in=date(2026, 10, 15),
            check_out=date(2026, 10, 12)  # Check-out before check-in
        )
        assert date_res["status"] == "FAIL"
        assert date_res["code"] == "DATE_MISMATCH"
        print(f"  ✓ Date Mismatch correctly caught: {date_res['code']} - {date_res['message']}")
        passed_count += 1

        # =====================================================================
        # TEST 7: Payment Failed / Cancelled -> Booking Remains Pending/Failed
        # =====================================================================
        print("\n[TEST 7/10] VeriNova & Execution Handle Payment Failure Gracefully...")
        # Create preview and payment order
        fail_checkin = date.today() + timedelta(days=45)
        fail_checkout = fail_checkin + timedelta(days=2)
        prev_fail_dict = BookingAgentToolsService.create_booking_preview(
            db=db,
            traveler_id=traveler.id,
            property_id=property_obj.id,
            room_id=room_obj.id,
            check_in=fail_checkin,
            check_out=fail_checkout,
            adults=2,
            children=0,
            room_quantity=1
        )
        order_fail = BookingExecutionService.create_payment_order(
            db=db,
            traveler_id=traveler.id,
            request=AIBookingCreatePaymentOrderRequest(
                preview_id=prev_fail_dict["preview_id"],
                idempotency_key=f"fail-idemp-{uuid.uuid4().hex[:8]}",
                rules_accepted=True
            )
        )
        
        # Record Failure
        fail_rec = BookingExecutionService.record_payment_failure(
            db=db,
            traveler_id=traveler.id,
            request=PaymentFailureRequest(
                booking_id=order_fail.booking_id,
                razorpay_order_id=order_fail.order_id,
                error_code="BAD_REQUEST_ERROR",
                error_description="Card limit reached."
            )
        )
        assert fail_rec["success"] == True
        failed_b = db.query(Booking).filter(Booking.id == order_fail.booking_id).first()
        assert failed_b.status in [BookingStatus.FAILED, BookingStatus.PENDING]
        print(f"  ✓ Payment Failure recorded safely. Booking status: {failed_b.status.value}")
        passed_count += 1

        # =====================================================================
        # TEST 8: Post-Booking Verification with Discrepancy Caught
        # =====================================================================
        # Create a mock session and preview with 1 adult, but booking created with 4 adults
        mock_sess_id = f"SESS-{uuid.uuid4().hex[:8]}"
        mock_session = AIBookingSession(
            id=mock_sess_id,
            traveler_id=traveler.id,
            conversation_id=str(uuid.uuid4()),
            status=AIBookingSessionStatus.ACTIVE,
            requirements_json={}
        )
        db.add(mock_session)
        db.flush()

        disc_preview = AIBookingPreview(
            id=f"PREV-DISC-{uuid.uuid4().hex[:6]}",
            session_id=mock_sess_id,
            traveler_id=traveler.id,
            property_id=property_obj.id,
            room_id=room_obj.id,
            check_in=target_c_in,
            check_out=target_c_out,
            total_nights=2,
            room_quantity=1,
            adults=1,
            children=0,
            room_nightly_price=room_obj.base_price,
            room_total=room_obj.base_price * 2,
            total_price=room_obj.base_price * 2,
            currency="INR",
            cancellation_policy_snapshot="Non-refundable",
            status=AIBookingPreviewStatus.ACTIVE,
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=20)
        )
        db.add(disc_preview)
        db.commit()

        # Audit booking against discordant preview (Total guests expected 1, booking has 2)
        disc_report = VeriNovaVerificationService.verify_post_booking(
            db=db,
            booking_id=order_resp.booking_id,
            expected_preview=disc_preview,
            traveler_id=traveler.id
        )
        assert disc_report.status in ["MISMATCH", "FAILED"]
        assert disc_report.verinova_score < 100
        print(f"  ✓ Post-Booking Discrepancy Detected: Status={disc_report.status}, Score={disc_report.verinova_score}/100")
        passed_count += 1

        # =====================================================================
        # TEST 9: Idempotency Protection Against Duplicate Confirmation
        # =====================================================================
        print("\n[TEST 9/10] Idempotency Verification Prevents Duplicate Bookings...")
        idemp_confirm_1 = BookingExecutionService.confirm_and_execute_booking(
            db=db,
            traveler_id=traveler.id,
            request=AIBookingConfirmRequest(
                preview_id=preview_dict["preview_id"],
                idempotency_key=idemp_key_1
            )
        )
        # Re-submitting with identical idempotency key returns existing booking safely
        assert idemp_confirm_1.booking is not None
        assert idemp_confirm_1.booking["id"] == order_resp.booking_id
        print(f"  ✓ Duplicate Confirmation safely deduplicated without secondary charge or booking.")
        passed_count += 1

        # =====================================================================
        # TEST 10: Dynamic Nearby Alternatives Retrieval
        # =====================================================================
        print("\n[TEST 10/10] Dynamic Retrieval of Nearby Verified Alternatives...")
        nearby_dest_res = BookingAgentToolsService.search_intelligent_fallbacks(
            db=db,
            destination="NonExistentDestinationWithoutStays123",
            check_in=target_c_in,
            check_out=target_c_out,
            adults=2,
            children=0
        )
        assert nearby_dest_res["state"] in ["NEARBY_MATCH", "NO_MATCH", "CLOSE_MATCH"]
        print(f"  ✓ Nearby Fallback Search dynamically executed: State={nearby_dest_res['state']}, Found {len(nearby_dest_res.get('alternatives', []))} alternatives.")
        passed_count += 1

        print("\n=================================================================")
        print(f"  >>> ALL {passed_count}/{total_count} VERINOVA TESTS PASSED (100%) <<<")
        print("=================================================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_all_verinova_tests()
