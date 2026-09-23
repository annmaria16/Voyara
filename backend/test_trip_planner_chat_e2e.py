import sys
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User

client = TestClient(app)

def run_tests():
    print("=== STARTING CONVERSATIONAL TRIP PLANNER E2E TESTS ===")

    # TEST 1: Complete request in a single sentence
    print("\n--- TEST 1: Complete Request ---")
    payload1 = {
        "message": "Plan 4 days in Munnar for two adults around ₹15,000. We love nature and local food."
    }
    r1 = client.post("/api/ai/trip-planner/chat", json=payload1)
    assert r1.status_code == 200, f"Error: {r1.text}"
    data1 = r1.json()
    assert data1["trip_plan"] is not None, "Trip plan should be generated"
    assert data1["trip_context"]["destination"] == "Munnar"
    assert data1["trip_context"]["adults"] == 2
    assert data1["trip_context"]["duration_days"] == 4
    assert data1["trip_plan"]["stay"] is not None
    print(f"[PASS] Complete request generated plan: {data1['plan_status']} - {data1['reply'][:80]}...")

    # TEST 2: Minimal request (asks for duration next)
    print("\n--- TEST 2: Minimal Request ---")
    payload2 = {
        "message": "Plan a trip to Munnar."
    }
    r2 = client.post("/api/ai/trip-planner/chat", json=payload2)
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["requires_input"] is True
    assert data2["missing_field"] == "DURATION"
    print(f"[PASS] Correctly asked for duration: {data2['reply']}")

    # TEST 3: Provide duration, asks for travelers
    print("\n--- TEST 3: Multi-turn Follow-up ---")
    payload3 = {
        "message": "4 days",
        "current_context": data2["trip_context"]
    }
    r3 = client.post("/api/ai/trip-planner/chat", json=payload3)
    assert r3.status_code == 200
    data3 = r3.json()
    assert data3["requires_input"] is True
    assert data3["missing_field"] == "TRAVELERS"
    print(f"[PASS] Correctly asked for travelers: {data3['reply']}")

    # TEST 4: Budget too low (Transparent explanation, doesn't fail)
    print("\n--- TEST 4: Budget Too Low (3-Level Matching) ---")
    payload4 = {
        "message": "5 days in Munnar for 2 people under Rs 5000."
    }
    r4 = client.post("/api/ai/trip-planner/chat", json=payload4)
    assert r4.status_code == 200
    data4 = r4.json()
    assert data4["trip_plan"] is not None, "Should still return closest realistic plan"
    assert data4["plan_status"] in ["CLOSE_MATCH", "ROUGH_PLAN"]
    assert data4["budget_analysis"] is not None
    assert data4["budget_analysis"]["budget_difference"] > 0
    print(f"[PASS] Plan generated with status {data4['plan_status']} and difference INR {data4['budget_analysis']['budget_difference']}")

    # TEST 5: Contextual Modification - Add a child
    print("\n--- TEST 5: Contextual Modification (Add Child) ---")
    payload5 = {
        "message": "Actually, we're travelling with our 6-year-old son.",
        "current_context": data1["trip_context"],
        "current_plan": data1["trip_plan"]
    }
    r5 = client.post("/api/ai/trip-planner/chat", json=payload5)
    assert r5.status_code == 200
    data5 = r5.json()
    assert data5["trip_context"]["children"] == 1
    assert 6 in data5["trip_context"]["child_ages"]
    print(f"[PASS] Updated context with 1 child age 6: {data5['reply'][:80]}...")

    # TEST 6: Contextual Modification - Destination Switch
    print("\n--- TEST 6: Destination Switch ---")
    payload6 = {
        "message": "Actually change to Wayanad",
        "current_context": data5["trip_context"]
    }
    r6 = client.post("/api/ai/trip-planner/chat", json=payload6)
    assert r6.status_code == 200
    data6 = r6.json()
    assert data6["trip_context"]["destination"] == "Wayanad"
    assert data6["trip_plan"]["trip"]["destination"] == "Wayanad"
    print(f"[PASS] Successfully replanned for Wayanad: {data6['trip_plan']['trip']['destination']}")

    # TEST 7: Conversational Booking Action
    print("\n--- TEST 7: Conversational Booking Action ---")
    payload7 = {
        "message": "Book this stay",
        "current_context": data1["trip_context"],
        "current_plan": data1["trip_plan"]
    }
    r7 = client.post("/api/ai/trip-planner/chat", json=payload7)
    assert r7.status_code == 200
    data7 = r7.json()
    assert data7["action_type"] == "PROCEED_TO_BOOKING"
    assert data7["booking_payload"] is not None
    assert data7["booking_payload"]["property_name"] == data1["trip_plan"]["stay"]["property_name"]
    print(f"[PASS] Booking payload generated correctly: {data7['booking_payload']['property_name']}")

    print("\n=======================================================")
    print("ALL CONVERSATIONAL TRIP PLANNER E2E TESTS PASSED (100%)!")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
