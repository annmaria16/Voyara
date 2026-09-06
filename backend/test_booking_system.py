import sys
import threading
from datetime import date, timedelta
from app.database import SessionLocal, engine
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.models.property import Property
from app.models.room import Room
from app.models.booking import Booking, BookingStatus, BookingRoom
from app.models.availability import PropertyAvailability, RoomAvailability
from app.schemas.booking import BookingCreate
from app.schemas.room import RoomCreate, RoomUpdate
from app.services.bookings.booking_service import BookingService
from app.services.availability.availability_service import AvailabilityService
from app.services.rooms.room_service import RoomService
from app.services.verinova.verification_service import VeriNovaService
from fastapi import HTTPException

def clean_room_bookings(db, room_id):
    booking_ids = [br.booking_id for br in db.query(BookingRoom).filter(BookingRoom.room_id == room_id).all()]
    db.query(BookingRoom).filter(BookingRoom.room_id == room_id).delete()
    if booking_ids:
        db.query(Booking).filter(Booking.id.in_(booking_ids)).delete()
    db.commit()

def run_all_tests():
    db = SessionLocal()
    print("==================================================")
    print("VOYARA BOOKING & AVAILABILITY SYSTEM AUTOMATED TESTS")
    print("==================================================")

    # Setup Test Customer & Provider & Property
    customer = db.query(User).filter(User.role == UserRole.CUSTOMER).first()
    if not customer:
        customer = User(
            email="test_customer_booking_unique@voyara.com",
            hashed_password="testpass123",
            name="Susan BookingTester",
            phone="+919999888801",
            role=UserRole.CUSTOMER,
            is_active=True
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)

    provider_profile = db.query(ProviderProfile).first()
    if not provider_profile:
        provider_user = db.query(User).filter(User.role == UserRole.PROVIDER).first()
        if not provider_user:
            provider_user = User(
                email="test_provider_booking_unique@voyara.com",
                hashed_password="testpass123",
                name="Rohit ProviderTester",
                phone="+919999888802",
                role=UserRole.PROVIDER,
                is_active=True
            )
            db.add(provider_user)
            db.commit()
            db.refresh(provider_user)

        provider_profile = ProviderProfile(
            user_id=provider_user.id,
            business_name="Voyara Retreats Testing",
            pan_number="ABCDE1234F",
            business_address="Munnar, Kerala",
            is_verified=True
        )
        db.add(provider_profile)
        db.commit()
        db.refresh(provider_profile)

    test_prop = db.query(Property).filter(Property.name == "Voyara Test Sanctuary").first()
    if not test_prop:
        test_prop = Property(
            provider_id=provider_profile.id,
            name="Voyara Test Sanctuary",
            property_type="Resort",
            description="Luxury testing sanctuary",
            address="Cliff Road",
            city="Munnar",
            state="Kerala",
            country="India",
            contact_phone="+919876543211",
            contact_email="test_provider_booking@voyara.com",
            check_in_time="02:00 PM",
            check_out_time="11:00 AM",
            is_active=True
        )
        db.add(test_prop)
        db.commit()
        db.refresh(test_prop)

    # Create Test Room with Capacity=4, Quantity=5, Base Price=4000
    test_room = db.query(Room).filter(Room.property_id == test_prop.id, Room.name == "Deluxe Test Suite").first()
    if not test_room:
        test_room = Room(
            property_id=test_prop.id,
            name="Deluxe Test Suite",
            room_type="Deluxe Room",
            description="Spacious mountain suite",
            capacity=4,
            quantity=5,
            base_price=4000.0,
            is_active=True
        )
        db.add(test_room)
        db.commit()
        db.refresh(test_room)
    else:
        test_room.capacity = 4
        test_room.quantity = 5
        test_room.base_price = 4000.0
        test_room.is_active = True
        db.commit()
        db.refresh(test_room)

    # Clean existing bookings for this test room
    clean_room_bookings(db, test_room.id)
    db.query(RoomAvailability).filter(RoomAvailability.room_id == test_room.id).delete()
    db.query(PropertyAvailability).filter(PropertyAvailability.property_id == test_prop.id).delete()
    db.commit()

    today = date.today()
    in_5_days = today + timedelta(days=5)
    in_7_days = today + timedelta(days=7)
    in_10_days = today + timedelta(days=10)
    in_12_days = today + timedelta(days=12)

    passed_tests = 0
    total_tests = 14

    # TEST 1: Today selected as check-in -> Allowed
    try:
        data = BookingCreate(
            property_id=test_prop.id,
            room_id=test_room.id,
            check_in=today,
            check_out=today + timedelta(days=1),
            total_guests=2,
            room_quantity=1
        )
        b1 = BookingService.create_booking(db, user_id=customer.id, data=data)
        assert b1.id is not None
        print("[PASS] TEST 1 PASSED: Today selected as check-in -> Allowed and booked successfully.")
        passed_tests += 1
        clean_room_bookings(db, test_room.id)
    except Exception as e:
        print(f"[FAIL] TEST 1 FAILED: {e}")

    # TEST 2: Yesterday selected as check-in -> Blocked
    try:
        data = BookingCreate(
            property_id=test_prop.id,
            room_id=test_room.id,
            check_in=today - timedelta(days=1),
            check_out=today + timedelta(days=2),
            total_guests=2,
            room_quantity=1
        )
        BookingService.create_booking(db, user_id=customer.id, data=data)
        print("[FAIL] TEST 2 FAILED: Past check-in was allowed unexpectedly.")
    except HTTPException as e:
        if "past" in e.detail.lower():
            print(f"[PASS] TEST 2 PASSED: Yesterday check-in correctly blocked with message: '{e.detail}'")
            passed_tests += 1
        else:
            print(f"[FAIL] TEST 2 FAILED with unexpected message: {e.detail}")

    # TEST 3: Checkout before or equal to check-in -> Blocked
    try:
        data = BookingCreate(
            property_id=test_prop.id,
            room_id=test_room.id,
            check_in=in_5_days,
            check_out=in_5_days,
            total_guests=2,
            room_quantity=1
        )
        BookingService.create_booking(db, user_id=customer.id, data=data)
        print("[FAIL] TEST 3 FAILED: Same-day or earlier checkout was allowed unexpectedly.")
    except HTTPException as e:
        if "after" in e.detail.lower():
            print(f"[PASS] TEST 3 PASSED: Invalid checkout correctly blocked with message: '{e.detail}'")
            passed_tests += 1
        else:
            print(f"[FAIL] TEST 3 FAILED with unexpected message: {e.detail}")

    # TEST 4: Provider sets maximum guests = 4. Customer selects 5 for 1 room -> Blocked
    try:
        data = BookingCreate(
            property_id=test_prop.id,
            room_id=test_room.id,
            check_in=in_5_days,
            check_out=in_7_days,
            total_guests=5,
            room_quantity=1
        )
        BookingService.create_booking(db, user_id=customer.id, data=data)
        print("[FAIL] TEST 4 FAILED: 5 guests for capacity 4 was allowed unexpectedly.")
    except HTTPException as e:
        if "maximum" in e.detail.lower():
            print(f"[PASS] TEST 4 PASSED: Exceeding capacity correctly blocked with message: '{e.detail}'")
            passed_tests += 1
        else:
            print(f"[FAIL] TEST 4 FAILED with unexpected message: {e.detail}")

    # TEST 5: Provider sets room quantity = 5. Customer selects 6 -> Blocked
    try:
        data = BookingCreate(
            property_id=test_prop.id,
            room_id=test_room.id,
            check_in=in_5_days,
            check_out=in_7_days,
            total_guests=4,
            room_quantity=6
        )
        BookingService.create_booking(db, user_id=customer.id, data=data)
        print("[FAIL] TEST 5 FAILED: 6 rooms for total quantity 5 was allowed unexpectedly.")
    except HTTPException as e:
        if "available" in e.detail.lower():
            print(f"[PASS] TEST 5 PASSED: Exceeding total room units correctly blocked with message: '{e.detail}'")
            passed_tests += 1
        else:
            print(f"[FAIL] TEST 5 FAILED with unexpected message: {e.detail}")

    # TEST 6: 5 total rooms. 3 already booked. Customer sees 2 available in availability API
    try:
        clean_room_bookings(db, test_room.id)
        test_room.quantity = 5
        db.commit()

        # Create booking for 3 rooms
        data_3 = BookingCreate(
            property_id=test_prop.id,
            room_id=test_room.id,
            check_in=in_10_days,
            check_out=in_12_days,
            total_guests=6,
            room_quantity=3
        )
        b_3 = BookingService.create_booking(db, user_id=customer.id, data=data_3)

        avail = AvailabilityService.check_room_availability(db, test_room.id, in_10_days, in_12_days)
        assert avail["total_quantity"] == 5
        assert avail["booked_quantity"] == 3
        assert avail["available_quantity"] == 2
        assert avail["is_available"] == True
        print(f"[PASS] TEST 6 PASSED: 5 total rooms, 3 booked -> Live availability reports {avail['available_quantity']} available.")
        passed_tests += 1
    except Exception as e:
        print(f"[FAIL] TEST 6 FAILED: {e}")

    # TEST 7: Customer requests 3 rooms when only 2 available -> Booking rejected
    try:
        data_req3 = BookingCreate(
            property_id=test_prop.id,
            room_id=test_room.id,
            check_in=in_10_days,
            check_out=in_12_days,
            total_guests=6,
            room_quantity=3
        )
        BookingService.create_booking(db, user_id=customer.id, data=data_req3)
        print("[FAIL] TEST 7 FAILED: Booking 3 rooms when only 2 available succeeded unexpectedly.")
    except HTTPException as e:
        if "only 2 room" in e.detail.lower():
            print(f"[PASS] TEST 7 PASSED: Booking 3 when only 2 available rejected with message: '{e.detail}'")
            passed_tests += 1
        else:
            print(f"[FAIL] TEST 7 FAILED with unexpected message: {e.detail}")

    # TEST 8: Two customers try to book the final room simultaneously -> Exactly one succeeds
    clean_room_bookings(db, test_room.id)
    test_room.quantity = 5
    db.commit()

    # Pre-book 4 of 5 rooms
    b_4 = BookingService.create_booking(db, user_id=customer.id, data=BookingCreate(
        property_id=test_prop.id,
        room_id=test_room.id,
        check_in=in_10_days,
        check_out=in_12_days,
        total_guests=8,
        room_quantity=4
    ))

    # Now exactly 1 room remaining!
    results = []
    def try_book(cust_num):
        session = SessionLocal()
        try:
            b = BookingService.create_booking(
                session,
                user_id=customer.id,
                data=BookingCreate(
                    property_id=test_prop.id,
                    room_id=test_room.id,
                    check_in=in_10_days,
                    check_out=in_12_days,
                    total_guests=2,
                    room_quantity=1
                )
            )
            results.append(("SUCCESS", cust_num, b.booking_number))
        except Exception as e:
            results.append(("FAILED", cust_num, str(e)))
        finally:
            session.close()

    t1 = threading.Thread(target=try_book, args=(1,))
    t2 = threading.Thread(target=try_book, args=(2,))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    successes = [r for r in results if r[0] == "SUCCESS"]
    fails = [r for r in results if r[0] == "FAILED"]

    if len(successes) == 1 and len(fails) == 1:
        print(f"[PASS] TEST 8 PASSED: Simultaneous booking for final room -> Exactly 1 succeeded ({successes[0][2]}), 1 rejected cleanly ({fails[0][2]}).")
        passed_tests += 1
    else:
        print(f"[FAIL] TEST 8 FAILED: Concurrency test resulted in: {results}")

    # Clean up
    clean_room_bookings(db, test_room.id)

    # TEST 9: Provider changes room quantity from 5 to 3 -> Reflected in database & API
    try:
        RoomService.update_room(db, test_room.id, provider_profile.id, RoomUpdate(quantity=3))
        avail = AvailabilityService.check_room_availability(db, test_room.id, in_5_days, in_7_days)
        assert avail["total_quantity"] == 3
        assert avail["available_quantity"] == 3
        print(f"[PASS] TEST 9 PASSED: Provider changes quantity from 5 to 3 -> Availability API reflects total {avail['total_quantity']}.")
        passed_tests += 1
    except Exception as e:
        print(f"[FAIL] TEST 9 FAILED: {e}")

    # TEST 10: Provider changes room capacity from 4 to 6 -> Reflected in database & API
    try:
        RoomService.update_room(db, test_room.id, provider_profile.id, RoomUpdate(capacity=6))
        avail = AvailabilityService.check_room_availability(db, test_room.id, in_5_days, in_7_days)
        assert avail["max_guests"] == 6
        print(f"[PASS] TEST 10 PASSED: Provider changes capacity from 4 to 6 -> Availability API reflects max guests {avail['max_guests']}.")
        passed_tests += 1
    except Exception as e:
        print(f"[FAIL] TEST 10 FAILED: {e}")

    # TEST 11: Provider changes room price -> New booking uses current database price
    try:
        clean_room_bookings(db, test_room.id)
        RoomService.update_room(db, test_room.id, provider_profile.id, RoomUpdate(base_price=6500.0))
        b_price_test = BookingService.create_booking(
            db,
            user_id=customer.id,
            data=BookingCreate(
                property_id=test_prop.id,
                room_id=test_room.id,
                check_in=in_5_days,
                check_out=in_7_days, # 2 nights
                total_guests=2,
                room_quantity=2 # 2 rooms -> 6500 * 2 nights * 2 rooms = 26,000
            )
        )
        assert b_price_test.total_amount == 26000.0
        print(f"[PASS] TEST 11 PASSED: Updated price INR 6500/night used in booking calculation (Total: INR {b_price_test.total_amount:,.2f} for 2 nights x 2 rooms).")
        passed_tests += 1
        clean_room_bookings(db, test_room.id)
    except Exception as e:
        print(f"[FAIL] TEST 11 FAILED: {e}")

    # TEST 12: Backend calculates price authoritatively (no client tampering possible)
    try:
        clean_room_bookings(db, test_room.id)
        b_authoritative = BookingService.create_booking(
            db,
            user_id=customer.id,
            data=BookingCreate(
                property_id=test_prop.id,
                room_id=test_room.id,
                check_in=in_5_days,
                check_out=in_7_days, # 2 nights
                total_guests=2,
                room_quantity=1 # 6500 * 2 nights * 1 room = 13,000
            )
        )
        assert b_authoritative.total_amount == 13000.0
        print(f"[PASS] TEST 12 PASSED: Backend computed authoritative price INR {b_authoritative.total_amount:,.2f} correctly.")
        passed_tests += 1
        clean_room_bookings(db, test_room.id)
    except Exception as e:
        print(f"[FAIL] TEST 12 FAILED: {e}")

    # TEST 13: Room unavailable because of provider-blocked dates -> Customer cannot book
    try:
        clean_room_bookings(db, test_room.id)
        block = RoomAvailability(
            room_id=test_room.id,
            start_date=in_5_days,
            end_date=in_7_days,
            is_blocked=True,
            reason="Renovation"
        )
        db.add(block)
        db.commit()

        # Check availability
        avail = AvailabilityService.check_room_availability(db, test_room.id, in_5_days, in_7_days)
        assert avail["is_available"] == False
        assert avail["is_room_blocked"] == True

        # Attempt booking
        BookingService.create_booking(
            db,
            user_id=customer.id,
            data=BookingCreate(
                property_id=test_prop.id,
                room_id=test_room.id,
                check_in=in_5_days,
                check_out=in_7_days,
                total_guests=2,
                room_quantity=1
            )
        )
        print("[FAIL] TEST 13 FAILED: Booking succeeded on blocked room dates.")
    except HTTPException as e:
        if "blocked" in e.detail.lower():
            print(f"[PASS] TEST 13 PASSED: Booking on blocked dates rejected with message: '{e.detail}'")
            passed_tests += 1
        else:
            print(f"[FAIL] TEST 13 FAILED with unexpected message: {e.detail}")
    finally:
        db.query(RoomAvailability).filter(RoomAvailability.room_id == test_room.id).delete()
        db.commit()

    # TEST 14: Valid booking -> VeriNova verifies -> Booking confirmed
    try:
        clean_room_bookings(db, test_room.id)
        test_room.quantity = 5
        test_room.capacity = 4
        db.commit()

        valid_booking = BookingService.create_booking(
            db,
            user_id=customer.id,
            data=BookingCreate(
                property_id=test_prop.id,
                room_id=test_room.id,
                check_in=in_5_days,
                check_out=in_7_days,
                total_guests=4,
                room_quantity=2,
                customer_notes="Please arrange early luggage drop."
            )
        )
        db.refresh(valid_booking)
        assert valid_booking.status == BookingStatus.VERIFIED or valid_booking.status == BookingStatus.CONFIRMED
        assert valid_booking.verification_result is not None
        assert valid_booking.verification_result.status.value == "VERIFIED"
        print(f"[PASS] TEST 14 PASSED: Valid booking confirmed with VeriNova Verification status: '{valid_booking.verification_result.status.value}'.")
        passed_tests += 1
        clean_room_bookings(db, test_room.id)
    except Exception as e:
        print(f"[FAIL] TEST 14 FAILED: {e}")

    print("==================================================")
    print(f"TEST SUMMARY: {passed_tests}/{total_tests} TESTS PASSED.")
    print("==================================================")
    db.close()

if __name__ == "__main__":
    run_all_tests()
