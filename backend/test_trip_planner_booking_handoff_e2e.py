import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.models.property import Property, PropertyType, PropertyVerificationStatus, PropertyImage, PropertyRule
from app.models.room import Room, RoomRule
from app.models.availability import PropertyAvailability, RoomAvailability
from app.models.experience import Experience, ExperienceSchedule, ExperienceAvailability
from app.models.saved_trip import SavedTrip, SavedTripItem
from app.models.booking import Booking, BookingStatus, BookingRoom, BookingExperience
from app.auth.password import hash_password
from app.auth.jwt import create_access_token
from app.schemas.trip_planner import TripPlannerRequest, SelectStayRequest, TripBookingHandoffRequest
from app.services.ai.trip_planner import TripPlannerService
from app.services.bookings.booking_service import BookingService
from app.schemas.booking import BookingCreate

client = TestClient(app)

def setup_handoff_test_data():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    # 1. Clean up prior test data
    db.query(SavedTripItem).delete()
    db.query(SavedTrip).delete()
    db.commit()

    # 2. Test Customer
    cust = db.query(User).filter((User.email == "handoff.traveler@voyara.com") | (User.phone == "+919999888771")).first()
    if not cust:
        cust = User(
            email="handoff.traveler@voyara.com",
            name="Priya Nair",
            phone="+919999888771",
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

    # 3. Provider
    prov_user = db.query(User).filter((User.email == "handoff.provider@voyara.com") | (User.phone == "+919999888772")).first()
    if not prov_user:
        prov_user = User(
            email="handoff.provider@voyara.com",
            name="Rahul Varma",
            phone="+919999888772",
            hashed_password=hash_password("password123"),
            role=UserRole.PROVIDER,
            is_active=True,
            account_status="ACTIVE",
            phone_verified=True,
            email_verified=True
        )
        db.add(prov_user)
        db.commit()
        db.refresh(prov_user)

    prov_prof = db.query(ProviderProfile).filter(ProviderProfile.user_id == prov_user.id).first()
    if not prov_prof:
        prov_prof = ProviderProfile(
            user_id=prov_user.id,
            business_name="Highland Sanctuaries Hospitality",
            contact_phone="+919847012345",
            contact_email="handoff.provider@voyara.com",
            verification_status="VERIFIED"
        )
        db.add(prov_prof)
        db.commit()
        db.refresh(prov_prof)

    # 4. Property A: Munnar Pine & Peak Retreat (Verified) - with 1 room, NO experiences
    prop_a = db.query(Property).filter(Property.name == "Munnar Pine & Peak Retreat").first()
    if not prop_a:
        prop_a = Property(
            provider_id=prov_prof.id,
            name="Munnar Pine & Peak Retreat",
            property_type=PropertyType.RESORT.value,
            description="Serene pine forest retreat in Munnar highlands.",
            address="Cliff View Road, Munnar",
            city="Munnar",
            state="Kerala",
            country="India",
            contact_phone="+919847012345",
            contact_email="pineandpeak@voyara.com",
            check_in_time="14:00",
            check_out_time="11:00",
            verification_status=PropertyVerificationStatus.VERIFIED.value,
            is_active=True,
            rating=4.9,
            review_count=35,
            latitude=10.0889,
            longitude=77.0595
        )
        db.add(prop_a)
        db.commit()
        db.refresh(prop_a)
    else:
        prop_a.verification_status = PropertyVerificationStatus.VERIFIED.value
        prop_a.is_active = True
        prop_a.city = "Munnar"
        db.commit()

    room_a = db.query(Room).filter(Room.property_id == prop_a.id).first()
    if not room_a:
        room_a = Room(
            property_id=prop_a.id,
            name="Pine Luxury Suite",
            room_type="Luxury Suite",
            description="Spacious mountain facing luxury suite.",
            capacity=3,
            quantity=5,
            base_price=5000.0,
            is_active=True
        )
        db.add(room_a)
        db.commit()
        db.refresh(room_a)
    else:
        room_a.base_price = 5000.0
        room_a.capacity = 3
        room_a.quantity = 5
        room_a.is_active = True
        db.commit()

    rule_a = db.query(RoomRule).filter(RoomRule.room_id == room_a.id).first()
    if rule_a:
        rule_a.maximum_total_guests = 3
        rule_a.maximum_adults = 3
        db.commit()

    # 5. Property B: Misty Valley Retreat (Verified) - with Room AND Experience
    prop_b = db.query(Property).filter(Property.name == "Misty Valley Retreat").first()
    if not prop_b:
        prop_b = Property(
            provider_id=prov_prof.id,
            name="Misty Valley Retreat",
            property_type=PropertyType.RESORT.value,
            description="Tea estate mountain resort.",
            address="Chithirapuram, Munnar",
            city="Munnar",
            state="Kerala",
            country="India",
            contact_phone="+919847098765",
            contact_email="mistyvalley@voyara.com",
            check_in_time="14:00",
            check_out_time="11:00",
            verification_status=PropertyVerificationStatus.VERIFIED.value,
            is_active=True,
            rating=4.8,
            review_count=28,
            latitude=10.0750,
            longitude=77.0420
        )
        db.add(prop_b)
        db.commit()
        db.refresh(prop_b)
    else:
        prop_b.verification_status = PropertyVerificationStatus.VERIFIED.value
        prop_b.is_active = True
        prop_b.city = "Munnar"
        db.commit()

    room_b = db.query(Room).filter(Room.property_id == prop_b.id).first()
    if not room_b:
        room_b = Room(
            property_id=prop_b.id,
            name="Valley View Cottage",
            room_type="Cottage",
            description="Cottage overlooking misty hills.",
            capacity=2,
            quantity=4,
            base_price=4000.0,
            is_active=True
        )
        db.add(room_b)
        db.commit()
        db.refresh(room_b)
    else:
        room_b.base_price = 4000.0
        room_b.capacity = 2
        room_b.quantity = 4
        room_b.is_active = True
        db.commit()

    exp_b = db.query(Experience).filter(Experience.property_id == prop_b.id).first()
    if not exp_b:
        exp_b = Experience(
            property_id=prop_b.id,
            title="Tea Plantation Walking Tour",
            experience_type="Guided Trek",
            description="Private tea trail walk with resident botanist.",
            price=600.0,
            pricing_model="per_person",
            capacity=10,
            duration="2 Hours",
            schedule_type="recurring",
            start_time="07:00",
            end_time="09:00",
            is_active=True
        )
        db.add(exp_b)
        db.commit()
        db.refresh(exp_b)

        for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]:
            db.add(ExperienceSchedule(
                experience_id=exp_b.id,
                day_of_week=day,
                start_time="07:00",
                end_time="09:00",
                is_active=True
            ))
        db.commit()
    else:
        exp_b.price = 600.0
        exp_b.pricing_model = "per_person"
        exp_b.capacity = 10
        exp_b.is_active = True
        exp_b.schedule_type = "recurring"
        db.commit()
        sched_count = db.query(ExperienceSchedule).filter(ExperienceSchedule.experience_id == exp_b.id).count()
        if sched_count == 0:
            for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]:
                db.add(ExperienceSchedule(
                    experience_id=exp_b.id,
                    day_of_week=day,
                    start_time="07:00",
                    end_time="09:00",
                    is_active=True
                ))
            db.commit()

    token = create_access_token(data={"sub": str(cust.id), "email": cust.email, "role": cust.role.value})
    user_id = cust.id
    prop_a_id = prop_a.id
    room_a_id = room_a.id
    prop_b_id = prop_b.id
    room_b_id = room_b.id
    exp_b_id = exp_b.id
    db.close()
    return token, user_id, prop_a_id, room_a_id, prop_b_id, room_b_id, exp_b_id

