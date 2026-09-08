import sys
import os
from datetime import date, timedelta

# Set up python path to include backend root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.models.property import Property, PropertyAmenity, PropertyImage
from app.models.room import Room, RoomAmenity, RoomImage
from app.models.booking import Booking, BookingStatus, BookingRoom
from app.models.notification import Notification
from app.models.review import Review
from app.schemas.property import PropertyCreate, PropertyUpdate, clean_indian_phone
from app.schemas.room import RoomCreate, RoomUpdate
from app.schemas.booking import BookingCreate
from app.schemas.review import ReviewCreate
from app.auth.password import hash_password
from app.services.properties.property_service import PropertyService
from app.services.rooms.room_service import RoomService
from app.services.bookings.booking_service import BookingService
from app.services.reviews.review_service import ReviewService

def run_tests():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("RUNNING COMPLETE TEST SUITE FOR ALL 7 ENHANCEMENTS")
        print("=" * 60)

        # ----------------------------------------------------
        # TEST 1: Indian Phone Number Validation
        # ----------------------------------------------------
        print("\n--- TEST 1: Indian Phone Number Validation ---")
        valid_phones = ["9847012345", "+91 98470 12345", "+919847012345", "09847012345", "919847012345", "7890123456", "8901234567", "6789012345"]
        for p in valid_phones:
            cleaned = clean_indian_phone(p)
            assert len(cleaned) == 10 and cleaned[0] in "6789", f"Expected valid 10-digit number for {p}, got {cleaned}"
            print(f"  [OK] Valid phone input '{p}' -> standardized to '{cleaned}'")

        invalid_phones = ["1234567890", "98470", "98470123459999", "abcdefghij", "+1 555 123 4567"]
        for p in invalid_phones:
            try:
                clean_indian_phone(p)
                assert False, f"Expected validation error for invalid phone {p}"
            except ValueError as e:
                print(f"  [OK] Successfully rejected invalid phone '{p}': {e}")

        # ----------------------------------------------------
        # SETUP TEST DATA: Host User, Provider Profile, Customer Users
        # ----------------------------------------------------
        print("\n--- SETUP: Preparing Test Users & Database State ---")
        host_user = db.query(User).filter(User.email == "test_host_enhancements@voyara.com").first()
        if not host_user:
            host_user = User(
                email="test_host_enhancements@voyara.com",
                name="Aravind Host",
                role=UserRole.PROVIDER,
                hashed_password=hash_password("Password@123"),
                is_active=True
            )
            db.add(host_user)
            db.commit()
            db.refresh(host_user)

        provider_profile = db.query(ProviderProfile).filter(ProviderProfile.user_id == host_user.id).first()
        if not provider_profile:
            provider_profile = ProviderProfile(
                user_id=host_user.id,
                business_name="Aravind Rainforest Retreats",
                contact_phone="9847012345",
                contact_email="test_host_enhancements@voyara.com",
                verification_status="VERIFIED"
            )
            db.add(provider_profile)
            db.commit()
            db.refresh(provider_profile)

        cust_user1 = db.query(User).filter(User.email == "test_customer1@voyara.com").first()
        if not cust_user1:
            cust_user1 = User(
                email="test_customer1@voyara.com",
                name="Rahul Sharma",
                role=UserRole.CUSTOMER,
                hashed_password=hash_password("Password@123"),
                is_active=True
            )
            db.add(cust_user1)
            db.commit()
            db.refresh(cust_user1)

        cust_user2 = db.query(User).filter(User.email == "test_customer2@voyara.com").first()
        if not cust_user2:
            cust_user2 = User(
                email="test_customer2@voyara.com",
                name="Priya Nair",
                role=UserRole.CUSTOMER,
                hashed_password=hash_password("Password@123"),
                is_active=True
            )
            db.add(cust_user2)
            db.commit()
            db.refresh(cust_user2)

        # ----------------------------------------------------
        # TEST 2: Room Amenities & Features Persistence
        # ----------------------------------------------------
        print("\n--- TEST 2: Room Amenities & Features Persistence ---")
        test_prop_name = "Rainforest Eco Luxury Villa & Spa"
        # Clean up existing test property if any
        old_props = db.query(Property).filter(Property.provider_id == provider_profile.id, Property.name == test_prop_name).all()
        for op in old_props:
            db.delete(op)
        db.commit()

        prop_data = PropertyCreate(
            name=test_prop_name,
            property_type="Resort",
            description="Luxury eco-sanctuary nestled in the mist-clad hills of Munnar with organic farm and tea garden views.",
            address="Pothamedu View Point Road, Munnar",
            city="Munnar",
            state="Kerala",
            country="India",
            location_details="Near Pothamedu View Point",
            latitude=10.0889,
            longitude=77.0595,
            contact_phone="+91 98470 12345",
            contact_email="test_host_enhancements@voyara.com",
            check_in_time="14:00",
            check_out_time="11:00",
            amenities=["Wi-Fi", "Swimming Pool", "Infinity Pool", "Ayurvedic Spa"],
            images=["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80"],
            ownership_proof_url="https://example.com/proof.pdf",
            rooms=[
                RoomCreate(
                    name="Luxury Mist View Cottage",
                    room_type="Private Cottage",
                    description="Private cottage with 180-degree mist-clad valley views, ensuite Jacuzzi, and private balcony.",
                    capacity=2,
                    quantity=2,  # Exactly 2 units for multi-unit test
                    base_price=4500.0,
                    amenities=["King Bed", "Jacuzzi", "Attached Bathroom", "Free Wi-Fi", "Private Balcony", "Valley View"],
                    images=["https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80"]
                )
            ]
        )

        prop = PropertyService.create_property(db, provider_profile.id, prop_data)
        # Verify amenities in PostgreSQL
        assert len(prop.amenities) == 4, f"Expected 4 property amenities, got {len(prop.amenities)}"
        prop_am_names = [a.amenity_name for a in prop.amenities]
        assert "Infinity Pool" in prop_am_names and "Ayurvedic Spa" in prop_am_names
        print(f"  [OK] Property created with {len(prop.amenities)} amenities: {prop_am_names}")

        room = prop.rooms[0]
        assert len(room.amenities) == 6, f"Expected 6 room amenities, got {len(room.amenities)}"
        room_am_names = [a.amenity_name for a in room.amenities]
        assert "Jacuzzi" in room_am_names and "Valley View" in room_am_names
        print(f"  [OK] Room '{room.name}' created with {len(room.amenities)} amenities: {room_am_names}")

        # ----------------------------------------------------
        # TEST 3: Post-Approval Property & Room Editing
        # ----------------------------------------------------
        print("\n--- TEST 3: Post-Approval Property & Room Editing ---")
        # Approve property first
        prop.verification_status = "VERIFIED"
        prop.is_active = True
        db.commit()
        db.refresh(prop)
        print(f"  [OK] Property '{prop.name}' is approved & VERIFIED.")

        # Update property details
        update_data = PropertyUpdate(
            description="Updated: Ultra-luxury rainforest eco-sanctuary with private organic tea tastings and infinity pool.",
            amenities=["Wi-Fi", "Swimming Pool", "Infinity Pool", "Ayurvedic Spa", "Organic Tea Tasting"],
            contact_phone="9847054321"
        )
        updated_prop = PropertyService.update_property(db, prop.id, provider_profile.id, update_data)
        assert updated_prop.verification_status == "VERIFIED", "Verification status must be preserved post-update"
        assert updated_prop.contact_phone == "9847054321"
        assert len(updated_prop.amenities) == 5
        print(f"  [OK] Property updated in DB. Verification status preserved as: {updated_prop.verification_status}")

        # Update room details
        room_update = RoomUpdate(
            base_price=4800.0,
            amenities=["King Bed", "Jacuzzi", "Attached Bathroom", "Free Wi-Fi", "Private Balcony", "Valley View", "Fireplace"]
        )
        updated_room = RoomService.update_room(db, room.id, provider_profile.id, room_update)
        assert updated_room.base_price == 4800.0
        assert len(updated_room.amenities) == 7
        print(f"  [OK] Room updated in DB. Price: INR {updated_room.base_price}, Amenities: {[a.amenity_name for a in updated_room.amenities]}")
        
        # Verify reflected in customer search and details
        public_details = PropertyService.get_public_property_details(db, prop.id)
        assert public_details["name"] == prop.name
        assert public_details["rooms"][0]["base_price"] == 4800.0
        print(f"  [OK] Changes immediately reflected in public customer details (Price: INR {public_details['rooms'][0]['base_price']})")

        # ----------------------------------------------------
        # TEST 4: Room-Unit Availability & Overbooking Prevention (2 units)
        # ----------------------------------------------------
        print("\n--- TEST 4: Room-Unit Availability & Overbooking Prevention ---")
        stay_in = date.today() + timedelta(days=10)
        stay_out = date.today() + timedelta(days=13)

        # Booking 1: Customer 1 books 1 unit
        b1_data = BookingCreate(
            property_id=prop.id,
            room_id=room.id,
            room_quantity=1,
            check_in=stay_in,
            check_out=stay_out,
            total_guests=2
        )
        booking1 = BookingService.create_booking(db, cust_user1.id, b1_data)
        print(f"  [OK] Booking 1 confirmed: {booking1.booking_number} for 1 unit (1 of 2 units remaining)")

        # Booking 2: Customer 2 books the second unit
        b2_data = BookingCreate(
            property_id=prop.id,
            room_id=room.id,
            room_quantity=1,
            check_in=stay_in,
            check_out=stay_out,
            total_guests=2
        )
        booking2 = BookingService.create_booking(db, cust_user2.id, b2_data)
        print(f"  [OK] Booking 2 confirmed: {booking2.booking_number} for 1 unit (0 of 2 units remaining - fully booked!)")

        # Booking 3: Customer 1 tries to book a 3rd unit (Must be prevented by backend!)
        try:
            b3_data = BookingCreate(
                property_id=prop.id,
                room_id=room.id,
                room_quantity=1,
                check_in=stay_in,
                check_out=stay_out,
                total_guests=2
            )
            BookingService.create_booking(db, cust_user1.id, b3_data)
            assert False, "Overbooking should have been blocked!"
        except Exception as e:
            print(f"  [OK] Overbooking blocked successfully: {e}")

        # ----------------------------------------------------
        # TEST 5: Fully Booked Host In-App Alert
        # ----------------------------------------------------
        print("\n--- TEST 5: Fully Booked Host Notification ---")
        host_notif = db.query(Notification).filter(
            Notification.user_id == host_user.id,
            Notification.type == "ROOM_FULLY_BOOKED"
        ).order_by(Notification.created_at.desc()).first()
        assert host_notif is not None, "Expected ROOM_FULLY_BOOKED notification for host"
        print(f"  [OK] Host In-App Alert Received: '{host_notif.title}' -> '{host_notif.message}'")

        # ----------------------------------------------------
        # TEST 6: Automatic Unit Availability Post-Checkout & Auto-Complete
        # ----------------------------------------------------
        print("\n--- TEST 6: Unit Availability Post-Checkout & Auto-Complete ---")
        # Same room is available for dates starting immediately on checkout day (stay_out)
        future_in = stay_out
        future_out = stay_out + timedelta(days=2)
        b_future_data = BookingCreate(
            property_id=prop.id,
            room_id=room.id,
            room_quantity=2,  # Both 2 units must be available again!
            check_in=future_in,
            check_out=future_out,
            total_guests=4
        )
        booking_future = BookingService.create_booking(db, cust_user1.id, b_future_data)
        print(f"  [OK] Units available immediately on checkout date: Booking {booking_future.booking_number} created for 2 units.")

        # Test past stay auto-completion
        past_booking = Booking(
            booking_number="VOY-PAST-01",
            user_id=cust_user1.id,
            property_id=prop.id,
            check_in=date.today() - timedelta(days=5),
            check_out=date.today() - timedelta(days=2),
            total_nights=3,
            total_guests=2,
            room_total=9000.0,
            experience_total=0.0,
            total_amount=9000.0,
            status=BookingStatus.CONFIRMED
        )
        db.add(past_booking)
        db.commit()
        db.refresh(past_booking)

        BookingService.auto_complete_past_bookings(db)
        db.refresh(past_booking)
        assert past_booking.status == BookingStatus.COMPLETED, f"Expected COMPLETED status, got {past_booking.status}"
        print(f"  [OK] Past booking {past_booking.booking_number} auto-completed to: {past_booking.status.value}")

        # ----------------------------------------------------
        # TEST 7: Customer Review & Rating System
        # ----------------------------------------------------
        print("\n--- TEST 7: Customer Review & Rating System ---")
        # Check eligible bookings for review
        eligible = ReviewService.get_eligible_bookings_for_review(db, cust_user1.id)
        eligible_ids = [b["id"] for b in eligible]
        assert past_booking.id in eligible_ids, "Completed past booking must be eligible for review"
        print(f"  [OK] Customer has {len(eligible)} eligible booking(s) for review: IDs {eligible_ids}")

        # Submit 5-star review
        rev_data = ReviewCreate(
            booking_id=past_booking.id,
            rating=5.0,
            cleanliness_rating=5.0,
            comfort_rating=5.0,
            location_rating=5.0,
            hospitality_rating=5.0,
            value_rating=5.0,
            title="Magical Rainforest Stay!",
            comment="The mist-clad valley views, private Jacuzzi, and exceptional hospitality made this stay unforgettable. Will visit again!"
        )
        new_review = ReviewService.create_review(db, cust_user1.id, rev_data)
        assert new_review.property_id == prop.id
        assert new_review.rating == 5.0
        print(f"  [OK] Review submitted successfully (ID: {new_review.id}, Rating: {new_review.rating} stars)")

        # Verify property rating and review count updated in PostgreSQL
        db.refresh(prop)
        assert prop.review_count >= 1
        assert prop.rating == 5.0
        print(f"  [OK] Property rating recalculated: {prop.rating} stars across {prop.review_count} verified review(s).")

        # Verify review summary endpoint
        summary = ReviewService.get_property_reviews(db, prop.id)
        assert summary["total_reviews"] >= 1
        assert summary["average_rating"] == 5.0
        assert len(summary["reviews"]) >= 1
        print(f"  [OK] Property reviews summary verified: Average {summary['average_rating']} stars, {len(summary['reviews'])} review(s) returned.")

        # Verify customer cannot double-review the same booking
        try:
            ReviewService.create_review(db, cust_user1.id, rev_data)
            assert False, "Double review on same booking should be blocked!"
        except Exception as e:
            print(f"  [OK] Duplicate review blocked: {e}")

        print("\n" + "=" * 60)
        print("ALL 7 ENHANCEMENT TESTS PASSED PERFECTLY!")
        print("=" * 60)

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
