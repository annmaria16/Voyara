import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.database import SessionLocal, get_db
from app.auth.jwt import create_access_token
from app.auth.password import hash_password
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.models.property import Property, PropertyRule, PropertyAmenity
from app.models.room import Room, RoomRule, RoomAmenity
from app.models.booking import Booking, BookingRuleSnapshot

client = TestClient(app)

@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    yield db
    db.close()

@pytest.fixture(scope="module")
def setup_test_users_and_properties(db_session):
    # Clean up previous test state for idempotency
    existing_prop_a = db_session.query(Property).filter(Property.name == "StayGuide Test Resort A").first()
    if existing_prop_a:
        db_session.query(Booking).filter(Booking.property_id == existing_prop_a.id).delete(synchronize_session=False)
        db_session.commit()

    # Create or get provider user with full verification flags
    provider = db_session.query(User).filter(User.email == "stayguide_provider@test.com").first()
    if not provider:
        provider = User(
            email="stayguide_provider@test.com",
            hashed_password=hash_password("Provider123!"),
            name="StayGuide Provider Test",
            role=UserRole.PROVIDER,
            is_active=True,
            phone_verified=True,
            email_verified=True,
        )
        db_session.add(provider)
        db_session.commit()
        db_session.refresh(provider)
    else:
        provider.phone_verified = True
        provider.email_verified = True
        db_session.commit()

    # Create or get provider profile
    provider_profile = db_session.query(ProviderProfile).filter(ProviderProfile.user_id == provider.id).first()
    if not provider_profile:
        provider_profile = ProviderProfile(
            user_id=provider.id,
            business_name="StayGuide Hospitality Ltd",
            contact_phone="9876543210",
            contact_email="stayguide_provider@test.com",
            verification_status="VERIFIED",
        )
        db_session.add(provider_profile)
        db_session.commit()
        db_session.refresh(provider_profile)

    # Create or get customer user
    customer = db_session.query(User).filter(User.email == "stayguide_customer@test.com").first()
    if not customer:
        customer = User(
            email="stayguide_customer@test.com",
            hashed_password=hash_password("Customer123!"),
            name="StayGuide Customer Test",
            role=UserRole.CUSTOMER,
            is_active=True,
            phone_verified=True,
            email_verified=True,
        )
        db_session.add(customer)
        db_session.commit()
        db_session.refresh(customer)
    else:
        customer.phone_verified = True
        customer.email_verified = True
        db_session.commit()

    # Create or get admin user
    admin = db_session.query(User).filter(User.email == "stayguide_admin@test.com").first()
    if not admin:
        admin = User(
            email="stayguide_admin@test.com",
            hashed_password=hash_password("Admin123!"),
            name="StayGuide Admin Test",
            role=UserRole.ADMIN,
            is_active=True,
        )
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)

    # Generate JWT tokens
    provider_token = create_access_token(data={"sub": str(provider.id), "role": "PROVIDER"})
    customer_token = create_access_token(data={"sub": str(customer.id), "role": "CUSTOMER"})
    admin_token = create_access_token(data={"sub": str(admin.id), "role": "ADMIN"})

    # Create Test Property A (Family Friendly Sanctuary)
    prop_a = db_session.query(Property).filter(Property.name == "StayGuide Test Resort A").first()
    if not prop_a:
        prop_a = Property(
            name="StayGuide Test Resort A",
            property_type="Resort",
            description="Luxury peaceful sanctuary for families in Munnar hills.",
            address="Cliffside Road 101",
            city="Munnar",
            state="Kerala",
            country="India",
            contact_phone="9876543210",
            contact_email="stayguide_provider@test.com",
            provider_id=provider_profile.id,
            is_active=True,
            verification_status="VERIFIED",
        )
        db_session.add(prop_a)
        db_session.commit()
        db_session.refresh(prop_a)

    # Attach Property Rules A
    prop_a_rules = db_session.query(PropertyRule).filter(PropertyRule.property_id == prop_a.id).first()
    if not prop_a_rules:
        prop_a_rules = PropertyRule(
            property_id=prop_a.id,
            children_allowed="Yes",
            minimum_child_age=3,
            cot_policy="Upon Request",
            cot_quantity=2,
            pets_policy="Yes",
            pet_fee=500.0,
            pet_policy_description="Pets must remain leashed in public gardens.",
            smoking_policy="No",
            smoking_policy_description="Strictly non-smoking indoors.",
            parties_policy="No",
            visitors_policy="Upon Request",
            quiet_hours_enabled=True,
            quiet_hours_start="22:00",
            quiet_hours_end="07:00",
            check_in_start="14:00",
            check_in_end="21:00",
            check_out_time="11:00",
            government_id_required=True,
        )
        db_session.add(prop_a_rules)
        db_session.commit()
    else:
        # Reset to initial state for test suite
        prop_a_rules.pets_policy = "Yes"
        prop_a_rules.pet_fee = 500.0
        prop_a_rules.children_allowed = "Yes"
        prop_a_rules.minimum_child_age = 3
        prop_a_rules.quiet_hours_start = "22:00"
        prop_a_rules.quiet_hours_end = "07:00"
        db_session.commit()

    # Create Room A1 (Family Room with Cot & Extra Bed)
    room_a1 = db_session.query(Room).filter(Room.property_id == prop_a.id, Room.name == "Sanctuary Family Villa").first()
    if not room_a1:
        room_a1 = Room(
            property_id=prop_a.id,
            name="Sanctuary Family Villa",
            room_type="Villa",
            description="Spacious villa with valley views and cot support.",
            base_price=5000.0,
            capacity=4,
            quantity=5,
            is_active=True,
        )
        db_session.add(room_a1)
        db_session.commit()
        db_session.refresh(room_a1)

    room_a1_rules = db_session.query(RoomRule).filter(RoomRule.room_id == room_a1.id).first()
    if not room_a1_rules:
        room_a1_rules = RoomRule(
            room_id=room_a1.id,
            maximum_total_guests=4,
            maximum_adults=3,
            maximum_children=2,
            children_allowed="Yes",
            minimum_child_age=3,
            cot_policy="Upon Request",
            cot_available="Yes",
            cot_quantity=2,
            extra_bed_policy="Upon Request",
            extra_bed_available="Yes",
            maximum_extra_beds=1,
            extra_bed_price=800.0,
            child_price=400.0,
            room_specific_rules="Balcony child lock enabled upon request.",
        )
        db_session.add(room_a1_rules)
        db_session.commit()
    else:
        room_a1_rules.maximum_total_guests = 4
        room_a1_rules.maximum_adults = 3
        room_a1_rules.maximum_children = 2
        room_a1_rules.children_allowed = "Yes"
        room_a1_rules.minimum_child_age = 3
        room_a1_rules.cot_policy = "Upon Request"
        room_a1_rules.cot_available = "Yes"
        room_a1_rules.cot_quantity = 2
        room_a1_rules.extra_bed_policy = "Upon Request"
        room_a1_rules.extra_bed_available = "Yes"
        room_a1_rules.maximum_extra_beds = 1
        room_a1_rules.extra_bed_price = 800.0
        room_a1_rules.child_price = 400.0
        db_session.commit()

    # Create Test Property B (Adults Only Honeymoon Cottage)
    prop_b = db_session.query(Property).filter(Property.name == "StayGuide Test Adults Retreat B").first()
    if not prop_b:
        prop_b = Property(
            name="StayGuide Test Adults Retreat B",
            property_type="Cottage",
            description="Tranquil couples-only getaway in Wayanad.",
            address="Forest Trail 5",
            city="Wayanad",
            state="Kerala",
            country="India",
            contact_phone="9876543211",
            contact_email="stayguide_provider@test.com",
            provider_id=provider_profile.id,
            is_active=True,
            verification_status="VERIFIED",
        )
        db_session.add(prop_b)
        db_session.commit()
        db_session.refresh(prop_b)

    prop_b_rules = db_session.query(PropertyRule).filter(PropertyRule.property_id == prop_b.id).first()
    if not prop_b_rules:
        prop_b_rules = PropertyRule(
            property_id=prop_b.id,
            children_allowed="No",
            minimum_child_age=18,
            pets_policy="No",
            smoking_policy="No",
            parties_policy="No",
            visitors_policy="No",
            quiet_hours_enabled=True,
            quiet_hours_start="21:00",
            quiet_hours_end="08:00",
            check_in_start="15:00",
            check_in_end="20:00",
            check_out_time="10:00",
            government_id_required=True,
        )
        db_session.add(prop_b_rules)
        db_session.commit()

    room_b1 = db_session.query(Room).filter(Room.property_id == prop_b.id, Room.name == "Romance Honeymoon Suite").first()
    if not room_b1:
        room_b1 = Room(
            property_id=prop_b.id,
            name="Romance Honeymoon Suite",
            room_type="Executive Suite",
            description="Luxury couple suite with private hot tub.",
            base_price=7000.0,
            capacity=2,
            quantity=3,
            is_active=True,
        )
        db_session.add(room_b1)
        db_session.commit()
        db_session.refresh(room_b1)

    room_b1_rules = db_session.query(RoomRule).filter(RoomRule.room_id == room_b1.id).first()
    if not room_b1_rules:
        room_b1_rules = RoomRule(
            room_id=room_b1.id,
            maximum_total_guests=2,
            maximum_adults=2,
            maximum_children=0,
            children_allowed="No",
            minimum_child_age=18,
            cot_policy="No",
            cot_quantity=0,
            extra_bed_policy="No",
            maximum_extra_beds=0,
            room_specific_rules="Designed exclusively for couples.",
        )
        db_session.add(room_b1_rules)
        db_session.commit()

    # Create Room A2 (Deluxe Double Room - Capacity 2, cheaper)
    room_a2 = db_session.query(Room).filter(Room.property_id == prop_a.id, Room.name == "Deluxe Double Room").first()
    if not room_a2:
        room_a2 = Room(
            property_id=prop_a.id,
            name="Deluxe Double Room",
            room_type="Deluxe Room",
            description="Cozy double bedroom with private balcony and valley view.",
            base_price=2500.0,
            capacity=2,
            quantity=4,
            is_active=True,
        )
        db_session.add(room_a2)
        db_session.commit()
        db_session.refresh(room_a2)

    room_a2_rules = db_session.query(RoomRule).filter(RoomRule.room_id == room_a2.id).first()
    if not room_a2_rules:
        room_a2_rules = RoomRule(
            room_id=room_a2.id,
            maximum_total_guests=2,
            maximum_adults=2,
            maximum_children=1,
            children_allowed="Yes",
            minimum_child_age=3,
            cot_policy="Upon Request",
            cot_quantity=1,
            extra_bed_policy="Upon Request",
            maximum_extra_beds=1,
            extra_bed_price=500.0,
            child_price=250.0,
            room_specific_rules="Standard double room rules apply.",
        )
        db_session.add(room_a2_rules)
        db_session.commit()

    # Add Property Amenities for Prop A
    for am_name in ["Free Wi-Fi", "Swimming Pool", "Free Parking", "Restaurant", "Kitchenette"]:
        am = db_session.query(PropertyAmenity).filter(PropertyAmenity.property_id == prop_a.id, PropertyAmenity.amenity_name == am_name).first()
        if not am:
            db_session.add(PropertyAmenity(property_id=prop_a.id, amenity_name=am_name))
    db_session.commit()

    # Add Room Amenities for Room A1 and A2
    for am_name in ["Balcony", "Air Conditioning", "Private Bathroom"]:
        am = db_session.query(RoomAmenity).filter(RoomAmenity.room_id == room_a1.id, RoomAmenity.amenity_name == am_name).first()
        if not am:
            db_session.add(RoomAmenity(room_id=room_a1.id, amenity_name=am_name))
        am2 = db_session.query(RoomAmenity).filter(RoomAmenity.room_id == room_a2.id, RoomAmenity.amenity_name == am_name).first()
        if not am2:
            db_session.add(RoomAmenity(room_id=room_a2.id, amenity_name=am_name))
    db_session.commit()

    return {
        "provider": provider,
        "customer": customer,
        "admin": admin,
        "provider_token": provider_token,
        "customer_token": customer_token,
        "admin_token": admin_token,
        "prop_a": prop_a,
        "room_a1": room_a1,
        "room_a2": room_a2,
        "prop_b": prop_b,
        "room_b1": room_b1,
    }


