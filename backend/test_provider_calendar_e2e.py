"""
Voyara - Stay Partner Property Calendar & Blackouts E2E Test Suite
Tests:
1. No bookings + no blockouts -> Entire month shows Available
2. One real booking (20-23 Sep 2026) -> 20, 21, 22 Booked, 23 Available
3. Date click detail -> Sep 20 returns all active bookings, room inventory breakdown, traveler details
4. Multiple bookings on same day -> Shows ALL active bookings, booking count vs booked units count
5. Booking cancelled -> Immediately frees room inventory
6. Manual blackout (property closure & room block) -> Marks date Blocked, separate from bookings
7. Room inventory partial booking -> e.g. 2 of 5 units booked, 3 available
8. Single Property Isolation -> Property A calendar does not show Property B bookings
9. Cross-Provider Security Isolation -> Provider B cannot access Provider A's calendar
"""

import pytest
from datetime import date
from fastapi import HTTPException
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.models.property import Property
from app.models.room import Room
from app.models.booking import Booking, BookingStatus, BookingRoom
from app.models.availability import PropertyAvailability, RoomAvailability
from app.services.availability.availability_service import AvailabilityService
from app.schemas.availability import PropertyClosureCreate, RoomBlockCreate

def run_calendar_e2e_tests():
    db = SessionLocal()
    try:
        print("\n=======================================================")
        print("  RUNNING STAY PARTNER PROPERTY CALENDAR E2E TESTS")
        print("=======================================================\n")

        # 1. Setup Test Providers
        provider_user_a = db.query(User).filter(User.email == "cal_test_prov_a@voyara.com").first()
        if not provider_user_a:
            provider_user_a = User(
                email="cal_test_prov_a@voyara.com",
                name="Host Alice",
                phone="+919999111001",
                hashed_password="testhash123",
                role=UserRole.PROVIDER,
                is_active=True,
                phone_verified=True,
                email_verified=True
            )
            db.add(provider_user_a)
            db.commit()
            db.refresh(provider_user_a)

        profile_a = db.query(ProviderProfile).filter(ProviderProfile.user_id == provider_user_a.id).first()
        if not profile_a:
            profile_a = ProviderProfile(
                user_id=provider_user_a.id,
                business_name="Alice Hospitality Ltd",
                contact_phone="+919999111001",
                contact_email="cal_test_prov_a@voyara.com",
                verification_status="VERIFIED"
            )
            db.add(profile_a)
            db.commit()
            db.refresh(profile_a)

        provider_user_b = db.query(User).filter(User.email == "cal_test_prov_b@voyara.com").first()
        if not provider_user_b:
            provider_user_b = User(
                email="cal_test_prov_b@voyara.com",
                name="Host Bob",
                phone="+919999111002",
                hashed_password="testhash123",
                role=UserRole.PROVIDER,
                is_active=True,
                phone_verified=True,
                email_verified=True
            )
            db.add(provider_user_b)
            db.commit()
            db.refresh(provider_user_b)

        profile_b = db.query(ProviderProfile).filter(ProviderProfile.user_id == provider_user_b.id).first()
        if not profile_b:
            profile_b = ProviderProfile(
                user_id=provider_user_b.id,
                business_name="Bob Hospitality Ltd",
                contact_phone="+919999111002",
                contact_email="cal_test_prov_b@voyara.com",
                verification_status="VERIFIED"
            )
            db.add(profile_b)
            db.commit()
            db.refresh(profile_b)

        traveler_user = db.query(User).filter(User.email == "cal_test_traveler@voyara.com").first()
        if not traveler_user:
            traveler_user = User(
                email="cal_test_traveler@voyara.com",
                name="Rahul Sharma",
                phone="+919999111003",
                hashed_password="testhash123",
                role=UserRole.CUSTOMER,
                is_active=True
            )
            db.add(traveler_user)
            db.commit()
            db.refresh(traveler_user)

        traveler_user_2 = db.query(User).filter(User.email == "cal_test_traveler2@voyara.com").first()
        if not traveler_user_2:
            traveler_user_2 = User(
                email="cal_test_traveler2@voyara.com",
                name="Anu Verma",
                phone="+919999111004",
                hashed_password="testhash123",
                role=UserRole.CUSTOMER,
                is_active=True
            )
            db.add(traveler_user_2)
            db.commit()
            db.refresh(traveler_user_2)

        # 2. Setup Properties for Provider A: Prop A1 & Prop A2
        prop_a1 = db.query(Property).filter(Property.name == "Cal Test Misty Valley Retreat").first()
        if not prop_a1:
            prop_a1 = Property(
                provider_id=profile_a.id,
                name="Cal Test Misty Valley Retreat",
                property_type="Resort",
                description="Serene retreat in the hills",
                address="Hill Station Rd",
                city="Munnar",
                state="Kerala",
                contact_phone="+919876543210",
                contact_email="cal_test_prov_a@voyara.com",
                is_active=True,
                verification_status="VERIFIED"
            )
            db.add(prop_a1)
            db.commit()
            db.refresh(prop_a1)

        prop_a2 = db.query(Property).filter(Property.name == "Cal Test Coastal Breeze Retreat").first()
        if not prop_a2:
            prop_a2 = Property(
                provider_id=profile_a.id,
                name="Cal Test Coastal Breeze Retreat",
                property_type="Villa",
                description="Boutique coastal villa",
                address="Beach Rd",
                city="Varkala",
                state="Kerala",
                contact_phone="+919876543210",
                contact_email="cal_test_prov_a@voyara.com",
                is_active=True,
                verification_status="VERIFIED"
            )
            db.add(prop_a2)
            db.commit()
            db.refresh(prop_a2)

        # Setup Property for Provider B: Prop B1
        prop_b1 = db.query(Property).filter(Property.name == "Cal Test Bob Lakehouse").first()
        if not prop_b1:
            prop_b1 = Property(
                provider_id=profile_b.id,
                name="Cal Test Bob Lakehouse",
                property_type="Homestay",
                description="Cozy lakehouse",
                address="Lake View",
                city="Kumarakom",
                state="Kerala",
                contact_phone="+919876543211",
                contact_email="cal_test_prov_b@voyara.com",
                is_active=True,
                verification_status="VERIFIED"
            )
            db.add(prop_b1)
            db.commit()
            db.refresh(prop_b1)

        # Setup Rooms for Prop A1
        # Room 1: Deluxe Room (qty = 3)
        room_a1_deluxe = db.query(Room).filter(Room.property_id == prop_a1.id, Room.name == "Deluxe Valley Room").first()
        if not room_a1_deluxe:
            room_a1_deluxe = Room(
                property_id=prop_a1.id,
                name="Deluxe Valley Room",
                room_type="Deluxe",
                description="Deluxe room with scenic view",
                quantity=3,
                base_price=5000.0,
                capacity=2,
                is_active=True
            )
            db.add(room_a1_deluxe)
            db.commit()
            db.refresh(room_a1_deluxe)

        # Room 2: Standard Room (qty = 2)
        room_a1_std = db.query(Room).filter(Room.property_id == prop_a1.id, Room.name == "Standard Valley Room").first()
        if not room_a1_std:
            room_a1_std = Room(
                property_id=prop_a1.id,
                name="Standard Valley Room",
                room_type="Standard",
                description="Standard cozy room",
                quantity=2,
                base_price=3000.0,
                capacity=2,
                is_active=True
            )
            db.add(room_a1_std)
            db.commit()
            db.refresh(room_a1_std)

        # Total units for Prop A1 = 3 + 2 = 5

        # Cleanup any previous test bookings or closures for Prop A1
        db.query(BookingRoom).filter(BookingRoom.room_id.in_([room_a1_deluxe.id, room_a1_std.id])).delete(synchronize_session=False)
        db.query(Booking).filter(Booking.property_id == prop_a1.id).delete(synchronize_session=False)
        db.query(PropertyAvailability).filter(PropertyAvailability.property_id == prop_a1.id).delete(synchronize_session=False)
        db.query(RoomAvailability).filter(RoomAvailability.room_id.in_([room_a1_deluxe.id, room_a1_std.id])).delete(synchronize_session=False)
        db.commit()

        # -------------------------------------------------------------
        # TEST 1: No bookings + no blockouts
        # -------------------------------------------------------------
        print("\n--- TEST 1: No bookings + no blockouts ---")
        cal_data = AvailabilityService.get_property_month_calendar(
            db=db,
            property_id=prop_a1.id,
            provider_id=profile_a.id,
            year=2026,
            month=9
        )
        assert cal_data["property_id"] == prop_a1.id
        assert cal_data["property_name"] == prop_a1.name
        assert cal_data["year"] == 2026
        assert cal_data["month"] == 9
        assert len(cal_data["days"]) == 30
        assert len(cal_data["booked_dates"]) == 0, f"Expected 0 booked dates, got {cal_data['booked_dates']}"
        assert len(cal_data["blocked_dates"]) == 0, f"Expected 0 blocked dates, got {cal_data['blocked_dates']}"
        assert cal_data["summary"]["available_days"] == 30
        assert cal_data["summary"]["booked_days_count"] == 0
        assert cal_data["summary"]["total_units"] == 5

        # Every day should be AVAILABLE with 5 available units
        for day in cal_data["days"]:
            assert day["status"] == "AVAILABLE", f"Day {day['day']} has status {day['status']}, expected AVAILABLE"
            assert day["booked_units"] == 0
            assert day["available_units"] == 5
            assert day["total_units"] == 5

        print("[PASS] TEST 1 PASSED: Entire month is 100% Available with zero booked/blocked dates.")

        # -------------------------------------------------------------
        # TEST 2: One real booking: Check-in = 20 Sep, Check-out = 23 Sep (2 units)
        # -------------------------------------------------------------
        print("\n--- TEST 2: One real booking (20 Sep to 23 Sep) ---")
        booking1 = Booking(
            booking_number="CAL-TEST-001",
            user_id=traveler_user.id,
            property_id=prop_a1.id,
            check_in=date(2026, 9, 20),
            check_out=date(2026, 9, 23),
            total_nights=3,
            total_guests=4,
            total_amount=30000.0,
            original_total_amount=30000.0,
            status=BookingStatus.CONFIRMED
        )
        db.add(booking1)
        db.commit()
        db.refresh(booking1)

        br1 = BookingRoom(
            booking_id=booking1.id,
            room_id=room_a1_deluxe.id,
            room_name="Deluxe Valley Room",
            nightly_price=5000.0,
            nights=3,
            quantity=2,
            guests=4,
            subtotal=30000.0
        )
        db.add(br1)
        db.commit()

        cal_data = AvailabilityService.get_property_month_calendar(
            db=db,
            property_id=prop_a1.id,
            provider_id=profile_a.id,
            year=2026,
            month=9
        )

        assert cal_data["booked_dates"] == [20, 21, 22], f"Expected booked dates [20, 21, 22], got {cal_data['booked_dates']}"
        assert cal_data["summary"]["booked_days_count"] == 3

        # Check occupied nights (20, 21, 22)
        for day_num in [20, 21, 22]:
            day = cal_data["days"][day_num - 1]
            assert day["booked_units"] == 2
            assert day["available_units"] == 3
            assert day["status"] == "PARTIALLY_BOOKED"
            assert day["booking_count"] == 1
            assert len(day["bookings"]) == 1
            assert day["bookings"][0]["booking_number"] == "CAL-TEST-001"
            assert day["bookings"][0]["customer_name"] == "Rahul Sharma"
            assert day["bookings"][0]["quantity"] == 2

        # Check-out date (23 Sep) must be AVAILABLE
        day_23 = cal_data["days"][22]
        assert day_23["day"] == 23
        assert day_23["booked_units"] == 0
        assert day_23["available_units"] == 5
        assert day_23["status"] == "AVAILABLE"
        assert day_23["booking_count"] == 0

        print("[PASS] TEST 2 PASSED: 20, 21, 22 are Booked (2 units); 23 is Available for new check-in.")

        # -------------------------------------------------------------
        # TEST 3: Date click detail for Sep 20
        # -------------------------------------------------------------
        print("\n--- TEST 3: Date click detail for Sep 20 ---")
        date_detail = AvailabilityService.get_property_date_detail(
            db=db,
            property_id=prop_a1.id,
            provider_id=profile_a.id,
            target_date=date(2026, 9, 20)
        )
        assert date_detail["date"] == "2026-09-20"
        assert date_detail["booking_count"] == 1
        assert date_detail["booked_units"] == 2
        assert date_detail["available_units"] == 3
        assert date_detail["total_units"] == 5
        assert len(date_detail["bookings"]) == 1
        assert date_detail["bookings"][0]["customer_name"] == "Rahul Sharma"
        assert len(date_detail["room_inventory"]) == 2

        # Deluxe Room: total 3, booked 2, available 1
        deluxe_inv = next(r for r in date_detail["room_inventory"] if r["room_name"] == "Deluxe Valley Room")
        assert deluxe_inv["total_units"] == 3
        assert deluxe_inv["booked_units"] == 2
        assert deluxe_inv["available_units"] == 1

        # Standard Room: total 2, booked 0, available 2
        std_inv = next(r for r in date_detail["room_inventory"] if r["room_name"] == "Standard Valley Room")
        assert std_inv["total_units"] == 2
        assert std_inv["booked_units"] == 0
        assert std_inv["available_units"] == 2

        print("[PASS] TEST 3 PASSED: Sep 20 date detail returns complete active booking and room breakdown.")

        # -------------------------------------------------------------
        # TEST 4: Multiple bookings on same day (Sep 20)
        # Booking 2: Check-in = 20 Sep, Check-out = 22 Sep (1 unit Standard Room)
        # Booking 3: Check-in = 19 Sep, Check-out = 21 Sep (1 unit Deluxe Room)
        # -------------------------------------------------------------
        print("\n--- TEST 4: Multiple bookings on same day (Sep 20) ---")
        booking2 = Booking(
            booking_number="CAL-TEST-002",
            user_id=traveler_user_2.id,
            property_id=prop_a1.id,
            check_in=date(2026, 9, 20),
            check_out=date(2026, 9, 22),
            total_nights=2,
            total_guests=2,
            total_amount=6000.0,
            original_total_amount=6000.0,
            status=BookingStatus.CONFIRMED
        )
        db.add(booking2)
        db.commit()
        db.refresh(booking2)

        br2 = BookingRoom(
            booking_id=booking2.id,
            room_id=room_a1_std.id,
            room_name="Standard Valley Room",
            nightly_price=3000.0,
            nights=2,
            quantity=1,
            guests=2,
            subtotal=6000.0
        )
        db.add(br2)

        booking3 = Booking(
            booking_number="CAL-TEST-003",
            user_id=traveler_user.id,
            property_id=prop_a1.id,
            check_in=date(2026, 9, 19),
            check_out=date(2026, 9, 21),
            total_nights=2,
            total_guests=2,
            total_amount=10000.0,
            original_total_amount=10000.0,
            status=BookingStatus.CHECKED_IN
        )
        db.add(booking3)
        db.commit()
        db.refresh(booking3)

        br3 = BookingRoom(
            booking_id=booking3.id,
            room_id=room_a1_deluxe.id,
            room_name="Deluxe Valley Room",
            nightly_price=5000.0,
            nights=2,
            quantity=1,
            guests=2,
            subtotal=10000.0
        )
        db.add(br3)
        db.commit()

        # Check Sep 20: Should have ALL 3 bookings!
        # Booking 1: 2 units Deluxe
        # Booking 2: 1 unit Standard
        # Booking 3: 1 unit Deluxe
        # Total Bookings = 3
        # Total Booked Units = 2 + 1 + 1 = 4
        # Total Units = 5 -> Available Units = 1
        date_detail_20 = AvailabilityService.get_property_date_detail(
            db=db,
            property_id=prop_a1.id,
            provider_id=profile_a.id,
            target_date=date(2026, 9, 20)
        )
        assert date_detail_20["booking_count"] == 3, f"Expected 3 bookings, got {date_detail_20['booking_count']}"
        assert date_detail_20["booked_units"] == 4, f"Expected 4 booked units, got {date_detail_20['booked_units']}"
        assert date_detail_20["available_units"] == 1, f"Expected 1 available unit, got {date_detail_20['available_units']}"
        assert len(date_detail_20["bookings"]) == 3

        booking_numbers = [b["booking_number"] for b in date_detail_20["bookings"]]
        assert "CAL-TEST-001" in booking_numbers
        assert "CAL-TEST-002" in booking_numbers
        assert "CAL-TEST-003" in booking_numbers

        # Room Breakdown:
        # Deluxe Room: total 3, booked 3 (2 from B1, 1 from B3), available 0
        # Standard Room: total 2, booked 1 (from B2), available 1
        deluxe_inv_20 = next(r for r in date_detail_20["room_inventory"] if r["room_name"] == "Deluxe Valley Room")
        assert deluxe_inv_20["total_units"] == 3
        assert deluxe_inv_20["booked_units"] == 3
        assert deluxe_inv_20["available_units"] == 0

        std_inv_20 = next(r for r in date_detail_20["room_inventory"] if r["room_name"] == "Standard Valley Room")
        assert std_inv_20["total_units"] == 2
        assert std_inv_20["booked_units"] == 1
        assert std_inv_20["available_units"] == 1

        print("[PASS] TEST 4 PASSED: Sep 20 correctly aggregates all 3 active bookings (4 booked units, 1 available unit).")

        # -------------------------------------------------------------
        # TEST 5: Booking cancellation
        # Cancel Booking 1 -> Deluxe room has only 1 booked unit on Sep 20
        # -------------------------------------------------------------
        print("\n--- TEST 5: Booking cancellation ---")
        booking1.status = BookingStatus.CANCELLED
        db.commit()

        date_detail_after_cancel = AvailabilityService.get_property_date_detail(
            db=db,
            property_id=prop_a1.id,
            provider_id=profile_a.id,
            target_date=date(2026, 9, 20)
        )
        assert date_detail_after_cancel["booking_count"] == 2
        assert date_detail_after_cancel["booked_units"] == 2  # 1 from B2, 1 from B3
        assert date_detail_after_cancel["available_units"] == 3

        # Cancel Booking 2 & Booking 3 as well
        booking2.status = BookingStatus.CANCELLED
        booking3.status = BookingStatus.CANCELLED
        db.commit()

        cal_data_after_all_cancel = AvailabilityService.get_property_month_calendar(
            db=db,
            property_id=prop_a1.id,
            provider_id=profile_a.id,
            year=2026,
            month=9
        )
        assert len(cal_data_after_all_cancel["booked_dates"]) == 0
        assert cal_data_after_all_cancel["summary"]["booked_days_count"] == 0
        print("[PASS] TEST 5 PASSED: Cancelled bookings immediately freed room inventory without stale occupancy.")

        # -------------------------------------------------------------
        # TEST 6: Manual blackout (Property closure on Sep 25 and Room block on Sep 28)
        # -------------------------------------------------------------
        print("\n--- TEST 6: Manual blackout (closures & room blocks) ---")
        closure = PropertyAvailability(
            property_id=prop_a1.id,
            start_date=date(2026, 9, 25),
            end_date=date(2026, 9, 25),
            is_closed=True,
            reason="Monsoon Maintenance"
        )
        db.add(closure)

        room_block = RoomAvailability(
            room_id=room_a1_deluxe.id,
            start_date=date(2026, 9, 28),
            end_date=date(2026, 9, 28),
            is_blocked=True,
            reason="VIP Reserved"
        )
        db.add(room_block)
        db.commit()

        cal_data_blocks = AvailabilityService.get_property_month_calendar(
            db=db,
            property_id=prop_a1.id,
            provider_id=profile_a.id,
            year=2026,
            month=9
        )

        assert 25 in cal_data_blocks["blocked_dates"]
        assert 28 in cal_data_blocks["blocked_dates"]

        # Day 25 (Property closure): BLOCKED, total 5 units blocked, available 0
        day_25 = cal_data_blocks["days"][24]
        assert day_25["day"] == 25
        assert day_25["status"] == "BLOCKED"
        assert day_25["blocked_units"] == 5
        assert day_25["available_units"] == 0
        assert day_25["booking_count"] == 0
        assert len(day_25["closures"]) == 1
        assert day_25["closures"][0]["reason"] == "Monsoon Maintenance"

        # Day 28 (Room block on Deluxe): PARTIALLY_BLOCKED (3 blocked, 2 available standard)
        day_28 = cal_data_blocks["days"][27]
        assert day_28["day"] == 28
        assert day_28["status"] == "PARTIALLY_BLOCKED"
        assert day_28["blocked_units"] == 3
        assert day_28["available_units"] == 2
        assert len(day_28["room_blocks"]) == 1
        assert day_28["room_blocks"][0]["reason"] == "VIP Reserved"

        # Remove closure & room block
        db.delete(closure)
        db.delete(room_block)
        db.commit()

        cal_data_after_unblock = AvailabilityService.get_property_month_calendar(
            db=db,
            property_id=prop_a1.id,
            provider_id=profile_a.id,
            year=2026,
            month=9
        )
        assert len(cal_data_after_unblock["blocked_dates"]) == 0
        print("[PASS] TEST 6 PASSED: Manual blackouts render as BLOCKED / PARTIALLY_BLOCKED and return to Available upon removal.")

        # -------------------------------------------------------------
        # TEST 7: Room inventory full booking vs partial booking
        # Book all 5 units on Sep 15 -> FULLY_BOOKED (status BOOKED)
        # -------------------------------------------------------------
        print("\n--- TEST 7: Fully Booked vs Partially Booked ---")
        full_booking = Booking(
            booking_number="CAL-TEST-FULL",
            user_id=traveler_user.id,
            property_id=prop_a1.id,
            check_in=date(2026, 9, 15),
            check_out=date(2026, 9, 16),
            total_nights=1,
            total_guests=10,
            total_amount=21000.0,
            original_total_amount=21000.0,
            status=BookingStatus.CONFIRMED
        )
        db.add(full_booking)
        db.commit()
        db.refresh(full_booking)

        # Book all 3 Deluxe + all 2 Standard
        db.add(BookingRoom(
            booking_id=full_booking.id,
            room_id=room_a1_deluxe.id,
            room_name="Deluxe Valley Room",
            nightly_price=5000.0,
            nights=1,
            quantity=3,
            guests=6,
            subtotal=15000.0
        ))
        db.add(BookingRoom(
            booking_id=full_booking.id,
            room_id=room_a1_std.id,
            room_name="Standard Valley Room",
            nightly_price=3000.0,
            nights=1,
            quantity=2,
            guests=4,
            subtotal=6000.0
        ))
        db.commit()

        cal_data_full = AvailabilityService.get_property_month_calendar(
            db=db,
            property_id=prop_a1.id,
            provider_id=profile_a.id,
            year=2026,
            month=9
        )
        day_15 = cal_data_full["days"][14]
        assert day_15["day"] == 15
        assert day_15["status"] == "BOOKED"
        assert day_15["is_fully_booked"] is True
        assert day_15["booked_units"] == 5
        assert day_15["available_units"] == 0

        print("[PASS] TEST 7 PASSED: All 5 units booked accurately marks day 15 as BOOKED (Fully Booked).")

        # -------------------------------------------------------------
        # TEST 8: Single Property Isolation
        # Prop A1 has booking on Sep 15. Prop A2 must NOT show booking on Sep 15!
        # -------------------------------------------------------------
        print("\n--- TEST 8: Single Property Isolation ---")
        # Ensure Prop A2 has a room
        room_a2 = db.query(Room).filter(Room.property_id == prop_a2.id).first()
        if not room_a2:
            room_a2 = Room(
                property_id=prop_a2.id,
                name="Coastal Villa Suite",
                room_type="Suite",
                description="Luxurious coastal suite with ocean breeze",
                quantity=4,
                base_price=7000.0,
                capacity=4,
                is_active=True
            )
            db.add(room_a2)
            db.commit()
            db.refresh(room_a2)

        cal_data_a2 = AvailabilityService.get_property_month_calendar(
            db=db,
            property_id=prop_a2.id,
            provider_id=profile_a.id,
            year=2026,
            month=9
        )
        assert len(cal_data_a2["booked_dates"]) == 0, f"Prop A2 should have 0 booked dates, got {cal_data_a2['booked_dates']}"
        assert cal_data_a2["days"][14]["status"] == "AVAILABLE"
        assert cal_data_a2["days"][14]["booked_units"] == 0
        print("[PASS] TEST 8 PASSED: Misty Valley Retreat bookings do NOT leak into Coastal Breeze Retreat.")

        # -------------------------------------------------------------
        # TEST 9: Cross-Provider Security Isolation
        # Provider B attempting to access Provider A's property calendar -> 404
        # -------------------------------------------------------------
        print("\n--- TEST 9: Cross-Provider Security Isolation ---")
        try:
            AvailabilityService.get_property_month_calendar(
                db=db,
                property_id=prop_a1.id,
                provider_id=profile_b.id,
                year=2026,
                month=9
            )
            assert False, "Provider B should NOT be allowed to access Provider A's property calendar"
        except HTTPException as e:
            assert e.status_code == 404
            print(f"[PASS] Security: Correctly denied Provider B access to Provider A's property calendar (HTTP {e.status_code}).")

        # Cleanup test bookings
        db.delete(full_booking)
        db.commit()

        print("\n" + "="*70)
        print("  ALL 9 PROPERTY CALENDAR & BLACKOUT TESTS PASSED WITH 100% SUCCESS!")
        print("="*70 + "\n")

    finally:
        db.close()

if __name__ == "__main__":
    run_calendar_e2e_tests()
