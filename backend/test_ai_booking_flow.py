import sys
from datetime import date, timedelta
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.booking import Booking
from app.schemas.ai_booking import AIBookingChatRequest, AIBookingConfirmRequest
from app.services.ai.booking_agent_service import BookingAgentService
from app.services.ai.booking_execution_service import BookingExecutionService

def test_ai_booking_flow():
    """
    End-to-End Autonomous AI Booking Flow Test:
    1. Extracts destination, dates, guest count, and budget dynamically from traveler request
    2. Generates verified booking preview
    3. Confirms and executes booking with VeriNova verification and booking_source='ai'
    """
    sys.stdout.reconfigure(encoding='utf-8')
    db = SessionLocal()
    try:
        traveler = db.query(User).filter(User.role == UserRole.CUSTOMER).first()
        if not traveler:
            traveler = User(
                name="Test Traveler",
                email="traveler.test@voyara.test",
                role=UserRole.CUSTOMER,
                password_hash="hashed_pw"
            )
            db.add(traveler)
            db.commit()
            db.refresh(traveler)

        print(f"=== TEST: Full End-to-End Autonomous AI Booking Flow ===")
        print(f"Traveler: {traveler.name} (ID: {traveler.id})")

        # Step 1: User enters prompt with destination, future dates, guest count, and budget
        target_checkin = date.today() + timedelta(days=15)
        target_checkout = target_checkin + timedelta(days=3)
        c_in_str = target_checkin.strftime("%d %b %Y")
        c_out_str = target_checkout.strftime("%d %b %Y")
        
        user_prompt = f"Book a stay in Munnar from {c_in_str} to {c_out_str} for 2 adults under ₹15,000"
        print(f"\nUser Input: '{user_prompt}'")

        res1 = BookingAgentService.handle_chat_message(
            db=db,
            traveler_id=traveler.id,
            request=AIBookingChatRequest(message=user_prompt)
        )

        print("\n--- Step 1 Output ---")
        print("Intent:", res1.intent)
        print("Search State:", res1.search_state)
        print("Extracted Requirements:", res1.extracted_requirements)
        print("Score:", res1.ai_verification_score["score"])
        print("Has Preview or Alternatives:", bool(res1.booking_preview or res1.alternatives))

        assert res1.extracted_requirements.get("destination") == "Munnar"
        assert res1.extracted_requirements.get("check_in") == target_checkin.isoformat()
        assert res1.extracted_requirements.get("check_out") == target_checkout.isoformat()
        assert res1.extracted_requirements.get("adults") == 2
        assert res1.extracted_requirements.get("budget_max") == 15000.0

        # Step 2: User selects recommended stay or preview is ready
        preview_id = None
        if res1.booking_preview:
            preview_id = res1.booking_preview["preview_id"]
            print("\nPreview immediately prepared in Step 1")
        else:
            print("\nUser Input: 'Book the recommended stay'")
            res2 = BookingAgentService.handle_chat_message(
                db=db,
                traveler_id=traveler.id,
                request=AIBookingChatRequest(
                    session_id=res1.session_id,
                    conversation_id=res1.conversation_id,
                    message="Book the recommended stay"
                )
            )

            print("\n--- Step 2 Output (Booking Preview) ---")
            print("Intent:", res2.intent)
            print("Action:", res2.action)
            print("Has Booking Preview:", bool(res2.booking_preview))
            assert res2.booking_preview is not None
            assert res2.intent == "PAYMENT_CONFIRMATION_REQUIRED"
            preview_id = res2.booking_preview["preview_id"]

        # Step 3: Traveler confirms booking execution
        print("\nUser Input: Confirm Booking")
        confirm_res = BookingExecutionService.confirm_and_execute_booking(
            db=db,
            traveler_id=traveler.id,
            request=AIBookingConfirmRequest(
                preview_id=preview_id,
                rules_accepted=True,
                idempotency_key=f"idemp-test-{preview_id}"
            )
        )

        print("\n--- Step 3 Output (Booking Result & VeriNova) ---")
        print("Success:", confirm_res.success)
        print("Status:", confirm_res.status)
        print("Message:", confirm_res.message)
        print("Revalidation Error:", confirm_res.revalidation_error)
        if confirm_res.booking:
            print("Booking Number:", confirm_res.booking.get("booking_number"))
        if confirm_res.verification:
            print("VeriNova Score:", confirm_res.verification.get("verinova_score"))
            print("VeriNova Verification Status:", confirm_res.verification.get("status"))

        # Verify DB record
        booked_db = db.query(Booking).filter(Booking.id == confirm_res.booking["id"]).first()
        print("DB Record Booking ID:", booked_db.id)
        print("DB Record Booking Source:", booked_db.booking_source)
        print("DB Record Total Amount: ₹", booked_db.total_amount)

        assert confirm_res.success is True
        assert booked_db.booking_source == "ai"
        assert confirm_res.verification.get("verinova_score") >= 80

        print("\n========================================================")
        print(">>> END-TO-END AUTONOMOUS AI BOOKING TEST PASSED 100% <<<")
        print("========================================================")

    finally:
        db.close()

if __name__ == "__main__":
    test_ai_booking_flow()
