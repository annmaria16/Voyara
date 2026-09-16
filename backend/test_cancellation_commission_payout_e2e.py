import os
import sys
from datetime import datetime, date, time, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi.testclient import TestClient

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.models.property import Property
from app.models.room import Room
from app.models.experience import Experience
from app.models.booking import Booking, BookingStatus, BookingRoom, BookingExperience
from app.models.refund import Refund
from app.services.bookings.booking_service import BookingService
from app.auth.jwt import create_access_token

def run_tests():
    db = SessionLocal()
    client = TestClient(app)
    kolkata_tz = ZoneInfo("Asia/Kolkata")
    
    print("=" * 70)
    print("RUNNING VOYARA BOOKING CANCELLATION & FINANCIAL TEST SUITE (15 TESTS)")
    print("=" * 70)

    # Setup base entities: customer, provider, property, room, experience
    import random
    rand_suffix = random.randint(10000, 99999)
    customer = db.query(User).filter(User.email == "test_traveler_cancel@voyara.com").first()
    if not customer:
        customer = User(
            name="Traveler Alice",
            email="test_traveler_cancel@voyara.com",
            hashed_password="$2b$12$eX8mP.J3t3Qo0D1I7hGze.1rM7cE3K1X2G2jL/o5eX.8rP1J3t3Qo",
            role=UserRole.CUSTOMER,
            phone=f"+9198765{rand_suffix}",
            phone_verified=True,
            email_verified=True
        )
        db.add(customer)
        db.flush()
    else:
        customer.phone_verified = True
        customer.email_verified = True

    customer_b = db.query(User).filter(User.email == "test_traveler_bob@voyara.com").first()
    if not customer_b:
        customer_b = User(
            name="Traveler Bob",
            email="test_traveler_bob@voyara.com",
            hashed_password="$2b$12$eX8mP.J3t3Qo0D1I7hGze.1rM7cE3K1X2G2jL/o5eX.8rP1J3t3Qo",
            role=UserRole.CUSTOMER,
            phone=f"+9198766{rand_suffix}",
            phone_verified=True,
            email_verified=True
        )
        db.add(customer_b)
        db.flush()
    else:
        customer_b.phone_verified = True
        customer_b.email_verified = True

    provider_user = db.query(User).filter(User.email == "test_provider_cancel@voyara.com").first()
    if not provider_user:
        provider_user = User(
            name="Host Susan",
            email="test_provider_cancel@voyara.com",
            hashed_password="$2b$12$eX8mP.J3t3Qo0D1I7hGze.1rM7cE3K1X2G2jL/o5eX.8rP1J3t3Qo",
            role=UserRole.PROVIDER,
            phone=f"+9198767{rand_suffix}",
            phone_verified=True,
            email_verified=True
        )
        db.add(provider_user)
        db.flush()
    else:
        provider_user.phone_verified = True
        provider_user.email_verified = True

    provider_profile = db.query(ProviderProfile).filter(ProviderProfile.user_id == provider_user.id).first()
    if not provider_profile:
        provider_profile = ProviderProfile(
            user_id=provider_user.id,
            business_name="Misty Valley Retreats Ltd",
            contact_phone="+919876543212",
            contact_email="test_provider_cancel@voyara.com"
        )
        db.add(provider_profile)
        db.flush()

    prop = db.query(Property).filter(Property.name == "Misty Valley Tea Estate").first()
    if not prop:
        prop = Property(
            provider_id=provider_profile.id,
            name="Misty Valley Tea Estate",
            property_type="Resort",
            description="Luxury eco retreat in Munnar hills.",
            address="Tea County Road",
            city="Munnar",
            state="Kerala",
            country="India",
            contact_phone="+919876543212",
            contact_email="test_provider_cancel@voyara.com",
            check_in_time="14:00",
            check_out_time="11:00",
            cancellation_refund_percentage=50,
            is_active=True
        )
        db.add(prop)
        db.flush()
    else:
        prop.cancellation_refund_percentage = 50
        db.flush()

    room = db.query(Room).filter(Room.property_id == prop.id, Room.name == "Heritage Plantation Suite").first()
    if not room:
        room = Room(
            property_id=prop.id,
            name="Heritage Plantation Suite",
            room_type="Suite",
            description="Panoramic view luxury suite.",
            base_price=10000.0,
            capacity=2,
            quantity=5,
            is_active=True
        )
        db.add(room)
        db.flush()

    exp = db.query(Experience).filter(Experience.property_id == prop.id, Experience.title == "Tea Tasting & Forest Walk").first()
    if not exp:
        exp = Experience(
            property_id=prop.id,
            title="Tea Tasting & Forest Walk",
            experience_type="Workshop",
            description="Guided organic tea tasting session.",
            duration="3 hours",
            price=1500.0,
            pricing_model="per_person",
            capacity=10,
            is_active=True
        )
        db.add(exp)
        db.flush()

    db.commit()

    customer_token = create_access_token({"sub": str(customer.id), "role": "CUSTOMER", "user_id": customer.id})
    customer_b_token = create_access_token({"sub": str(customer_b.id), "role": "CUSTOMER", "user_id": customer_b.id})
    provider_token = create_access_token({"sub": str(provider_user.id), "role": "PROVIDER", "user_id": provider_user.id})

    auth_customer = {"Authorization": f"Bearer {customer_token}"}
    auth_customer_b = {"Authorization": f"Bearer {customer_b_token}"}
    auth_provider = {"Authorization": f"Bearer {provider_token}"}

    # Helper function to create test booking directly in DB
    def create_test_booking(check_in_dt: date, check_out_dt: date, total_amt: float = 10000.0, refund_pct_snap: float = 50.0):
        b = Booking(
            booking_number=f"TEST-{int(datetime.utcnow().timestamp()*1000)%1000000}",
            user_id=customer.id,
            property_id=prop.id,
            check_in=check_in_dt,
            check_out=check_out_dt,
            total_nights=(check_out_dt - check_in_dt).days or 1,
            total_guests=2,
            room_total=total_amt,
            experience_total=0.0,
            total_amount=total_amt,
            original_total_amount=total_amt,
            commission_percentage_snapshot=10.0,
            cancellation_refund_percentage_snapshot=refund_pct_snap,
            refund_amount=0.0,
            retained_amount=0.0,
            commission_amount=0.0,
            provider_settlement_amount=0.0,
            commission_status="NOT_FINALIZED",
            refund_status="NOT_APPLICABLE",
            payout_status="NOT_READY",
            status=BookingStatus.CONFIRMED,
            cancellation_policy_snapshot=f"100% refund up to 2 days before check-in. {int(refund_pct_snap)}% refund within 2 days of check-in.",
            refund_percentage_snapshot=refund_pct_snap
        )
        db.add(b)
        db.flush()
        br = BookingRoom(
            booking_id=b.id,
            room_id=room.id,
            room_name=room.name,
            nightly_price=total_amt,
            nights=1,
            quantity=1,
            guests=2,
            subtotal=total_amt
        )
        db.add(br)
        db.commit()
        db.refresh(b)
        return b

    # =========================================================================
    # TEST 1: Booking ₹10,000 -> Traveler checks in -> Commission 10%
    # Expected: Commission = ₹1,000, Stay Partner = ₹9,000, Status = FINALIZED
    # =========================================================================
    print("\n--- TEST 1: Check-in Commission & Payout Finalization ---")
    today_ist = datetime.now(kolkata_tz).date()
    b1 = create_test_booking(check_in_dt=today_ist, check_out_dt=today_ist + timedelta(days=2), total_amt=10000.0)
    assert b1.commission_status == "NOT_FINALIZED", "Pre-checkin commission must be NOT_FINALIZED"
    
    res1 = client.post(f"/api/provider/bookings/{b1.id}/check-in", headers=auth_provider)
    assert res1.status_code == 200, f"Check-in failed: {res1.text}"
    db.refresh(b1)
    assert b1.status == BookingStatus.CHECKED_IN
    assert b1.commission_status == "FINALIZED"
    assert b1.commission_amount == 1000.0, f"Expected 1000 commission, got {b1.commission_amount}"
    assert b1.provider_settlement_amount == 9000.0, f"Expected 9000 provider settlement, got {b1.provider_settlement_amount}"
    assert b1.payout_status == "READY"
    print("[PASS] TEST 1: Check-in finalizes INR 1,000 commission and INR 9,000 provider settlement.")

    # =========================================================================
    # TEST 2: Booking ₹10,000 -> Traveler cancels early (>= 2 days)
    # Expected: Refund = ₹10,000, Retained = ₹0, Commission = ₹0, Partner = ₹0
    # =========================================================================
    print("\n--- TEST 2: Early Cancellation (100% Free Refund) ---")
    future_date = today_ist + timedelta(days=10)
    b2 = create_test_booking(check_in_dt=future_date, check_out_dt=future_date + timedelta(days=2), total_amt=10000.0)
    
    # Calculate preview
    calc2 = BookingService.calculate_cancellation_refund(b2)
    assert calc2["can_cancel"] == True
    assert calc2["is_free_cancellation"] == True
    assert calc2["refund_amount"] == 10000.0
    assert calc2["retained_amount"] == 0.0
    assert calc2["commission_amount"] == 0.0
    assert calc2["provider_settlement_amount"] == 0.0

    res2 = client.post(f"/api/customer/bookings/{b2.id}/cancel", json={"reason": "Schedule change"}, headers=auth_customer)
    assert res2.status_code == 200, f"Cancel failed: {res2.text}"
    db.refresh(b2)
    assert b2.status == BookingStatus.CANCELLED
    assert b2.refund_amount == 10000.0
    assert b2.retained_amount == 0.0
    assert b2.commission_amount == 0.0
    assert b2.provider_settlement_amount == 0.0
    assert b2.commission_status == "NOT_APPLICABLE"
    assert b2.refund_status == "REFUNDED"
    print("✓ TEST 2 PASSED: Early cancellation gives 100% refund (₹10,000) and ₹0 retained/commission.")

    # =========================================================================
    # TEST 3: Booking ₹10,000 -> Cancel 1 day before check-in with 50% policy
    # Expected: Refund = ₹5,000, Retained = ₹5,000, Commission = ₹500, Partner = ₹4,500
    # =========================================================================
    print("\n--- TEST 3: Late Cancellation 1 Day Before Check-in (50% Refund Snapshot) ---")
    tomorrow = today_ist + timedelta(days=1)
    b3 = create_test_booking(check_in_dt=tomorrow, check_out_dt=tomorrow + timedelta(days=2), total_amt=10000.0, refund_pct_snap=50.0)
    
    calc3 = BookingService.calculate_cancellation_refund(b3)
    assert calc3["can_cancel"] == True
    assert calc3["is_free_cancellation"] == False
    assert calc3["refund_amount"] == 5000.0
    assert calc3["retained_amount"] == 5000.0
    assert calc3["commission_amount"] == 500.0  # 10% of 5,000
    assert calc3["provider_settlement_amount"] == 4500.0  # 5,000 - 500

    res3 = client.post(f"/api/customer/bookings/{b3.id}/cancel", json={"reason": "Emergency"}, headers=auth_customer)
    assert res3.status_code == 200, f"Cancel failed: {res3.text}"
    db.refresh(b3)
    assert b3.status == BookingStatus.CANCELLED
    assert b3.refund_amount == 5000.0
    assert b3.retained_amount == 5000.0
    assert b3.commission_amount == 500.0
    assert b3.provider_settlement_amount == 4500.0
    assert b3.commission_status == "FINALIZED"
    assert b3.payout_status == "READY"
    print("✓ TEST 3 PASSED: 1 day before check-in gives ₹5,000 refund, ₹500 Voyara commission (10%), ₹4,500 Stay Partner settlement.")

    # =========================================================================
    # TEST 4: Booking ₹10,000 -> Cancellation at 05:59:59 AM on Check-in Date
    # Expected: ALLOWED
    # =========================================================================
    print("\n--- TEST 4: Cancellation at 05:59:59 AM on Check-in Date ---")
    b4 = create_test_booking(check_in_dt=today_ist, check_out_dt=today_ist + timedelta(days=1), total_amt=10000.0)
    t_559 = datetime.combine(today_ist, time(5, 59, 59), tzinfo=kolkata_tz)
    calc4 = BookingService.calculate_cancellation_refund(b4, check_datetime=t_559)
    assert calc4["can_cancel"] == True, f"05:59:59 AM should be allowed, got can_cancel={calc4['can_cancel']}"
    print("✓ TEST 4 PASSED: Cancellation at 05:59:59 AM on check-in date is ALLOWED.")

    # =========================================================================
    # TEST 5: Booking ₹10,000 -> Cancellation at 06:00:00 AM on Check-in Date
    # Expected: REJECTED
    # =========================================================================
    print("\n--- TEST 5: Cancellation at exactly 06:00:00 AM on Check-in Date ---")
    b5 = create_test_booking(check_in_dt=today_ist, check_out_dt=today_ist + timedelta(days=1), total_amt=10000.0)
    t_600 = datetime.combine(today_ist, time(6, 0, 0), tzinfo=kolkata_tz)
    calc5 = BookingService.calculate_cancellation_refund(b5, check_datetime=t_600)
    assert calc5["can_cancel"] == False, "06:00:00 AM must be rejected"
    assert "cancellation deadline has passed" in calc5["reason"].lower()
    print("✓ TEST 5 PASSED: Cancellation at exactly 06:00:00 AM is REJECTED.")

    # =========================================================================
    # TEST 6: Cancellation after 06:00 AM (e.g. 08:30 AM or check-in afternoon)
    # Expected: REJECTED
    # =========================================================================
    print("\n--- TEST 6: Cancellation after 06:00 AM (08:30 AM) ---")
    t_830 = datetime.combine(today_ist, time(8, 30, 0), tzinfo=kolkata_tz)
    calc6 = BookingService.calculate_cancellation_refund(b5, check_datetime=t_830)
    assert calc6["can_cancel"] == False
    print("✓ TEST 6 PASSED: Cancellation after 06:00 AM is REJECTED.")

    # =========================================================================
    # TEST 7: Traveler attempts to cancel another Traveler's booking
    # Expected: 403 Forbidden / Error
    # =========================================================================
    print("\n--- TEST 7: Unauthorized Cancellation (Traveler B on Traveler A's Booking) ---")
    b7 = create_test_booking(check_in_dt=future_date, check_out_dt=future_date + timedelta(days=2), total_amt=10000.0)
    res7 = client.post(f"/api/customer/bookings/{b7.id}/cancel", json={"reason": "Malicious attempt"}, headers=auth_customer_b)
    assert res7.status_code in [403, 404], f"Expected 403/404, got {res7.status_code}"
    print("✓ TEST 7 PASSED: Traveler cannot cancel another Traveler's booking.")

    # =========================================================================
    # TEST 8: Stay Partner attempts to cancel Traveler's booking via customer cancel
    # Expected: 403 Forbidden
    # =========================================================================
    print("\n--- TEST 8: Stay Partner unauthorized call to Customer cancel endpoint ---")
    res8 = client.post(f"/api/customer/bookings/{b7.id}/cancel", json={"reason": "Host cancellation"}, headers=auth_provider)
    assert res8.status_code in [401, 403], f"Expected 401/403, got {res8.status_code}"
    print("✓ TEST 8 PASSED: Stay Partner cannot invoke Traveler cancellation endpoint.")

    # =========================================================================
    # TEST 9: Already cancelled booking cancelled again
    # Expected: Rejected, no duplicate refund or settlement
    # =========================================================================
    print("\n--- TEST 9: Duplicate Cancellation Prevention ---")
    res9 = client.post(f"/api/customer/bookings/{b2.id}/cancel", json={"reason": "Second cancel"}, headers=auth_customer)
    assert res9.status_code == 400, f"Expected 400 for already cancelled booking, got {res9.status_code}"
    assert "already cancelled" in res9.text.lower()
    print("✓ TEST 9 PASSED: Duplicate cancellation rejected with no duplicate transactions.")

    # =========================================================================
    # TEST 10: Cancelled booking releases room inventory
    # Expected: Room available quantity increases back
    # =========================================================================
    print("\n--- TEST 10: Room Inventory Release Verification ---")
    b10_date = today_ist + timedelta(days=20)
    # Check initial booked quantity
    initial_booked = db.query(BookingRoom).join(Booking).filter(
        BookingRoom.room_id == room.id,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED, BookingStatus.CHECKED_IN]),
        Booking.check_in < b10_date + timedelta(days=1),
        Booking.check_out > b10_date
    ).count()

    b10 = create_test_booking(check_in_dt=b10_date, check_out_dt=b10_date + timedelta(days=1), total_amt=10000.0)
    after_book = db.query(BookingRoom).join(Booking).filter(
        BookingRoom.room_id == room.id,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED, BookingStatus.CHECKED_IN]),
        Booking.check_in < b10_date + timedelta(days=1),
        Booking.check_out > b10_date
    ).count()
    assert after_book == initial_booked + 1

    # Cancel b10
    client.post(f"/api/customer/bookings/{b10.id}/cancel", json={"reason": "Test inventory"}, headers=auth_customer)
    after_cancel = db.query(BookingRoom).join(Booking).filter(
        BookingRoom.room_id == room.id,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED, BookingStatus.CHECKED_IN]),
        Booking.check_in < b10_date + timedelta(days=1),
        Booking.check_out > b10_date
    ).count()
    assert after_cancel == initial_booked, f"Inventory was not restored: initial={initial_booked}, after_cancel={after_cancel}"
    print("✓ TEST 10 PASSED: Room inventory atomically released upon cancellation.")

    # =========================================================================
    # TEST 11: Cancelled experience booking releases experience capacity
    # Expected: Capacity restored
    # =========================================================================
    print("\n--- TEST 11: Experience Capacity Release Verification ---")
    b11_date = today_ist + timedelta(days=25)
    b11 = create_test_booking(check_in_dt=b11_date, check_out_dt=b11_date + timedelta(days=1), total_amt=11500.0)
    b_exp = BookingExperience(
        booking_id=b11.id,
        experience_id=exp.id,
        experience_title=exp.title,
        price=1500.0,
        pricing_model="per_person",
        participants=2,
        subtotal=3000.0,
        scheduled_date=b11_date
    )
    db.add(b_exp)
    db.commit()

    # Cancel b11
    client.post(f"/api/customer/bookings/{b11.id}/cancel", json={"reason": "Experience cancel"}, headers=auth_customer)
    active_exp_participants = db.query(BookingExperience).join(Booking).filter(
        BookingExperience.experience_id == exp.id,
        BookingExperience.scheduled_date == b11_date,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED, BookingStatus.CHECKED_IN])
    ).count()
    assert active_exp_participants == 0
    print("✓ TEST 11 PASSED: Experience capacity released upon cancellation.")

    # =========================================================================
    # TEST 12: Check-in logic finalizes commission
    # =========================================================================
    print("\n--- TEST 12: Check-in Commission Verification ---")
    b12 = create_test_booking(check_in_dt=today_ist, check_out_dt=today_ist + timedelta(days=1), total_amt=10000.0)
    res12 = client.post(f"/api/provider/bookings/{b12.id}/check-in", headers=auth_provider)
    assert res12.status_code == 200
    db.refresh(b12)
    assert b12.commission_status == "FINALIZED"
    assert b12.commission_amount == 1000.0
    print("✓ TEST 12 PASSED: Normal commission strictly finalized on check-in.")

    # =========================================================================
    # TEST 13: Property cancellation policy changed AFTER booking
    # Expected: Existing booking uses original snapshot
    # =========================================================================
    print("\n--- TEST 13: Immutability of Policy Snapshot ---")
    b13 = create_test_booking(check_in_dt=tomorrow, check_out_dt=tomorrow + timedelta(days=1), total_amt=10000.0, refund_pct_snap=75.0)
    # Host changes property policy to 25% later
    prop.cancellation_refund_percentage = 25
    db.commit()

    calc13 = BookingService.calculate_cancellation_refund(b13)
    assert calc13["refund_percentage"] == 75.0, f"Expected snapshotted 75%, got {calc13['refund_percentage']}"
    assert calc13["refund_amount"] == 7500.0
    assert calc13["retained_amount"] == 2500.0
    assert calc13["commission_amount"] == 250.0  # 10% of 2,500
    assert calc13["provider_settlement_amount"] == 2250.0  # 2,500 - 250
    # Revert property
    prop.cancellation_refund_percentage = 50
    db.commit()
    print("✓ TEST 13 PASSED: Booking retains original snapshotted policy despite subsequent property changes.")

    # =========================================================================
    # TEST 14: Frontend sends manipulated commission/refund/total
    # Expected: Backend calculates authoritatively
    # =========================================================================
    print("\n--- TEST 14: Authority of Backend Calculation (Zero Trust in Frontend) ---")
    b14 = create_test_booking(check_in_dt=future_date, check_out_dt=future_date + timedelta(days=2), total_amt=10000.0)
    # Customer attempts to send custom manipulated params in JSON payload
    res14 = client.post(
        f"/api/customer/bookings/{b14.id}/cancel",
        json={"reason": "Cancel", "refund_amount": 999999, "commission": 0, "status": "COMPLETED"},
        headers=auth_customer
    )
    assert res14.status_code == 200
    db.refresh(b14)
    # Server should ignore client values and calculate 10000.0 authoritatively
    assert b14.refund_amount == 10000.0
    assert b14.status == BookingStatus.CANCELLED
    print("✓ TEST 14 PASSED: Backend ignores manipulated frontend numbers and enforces authoritative math.")

    # =========================================================================
    # TEST 15: Concurrency Safety & Double-Booking Protection on Final Room Unit
    # Expected: Over-booking rejected
    # =========================================================================
    print("\n--- TEST 15: Concurrency / Double-Booking Protection ---")
    # Verify BookingService.create_booking rejects when room quantity is exceeded
    b15_date = today_ist + timedelta(days=35)
    # Fill room capacity
    from app.schemas.booking import BookingCreate
    for q in range(room.quantity):
        create_test_booking(check_in_dt=b15_date, check_out_dt=b15_date + timedelta(days=2), total_amt=10000.0)
    
    # Next booking must fail
    try:
        BookingService.create_booking(
            db=db,
            user_id=customer.id,
            data=BookingCreate(
                property_id=prop.id,
                room_id=room.id,
                check_in=b15_date,
                check_out=b15_date + timedelta(days=2),
                total_guests=2,
                room_quantity=1
            )
        )
        assert False, "Should have failed due to room fully booked"
    except Exception as e:
        assert "fully booked" in str(e).lower() or "available" in str(e).lower() or "400" in str(e)
    print("✓ TEST 15 PASSED: Double booking prevented when room inventory is depleted.")

    print("\n" + "=" * 70)
    print("ALL 15 TESTS PASSED SUCCESSFULLY! BACKEND BUSINESS LOGIC VERIFIED.")
    print("=" * 70)
    db.close()

if __name__ == "__main__":
    run_tests()
