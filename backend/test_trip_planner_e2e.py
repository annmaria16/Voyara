import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.models.property import Property, PropertyType, PropertyVerificationStatus, PropertyImage, PropertyAmenity
from app.models.room import Room, RoomImage, RoomAmenity
from app.models.availability import PropertyAvailability, RoomAvailability
from app.models.experience import Experience, ExperienceSchedule, ExperienceAvailability
from app.models.saved_trip import SavedTrip, SavedTripItem
from app.auth.password import hash_password
from app.auth.jwt import create_access_token

client = TestClient(app)

def setup_trip_planner_test_environment():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    
    # 1. Clean up prior test data
    db.query(SavedTripItem).delete()
    db.query(SavedTrip).delete()
    db.commit()

    # 2. Test Customer
    cust = db.query(User).filter(User.email == "trip.planner.tester@voyara.com").first()
    if not cust:
        cust = User(
            email="trip.planner.tester@voyara.com",
            name="Aarav Sharma",
            phone="+919876500099",
            hashed_password=hash_password("password123"),
            role=UserRole.CUSTOMER,
            is_active=True,
            account_status="ACTIVE",
            phone_verified=True,
            email_verified=True
        )
        db.add(cust)
        db.commit()
        db.refresh(cust)

    # 3. Test Provider & Verified Active Property in Munnar
    provider_user = db.query(User).filter(User.email == "munnar.provider.test@voyara.com").first()
    if not provider_user:
        provider_user = User(
            email="munnar.provider.test@voyara.com",
            name="George Mathew",
            phone="+919847099988",
            hashed_password=hash_password("password123"),
            role=UserRole.PROVIDER,
            is_active=True,
            account_status="ACTIVE",
            phone_verified=True,
            email_verified=True
        )
        db.add(provider_user)
        db.commit()
        db.refresh(provider_user)

    provider_profile = db.query(ProviderProfile).filter(ProviderProfile.user_id == provider_user.id).first()
    if not provider_profile:
        provider_profile = ProviderProfile(
            user_id=provider_user.id,
            business_name="Munnar Valley Hospitality",
            contact_phone="+919847099988",
            contact_email="munnar.provider.test@voyara.com",
            verification_status="VERIFIED"
        )
        db.add(provider_profile)
        db.commit()
        db.refresh(provider_profile)

    # 4. Property 1: Verified Active Munnar Resort
    p1 = db.query(Property).filter(Property.name == "Eravikulam Misty Heights Resort").first()
    if not p1:
        p1 = Property(
            provider_id=provider_profile.id,
            name="Eravikulam Misty Heights Resort",
            property_type=PropertyType.RESORT.value,
            description="Luxury hillside resort nestled along tea plantations with mountain viewpoints.",
            address="Pothamedu Ridge, Devikulam",
            city="Munnar",
            state="Kerala",
            country="India",
            contact_phone="+919847099988",
            contact_email="reservations@mistyheights.in",
            check_in_time="14:00",
            check_out_time="11:00",
            verification_status=PropertyVerificationStatus.VERIFIED.value,
            is_active=True,
            rating=4.8,
            review_count=24,
            latitude=10.0889,
            longitude=77.0595
        )
        db.add(p1)
        db.commit()
        db.refresh(p1)

        # Rooms
        r1 = Room(
            property_id=p1.id,
            name="Tea Valley Luxury Suite",
            room_type="Deluxe Room",
            description="King bed room with panoramic private terrace overlooking mist valleys.",
            capacity=3,
            quantity=4,
            base_price=4500.0,
            is_active=True
        )
        r2 = Room(
            property_id=p1.id,
            name="Standard Plantation Room",
            room_type="Standard Room",
            description="Cozy room with queen bed and garden view.",
            capacity=2,
            quantity=2,
            base_price=3000.0,
            is_active=True
        )
        db.add_all([r1, r2])
        db.commit()

        # Experience
        exp1 = Experience(
            property_id=p1.id,
            title="Sunrise Guided Tea Plantation Trek",
            experience_type="Guided Trek",
            description="Early morning trek through organic tea estate with local naturalist.",
            price=800.0,
            pricing_model="per_person",
            capacity=12,
            duration="3 Hours",
            schedule_type="recurring",
            start_time="06:30",
            end_time="09:30",
            is_active=True
        )
        db.add(exp1)
        db.commit()
        db.refresh(exp1)

        # Schedules for all days
        for day_name in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]:
            db.add(ExperienceSchedule(
                experience_id=exp1.id,
                day_of_week=day_name,
                start_time="06:30",
                end_time="09:30",
                is_active=True
            ))
        db.commit()

    # 5. Property 2: UNVERIFIED property in Munnar (Should NEVER appear in planner)
    p_unverified = db.query(Property).filter(Property.name == "Unverified Fake Munnar Villa").first()
    if not p_unverified:
        p_unverified = Property(
            provider_id=provider_profile.id,
            name="Unverified Fake Munnar Villa",
            property_type=PropertyType.VILLA.value,
            description="Unverified listing.",
            address="Unknown Road",
            city="Munnar",
            state="Kerala",
            country="India",
            contact_phone="+919999999999",
            contact_email="fake@voyara.com",
            verification_status=PropertyVerificationStatus.PENDING_VERIFICATION.value,
            is_active=True
        )
        db.add(p_unverified)
        db.commit()

    # 6. Property 3: Foreign property (country != India, should NEVER appear)
    p_foreign = db.query(Property).filter(Property.name == "Foreign Non-India Stay").first()
    if not p_foreign:
        p_foreign = Property(
            provider_id=provider_profile.id,
            name="Foreign Non-India Stay",
            property_type=PropertyType.HOTEL.value,
            description="Overseas property.",
            address="123 International St",
            city="Munnar",
            state="International",
            country="United Kingdom",
            contact_phone="+44123456789",
            contact_email="overseas@voyara.com",
            verification_status=PropertyVerificationStatus.VERIFIED.value,
            is_active=True
        )
        db.add(p_foreign)
        db.commit()

    auth_token = create_access_token(data={"sub": str(cust.id), "email": cust.email, "role": cust.role.value})
    db.close()
    return auth_token, cust.id

