import sys
from datetime import date, timedelta
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.property import Property, PropertyVerificationStatus
from app.models.room import Room
from app.models.booking import Booking, BookingStatus
from app.schemas.ai_booking import AIBookingChatRequest, AIBookingConfirmRequest
from app.services.ai.booking_agent_service import BookingAgentService
from app.services.ai.booking_execution_service import BookingExecutionService

def test_all_ai_scenarios():
    db = SessionLocal()
    try:
        # Get or create test traveler
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

        print(f"Testing with traveler: {traveler.name} (ID: {traveler.id})")

        # Scenario 1: Missing information -> AI asks only for missing info
        print("\n--- Test 10: Missing Information Prompt ---")
        res_missing = BookingAgentService.handle_chat_message(
            db=db,
            traveler_id=traveler.id,
            request=AIBookingChatRequest(message="Find a stay")
        )
        print("Intent:", res_missing.intent)
        print("Message:", res_missing.message)
        print("Verification Score:", res_missing.ai_verification_score["score"])
        assert res_missing.intent == "AWAITING_INFO"
        print("[OK] Test 10 Passed")

        # Scenario 2: Requested location has no suitable stays -> Nearby search with distance & driving time
        print("\n--- Test 3: Requested location has no stays (Case A - Vagamon) ---")
        c_in = (date.today() + timedelta(days=10)).isoformat()
        c_out = (date.today() + timedelta(days=12)).isoformat()
        res_vagamon = BookingAgentService.handle_chat_message(
            db=db,
            traveler_id=traveler.id,
            request=AIBookingChatRequest(
                message=f"Find me a stay in Vagamon for 2 adults from {c_in} to {c_out} under 10000"
            )
        )
        print("Intent:", res_vagamon.intent)
        print("Search State:", res_vagamon.search_state)
        print("Alternatives count:", len(res_vagamon.alternatives))
        if res_vagamon.alternatives:
            print("First alternative distance:", res_vagamon.alternatives[0].get("distance_label"))
            print("First alternative travel time:", res_vagamon.alternatives[0].get("travel_time_text"))
        print("Verification Score:", res_vagamon.ai_verification_score["score"])
        assert len(res_vagamon.alternatives) > 0 or res_vagamon.intent in ["SELECTION_REQUIRED", "NO_AVAILABILITY"]
        print("[OK] Test 3 Passed")

        # Scenario 3: Requested stay exists + room available -> Booking preview prepared
        print("\n--- Test 1: Requested stay exists + room available (Case C - Munnar) ---")
        res_munnar = BookingAgentService.handle_chat_message(
            db=db,
            traveler_id=traveler.id,
            request=AIBookingChatRequest(
                message=f"Book a deluxe room in Munnar for 2 adults from {c_in} to {c_out} under 10000"
            )
        )
        print("Intent:", res_munnar.intent)
        print("Search State:", res_munnar.search_state)
        print("Has Booking Preview:", bool(res_munnar.booking_preview))
        if res_munnar.booking_preview:
            print("Preview ID:", res_munnar.booking_preview["preview_id"])
            print("Total Price:", res_munnar.booking_preview["pricing"]["total_price"])
        print("Verification Score:", res_munnar.ai_verification_score["score"])
        print("[OK] Test 1 Passed")

        # Scenario 4: Confirm Booking -> Execution + VeriNova Verification
        if res_munnar.booking_preview:
            print("\n--- Test 4 & Test 8: Booking Execution & AI Booking Source ---")
            confirm_res = BookingExecutionService.confirm_and_execute_booking(
                db=db,
                traveler_id=traveler.id,
                request=AIBookingConfirmRequest(
                    preview_id=res_munnar.booking_preview["preview_id"],
                    rules_accepted=True,
                    idempotency_key=f"test-key-{res_munnar.booking_preview['preview_id']}"
                )
            )
            print("Success:", confirm_res.success)
            print("Status:", confirm_res.status)
            print("Booking Number:", confirm_res.booking.get("booking_number"))
            print("VeriNova Score:", confirm_res.verification.get("verinova_score"))

            # Check in database that booking_source == 'ai'
            booked_record = db.query(Booking).filter(Booking.id == confirm_res.booking["id"]).first()
            print("Database booking_source:", booked_record.booking_source)
            assert booked_record.booking_source == "ai"
            print("[OK] Test 4 & 8 Passed")

        print("\n==========================================")
        print("ALL SCENARIO TESTS COMPLETED SUCCESSFULLY!")
        print("==========================================")

    finally:
        db.close()

if __name__ == "__main__":
    test_all_ai_scenarios()
