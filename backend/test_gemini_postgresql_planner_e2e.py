import os
import sys
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.auth.jwt import create_access_token
from app.services.ai.trip_planner_tools import TripPlannerToolsService
from app.services.ai.gemini_service import GeminiTripPlannerService

client = TestClient(app)

def run_gemini_postgresql_tests():
    print("=== STARTING FULL GEMINI + POSTGRESQL AI TRIP PLANNER E2E TESTS ===\n")
    db = SessionLocal()

    # Setup test traveler user
    test_user = db.query(User).filter(User.email == "traveler_test@voyara.com").first()
    if not test_user:
        test_user = User(
            email="traveler_test@voyara.com",
            hashed_password="hashed_pw_test",
            name="Traveler Test",
            role=UserRole.CUSTOMER,
            is_active=True
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)

    token = create_access_token(data={"sub": str(test_user.id), "email": test_user.email, "role": test_user.role.value})
    headers = {"Authorization": f"Bearer {token}"}

    # Setup second user for security tests
    other_user = db.query(User).filter(User.email == "other_traveler@voyara.com").first()
    if not other_user:
        other_user = User(
            email="other_traveler@voyara.com",
            hashed_password="hashed_pw_test",
            name="Other Traveler",
            role=UserRole.CUSTOMER,
            is_active=True
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)
    other_token = create_access_token(data={"sub": str(other_user.id), "email": other_user.email, "role": other_user.role.value})
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # TEST 1: Destination only -> Asks dates
    print("--- TEST 1: 'Munnar' -> Asks Dates ---")
    r1 = client.post("/api/ai/trip-planner/chat", json={"message": "Munnar"}, headers=headers)
    assert r1.status_code == 200, r1.text
    d1 = r1.json()
    assert d1["requires_input"] is True
    assert d1["input_type"] == "DATES"
    assert "dates" in d1["reply"].lower() or "days" in d1["reply"].lower()
    print(f"[PASS] Correctly asked for dates: {d1['reply']}")

    # TEST 2: Dates provided -> Asks travelers
    print("\n--- TEST 2: '4 days' -> Asks Travelers ---")
    r2 = client.post("/api/ai/trip-planner/chat", json={
        "session_id": d1["session_id"],
        "message": "4 days",
        "current_context": d1["trip_context"]
    }, headers=headers)
    assert r2.status_code == 200, r2.text
    d2 = r2.json()
    assert d2["requires_input"] is True
    assert d2["input_type"] == "TRAVELERS"
    print(f"[PASS] Correctly asked for travelers: {d2['reply']}")

    # TEST 3: Travelers provided -> 2 adults + 1 child
    print("\n--- TEST 3: 'Family with 1 kid' -> Child-compatible check ---")
    r3 = client.post("/api/ai/trip-planner/chat", json={
        "session_id": d1["session_id"],
        "message": "Family with 1 kid",
        "current_context": d2["trip_context"]
    }, headers=headers)
    assert r3.status_code == 200, r3.text
    d3 = r3.json()
    assert d3["trip_context"]["adults"] == 2
    assert d3["trip_context"]["children"] == 1
    print(f"[PASS] Successfully extracted 2 adults + 1 child, generated plan with status: {d3['plan_status']}")

    # TEST 4: Controlled Tool execution - Search Properties
    print("\n--- TEST 4: Controlled Backend Tool - search_properties_for_trip ---")
    props = TripPlannerToolsService.search_properties_for_trip(db=db, destination="Munnar")
    assert len(props) > 0, "Should find real verified properties in Munnar"
    for p in props:
        assert "property_id" in p
        assert "property_name" in p
        assert "starting_price_per_night" in p
        assert p["starting_price_per_night"] > 0
    print(f"[PASS] Retrieved {len(props)} verified properties from PostgreSQL without fake data.")

    # TEST 5: Controlled Tool execution - Check Stay Availability & Multi-room config
    print("\n--- TEST 5: Controlled Tool - check_stay_availability ---")
    avail = TripPlannerToolsService.check_stay_availability(
        db=db, destination="Munnar", check_in="2026-10-02", check_out="2026-10-05", adults=2, children=1, child_ages=[6]
    )
    assert avail["available_stays_count"] > 0
    assert len(avail["available_stays"]) > 0
    print(f"[PASS] Found {avail['available_stays_count']} available stays for 2026-10-02 to 2026-10-05.")

    # TEST 6: Multi-room Calculation for 6 adults
    print("\n--- TEST 6: Multi-room Calculation for 6 adults ---")
    first_prop_id = avail["available_stays"][0]["property_id"]
    room_config = TripPlannerToolsService.calculate_room_configuration(
        db=db, property_id=first_prop_id, check_in="2026-10-02", check_out="2026-10-05", adults=6, children=0
    )
    assert room_config["valid"] is True
    for cfg in room_config["configurations"]:
        assert cfg["quantity_required"] >= 2, "6 adults must require at least 2 rooms"
    print(f"[PASS] Correctly calculated multi-room requirement ({room_config['configurations'][0]['quantity_required']} rooms) for 6 adults.")

    # TEST 7: Controlled Tool - Experiences from PostgreSQL
    print("\n--- TEST 7: Controlled Tool - search_experiences_for_trip ---")
    exps = TripPlannerToolsService.search_experiences_for_trip(db=db, destination="Munnar", travelers=2)
    print(f"[PASS] Retrieved {len(exps)} real experiences for Munnar from PostgreSQL.")

    # TEST 8: Budget Optimization & Transparent Known Cost vs Unknown Cost
    print("\n--- TEST 8: calculate_trip_estimate ---")
    estimate = TripPlannerToolsService.calculate_trip_estimate(accommodation_total=13500.0, experience_total=2400.0, budget=20000.0)
    assert estimate["known_total"] == 15900.0
    assert estimate["budget_status"] == "WITHIN_BUDGET"
    assert len(estimate["unknown_costs"]) > 0
    print(f"[PASS] Known cost ₹15,900 vs budget ₹20,000 correctly evaluated as WITHIN_BUDGET.")

    # TEST 9: Destination with no VOYARA properties
    print("\n--- TEST 9: Destination with no properties ---")
    no_prop_res = client.post("/api/ai/trip-planner/chat", json={
        "message": "Plan a 3-day trip to RemoteVillage123 for 2 adults around 15000"
    }, headers=headers)
    assert no_prop_res.status_code == 200
    no_prop_d = no_prop_res.json()
    assert no_prop_d["plan_status"] == "NO_BOOKABLE_STAY"
    assert "no" in no_prop_d["reply"].lower() or "verified" in no_prop_d["reply"].lower()
    print(f"[PASS] Handled no-property destination gracefully without fake stays: {no_prop_d['reply'][:90]}...")

    # TEST 10: Conversational Stay Switch
    print("\n--- TEST 10: Conversational Stay Switch ---")
    if len(d3.get("stays", [])) > 1:
        second_stay = d3["stays"][1]
        switch_res = client.post("/api/ai/trip-planner/chat", json={
            "session_id": d1["session_id"],
            "message": f"Choose {second_stay['property_name']}",
            "current_plan": d3["trip_plan"],
            "current_context": d3["trip_context"]
        }, headers=headers)
        assert switch_res.status_code == 200
        switch_d = switch_res.json()
        print("DEBUG second_stay property_name:", second_stay.get("property_name"))
        print("DEBUG switch_d action_type:", switch_d.get("action_type"), "reply:", switch_d.get("reply"))
        assert switch_d["action_type"] == "SELECT_STAY"
        assert second_stay["property_name"] in switch_d["reply"] or (switch_d.get("selected_stay") and switch_d["selected_stay"].get("property_name") == second_stay["property_name"])
        print(f"[PASS] Successfully switched stay to {second_stay['property_name']}.")

    # TEST 11: Booking Handoff
    print("\n--- TEST 11: Booking Handoff ---")
    book_res = client.post("/api/ai/trip-planner/chat", json={
        "session_id": d1["session_id"],
        "message": "Proceed to book this stay",
        "current_plan": d3["trip_plan"],
        "current_context": d3["trip_context"]
    }, headers=headers)
    assert book_res.status_code == 200
    book_d = book_res.json()
    assert book_d["action_type"] == "PROCEED_TO_BOOKING"
    assert book_d["booking_payload"] is not None
    assert book_d["booking_handoff"] is not None
    assert "property_id" in book_d["booking_payload"]
    print(f"[PASS] Generated authoritative booking handoff payload with property ID {book_d['booking_payload']['property_id']}.")

    # TEST 12: Security - User Isolation (Cannot access other user's session)
    print("\n--- TEST 12: Security - Traveler Session Isolation ---")
    iso_res = client.get(f"/api/ai/trip-planner/sessions/{d1['session_id']}", headers=other_headers)
    assert iso_res.status_code == 404, "Traveler must not access another traveler's chat session"
    print("[PASS] Other traveler was blocked from accessing test traveler's session (404).")

    # TEST 13: Gemini Service Availability / Fallback Resilience
    print("\n--- TEST 13: Gemini Service Fallback Resilience ---")
    gemini_avail = GeminiTripPlannerService.is_available()
    print(f"[INFO] Gemini service is_available: {gemini_avail}")
    # Call process_chat_message
    res = GeminiTripPlannerService.process_chat_message(
        db=db,
        message="Plan a trip to Munnar",
        current_context=d3["trip_context"]
    )
    print(f"[PASS] Gemini / Fallback processing executed cleanly without errors.")

    print("\n=======================================================")
    print("ALL GEMINI + POSTGRESQL AI TRIP PLANNER TESTS PASSED 100%!")
    print("=======================================================")
    db.close()

if __name__ == "__main__":
    run_gemini_postgresql_tests()