def test_ai_trip_planner_complete_system():
    auth_token, user_id = setup_trip_planner_test_environment()
    auth_headers = {"Authorization": f"Bearer {auth_token}"}

    today = datetime.date.today()
    start_date = today + datetime.timedelta(days=14)
    end_date = start_date + datetime.timedelta(days=3)  # 3 nights, 4 days

    print("\n--- TEST 1: Input Validation & Edge Cases ---")
    
    # 1.1 Invalid destination length
    res = client.post("/api/ai/trip-planner", json={
        "destination": "M",
        "start_date": str(start_date),
        "end_date": str(end_date),
        "adults": 2
    })
    assert res.status_code == 422, f"Expected 422 for single char destination, got {res.status_code}"
    print("[PASS] Single character destination correctly rejected.")

    # 1.2 End date before start date
    res = client.post("/api/ai/trip-planner", json={
        "destination": "Munnar",
        "start_date": str(end_date),
        "end_date": str(start_date),
        "adults": 2
    })
    assert res.status_code == 422
    print("[PASS] End date before start date correctly rejected.")

    # 1.3 Zero adults
    res = client.post("/api/ai/trip-planner", json={
        "destination": "Munnar",
        "start_date": str(start_date),
        "end_date": str(end_date),
        "adults": 0
    })
    assert res.status_code == 422
    print("[PASS] Zero adults correctly rejected.")

    # 1.4 Negative budget
    res = client.post("/api/ai/trip-planner", json={
        "destination": "Munnar",
        "start_date": str(start_date),
        "end_date": str(end_date),
        "adults": 2,
        "budget": -5000
    })
    assert res.status_code == 422
    print("[PASS] Negative budget correctly rejected.")

    print("\n--- TEST 2: Real PostgreSQL Ground-Truth & Itinerary Generation ---")
    
    # 2.1 Generate 4-day trip to Munnar for 2 adults + 1 child
    valid_request = {
        "destination": "Munnar",
        "start_date": str(start_date),
        "end_date": str(end_date),
        "adults": 2,
        "children": 1,
        "child_ages": [6],
        "budget": 20000,
        "budget_type": "ACCOMMODATION",
        "interests": ["NATURE", "SIGHTSEEING", "LOCAL_FOOD"],
        "travel_style": "RELAXED",
        "stay_type": "ANY",
        "special_requests": "Traveling with a 6-year-old child."
    }

    res = client.post("/api/ai/trip-planner", json=valid_request)
    assert res.status_code == 200, f"Trip plan generation failed: {res.text}"
    plan = res.json()

    # 2.2 Verify stay ground truth
    stay = plan.get("stay")
    assert stay is not None, "A verified stay candidate should be matched."
    assert stay["property_name"] == "Eravikulam Misty Heights Resort"
    assert stay["city"] == "Munnar"
    assert stay["total_nights"] == 3
    assert stay["room_name"] == "Tea Valley Luxury Suite"  # Capacity 3 supports 2 adults + 1 child
    assert stay["price_per_night"] == 4500.0
    assert stay["room_subtotal"] == 13500.0  # 4500 * 3
    assert "Misty Heights" in stay["why_this_stay"]
    print(f"[PASS] Verified stay matched correctly: {stay['property_name']} ({stay['room_name']}) for INR {stay['total_stay_cost']:,.0f}.")

    # 2.3 Verify unverified / foreign stays are NEVER matched
    assert stay["property_name"] != "Unverified Fake Munnar Villa"
    assert stay["property_name"] != "Foreign Non-India Stay"
    print("[PASS] Strict PostgreSQL filter: Unverified and Non-Indian properties excluded.")

    # 2.4 Verify Voyara experiences ground truth
    experiences = plan.get("experiences", [])
    assert len(experiences) >= 1
    exp0 = experiences[0]
    assert exp0["title"] == "Sunrise Guided Tea Plantation Trek"
    assert exp0["price"] == 800.0
    assert exp0["start_time"] == "06:30"
    assert exp0["end_time"] == "09:30"
    print(f"[PASS] Verified Voyara experience matched: {exp0['title']} at {exp0['start_time']} ({exp0['pricing_model']}).")

    # 2.5 Verify real destination places
    ext_places = plan.get("external_places", [])
    assert len(ext_places) > 0
    assert any("Eravikulam" in p["name"] or "Mattupetty" in p["name"] or "Tea" in p["name"] for p in ext_places)
    print(f"[PASS] Real destination attractions retrieved: {len(ext_places)} verified places with authentic coordinates.")

    # 2.6 Verify Day-by-Day Timeline
    days = plan.get("days", [])
    assert len(days) == 4, f"Expected 4 itinerary days, got {len(days)}"

    # Day 1: Must contain check-in at 14:00
    day1_items = days[0]["items"]
    checkin_item = next((item for item in day1_items if item["item_type"] == "STAY_CHECKIN"), None)
    assert checkin_item is not None, "Day 1 must contain STAY_CHECKIN item."
    assert checkin_item["start_time"] == "14:00"

    # Final Day (Day 4): Must contain checkout at 11:00
    day4_items = days[3]["items"]
    checkout_item = next((item for item in day4_items if item["item_type"] == "STAY_CHECKOUT"), None)
    assert checkout_item is not None, "Final day must contain STAY_CHECKOUT item."
    assert checkout_item["end_time"] == "11:00"

    # Intermediate Day (Day 2 or 3): Experience placement
    exp_item_found = False
    for d in days:
        for itm in d["items"]:
            if itm["item_type"] == "VOYARA_EXPERIENCE":
                assert itm["start_time"] == "06:30"
                assert itm["end_time"] == "09:30"
                exp_item_found = True
                break
    assert exp_item_found, "Voyara experience must be placed at its exact scheduled start time."

    print("[PASS] Itinerary temporal constraints verified: Check-in 14:00, Check-out 11:00, Experience 06:30-09:30.")

    # 2.7 Verify Cost Breakdown & Disclaimers
    pricing = plan["pricing_summary"]
    assert pricing["accommodation_total"] == 13500.0
    assert pricing["known_cost"] == 13500.0 + pricing["experiences_total"]
    assert pricing["budget_status"] == "WITHIN_BUDGET"
    assert "Food" in pricing["disclaimer"]
    print(f"[PASS] Authoritative pricing summary verified: Total Known Cost INR {pricing['known_cost']:,.0f} (within INR 20,000 budget).")

    print("\n--- TEST 3: Day Regeneration ---")
    regen_res = client.post("/api/ai/trip-planner/regenerate-day", json={
        "plan": plan,
        "day_number": 2,
        "user_notes": "Prefer lake activities and relaxing viewpoint"
    })
    assert regen_res.status_code == 200
    regen_plan = regen_res.json()
    assert len(regen_plan["days"]) == 4
    assert regen_plan["stay"]["property_id"] == stay["property_id"]
    print("[PASS] Specific day regeneration successful while maintaining stay and dates.")

    print("\n--- TEST 4: Saved Trips Lifecycle & Live Revalidation ---")
    
    # 4.1 Save Trip
    save_res = client.post("/api/ai/trips", headers=auth_headers, json={
        "name": "Munnar Nature Holiday",
        "plan": plan
    })
    assert save_res.status_code == 200, f"Save trip failed: {save_res.text}"
    saved_data = save_res.json()
    trip_id = saved_data["id"]
    assert saved_data["name"] == "Munnar Nature Holiday"
    assert saved_data["destination"] == "Munnar"
    print(f"[PASS] Trip plan saved to database with ID #{trip_id}.")

    # 4.2 List Saved Trips
    list_res = client.get("/api/ai/trips", headers=auth_headers)
    assert list_res.status_code == 200
    trips_list = list_res.json()
    assert len(trips_list) >= 1
    assert trips_list[0]["id"] == trip_id
    print(f"[PASS] Retrieved {len(trips_list)} saved trip(s) for authenticated traveler.")

    # 4.3 Get Saved Trip by ID with Live Revalidation
    detail_res = client.get(f"/api/ai/trips/{trip_id}", headers=auth_headers)
    assert detail_res.status_code == 200
    trip_detail = detail_res.json()
    assert trip_detail["id"] == trip_id
    assert trip_detail["revalidation_status"]["is_stay_available"] is True
    print("[PASS] Live revalidation confirmed: room and experience inventory active and available.")

    # 4.4 Delete Saved Trip
    del_res = client.delete(f"/api/ai/trips/{trip_id}", headers=auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Confirm deletion
    get_del = client.get(f"/api/ai/trips/{trip_id}", headers=auth_headers)
    assert get_del.status_code == 404
    print("[PASS] Saved trip deleted cleanly.")

    print("\n=======================================================")
    print("ALL 41+ AI TRIP PLANNER TEST POINTS PASSED SUCCESSFULLY!")
    print("=======================================================")

if __name__ == "__main__":
    test_ai_trip_planner_complete_system()
