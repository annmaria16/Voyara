import sys
import hmac
import hashlib
import time
from datetime import date, timedelta
from app.database import SessionLocal
from app.config import settings
from app.models.user import User, UserRole
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment, PaymentStatus
from app.schemas.ai_booking import (
    AIBookingChatRequest,
    AIBookingCreatePaymentOrderRequest,
    AIBookingVerifyPaymentRequest
)
from app.schemas.payment import PaymentFailureRequest
from app.services.ai.booking_agent_service import BookingAgentService
from app.services.ai.booking_execution_service import BookingExecutionService

def test_ai_booking_razorpay_flow():
    sys.stdout.reconfigure(encoding='utf-8')
    db = SessionLocal()
    try:
        traveler = db.query(User).filter(User.role == UserRole.CUSTOMER).first()
        if not traveler:
            traveler = User(
                name="Test Traveler",
                email="traveler.payment@voyara.test",
                role=UserRole.CUSTOMER,
                password_hash="hashed_pw"
            )
            db.add(traveler)
            db.commit()
            db.refresh(traveler)

        print(f"=== TEST: AI Booking with Razorpay Payment Flow ===")
        print(f"Traveler: {traveler.name} (ID: {traveler.id})")

        target_checkin = date.today() + timedelta(days=20)
        target_checkout = target_checkin + timedelta(days=2)
        c_in_str = target_checkin.strftime("%d %b %Y")
        c_out_str = target_checkout.strftime("%d %b %Y")

        # Step 1: Search and generate booking preview
        user_prompt = f"Book a stay in Munnar from {c_in_str} to {c_out_str} for 2 adults under ₹20,000"
        print(f"\n1. Submitting traveler AI booking search: '{user_prompt}'")

        chat_res = BookingAgentService.handle_chat_message(
            db=db,
            traveler_id=traveler.id,
            request=AIBookingChatRequest(message=user_prompt)
        )

        preview = chat_res.booking_preview
        if not preview and chat_res.alternatives:
            # Pick first alternative
            alt = chat_res.alternatives[0]
            chat_res = BookingAgentService.handle_chat_message(
                db=db,
                traveler_id=traveler.id,
                request=AIBookingChatRequest(
                    session_id=chat_res.session_id,
                    conversation_id=chat_res.conversation_id,
                    message=f"Book option 1: {alt['property_name']} ({alt['room_name']})"
                )
            )
            preview = chat_res.booking_preview

        assert preview is not None, "Booking preview was not generated"
        preview_id = preview["preview_id"]
        payable_amount = preview.get("total_price") or preview.get("pricing", {}).get("total_price")
        print(f"   ✓ Booking Preview generated (ID: {preview_id}, Amount: ₹{payable_amount})")

        # CASE 1: Successful Payment Flow
        print("\n--- CASE 1: Testing Successful Razorpay Payment Flow ---")
        idempotency_key = f"idemp-pay-{preview_id}-success"

        # 1.1 Create Payment Order
        order_res = BookingExecutionService.create_payment_order(
            db=db,
            traveler_id=traveler.id,
            request=AIBookingCreatePaymentOrderRequest(
                preview_id=preview_id,
                idempotency_key=idempotency_key,
                rules_accepted=True
            )
        )

        print(f"   ✓ Razorpay Order Created: {order_res.order_id}")
        print(f"   ✓ Amount in Rupees: ₹{order_res.amount}, Paise: {order_res.amount_paise}")
        print(f"   ✓ Key ID provided: {order_res.key_id}")
        print(f"   ✓ Pending Booking ID: {order_res.booking_id} (Number: {order_res.booking_number})")

        assert order_res.order_id.startswith("order_"), "Invalid Razorpay order_id format"
        assert order_res.amount == payable_amount, f"Amount mismatch: {order_res.amount} vs {payable_amount}"
        assert order_res.amount_paise == int(round(payable_amount * 100))

        # Check DB pending booking
        pending_booking = db.query(Booking).filter(Booking.id == order_res.booking_id).first()
        assert pending_booking.status == BookingStatus.PENDING, "Booking should be PENDING before payment"
        
        pending_payment = db.query(Payment).filter(Payment.razorpay_order_id == order_res.order_id).first()
        assert pending_payment.status == PaymentStatus.CREATED, "Payment should be CREATED before payment"

        # 1.2 Simulate standard Razorpay payment success & generate valid HMAC-SHA256 signature
        fake_payment_id = f"pay_test_{int(time.time())}"
        msg_payload = f"{order_res.order_id}|{fake_payment_id}"
        valid_signature = hmac.new(
            key=settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
            msg=msg_payload.encode("utf-8"),
            digestmod=hashlib.sha256
        ).hexdigest()

        # 1.3 Verify Payment on Backend
        verify_res = BookingExecutionService.verify_and_confirm_payment(
            db=db,
            traveler_id=traveler.id,
            request=AIBookingVerifyPaymentRequest(
                preview_id=preview_id,
                booking_id=order_res.booking_id,
                razorpay_order_id=order_res.order_id,
                razorpay_payment_id=fake_payment_id,
                razorpay_signature=valid_signature,
                payment_method="upi",
                idempotency_key=idempotency_key
            )
        )

        print(f"   ✓ Payment Verification Status: {verify_res.status}")
        print(f"   ✓ VeriNova Score: {verify_res.verification['verinova_score']}/100")
        print(f"   ✓ Booking Status in Response: {verify_res.booking['status']}")

        assert verify_res.success is True, "Payment verification should succeed"
        assert verify_res.status == "VERIFIED", f"Expected VERIFIED, got {verify_res.status}"
        assert verify_res.booking["status"] == "CONFIRMED", "Booking must be CONFIRMED after payment"

        # Check database records
        db.refresh(pending_booking)
        db.refresh(pending_payment)
        assert pending_booking.status == BookingStatus.CONFIRMED, "DB Booking must be CONFIRMED"
        assert pending_payment.status == PaymentStatus.PAID, "DB Payment must be PAID"
        assert pending_payment.razorpay_payment_id == fake_payment_id
        assert pending_payment.razorpay_signature == valid_signature

        # CASE 2: Invalid Signature Attack / Failure
        print("\n--- CASE 2: Testing Invalid Signature Verification ---")
        bad_preview_prompt = f"Book a stay in Munnar from {c_in_str} to {c_out_str} for 2 adults under ₹20,000"
        chat_res2 = BookingAgentService.handle_chat_message(
            db=db,
            traveler_id=traveler.id,
            request=AIBookingChatRequest(message=bad_preview_prompt)
        )
        prev2_id = chat_res2.booking_preview["preview_id"]

        order_res2 = BookingExecutionService.create_payment_order(
            db=db,
            traveler_id=traveler.id,
            request=AIBookingCreatePaymentOrderRequest(
                preview_id=prev2_id,
                rules_accepted=True
            )
        )

        invalid_signature = "bad_forged_signature_hex_1234567890"
        tampered_caught = False
        try:
            BookingExecutionService.verify_and_confirm_payment(
                db=db,
                traveler_id=traveler.id,
                request=AIBookingVerifyPaymentRequest(
                    preview_id=prev2_id,
                    booking_id=order_res2.booking_id,
                    razorpay_order_id=order_res2.order_id,
                    razorpay_payment_id="pay_tampered_123",
                    razorpay_signature=invalid_signature,
                    payment_method="card"
                )
            )
        except Exception as sig_err:
            tampered_caught = True
            print(f"   ✓ Forged signature successfully rejected with error: {sig_err.detail if hasattr(sig_err, 'detail') else str(sig_err)}")

        assert tampered_caught is True, "Invalid signature must be rejected"
        booking2 = db.query(Booking).filter(Booking.id == order_res2.booking_id).first()
        payment2 = db.query(Payment).filter(Payment.razorpay_order_id == order_res2.order_id).first()
        assert booking2.status != BookingStatus.CONFIRMED, "Tampered booking must NOT be confirmed"
        assert payment2.status == PaymentStatus.FAILED, "Tampered payment must be marked FAILED"

        # CASE 3: Cancelled Payment Flow
        print("\n--- CASE 3: Testing User Dismissed / Cancelled Checkout ---")
        order_res3 = BookingExecutionService.create_payment_order(
            db=db,
            traveler_id=traveler.id,
            request=AIBookingCreatePaymentOrderRequest(
                preview_id=prev2_id,
                rules_accepted=True
            )
        )

        fail_res = BookingExecutionService.record_payment_failure(
            db=db,
            traveler_id=traveler.id,
            request=PaymentFailureRequest(
                booking_id=order_res3.booking_id,
                razorpay_order_id=order_res3.order_id,
                error_code="PAYMENT_CANCELLED_BY_USER",
                error_description="User dismissed Razorpay checkout window."
            )
        )

        print(f"   ✓ Cancellation recorded: {fail_res}")
        booking3 = db.query(Booking).filter(Booking.id == order_res3.booking_id).first()
        payment3 = db.query(Payment).filter(Payment.razorpay_order_id == order_res3.order_id).first()
        assert booking3.status != BookingStatus.CONFIRMED, "Cancelled booking must NOT be confirmed"
        assert payment3.status == PaymentStatus.FAILED, "Cancelled payment must be FAILED"

        print("\n=======================================================")
        print(">>> ALL RAZORPAY PAYMENT FLOW TEST CASES PASSED 100% <<<")
        print("=======================================================")

    finally:
        db.close()

if __name__ == "__main__":
    import time
    test_ai_booking_razorpay_flow()
