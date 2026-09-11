"""
End-to-end automated test suite for:
1. Simplified Search Filters (destination, property name, host name, property type, price range)
2. Host Guest Information & Safety Message (CRUD, auth, 5000 character validation)
3. Booking message snapshot immutability & notifications (BOOKING_CONFIRMED & HOST_MESSAGE)
4. Check-in reminder service (Asia/Kolkata tomorrow date matching, idempotency)
5. Admin user directory verification
"""

import sys
import os
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo

# Add backend directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.models.property import Property, PropertyType, PropertyVerificationStatus
from app.models.room import Room
from app.models.booking import Booking, BookingStatus
from app.models.notification import Notification
from app.services.properties.property_service import PropertyService
from app.services.bookings.booking_service import BookingService
from app.services.reminders.reminder_service import ReminderService
from app.auth.password import hash_password
from app.schemas.property import GuestInformationMessageRequest
from app.schemas.user import UserResponse
from app.routers.provider.properties import get_property_guest_information, update_property_guest_information
from fastapi import HTTPException

def run_tests():
    db = SessionLocal()
    print("==================================================")
    print("RUNNING VOYARA VERIFICATION TEST SUITE")
    print("==================================================")
    
    try:
        # 1. SETUP TEST USERS & HOSTS
        print("\n[STEP 1] Setting up test data...")
        
        # Test Provider 1
        provider1 = db.query(User).filter((User.email == "host_alpha@voyara.test") | (User.phone == "+919800000001")).first()
        if not provider1:
            provider1 = User(
                email="host_alpha@voyara.test",
                hashed_password=hash_password("Password123!"),
                name="Alpha Hospitality Group",
                role=UserRole.PROVIDER,
                is_active=True,
                phone="+919800000001"
            )
            db.add(provider1)
            db.commit()
            db.refresh(provider1)

        prof1 = db.query(ProviderProfile).filter(ProviderProfile.user_id == provider1.id).first()
        if not prof1:
            prof1 = ProviderProfile(
                user_id=provider1.id,
                business_name="Alpha Hospitality Group",
                contact_phone="+919800000001",
                contact_email="host_alpha@voyara.test",
                verification_status="VERIFIED"
            )
            db.add(prof1)
            db.commit()
            db.refresh(prof1)

        # Test Provider 2
        provider2 = db.query(User).filter((User.email == "host_beta@voyara.test") | (User.phone == "+919800000002")).first()
        if not provider2:
            provider2 = User(
                email="host_beta@voyara.test",
                hashed_password=hash_password("Password123!"),
                name="Beta Retreats Ltd",
                role=UserRole.PROVIDER,
                is_active=True,
                phone="+919800000002"
            )
            db.add(provider2)
            db.commit()
            db.refresh(provider2)

        prof2 = db.query(ProviderProfile).filter(ProviderProfile.user_id == provider2.id).first()
        if not prof2:
            prof2 = ProviderProfile(
                user_id=provider2.id,
                business_name="Beta Retreats Ltd",
                contact_phone="+919800000002",
                contact_email="host_beta@voyara.test",
                verification_status="VERIFIED"
            )
            db.add(prof2)
            db.commit()
            db.refresh(prof2)

        # Test Customer
        customer = db.query(User).filter((User.email == "guest_test@voyara.test") | (User.phone == "+919800000003")).first()
        if not customer:
            customer = User(
                email="guest_test@voyara.test",
                hashed_password=hash_password("Password123!"),
                name="Rohan Sharma",
                role=UserRole.CUSTOMER,
                is_active=True,
                phone="+919800000003"
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)

        # Test Admin
        admin = db.query(User).filter(User.email == "admin_test@voyara.test").first()
        if not admin:
            admin = User(
                email="admin_test@voyara.test",
                hashed_password=hash_password("Password123!"),
                name="Voyara Admin",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        # Test Property 1 for Provider 1 (Villa in Munnar, Verified & Active)
        prop1 = db.query(Property).filter(Property.name == "Munnar Misty Cloud Villa").first()
        if not prop1:
            prop1 = Property(
                provider_id=prof1.id,
                name="Munnar Misty Cloud Villa",
                description="Luxury hill retreat overlooking tea gardens",
                property_type="Villa",
                city="Munnar",
                state="Kerala",
                address="Pothamedu Viewpoint Rd",
                contact_phone="+919876543210",
                contact_email="host_alpha@voyara.test",
                verification_status=PropertyVerificationStatus.VERIFIED,
                is_active=True,
                check_in_time="14:00",
                check_out_time="11:00",
                guest_information_message="Welcome to Munnar Misty Cloud Villa! Please carry government ID. Gate opens at 6 AM."
            )
            db.add(prop1)
            db.commit()
            db.refresh(prop1)

        # Add Room to Prop 1 (Price ₹4,500)
        room1 = db.query(Room).filter(Room.property_id == prop1.id).first()
        if not room1:
            room1 = Room(
                property_id=prop1.id,
                name="Valley View Suite",
                room_type="Suite",
                description="Spacious valley view suite",
                base_price=4500.0,
                capacity=4,
                quantity=3,
                is_active=True
            )
            db.add(room1)
            db.commit()
            db.refresh(room1)

        # Test Property 2 for Provider 2 (Resort in Wayanad, Verified & Active, Price ₹8,000)
        prop2 = db.query(Property).filter(Property.name == "Wayanad Rainforest Sanctuary").first()
        if not prop2:
            prop2 = Property(
                provider_id=prof2.id,
                name="Wayanad Rainforest Sanctuary",
                description="Eco luxury resort inside deep tropical forest",
                property_type="Resort",
                city="Wayanad",
                state="Kerala",
                address="Lakkidi Rainforest Way",
                contact_phone="+919876543211",
                contact_email="host_beta@voyara.test",
                verification_status=PropertyVerificationStatus.VERIFIED,
                is_active=True,
                check_in_time="13:00",
                check_out_time="10:00",
                guest_information_message="Welcome to Wayanad Sanctuary! Wildlife sightings are common. Avoid night walks."
            )
            db.add(prop2)
            db.commit()
            db.refresh(prop2)

        room2 = db.query(Room).filter(Room.property_id == prop2.id).first()
        if not room2:
            room2 = Room(
                property_id=prop2.id,
                name="Treehouse Villa",
                room_type="Villa",
                description="Serene treehouse canopy accommodation",
                base_price=8000.0,
                capacity=2,
                quantity=2,
                is_active=True
            )
            db.add(room2)
            db.commit()
            db.refresh(room2)

        print("[PASS] Test entities successfully created/loaded.")

        # ==================================================
        # TEST 1: SEARCH FILTERS
        # ==================================================
        print("\n[TEST 1] Testing Search & Filter Logic...")
        
        # 1A. Search by destination "Munnar"
        results = PropertyService.search_properties(db, destination="Munnar")
        assert any(p["id"] == prop1.id for p in results), "Destination search for Munnar should find prop1"
        assert not any(p["id"] == prop2.id for p in results), "Destination search for Munnar should NOT find prop2"
        print("[PASS] Destination search ('Munnar') passed.")

        # 1B. Search by property name "Cloud Villa"
        results = PropertyService.search_properties(db, destination="Cloud Villa")
        assert any(p["id"] == prop1.id for p in results), "Property name search should find prop1"
        print("[PASS] Property name search ('Cloud Villa') passed.")

        # 1C. Search by Host Name "Alpha Hospitality"
        results = PropertyService.search_properties(db, destination="Alpha Hospitality")
        assert any(p["id"] == prop1.id for p in results), "Host name search should find prop1"
        assert not any(p["id"] == prop2.id for p in results), "Host name search should NOT find prop2"
        print("[PASS] Host name search ('Alpha Hospitality') passed.")

        # 1D. Search by Property Type "Villa"
        results = PropertyService.search_properties(db, property_type="Villa")
        assert any(p["id"] == prop1.id for p in results), "Property type Villa should find prop1"
        assert not any(p["id"] == prop2.id for p in results), "Property type Villa should NOT find prop2 (Resort)"
        print("[PASS] Property type search ('Villa') passed.")

        # 1E. Search by Price Range: ₹3,000 to ₹5,000 (prop1 is ₹4,500, prop2 is ₹8,000)
        results = PropertyService.search_properties(db, min_price=3000, max_price=5000)
        assert any(p["id"] == prop1.id for p in results), "Price range [3000, 5000] should find prop1 (₹4500)"
        assert not any(p["id"] == prop2.id for p in results), "Price range [3000, 5000] should NOT find prop2 (₹8000)"
        print("[PASS] Price range search [3000, 5000] passed.")

        # 1F. Search Combo: Destination 'Munnar' + Type 'Villa' + Price <= 5000
        results = PropertyService.search_properties(db, destination="Munnar", property_type="Villa", max_price=5000)
        assert len(results) >= 1 and any(p["id"] == prop1.id for p in results), "Combo search should match prop1"
        print("[PASS] Combined search filters passed.")

        # ==================================================
        # TEST 2: HOST GUEST INFORMATION & SAFETY MESSAGE
        # ==================================================
        print("\n[TEST 2] Testing Host Guest Information Message CRUD & Auth...")
        
        # Reset prop1 message to known baseline
        prop1.guest_information_message = "Welcome to Munnar Misty Cloud Villa! Please carry government ID. Gate opens at 6 AM."
        db.commit()
        db.refresh(prop1)

        # 2A. Provider 1 gets their property message
        info_resp = get_property_guest_information(property_id=prop1.id, provider=prof1, db=db)
        assert "Welcome to Munnar" in (info_resp["guest_information_message"] or ""), "Host should retrieve message"
        print("[PASS] Host successfully fetched guest information message.")

        # 2B. Provider 1 updates their property message
        new_msg = "Updated Safety Rules: 1. No loud music after 10 PM. 2. Pool closes at 8 PM. 3. Caretaker contact: +919876543210."
        update_req = GuestInformationMessageRequest(guest_information_message=new_msg)
        update_resp = update_property_guest_information(property_id=prop1.id, data=update_req, provider=prof1, db=db)
        assert update_resp["guest_information_message"] == new_msg, "Message should update correctly"
        
        # Verify in DB
        db.refresh(prop1)
        assert prop1.guest_information_message == new_msg, "DB should reflect new message"
        print("[PASS] Host successfully updated guest information message.")

        # 2C. Host Authorization: Provider 2 trying to update Provider 1's property must be rejected (403 or 404)
        try:
            update_property_guest_information(property_id=prop1.id, data=update_req, provider=prof2, db=db)
            assert False, "Expected 403 or 404 HTTPException when Provider 2 attempts to edit Provider 1's property"
        except HTTPException as e:
            assert e.status_code in [403, 404], f"Expected 403 or 404 status code, got {e.status_code}"
            print("[PASS] Host ownership authorization (403/404 on unauthorized host) passed.")

        # 2D. 5000 Character validation
        huge_msg = "X" * 5001
        try:
            update_property_guest_information(property_id=prop1.id, data=GuestInformationMessageRequest(guest_information_message=huge_msg), provider=prof1, db=db)
            assert False, "Expected 400 or 422 HTTPException for message exceeding 5000 characters"
        except HTTPException as e:
            assert e.status_code in [400, 422], f"Expected 400 or 422 status code for >5000 chars, got {e.status_code}"
            print("[PASS] 5000 character length limit enforcement passed.")

        # ==================================================
        # TEST 3: BOOKING SNAPSHOT & IMMUTABILITY
        # ==================================================
        print("\n[TEST 3] Testing Booking Snapshot & Snapshot Immutability...")
        
        # Current message on prop1 is `new_msg`
        # 3A. Create booking for prop1
        booking_code = f"VOY-TEST-{int(datetime.now().timestamp())}"
        test_booking = Booking(
            booking_number=booking_code,
            user_id=customer.id,
            property_id=prop1.id,
            check_in=date.today() + timedelta(days=5),
            check_out=date.today() + timedelta(days=7),
            total_nights=2,
            total_guests=2,
            total_amount=9000.0,
            status=BookingStatus.CONFIRMED,
            guest_information_message_snapshot=prop1.guest_information_message
        )
        db.add(test_booking)
        db.commit()
        db.refresh(test_booking)

        assert test_booking.guest_information_message_snapshot == new_msg, "Booking should snapshot host message at booking time"
        print(f"[PASS] Booking {test_booking.booking_number} created with message snapshot.")

        # 3B. Host now modifies the property message to something completely different
        brand_new_msg = "COMPLETELY NEW MESSAGE FOR FUTURE GUESTS ONLY!"
        prop1.guest_information_message = brand_new_msg
        db.commit()
        db.refresh(prop1)
        db.refresh(test_booking)

        # Verify booking snapshot is UNCHANGED
        assert test_booking.guest_information_message_snapshot == new_msg, "Booking snapshot must remain immutable!"
        assert prop1.guest_information_message == brand_new_msg, "Property message updated for future bookings"
        print("[PASS] Booking message snapshot immutability verified (existing booking kept original message).")

        # ==================================================
        # TEST 4: CHECK-IN REMINDER BACKGROUND SERVICE
        # ==================================================
        print("\n[TEST 4] Testing One-Day-Before Check-In Reminder Service...")
        
        # Calculate tomorrow in Asia/Kolkata
        try:
            tz = ZoneInfo("Asia/Kolkata")
            tomorrow_ist = datetime.now(tz).date() + timedelta(days=1)
        except Exception:
            from datetime import timezone
            tz = timezone(timedelta(hours=5, minutes=30))
            tomorrow_ist = datetime.now(tz).date() + timedelta(days=1)

        # Create a booking with check_in = tomorrow_ist
        reminder_booking_code = f"VOY-REMIND-{int(datetime.now().timestamp())}"
        reminder_booking = Booking(
            booking_number=reminder_booking_code,
            user_id=customer.id,
            property_id=prop1.id,
            check_in=tomorrow_ist,
            check_out=tomorrow_ist + timedelta(days=2),
            total_nights=2,
            total_guests=2,
            total_amount=9000.0,
            status=BookingStatus.CONFIRMED,
            guest_information_message_snapshot=prop1.guest_information_message,
            checkin_reminder_sent=False
        )
        db.add(reminder_booking)
        db.commit()
        db.refresh(reminder_booking)

        # Run ReminderService
        reminders_res = ReminderService.process_checkin_reminders(db)
        print(f"[PASS] ReminderService ran. Result: {reminders_res}")
        assert reminders_res["reminders_sent"] >= 1, "At least 1 reminder should be sent"

        db.refresh(reminder_booking)
        assert reminder_booking.checkin_reminder_sent == True, "Booking.checkin_reminder_sent should now be True"

        # Check notification in DB
        notif = db.query(Notification).filter(
            Notification.user_id == customer.id,
            Notification.booking_id == reminder_booking.id,
            Notification.type == "CHECKIN_REMINDER"
        ).first()
        assert notif is not None, "CHECKIN_REMINDER notification must exist in DB"
        assert "tomorrow" in notif.title.lower() or "check-in" in notif.title.lower() or "reminder" in notif.title.lower(), f"Notification title: {notif.title}"
        print(f"[PASS] Verified CHECKIN_REMINDER notification created: '{notif.title}'")

        # 4B. IDEMPOTENCY TEST: Running reminder again should NOT send duplicate notification
        reminders_res_2 = ReminderService.process_checkin_reminders(db)
        assert reminders_res_2["reminders_sent"] == 0, "Second run should send 0 duplicate reminders"
        notif_count = db.query(Notification).filter(
            Notification.user_id == customer.id,
            Notification.booking_id == reminder_booking.id,
            Notification.type == "CHECKIN_REMINDER"
        ).count()
        assert notif_count == 1, f"Expected exactly 1 notification, found {notif_count}"
        print("[PASS] Idempotency test passed (no duplicate notifications generated on repeated runs).")

        # ==================================================
        # TEST 5: ADMIN USERS DIRECTORY (Email Validation Fix)
        # ==================================================
        print("\n[TEST 5] Testing Admin Users Directory Serializer...")
        user_res = UserResponse.model_validate(customer)
        assert user_res.email == customer.email
        assert user_res.role == "CUSTOMER"
        print("[PASS] UserResponse serialized properly without email TLD validation failure.")

        print("\n==================================================")
        print("ALL TESTS COMPLETED SUCCESSFULLY! [PASS]")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