# ==============================================================================
# TEST CASE 1: Property Home Rules Creation & Fetching
# ==============================================================================
def test_tc1_property_rules_fetching(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    headers = {"Authorization": f"Bearer {ctx['provider_token']}"}
    response = client.get(f"/api/provider/properties/{ctx['prop_a'].id}/rules", headers=headers)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["property_id"] == ctx["prop_a"].id
    assert data["children_allowed"] == "Yes"
    assert data["minimum_child_age"] == 3
    assert data["pets_policy"] == "Yes"
    assert data["pet_fee"] == 500.0


# ==============================================================================
# TEST CASE 2: Property Home Rules Update
# ==============================================================================
def test_tc2_property_rules_update(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    headers = {"Authorization": f"Bearer {ctx['provider_token']}"}
    payload = {
        "pets_policy": "Yes",
        "pet_fee": 600.0,
        "pet_policy_description": "Small trained dogs only",
        "smoking_policy": "No",
        "children_allowed": "Yes",
        "minimum_child_age": 3,
        "quiet_hours_enabled": True,
        "quiet_hours_start": "22:30",
        "quiet_hours_end": "07:30",
    }
    response = client.put(f"/api/provider/properties/{ctx['prop_a'].id}/rules", json=payload, headers=headers)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["pet_fee"] == 600.0
    assert data["quiet_hours_start"] == "22:30"
    assert data["pet_policy_description"] == "Small trained dogs only"


# ==============================================================================
# TEST CASE 3: Room Occupancy Rules Fetching
# ==============================================================================
def test_tc3_room_rules_fetching(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    headers = {"Authorization": f"Bearer {ctx['provider_token']}"}
    response = client.get(f"/api/provider/rooms/{ctx['room_a1'].id}/rules", headers=headers)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["room_id"] == ctx["room_a1"].id
    assert data["maximum_adults"] == 3
    assert data["maximum_children"] == 2
    assert data["cot_quantity"] == 2


# ==============================================================================
# TEST CASE 4: Room Occupancy Rules Update
# ==============================================================================
def test_tc4_room_rules_update(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    headers = {"Authorization": f"Bearer {ctx['provider_token']}"}
    payload = {
        "maximum_adults": 3,
        "maximum_children": 2,
        "children_allowed": "Yes",
        "minimum_child_age": 3,
        "cot_policy": "Yes",
        "cot_quantity": 2,
        "extra_bed_policy": "Yes",
        "maximum_extra_beds": 1,
        "extra_bed_price": 850.0,
        "child_price": 450.0,
    }
    response = client.put(f"/api/provider/rooms/{ctx['room_a1'].id}/rules", json=payload, headers=headers)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["cot_quantity"] == 2
    assert data["extra_bed_price"] == 850.0
    assert data["child_price"] == 450.0


# ==============================================================================
# TEST CASE 5: Child Booking When Allowed Succeeded with Snapshot
# ==============================================================================
def test_tc5_child_booking_when_allowed(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    headers = {"Authorization": f"Bearer {ctx['customer_token']}"}
    booking_payload = {
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "check_in": "2026-10-10",
        "check_out": "2026-10-12",
        "total_guests": 3,
        "adults": 2,
        "children": 1,
        "child_ages": [6],
        "cot_count": 1,
        "room_quantity": 1,
        "rules_accepted": True,
    }
    response = client.post("/api/customer/bookings", json=booking_payload, headers=headers)
    assert response.status_code in [200, 201], response.text
    data = response.json()
    assert data["adults"] == 2
    assert data["children"] == 1
    assert data["child_ages"] == [6]
    assert data["cot_count"] == 1
    assert data["rule_snapshot"] is not None
    assert data["rule_snapshot"]["property_rules_snapshot"]["children_allowed"] == "Yes"
    assert data["rule_snapshot"]["property_rules_snapshot"]["minimum_child_age"] == 3


# ==============================================================================
# TEST CASE 6: Child Booking Rejected When Disallowed (Adults Only)
# ==============================================================================
def test_tc6_child_booking_rejected_when_disallowed(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    headers = {"Authorization": f"Bearer {ctx['customer_token']}"}
    booking_payload = {
        "property_id": ctx["prop_b"].id,
        "room_id": ctx["room_b1"].id,
        "check_in": "2026-10-15",
        "check_out": "2026-10-17",
        "total_guests": 2,
        "adults": 1,
        "children": 1,
        "child_ages": [4],
        "room_quantity": 1,
        "rules_accepted": True,
    }
    response = client.post("/api/customer/bookings", json=booking_payload, headers=headers)
    assert response.status_code == 400
    assert "Children are not permitted" in response.json()["detail"]


# ==============================================================================
# TEST CASE 7: Child Booking Rejected When Under Minimum Age
# ==============================================================================
def test_tc7_child_booking_rejected_when_under_min_age(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    headers = {"Authorization": f"Bearer {ctx['customer_token']}"}
    # Property A requires min_child_age = 3. Guest provides age = 1.
    booking_payload = {
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "check_in": "2026-10-20",
        "check_out": "2026-10-22",
        "total_guests": 3,
        "adults": 2,
        "children": 1,
        "child_ages": [1],
        "room_quantity": 1,
        "rules_accepted": True,
    }
    response = client.post("/api/customer/bookings", json=booking_payload, headers=headers)
    assert response.status_code == 400
    assert "cannot accommodate children under 3" in response.json()["detail"]


# ==============================================================================
# TEST CASE 8: Adult Limit Exceeded Rejection
# ==============================================================================
def test_tc8_adult_limit_exceeded(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    headers = {"Authorization": f"Bearer {ctx['customer_token']}"}
    # Room A1 max_adults = 3. Guest tries 4 adults.
    booking_payload = {
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "check_in": "2026-10-25",
        "check_out": "2026-10-27",
        "total_guests": 4,
        "adults": 4,
        "children": 0,
        "room_quantity": 1,
        "rules_accepted": True,
    }
    response = client.post("/api/customer/bookings", json=booking_payload, headers=headers)
    assert response.status_code == 400
    assert "exceeds maximum allowed adults" in response.json()["detail"]


# ==============================================================================
# TEST CASE 9: Child Limit Exceeded Rejection
# ==============================================================================
def test_tc9_child_limit_exceeded(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    headers = {"Authorization": f"Bearer {ctx['customer_token']}"}
    # Room A1 max_children = 2. Guest tries 3 children.
    booking_payload = {
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "check_in": "2026-11-01",
        "check_out": "2026-11-03",
        "total_guests": 4,
        "adults": 1,
        "children": 3,
        "child_ages": [5, 6, 7],
        "room_quantity": 1,
        "rules_accepted": True,
    }
    response = client.post("/api/customer/bookings", json=booking_payload, headers=headers)
    assert response.status_code == 400
    assert "exceeds maximum allowed children" in response.json()["detail"]


# ==============================================================================
# TEST CASE 10: Total Room Capacity Exceeded Rejection
# ==============================================================================
def test_tc10_total_capacity_exceeded(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    headers = {"Authorization": f"Bearer {ctx['customer_token']}"}
    # Room A1 total capacity = 4. Guest tries 3 adults + 2 children = 5 guests.
    booking_payload = {
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "check_in": "2026-11-05",
        "check_out": "2026-11-07",
        "total_guests": 5,
        "adults": 3,
        "children": 2,
        "child_ages": [5, 8],
        "room_quantity": 1,
        "rules_accepted": True,
    }
    response = client.post("/api/customer/bookings", json=booking_payload, headers=headers)
    assert response.status_code == 400
    assert "exceeds maximum room capacity" in response.json()["detail"]


# ==============================================================================
# TEST CASE 11: Cots Quantity Exceeded Rejection
# ==============================================================================
def test_tc11_cots_exceeded(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    headers = {"Authorization": f"Bearer {ctx['customer_token']}"}
    # Room A1 max cots = 2. Guest requests 3 cots.
    booking_payload = {
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "check_in": "2026-11-10",
        "check_out": "2026-11-12",
        "total_guests": 2,
        "adults": 2,
        "children": 0,
        "cot_count": 3,
        "room_quantity": 1,
        "rules_accepted": True,
    }
    response = client.post("/api/customer/bookings", json=booking_payload, headers=headers)
    assert response.status_code == 400
    assert "Requested cots" in response.json()["detail"]


# ==============================================================================
# TEST CASE 12: Extra Bed Exceeded Rejection
# ==============================================================================
def test_tc12_extra_bed_exceeded(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    headers = {"Authorization": f"Bearer {ctx['customer_token']}"}
    # Room A1 extra_bed_max = 1. Guest requests 2 extra beds.
    booking_payload = {
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "check_in": "2026-11-15",
        "check_out": "2026-11-17",
        "total_guests": 2,
        "adults": 2,
        "children": 0,
        "extra_bed_count": 2,
        "room_quantity": 1,
        "rules_accepted": True,
    }
    response = client.post("/api/customer/bookings", json=booking_payload, headers=headers)
    assert response.status_code == 400
    assert "Requested extra beds" in response.json()["detail"]


# ==============================================================================
# TEST CASE 13: Mandatory Rules Acceptance Validation
# ==============================================================================
def test_tc13_rules_acceptance_mandatory(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    headers = {"Authorization": f"Bearer {ctx['customer_token']}"}
    booking_payload = {
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "check_in": "2026-11-20",
        "check_out": "2026-11-22",
        "total_guests": 2,
        "adults": 2,
        "children": 0,
        "room_quantity": 1,
        "rules_accepted": False,
    }
    response = client.post("/api/customer/bookings", json=booking_payload, headers=headers)
    assert response.status_code == 400
    assert "agree to the property" in response.json()["detail"].lower() or "must accept and agree" in response.json()["detail"].lower()


# ==============================================================================
# TEST CASE 14: Booking Rule Snapshot Created & Immutable
# ==============================================================================
def test_tc14_snapshot_immutability(setup_test_users_and_properties, db_session):
    ctx = setup_test_users_and_properties
    prov_headers = {"Authorization": f"Bearer {ctx['provider_token']}"}
    # 1. Update property rules to pet_fee = 600, pets_policy = "Yes"
    client.put(
        f"/api/provider/properties/{ctx['prop_a'].id}/rules",
        json={"pet_fee": 600.0, "pets_policy": "Yes"},
        headers=prov_headers,
    )

    headers = {"Authorization": f"Bearer {ctx['customer_token']}"}
    # 2. Create a booking with current rules (pet_fee = 600)
    booking_payload = {
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "check_in": "2026-12-01",
        "check_out": "2026-12-03",
        "total_guests": 2,
        "adults": 2,
        "children": 0,
        "room_quantity": 1,
        "rules_accepted": True,
    }
    res = client.post("/api/customer/bookings", json=booking_payload, headers=headers)
    assert res.status_code in [200, 201], res.text
    booking_id = res.json()["id"]

    # 3. Mutate provider rules after booking
    client.put(
        f"/api/provider/properties/{ctx['prop_a'].id}/rules",
        json={"pet_fee": 1500.0, "pets_policy": "No"},
        headers=prov_headers,
    )

    # 4. Retrieve historical booking snapshot
    booking_res = client.get(f"/api/customer/bookings/{booking_id}", headers=headers)
    assert booking_res.status_code == 200
    snapshot = booking_res.json()["rule_snapshot"]
    # The historical snapshot must still retain the original values at booking time
    assert snapshot is not None
    assert snapshot["property_rules_snapshot"]["pets_policy"] == "Yes"
    assert snapshot["property_rules_snapshot"]["pet_fee"] == 600.0


# ==============================================================================
# TEST CASE 15: StayGuide AI Pet Query Grounding
# ==============================================================================
def test_tc15_stayguide_pet_query_grounding(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    # Ask Property B (Adults/No pets)
    payload_b = {
        "property_id": ctx["prop_b"].id,
        "question": "Can I bring my pet dog?",
    }
    res_b = client.post("/api/ai/stayguide/ask", json=payload_b)
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert "not allowed" in data_b["answer"].lower() or "not permitted" in data_b["answer"].lower() or "no" in data_b["answer"].lower()


# ==============================================================================
# TEST CASE 16: StayGuide AI Children Policy Query Grounding
# ==============================================================================
def test_tc16_stayguide_children_query_grounding(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    # Ask Property A about children
    payload_a = {
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "question": "Can I bring a 4-year-old child and is a baby cot available?",
    }
    res_a = client.post("/api/ai/stayguide/ask", json=payload_a)
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert "welcome" in data_a["answer"].lower() or "allowed" in data_a["answer"].lower() or "cot" in data_a["answer"].lower()


# ==============================================================================
# TEST CASE 17: StayGuide AI Check-in Window Grounding
# ==============================================================================
def test_tc17_stayguide_checkin_window_grounding(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    payload = {
        "property_id": ctx["prop_a"].id,
        "question": "What is the check-in and check-out time?",
    }
    res = client.post("/api/ai/stayguide/ask", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "14:00" in data["answer"] or "11:00" in data["answer"]


# ==============================================================================
# TEST CASE 18: StayGuide AI Unknown Rule Deterministic Handling
# ==============================================================================
def test_tc18_stayguide_unknown_rule_handling(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    payload = {
        "property_id": ctx["prop_a"].id,
        "question": "Can I fly a drone with a commercial camera at midnight?",
    }
    res = client.post("/api/ai/stayguide/ask", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["source"] == "fallback" or "not specified" in data["answer"].lower()


# ==============================================================================
# TEST CASE 19: Multi-Property Isolation
# ==============================================================================
def test_tc19_multi_property_isolation(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    # Query A vs Query B
    res_a = client.post("/api/ai/stayguide/ask", json={"property_id": ctx["prop_a"].id, "question": "Are children allowed?"})
    res_b = client.post("/api/ai/stayguide/ask", json={"property_id": ctx["prop_b"].id, "question": "Are children allowed?"})

    assert res_a.status_code == 200 and res_b.status_code == 200
    # Property A allows children, Property B forbids children
    assert "welcome" in res_a.json()["answer"].lower() or "allowed" in res_a.json()["answer"].lower() or "yes" in res_a.json()["answer"].lower()
    assert "adults-only" in res_b.json()["answer"].lower() or "not allowed" in res_b.json()["answer"].lower() or "not permitted" in res_b.json()["answer"].lower()


# ==============================================================================
# TEST CASE 20: Admin Consistency Warnings & VeriNova Audit
# ==============================================================================
def test_tc20_admin_consistency_and_verinova(setup_test_users_and_properties, db_session):
    ctx = setup_test_users_and_properties
    admin_headers = {"Authorization": f"Bearer {ctx['admin_token']}"}

    # Fetch Admin property details for Property A & B
    res_a = client.get(f"/api/admin/properties/{ctx['prop_a'].id}", headers=admin_headers)
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["home_rules"] is not None
    assert "rule_consistency_warnings" in data_a

    # Verify VeriNova booking verification on a completed booking
    booking = db_session.query(Booking).filter(Booking.property_id == ctx["prop_a"].id).first()
    if booking:
        vn_res = client.get(f"/api/verinova/bookings/{booking.id}/verify")
        assert vn_res.status_code == 200
        vn_data = vn_res.json()
        assert vn_data["status"] == "VERIFIED"
        assert vn_data["audit_checks"]["rule_snapshot_persisted"] is True


# ==============================================================================
# TEST CASE 21: Voyara AI Multi-Property & Room-Specific Q&A Verification
# ==============================================================================
def test_tc21_voyara_ai_multi_property_and_room_rules(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties

    # 1. Ask Property A (StayGuide Test Resort A - allows pets)
    res_a = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "question": "Are pets allowed here?"
    })
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert "welcome" in data_a["answer"].lower() or "allowed" in data_a["answer"].lower()
    assert data_a["source"] == "property_rules"

    # 2. Ask Property B (StayGuide Test Adult Resort B - forbids pets)
    res_b = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_b"].id,
        "question": "Are pets allowed here?"
    })
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert "not allowed" in data_b["answer"].lower() or "not permitted" in data_b["answer"].lower() or "strictly" in data_b["answer"].lower()
    assert data_b["source"] == "property_rules"

    # 3. Room-specific query on Property A Room 1 (has cot available)
    res_room = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "question": "Are baby cots or extra beds available in this room?"
    })
    assert res_room.status_code == 200
    data_room = res_room.json()
    assert "cot" in data_room["answer"].lower() or "available" in data_room["answer"].lower()


# ==============================================================================
# TEST CASE 22: Occupancy Math & Capacity Exceeded (Section 3 Example)
# ==============================================================================
def test_tc22_two_adults_one_child_capacity_two_occupancy_math(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    # Room A2 has capacity: 2
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a2"].id,
        "question": "Can two adults and one 3-year-old child stay in this room?",
        "adults": 2,
        "children": 1,
        "child_ages": [3]
    })
    assert res.status_code == 200
    data = res.json()
    assert "maximum capacity of 2" in data["answer"]
    assert "3 guests" in data["answer"]
    assert "sharing" in data["answer"].lower() or "choose a room with capacity" in data["answer"].lower() or "larger room" in data["answer"].lower()
    assert data["booking_allowed"] is False
    assert data["requires_stay_partner_confirmation"] is True
    assert "Maximum total guests: 2" in data["rule_references"]


# ==============================================================================
# TEST CASE 23: Occupancy Within Capacity (Capacity 4 accommodates 3 guests)
# ==============================================================================
def test_tc23_two_adults_one_child_capacity_four(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    # Room A1 has capacity: 4
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "question": "Can two adults and one 3-year-old child stay in this room?",
        "adults": 2,
        "children": 1,
        "child_ages": [3]
    })
    assert res.status_code == 200
    data = res.json()
    assert "can accommodate" in data["answer"].lower() or "yes" in data["answer"].lower()
    assert data["booking_allowed"] is True


# ==============================================================================
# TEST CASE 24: Children Disallowed (Adults Only Property)
# ==============================================================================
def test_tc24_children_disallowed_property(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_b"].id,
        "question": "Are children allowed?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "not allowed" in data["answer"].lower() or "not permitted" in data["answer"].lower()
    assert data["booking_allowed"] is False


# ==============================================================================
# TEST CASE 25: Minimum Child Age Restriction
# ==============================================================================
def test_tc25_child_under_min_age(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    # Property A minimum child age is 3. Ask about a 1-year-old.
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "question": "Can my 1-year-old child stay here?",
        "adults": 2,
        "children": 1,
        "child_ages": [1]
    })
    assert res.status_code == 200
    data = res.json()
    assert "minimum age requirement is 3" in data["answer"] or "minimum age" in data["answer"].lower()
    assert data["booking_allowed"] is False


# ==============================================================================
# TEST CASE 26: Baby Cot Query Grounding & Pricing
# ==============================================================================
def test_tc26_baby_cot_query(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "question": "Is a baby cot available and how much does it cost?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "baby cot is available" in data["answer"].lower()
    assert "complimentary" in data["answer"].lower() or "free" in data["answer"].lower() or "₹" in data["answer"]
    assert "confirmed during booking" in data["answer"].lower()
    assert data["requires_stay_partner_confirmation"] is True


# ==============================================================================
# TEST CASE 27: Extra Bed Query Grounding & Price/Capacity Rule
# ==============================================================================
def test_tc27_extra_bed_query(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "question": "Is an extra bed available and how much is it?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "extra bed" in data["answer"].lower()
    assert "850" in data["answer"] or "800" in data["answer"] or "listed price" in data["answer"].lower()
    assert "cannot be used to exceed" in data["answer"].lower() or "occupancy" in data["answer"].lower()
    assert data["requires_stay_partner_confirmation"] is True


# ==============================================================================
# TEST CASE 28: Room Types, Cheapest Room, Largest Room & Suitability
# ==============================================================================
def test_tc28_room_types_cheapest_largest(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties

    # 1. All room types
    res_all = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "question": "What room types are available?"
    })
    assert res_all.status_code == 200
    assert "Sanctuary Family Villa" in res_all.json()["answer"]

    # 2. Cheapest room
    res_cheap = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "question": "Which is the cheapest room?"
    })
    assert res_cheap.status_code == 200
    assert "2,500" in res_cheap.json()["answer"] or "2500" in res_cheap.json()["answer"] or "5,000" in res_cheap.json()["answer"]

    # 3. Largest room
    res_large = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "question": "Which room has the largest capacity?"
    })
    assert res_large.status_code == 200
    assert "4" in res_large.json()["answer"]


# ==============================================================================
# TEST CASE 29: Room Amenities Query Grounding
# ==============================================================================
def test_tc29_room_amenities(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "question": "Does this room have a balcony and air conditioning?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "balcony" in data["answer"].lower() or "amenities" in data["answer"].lower()


# ==============================================================================
# TEST CASE 30: Property Amenities Query Grounding
# ==============================================================================
def test_tc30_property_amenities(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "question": "Is there a swimming pool and free Wi-Fi at this property?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "swimming pool" in data["answer"].lower() or "wi-fi" in data["answer"].lower()


# ==============================================================================
# TEST CASE 31: Room Availability Grounding with/without Dates
# ==============================================================================
def test_tc31_room_availability_with_and_without_dates(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties

    # 1. Without dates -> Prompt traveler to supply dates
    res_no_date = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "question": "How many rooms are available?"
    })
    assert res_no_date.status_code == 200
    data_no_date = res_no_date.json()
    assert "enter your check-in and check-out dates" in data_no_date["answer"].lower()
    assert data_no_date["availability_checked"] is False

    # 2. With dates -> Must check real PostgreSQL availability
    res_dates = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "question": "How many rooms are available?",
        "check_in": "2026-10-10",
        "check_out": "2026-10-12"
    })
    assert res_dates.status_code == 200
    data_dates = res_dates.json()
    assert "available" in data_dates["answer"].lower()
    assert "5 of 5" in data_dates["answer"] or "unit" in data_dates["answer"].lower()
    assert data_dates["availability_checked"] is True


# ==============================================================================
# TEST CASE 32: Cancellation & Refund Policy
# ==============================================================================
def test_tc32_cancellation_policy(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "question": "What is the cancellation policy?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "100%" in data["answer"] or "full refund" in data["answer"].lower()
    assert "2 days" in data["answer"].lower()
    assert data["source"] == "cancellation_policy"


# ==============================================================================
# TEST CASE 33: Smoking, Parties & Events Policy
# ==============================================================================
def test_tc33_smoking_and_parties(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties

    # Smoking
    res_smoke = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "question": "Is smoking allowed?"
    })
    assert res_smoke.status_code == 200
    assert "strictly prohibited" in res_smoke.json()["answer"].lower() or "no" in res_smoke.json()["answer"].lower()

    # Parties
    res_party = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "question": "Are parties allowed?"
    })
    assert res_party.status_code == 200
    assert "not allowed" in res_party.json()["answer"].lower() or "no" in res_party.json()["answer"].lower()


# ==============================================================================
# TEST CASE 34: Quiet Hours & Government ID
# ==============================================================================
def test_tc34_quiet_hours_and_id_policy(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties

    # Quiet hours
    res_quiet = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "question": "What are the quiet hours?"
    })
    assert "quiet hours are observed between" in res_quiet.json()["answer"].lower()
    assert "22:" in res_quiet.json()["answer"] and "07:" in res_quiet.json()["answer"]

    # Government ID
    res_id = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "question": "Is government ID required at check-in?"
    })
    assert res_id.status_code == 200
    assert "government-issued photo id is required" in res_id.json()["answer"].lower()


# ==============================================================================
# TEST CASE 35: Booking Flow Guidance
# ==============================================================================
def test_tc35_booking_flow_guidance(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "question": "Can I book this room?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "reserve stay" in data["answer"].lower() or "dates" in data["answer"].lower()
    assert data["source"] == "booking_flow"
    assert data["booking_allowed"] is True


# ==============================================================================
# TEST CASE 36: No Cross-Property Leakage / Unconfigured Feature Fallback
# ==============================================================================
def test_tc36_no_hallucination_or_cross_property_leak(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    # Query Property B for swimming pool (Prop B has NO swimming pool listed)
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_b"].id,
        "question": "Is there a swimming pool?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "not available" in data["answer"].lower() or "not listed" in data["answer"].lower()


# ==============================================================================
# TEST CASE 37: Child Occupancy & Additional Child Policy - Saving & Loading
# ==============================================================================
def test_tc37_child_policy_saving_loading_property_and_room(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    headers = {"Authorization": f"Bearer {ctx['provider_token']}"}

    # 1. Update Property Rules with all 7 Child Policy Fields
    prop_payload = {
        "additional_children_allowed": 2,
        "max_child_age": 12,
        "free_additional_children": 1,
        "child_charge_enabled": True,
        "child_charge_amount": 500.0,
        "child_charge_unit": "Per night",
        "existing_bed_allowed": "Yes",
        "existing_bed_explanation": "Children may share the king bed with parents.",
        "extra_bed_available": "Yes",
        "maximum_extra_beds": 1,
        "extra_bed_price": 750.0,
        "extra_bed_charge_unit": "Per night",
        "cot_available": "Yes",
        "cot_quantity": 2,
        "cot_price": 0.0,
        "cot_charge_unit": "Free",
        "children_allowed": "Yes",
        "minimum_child_age": 0,
    }
    prop_res = client.put(f"/api/provider/properties/{ctx['prop_a'].id}/rules", json=prop_payload, headers=headers)
    assert prop_res.status_code == 200, prop_res.text
    prop_data = prop_res.json()
    assert prop_data["additional_children_allowed"] == 2
    assert prop_data["max_child_age"] == 12
    assert prop_data["free_additional_children"] == 1
    assert prop_data["child_charge_enabled"] is True
    assert prop_data["child_charge_amount"] == 500.0
    assert prop_data["child_charge_unit"] == "Per night"
    assert prop_data["existing_bed_allowed"] == "Yes"
    assert prop_data["existing_bed_explanation"] == "Children may share the king bed with parents."
    assert prop_data["extra_bed_available"] == "Yes"
    assert prop_data["cot_available"] == "Yes"
    assert prop_data["cot_quantity"] == 2
    assert prop_data["cot_charge_unit"] == "Free"

    # 2. Update Room Rules with all 7 Child Policy Fields
    room_payload = {
        "maximum_adults": 3,
        "maximum_children": 2,
        "additional_children_allowed": 2,
        "max_child_age": 10,
        "free_additional_children": 1,
        "child_charge_enabled": True,
        "child_charge_amount": 600.0,
        "child_charge_unit": "Per night",
        "existing_bed_allowed": "Yes",
        "existing_bed_explanation": "Toddler can share existing double bed",
        "extra_bed_available": "Yes",
        "maximum_extra_beds": 1,
        "extra_bed_price": 900.0,
        "extra_bed_charge_unit": "Per night",
        "cot_available": "Yes",
        "cot_quantity": 1,
        "cot_price": 200.0,
        "cot_charge_unit": "Per night",
        "children_allowed": "Yes",
    }
    room_res = client.put(f"/api/provider/rooms/{ctx['room_a1'].id}/rules", json=room_payload, headers=headers)
    assert room_res.status_code == 200, room_res.text
    room_data = room_res.json()
    assert room_data["additional_children_allowed"] == 2
    assert room_data["max_child_age"] == 10
    assert room_data["free_additional_children"] == 1
    assert room_data["child_charge_amount"] == 600.0
    assert room_data["existing_bed_allowed"] == "Yes"
    assert room_data["extra_bed_price"] == 900.0
    assert room_data["cot_price"] == 200.0


# ==============================================================================
# TEST CASE 38: Child Policy Validation - Free Children > Allowed Children
# ==============================================================================
def test_tc38_child_policy_validation_free_greater_than_allowed(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    headers = {"Authorization": f"Bearer {ctx['provider_token']}"}

    # Attempt to set free_additional_children (3) > additional_children_allowed (1)
    invalid_payload = {
        "additional_children_allowed": 1,
        "free_additional_children": 3,
    }
    res = client.put(f"/api/provider/properties/{ctx['prop_a'].id}/rules", json=invalid_payload, headers=headers)
    assert res.status_code in [400, 422], res.text
    detail = res.json().get("detail", "")
    assert "Free additional children cannot exceed" in str(detail) or "free_additional_children" in str(detail)


# ==============================================================================
# TEST CASE 39: Child Policy Validation - Negative Values
# ==============================================================================
def test_tc39_child_policy_validation_negative_values(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    headers = {"Authorization": f"Bearer {ctx['provider_token']}"}

    # Negative child charge
    neg_charge_payload = {
        "additional_children_allowed": 2,
        "child_charge_amount": -100.0,
    }
    res = client.put(f"/api/provider/properties/{ctx['prop_a'].id}/rules", json=neg_charge_payload, headers=headers)
    assert res.status_code in [400, 422], res.text

    # Negative child age
    neg_age_payload = {
        "max_child_age": -5,
    }
    res_age = client.put(f"/api/provider/properties/{ctx['prop_a'].id}/rules", json=neg_age_payload, headers=headers)
    assert res_age.status_code in [400, 422], res_age.text


# ==============================================================================
# TEST CASE 40: Voyara AI - Additional Children Allowed Grounding
# ==============================================================================
def test_tc40_voyara_ai_additional_children_allowed(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "question": "How many additional children are allowed in this room?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "2 additional child" in data["answer"].lower() or "up to 2" in data["answer"].lower()
    assert data["booking_allowed"] is True


# ==============================================================================
# TEST CASE 41: Voyara AI - Child Age Limit Grounding
# ==============================================================================
def test_tc41_voyara_ai_child_age_limit(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "question": "What is the maximum age allowed for an additional child?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "10 years" in data["answer"] or "10" in data["answer"]


# ==============================================================================
# TEST CASE 42: Voyara AI - Free Additional Children Grounding
# ==============================================================================
def test_tc42_voyara_ai_free_additional_children(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "question": "How many additional children can stay free of charge?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "1 additional child" in data["answer"].lower() or "free of charge" in data["answer"].lower()


# ==============================================================================
# TEST CASE 43: Voyara AI - Additional Child Charges Grounding
# ==============================================================================
def test_tc43_voyara_ai_additional_child_charges(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "question": "How much is the additional child charge per night?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "600" in data["answer"]
    assert "per night" in data["answer"].lower()


# ==============================================================================
# TEST CASE 44: Voyara AI - Existing Bed Policy Grounding
# ==============================================================================
def test_tc44_voyara_ai_existing_bed_policy(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "question": "Can my child share the existing adult bed?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "yes" in data["answer"].lower()
    assert "share the existing" in data["answer"].lower() or "share the bed" in data["answer"].lower() or "bed" in data["answer"].lower()


# ==============================================================================
# TEST CASE 45: Voyara AI - Extra Bed Availability and Pricing
# ==============================================================================
def test_tc45_voyara_ai_extra_bed_availability_and_price(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "question": "Is an extra bed available and what is the extra bed charge?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "yes" in data["answer"].lower()
    assert "900" in data["answer"]


# ==============================================================================
# TEST CASE 46: Voyara AI - Baby Cot Availability and Pricing
# ==============================================================================
def test_tc46_voyara_ai_baby_cot_availability_and_price(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "question": "Is a baby cot available in this room and what is the cost?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "yes" in data["answer"].lower()
    assert "200" in data["answer"]


# ==============================================================================
# TEST CASE 47: Voyara AI - Unconfigured Policy Fallback Response
# ==============================================================================
def test_tc47_voyara_ai_unconfigured_policy_fallback(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    # Query Property B (Adults only property where additional child age is unconfigured)
    res = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_b"].id,
        "question": "What is the maximum age allowed for an additional child?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "This information has not been specified by the Stay Partner" in data["answer"]
    assert data["requires_stay_partner_confirmation"] is True


# ==============================================================================
# TEST CASE 48: Voyara AI - Room-Level Override Over Property-Level Policy
# ==============================================================================
def test_tc48_voyara_ai_room_override_over_property(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    # Property A max child age is 12, Room A1 max child age is 10.
    # Query without room_id -> gives property level (12)
    res_prop = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "question": "What is the maximum age allowed for an additional child?"
    })
    assert res_prop.status_code == 200
    assert "12 years" in res_prop.json()["answer"]

    # Query with room_a1 -> gives room level override (10)
    res_room = client.post("/api/ai/voyara/ask", json={
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "question": "What is the maximum age allowed for an additional child?"
    })
    assert res_room.status_code == 200
    assert "10 years" in res_room.json()["answer"]


# ==============================================================================
# TEST CASE 49: Booking Supplement Calculation (Child Charge, Extra Bed, Cot)
# ==============================================================================
def test_tc49_booking_supplement_calculation_child_and_bed_charges(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    headers = {"Authorization": f"Bearer {ctx['customer_token']}"}

    # Room A1: Base price = ₹5000/night. 2 nights = ₹10,000 base.
    # Guests: 2 Adults + 2 Children (ages 6, 8 <= 10 yrs max).
    # Room policy: 1 free child, 1 chargeable child @ ₹600/night * 2 nights = ₹1,200 child charge.
    # Extra bed: 1 @ ₹900/night * 2 nights = ₹1,800.
    # Baby cot: 1 @ ₹200/night * 2 nights = ₹400.
    # Total supplements = 1,200 + 1,800 + 400 = ₹3,400.
    # Total booking amount = ₹10,000 + ₹3,400 = ₹13,400.
    booking_payload = {
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "check_in": "2026-12-01",
        "check_out": "2026-12-03",
        "total_guests": 4,
        "adults": 2,
        "children": 2,
        "child_ages": [6, 8],
        "cot_count": 1,
        "extra_bed_count": 1,
        "room_quantity": 1,
        "rules_accepted": True,
    }
    res = client.post("/api/customer/bookings", json=booking_payload, headers=headers)
    assert res.status_code in [200, 201], res.text
    b_data = res.json()
    assert b_data["total_amount"] == 13400.0


# ==============================================================================
# TEST CASE 50: Booking Validation - Exceeding Max Child Age
# ==============================================================================
def test_tc50_booking_validation_max_child_age_exceeded(setup_test_users_and_properties):
    ctx = setup_test_users_and_properties
    headers = {"Authorization": f"Bearer {ctx['customer_token']}"}

    # Room A1 max child age is 10. Customer tries to book child age 14.
    booking_payload = {
        "property_id": ctx["prop_a"].id,
        "room_id": ctx["room_a1"].id,
        "check_in": "2026-12-10",
        "check_out": "2026-12-12",
        "total_guests": 3,
        "adults": 2,
        "children": 1,
        "child_ages": [14],
        "room_quantity": 1,
        "rules_accepted": True,
    }
    res = client.post("/api/customer/bookings", json=booking_payload, headers=headers)
    assert res.status_code == 400, res.text
    assert "exceeds this limit" in res.json()["detail"] or "up to 10 years" in res.json()["detail"]
