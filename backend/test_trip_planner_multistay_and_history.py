import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.models.property import Property, PropertyType, PropertyVerificationStatus
from app.models.room import Room
from app.auth.password import hash_password
from app.auth.jwt import create_access_token

client = TestClient(app)

def run_tests():
    print("=== STARTING MULTI-STAY COMPARISON & CHAT HISTORY E2E TESTS ===")
    
    # 1. Setup Auth
    db: Session = SessionLocal()
    user = db.query(User).filter(User.email == "traveler.history@voyara.com").first()
    if not user:
        user = User(
            email="traveler.history@voyara.com",
            name="Maya Nair",
            phone="+919876543210",
            hashed_password=hash_password("password123"),
            role=UserRole.CUSTOMER,
            is_active=True,
            account_status="ACTIVE",
            phone_verified=True,
            email_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role.value})
    auth_headers = {"Authorization": f"Bearer {token}"}
    db.close()

    today = datetime.date.today()
    start_date = today + datetime.timedelta(days=10)
    end_date = start_date + datetime.timedelta(days=3)

    # TEST 1: Generate Plan with Multiple Available Stays in Munnar
    print("\n--- TEST 1: Multiple Verified Stays in Destination ---")
    req_payload = {
        "destination": "Munnar",
        "start_date": str(start_date),
        "end_date": str(end_date),
        "adults": 2,
        "children": 1,
        "child_ages": [6],
        "budget": 25000,
        "travel_style": "RELAXED"
    }
    r1 = client.post("/api/ai/trip-planner", json=req_payload)
    assert r1.status_code == 200, f"Error: {r1.text}"
    data1 = r1.json()
    assert data1["stay"] is not None, "A stay must be selected"
    assert "available_stays" in data1, "available_stays must be in response"
    assert len(data1["available_stays"]) >= 1, "Must contain available stays"
    print(f"[PASS] Retrieved {len(data1['available_stays'])} available stay(s) in Munnar.")
    
    # Check that each stay has room options
    first_opt = data1["available_stays"][0]
    assert len(first_opt["available_rooms"]) >= 1
    print(f"[PASS] Property '{first_opt['property_name']}' has {len(first_opt['available_rooms'])} room option(s).")
    
    # Check destination info
    assert data1.get("destination_info") is not None
    assert data1["destination_info"]["name"] == "Munnar"
    assert len(data1["destination_info"]["hero_image"]) > 0
    print(f"[PASS] Destination visual metadata returned: {data1['destination_info']['tagline']}")

    # TEST 2: Select a Specific Stay & Room via Endpoint
    print("\n--- TEST 2: Select Specific Stay & Room ---")
    select_payload = {
        "current_plan": data1,
        "property_id": first_opt["property_id"],
        "room_id": first_opt["available_rooms"][0]["room_id"]
    }
    r2 = client.post("/api/ai/trip-planner/select-stay", json=select_payload)
    assert r2.status_code == 200, f"Select stay error: {r2.text}"
    data2 = r2.json()
    assert data2["stay"]["property_id"] == first_opt["property_id"]
    assert data2["stay"]["room_id"] == first_opt["available_rooms"][0]["room_id"]
    print(f"[PASS] Successfully selected stay: {data2['stay']['property_name']} ({data2['stay']['room_name']}).")

    # TEST 3: Persistent Chat Sessions (ChatGPT-like History)
    print("\n--- TEST 3: Chat Session Lifecycle & Message Persistence ---")
    
    # 3.1 Send initial chat message with user auth to auto-create session
    chat_payload = {
        "message": "Plan a 4-day trip to Munnar for 2 adults and 1 kid around ₹20,000"
    }
    r_chat = client.post("/api/ai/trip-planner/chat", headers=auth_headers, json=chat_payload)
    assert r_chat.status_code == 200, f"Chat error: {r_chat.text}"
    chat_res = r_chat.json()
    session_id = chat_res.get("session_id")
    assert session_id is not None, "session_id must be returned"
    print(f"[PASS] Chat message created persistent session ID: {session_id}")

    # 3.2 List user's sessions
    r_sessions = client.get("/api/ai/trip-planner/sessions", headers=auth_headers)
    assert r_sessions.status_code == 200
    sessions_list = r_sessions.json()
    assert len(sessions_list) >= 1
    assert any(s["id"] == session_id for s in sessions_list)
    print(f"[PASS] Found {len(sessions_list)} session(s) in traveler's history.")

    # 3.3 Send follow-up message within the same session
    followup_payload = {
        "session_id": session_id,
        "message": "Make Day 2 more relaxed",
        "current_context": chat_res["trip_context"],
        "current_plan": chat_res["trip_plan"]
    }
    r_followup = client.post("/api/ai/trip-planner/chat", headers=auth_headers, json=followup_payload)
    assert r_followup.status_code == 200
    print(f"[PASS] Multi-turn session message processed: {r_followup.json()['reply'][:60]}...")

    # 3.4 Retrieve full session details with messages history
    r_detail = client.get(f"/api/ai/trip-planner/sessions/{session_id}", headers=auth_headers)
    assert r_detail.status_code == 200
    session_detail = r_detail.json()
    assert session_detail["id"] == session_id
    assert len(session_detail["messages"]) >= 4, f"Expected at least 4 messages (2 user, 2 assistant), got {len(session_detail['messages'])}"
    print(f"[PASS] Retrieved complete chat history with {len(session_detail['messages'])} messages and plan snapshot.")

    # 3.5 Delete session
    r_del = client.delete(f"/api/ai/trip-planner/sessions/{session_id}", headers=auth_headers)
    assert r_del.status_code == 200
    print("[PASS] Chat session deleted cleanly.")

    print("\n=======================================================")
    print("ALL MULTI-STAY & CHAT HISTORY TESTS PASSED (100%)!")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