def test_trip_planner_booking_handoff_suite():
    token, user_id, prop_a_id, room_a_id, prop_b_id, room_b_id, exp_b_id = setup_handoff_test_data()
    auth_headers = {"Authorization": f"Bearer {token}"}
    db = SessionLocal()

    today = datetime.date.today()
    check_in = today + datetime.timedelta(days=20)
    check_out = check_in + datetime.timedelta(days=2) # 2 nights, 3 days

    # -------------------------------------------------------------
    # TEST 1: Trip Planner Stay Without Experience
    # When Munnar Pine & Peak Retreat (Prop A) is selected, which has no experiences,
    # plan.experiences must be empty, and handoff must succeed without experience.
    # -------------------------------------------------------------
    print("\n--- TEST 1: Trip Planner Stay Without Experience ---")
    plan_req = TripPlannerRequest(
        destination="Munnar",
        start_date=check_in,
        end_date=check_out,
        adults=2,
        children=0,
        budget=None
    )
    plan = TripPlannerService.generate_trip_plan(
        db=db,
        request=plan_req,
        preferred_property_id=prop_a_id,
        preferred_room_id=room_a_id
    )
    assert plan.stay is not None
    assert plan.stay.property_id == prop_a_id
    # Ensure no cross-property experience attached!
    assert len(plan.experiences) == 0, f"Expected 0 experiences for Prop A, got {len(plan.experiences)}"

    # Perform Booking Handoff
    handoff_req = TripBookingHandoffRequest(
        property_id=plan.stay.property_id,
        room_id=plan.stay.room_id,
        check_in=check_in,
        check_out=check_out,
        adults=2,
        children=0,
        room_quantity=1
    )
    handoff_res = TripPlannerService.create_booking_handoff(db=db, request=handoff_req, user_id=user_id)
    assert handoff_res.property_id == prop_a_id
    assert handoff_res.room_id == room_a_id
    assert handoff_res.room_quantity == 1
    assert handoff_res.experience_id is None
    assert handoff_res.room_subtotal == 5000.0 * 2 * 1 # 10,000
    assert handoff_res.total_amount == 10000.0
    print("[PASS] Test 1: Trip Planner stay without experience created valid booking handoff context.")

    # -------------------------------------------------------------
    # TEST 2: Trip Planner Stay With Valid Experience
    # Select Misty Valley Retreat (Prop B), which has Exp B (Tea Plantation Walking Tour).
    # Handoff must preserve and validate the experience.
    # -------------------------------------------------------------
    print("\n--- TEST 2: Trip Planner Stay With Valid Experience ---")
    plan_b = TripPlannerService.generate_trip_plan(
        db=db,
        request=plan_req,
        preferred_property_id=prop_b_id,
        preferred_room_id=room_b_id
    )
    assert plan_b.stay is not None
    assert plan_b.stay.property_id == prop_b_id
    assert len(plan_b.experiences) > 0
    assert plan_b.experiences[0].property_id == prop_b_id
    assert plan_b.experiences[0].experience_id == exp_b_id

    handoff_b_req = TripBookingHandoffRequest(
        property_id=prop_b_id,
        room_id=room_b_id,
        check_in=check_in,
        check_out=check_out,
        adults=2,
        children=0,
        room_quantity=1,
        experience_id=exp_b_id,
        experience_date=check_in + datetime.timedelta(days=1),
        experience_participants=2
    )
    handoff_b_res = TripPlannerService.create_booking_handoff(db=db, request=handoff_b_req, user_id=user_id)
    assert handoff_b_res.property_id == prop_b_id
    assert handoff_b_res.experience_id == exp_b_id
    assert handoff_b_res.experience_price == 600.0
    assert handoff_b_res.experience_subtotal == 1200.0 # 600 * 2
    assert handoff_b_res.room_subtotal == 4000.0 * 2 * 1 # 8,000
    assert handoff_b_res.total_amount == 9200.0
    print("[PASS] Test 2: Trip Planner stay with valid experience returned verified handoff.")

    # -------------------------------------------------------------
    # TEST 3: Experience Belongs To Another Property
    # Attempt to handoff Prop A (Pine & Peak) with Exp B (which belongs to Misty Valley).
    # Backend must reject this with HTTP 400.
    # -------------------------------------------------------------
    print("\n--- TEST 3: Experience Belongs To Another Property ---")
    mismatched_handoff_req = TripBookingHandoffRequest(
        property_id=prop_a_id, # Property A
        room_id=room_a_id,
        check_in=check_in,
        check_out=check_out,
        adults=2,
        children=0,
        experience_id=exp_b_id # Belongs to Property B!
    )
    with pytest.raises(Exception) as exc_info:
        TripPlannerService.create_booking_handoff(db=db, request=mismatched_handoff_req, user_id=user_id)
    assert "Selected experience does not exist or does not belong to this property" in str(exc_info.value.detail)
    print("[PASS] Test 3: Backend strictly rejected mismatched property/experience combination.")

    # -------------------------------------------------------------
    # TEST 4: Experience Deleted / Inactive After Trip Plan Creation
    # If experience is deactivated, handoff must reject with clean message.
    # -------------------------------------------------------------
    print("\n--- TEST 4: Experience Deactivated After Trip Plan Creation ---")
    exp_record = db.query(Experience).filter(Experience.id == exp_b_id).first()
    exp_record.is_active = False
    db.commit()

    with pytest.raises(Exception) as exc_info:
        TripPlannerService.create_booking_handoff(db=db, request=handoff_b_req, user_id=user_id)
    assert "no longer active or available" in str(exc_info.value.detail)
    print("[PASS] Test 4: Inactive experience rejected with clear refresh message.")

    # Restore experience active state
    exp_record.is_active = True
    db.commit()

    # -------------------------------------------------------------
    # TEST 5: Experience Exceeds Capacity
    # If participants requested > capacity, handoff must reject.
    # -------------------------------------------------------------
    print("\n--- TEST 5: Experience Capacity Exceeded ---")
    over_capacity_exp_req = TripBookingHandoffRequest(
        property_id=prop_b_id,
        room_id=room_b_id,
        check_in=check_in,
        check_out=check_out,
        adults=2,
        children=0,
        experience_id=exp_b_id,
        experience_participants=50 # Capacity is 10
    )
    with pytest.raises(Exception) as exc_info:
        TripPlannerService.create_booking_handoff(db=db, request=over_capacity_exp_req, user_id=user_id)
    assert "capacity" in str(exc_info.value.detail).lower()
    print("[PASS] Test 5: Experience capacity overflow correctly blocked.")

    # -------------------------------------------------------------
    # TEST 6: Room Becomes Unavailable
    # Block room on RoomAvailability, handoff must reject.
    # -------------------------------------------------------------
    print("\n--- TEST 6: Room Becomes Blocked / Unavailable ---")
    block = RoomAvailability(
        room_id=room_b_id,
        start_date=check_in,
        end_date=check_out,
        is_blocked=True,
        reason="Renovation"
    )
    db.add(block)
    db.commit()

    with pytest.raises(Exception) as exc_info:
        TripPlannerService.create_booking_handoff(db=db, request=handoff_b_req, user_id=user_id)
    assert "blocked" in str(exc_info.value.detail).lower()
    print("[PASS] Test 6: Blocked room unit correctly detected and prevented from checkout.")

    # Remove block
    db.delete(block)
    db.commit()

    # -------------------------------------------------------------
    # TEST 7: Price Changes
    # Update room price in DB, handoff must compute authoritative live price.
    # -------------------------------------------------------------
    print("\n--- TEST 7: Price Changes Recalculated Authoritatively ---")
    room_b_record = db.query(Room).filter(Room.id == room_b_id).first()
    original_price = room_b_record.base_price
    room_b_record.base_price = 4500.0 # Changed from 4000 to 4500
    db.commit()

    recal_handoff = TripPlannerService.create_booking_handoff(db=db, request=handoff_b_req, user_id=user_id)
    assert recal_handoff.room_price == 4500.0
    assert recal_handoff.room_subtotal == 4500.0 * 2 * 1 # 9000
    assert recal_handoff.total_amount == 9000.0 + 1200.0 # 10,200
    print(f"[PASS] Test 7: Live price change updated from INR 8000 to INR {recal_handoff.room_subtotal:,.0f}.")

    # Restore price
    room_b_record.base_price = original_price
    db.commit()

    # -------------------------------------------------------------
    # TEST 8: Multiple Rooms Calculation
    # 6 adults traveling, room capacity = 3 -> room_quantity = 2.
    # -------------------------------------------------------------
    print("\n--- TEST 8: Multiple Rooms Capacity Calculation ---")
    multi_room_req = TripBookingHandoffRequest(
        property_id=prop_a_id,
        room_id=room_a_id, # Capacity = 3
        check_in=check_in,
        check_out=check_out,
        adults=6, # 6 adults / capacity 3 = 2 rooms
        children=0
    )
    multi_handoff = TripPlannerService.create_booking_handoff(db=db, request=multi_room_req, user_id=user_id)
    assert multi_handoff.room_quantity == 2, f"Expected 2 rooms for 6 adults in capacity-3 room, got {multi_handoff.room_quantity}"
    assert multi_handoff.room_subtotal == 5000.0 * 2 * 2 # 20,000
    assert multi_handoff.total_amount == 20000.0
    print("[PASS] Test 8: Room quantity calculated as 2 for 6 adults (Capacity 3).")

    # -------------------------------------------------------------
    # TEST 9: Saved Trip Reopening & Revalidation
    # -------------------------------------------------------------
    print("\n--- TEST 9: Saved Trip Reopening & Revalidation ---")
    from app.schemas.trip_planner import SaveTripRequest
    saved_trip_req = SaveTripRequest(
        name="Munnar Test Trip",
        plan=plan_b
    )
    saved_trip_res = TripPlannerService.save_trip(db=db, user_id=user_id, req=saved_trip_req)
    assert saved_trip_res.id is not None

    reval_res = TripPlannerService.revalidate_saved_trip(db=db, trip_id=saved_trip_res.id, user_id=user_id)
    assert reval_res.is_stay_available is True
    assert reval_res.is_experience_available is True
    print("[PASS] Test 9: Saved trip revalidated with live database integrity.")

    # -------------------------------------------------------------
    # TEST 10: Normal Booking via BookingService unaffected
    # -------------------------------------------------------------
    print("\n--- TEST 10: Normal Booking via BookingService ---")
    normal_booking_data = BookingCreate(
        property_id=prop_a_id,
        room_id=room_a_id,
        check_in=check_in,
        check_out=check_out,
        total_guests=2,
        adults=2,
        children=0,
        room_quantity=1,
        rules_accepted=True
    )
    created_booking = BookingService.create_booking(db=db, user_id=user_id, data=normal_booking_data)
    assert created_booking.id is not None
    assert created_booking.property_id == prop_a_id
    assert created_booking.room_total == 10000.0
    assert created_booking.status.value in ["CONFIRMED", "VERIFIED", "PENDING"]
    print(f"[PASS] Test 10: Normal Explore Stays booking created booking #{created_booking.booking_number} smoothly.")

    # Clean up test booking
    db.delete(created_booking)
    db.commit()
    db.close()
    print("\n=== ALL 10 TEST SUITE CASES COMPLETED WITH 100% SUCCESS ===")

if __name__ == "__main__":
    test_trip_planner_booking_handoff_suite()
