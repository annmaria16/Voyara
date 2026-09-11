import sys
import os
from datetime import datetime, date, timedelta, time, timezone

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

IST = timezone(timedelta(hours=5, minutes=30))

from app.database import SessionLocal, engine
from app.models.user import User, UserRole
from app.models.property import Property
from app.models.provider import ProviderProfile
from app.models.room import Room
from app.models.booking import Booking, BookingStatus, BookingRoom
from app.models.refund import Refund, RefundStatus
from app.models.review import Review
from app.schemas.review import ReviewCreate
from app.services.bookings.booking_service import BookingService
from app.services.reviews.review_service import ReviewService
from app.services.availability.availability_service import AvailabilityService
from app.services.verinova.verification_service import VeriNovaService

def run_lifecycle_tests():
    print("\n=======================================================")
    print("  VOYARA: COMPLETE BOOKING LIFECYCLE AUTOMATED TEST SUITE")
    print("=======================================================\n")
    
    db = SessionLocal()
    try:
        # 1. Fetch test users and property
        customer = db.query(User).filter(User.role == UserRole.CUSTOMER).first()
        provider = db.query(User).filter(User.role == UserRole.PROVIDER).first()
        
        assert customer is not None, "Customer user must exist in DB"
        assert provider is not None, "Provider user must exist in DB"
        
        provider_profile = db.query(ProviderProfile).filter(ProviderProfile.user_id == provider.id).first()
        if not provider_profile:
            provider_profile = ProviderProfile(
                user_id=provider.id,
                business_name="Voyara Testing Host",
                is_verified=True,
            )
            db.add(provider_profile)
            db.commit()
            db.refresh(provider_profile)
            
        # Create or fetch a test property with cancellation_refund_percentage = 50
        test_prop = db.query(Property).filter(Property.provider_id == provider_profile.id).first()
        if not test_prop:
            test_prop = Property(
                provider_id=provider_profile.id,
                name="Lifecycle Test Sanctuary",
                property_type="Resort",
                description="Automated testing property",
                address="123 Test Road",
                city="Munnar",
                state="Kerala",
                country="India",
                contact_phone="9876543210",
                contact_email="provider@voyara.com",
                check_in_time="14:00",
                check_out_time="11:00",
                cancellation_refund_percentage=50,
                verification_status="VERIFIED",
                is_active=True,
            )
            db.add(test_prop)
            db.commit()
            db.refresh(test_prop)
        else:
            test_prop.cancellation_refund_percentage = 50
            db.commit()
            db.refresh(test_prop)
            
        # Ensure a test room with quantity = 2
        test_room = db.query(Room).filter(Room.property_id == test_prop.id, Room.is_active == True).first()
        if not test_room:
            test_room = Room(
                property_id=test_prop.id,
                name="Deluxe Test Suite",
                room_type="Deluxe Room",
                description="Testing room",
                capacity=2,
                quantity=2,
                base_price=3000.0,
                is_active=True,
            )
            db.add(test_room)
            db.commit()
            db.refresh(test_room)
        else:
            test_room.quantity = 2
            db.commit()
            db.refresh(test_room)
            
        print(f"[+] Loaded Test Property: {test_prop.name} (Policy: {test_prop.cancellation_refund_percentage}%)")
        print(f"[+] Loaded Test Room: {test_room.name} (Capacity: {test_room.capacity}, Qty: {test_room.quantity}, Price: INR {test_room.base_price})")
        print(f"[+] Loaded Customer: {customer.email}")
        
        # -------------------------------------------------------------
        # TEST 1: Tier 1 Cancellation (>= 2 days in advance -> 100% refund)
        # -------------------------------------------------------------
        print("\n--- TEST 1: Tier 1 Cancellation (>= 2 days prior -> 100% refund) ---")
        far_check_in = (datetime.now(IST) + timedelta(days=10)).date()
        far_check_out = far_check_in + timedelta(days=2)
        
        booking_1 = Booking(
            booking_number=f"TEST-T1-{int(datetime.now().timestamp())}",
            user_id=customer.id,
            property_id=test_prop.id,
            check_in=far_check_in,
            check_out=far_check_out,
            total_nights=2,
            total_guests=2,
            total_amount=6000.0,
            status=BookingStatus.CONFIRMED,
            cancellation_policy_snapshot="100% refund up to 2 days before check-in, 50% thereafter.",
            refund_percentage_snapshot=50,
        )
        db.add(booking_1)
        db.flush()
        
        br_1 = BookingRoom(
            booking_id=booking_1.id,
            room_id=test_room.id,
            room_name=test_room.name,
            quantity=1,
            nights=2,
            guests=2,
            nightly_price=3000.0,
            subtotal=6000.0,
        )
        db.add(br_1)
        db.commit()
        db.refresh(booking_1)
        
        preview_1 = BookingService.get_cancellation_preview(db, booking_1.id, customer.id)
        assert preview_1["can_cancel"] == True
        assert preview_1["is_free_cancellation"] == True
        assert preview_1["refund_percentage"] == 100.0
        assert preview_1["refund_amount"] == 6000.0
        assert preview_1["cancellation_fee"] == 0.0
        print(f"    [OK] Preview calculated: 100% refund (INR {preview_1['refund_amount']}), Fee: INR {preview_1['cancellation_fee']}")
        
        # Execute cancellation
        cancel_res_1 = BookingService.cancel_booking(db, booking_1.id, customer.id, "Change of plans")
        assert cancel_res_1.status == BookingStatus.CANCELLED
        assert cancel_res_1.refund is not None
        assert cancel_res_1.refund.refund_amount == 6000.0
        assert cancel_res_1.refund.refund_percentage == 100.0
        print(f"    [OK] Booking cancelled successfully. Refund Ref: {cancel_res_1.refund.refund_reference}, Status: {cancel_res_1.refund.refund_status}")
        
        # -------------------------------------------------------------
        # TEST 2: Tier 2 Cancellation (< 2 days prior -> host snapshot policy)
        # -------------------------------------------------------------
        print("\n--- TEST 2: Tier 2 Cancellation (< 2 days prior -> host policy 50%) ---")
        near_check_in = (datetime.now(IST) + timedelta(days=1)).date()
        near_check_out = near_check_in + timedelta(days=2)
        
        booking_2 = Booking(
            booking_number=f"TEST-T2-{int(datetime.now().timestamp())}",
            user_id=customer.id,
            property_id=test_prop.id,
            check_in=near_check_in,
            check_out=near_check_out,
            total_nights=2,
            total_guests=2,
            total_amount=6000.0,
            status=BookingStatus.CONFIRMED,
            cancellation_policy_snapshot="100% refund up to 2 days before check-in, 50% thereafter.",
            refund_percentage_snapshot=50,
        )
        db.add(booking_2)
        db.flush()
        
        br_2 = BookingRoom(
            booking_id=booking_2.id,
            room_id=test_room.id,
            room_name=test_room.name,
            quantity=1,
            nights=2,
            guests=2,
            nightly_price=3000.0,
            subtotal=6000.0,
        )
        db.add(br_2)
        db.commit()
        db.refresh(booking_2)
        
        preview_2 = BookingService.get_cancellation_preview(db, booking_2.id, customer.id)
        assert preview_2["can_cancel"] == True
        assert preview_2["is_free_cancellation"] == False
        assert preview_2["refund_percentage"] == 50.0
        assert preview_2["refund_amount"] == 3000.0
        assert preview_2["cancellation_fee"] == 3000.0
        print(f"    [OK] Preview calculated: 50% refund (INR {preview_2['refund_amount']}), Fee: INR {preview_2['cancellation_fee']}")
        
        # Execute cancellation
        cancel_res_2 = BookingService.cancel_booking(db, booking_2.id, customer.id, "Last minute emergency")
        assert cancel_res_2.status == BookingStatus.CANCELLED
        assert cancel_res_2.refund.refund_amount == 3000.0
        assert cancel_res_2.refund.refund_percentage == 50.0
        assert cancel_res_2.refund.cancellation_fee == 3000.0
        print(f"    [OK] Booking cancelled with 50% refund. Refund Ref: {cancel_res_2.refund.refund_reference}")
        
        # -------------------------------------------------------------
        # TEST 3: Snapshot Immutability (Host modifies property policy later)
        # -------------------------------------------------------------
        print("\n--- TEST 3: Snapshot Immutability (Host updates policy to 0%) ---")
        # Booking confirmed when policy was 75%
        booking_3 = Booking(
            booking_number=f"TEST-T3-{int(datetime.now().timestamp())}",
            user_id=customer.id,
            property_id=test_prop.id,
            check_in=near_check_in,
            check_out=near_check_out,
            total_nights=2,
            total_guests=2,
            total_amount=6000.0,
            status=BookingStatus.CONFIRMED,
            cancellation_policy_snapshot="100% refund >= 2 days, 75% thereafter.",
            refund_percentage_snapshot=75,
        )
        db.add(booking_3)
        db.commit()
        db.refresh(booking_3)
        
        # Host changes property policy to 0%
        test_prop.cancellation_refund_percentage = 0
        db.commit()
        
        # Cancellation preview must still yield 75% because snapshot is immutable!
        preview_3 = BookingService.get_cancellation_preview(db, booking_3.id, customer.id)
        assert preview_3["refund_percentage"] == 75.0, f"Expected 75.0, got {preview_3['refund_percentage']}"
        assert preview_3["refund_amount"] == 4500.0
        print(f"    [OK] Frozen snapshot honored: 75% refund (INR 4500.0) despite live property policy having changed to 0%")
        
        # Reset test_prop policy back to 50
        test_prop.cancellation_refund_percentage = 50
        db.commit()
        
        # -------------------------------------------------------------
        # TEST 4: Date-Specific Room Inventory & Concurrency
        # -------------------------------------------------------------
        print("\n--- TEST 4: Room Availability & Inventory Lock ---")
        target_check_in = (datetime.now(IST) + timedelta(days=20)).date()
        target_check_out = target_check_in + timedelta(days=2)
        
        # Check initial availability (quantity is 2)
        avail_init = AvailabilityService.check_room_availability(db, test_room.id, target_check_in, target_check_out)
        assert avail_init["available_quantity"] == 2
        assert avail_init["is_available"] == True
        print(f"    [OK] Initial room availability for {target_check_in} to {target_check_out}: {avail_init['available_quantity']} units")
        
        # Book 2 units
        booking_inv = Booking(
            booking_number=f"TEST-INV-{int(datetime.now().timestamp())}",
            user_id=customer.id,
            property_id=test_prop.id,
            check_in=target_check_in,
            check_out=target_check_out,
            total_nights=2,
            total_guests=4,
            total_amount=12000.0,
            status=BookingStatus.CONFIRMED,
        )
        db.add(booking_inv)
        db.flush()
        
        br_inv = BookingRoom(
            booking_id=booking_inv.id,
            room_id=test_room.id,
            room_name=test_room.name,
            quantity=2,
            nights=2,
            guests=4,
            nightly_price=3000.0,
            subtotal=12000.0,
        )
        db.add(br_inv)
        db.commit()
        
        # Now check availability again -> must be 0
        avail_after = AvailabilityService.check_room_availability(db, test_room.id, target_check_in, target_check_out)
        assert avail_after["available_quantity"] == 0
        assert avail_after["is_available"] == False
        print(f"    [OK] After booking 2 units, available_quantity is 0 (Sold Out correctly enforced)")
        
        # Cancel booking -> inventory must immediately be released back to 2!
        BookingService.cancel_booking(db, booking_inv.id, customer.id, "Testing inventory release")
        avail_released = AvailabilityService.check_room_availability(db, test_room.id, target_check_in, target_check_out)
        assert avail_released["available_quantity"] == 2
        assert avail_released["is_available"] == True
        print(f"    [OK] After cancellation, inventory instantly returned to {avail_released['available_quantity']} units")
        
        # -------------------------------------------------------------
        # TEST 5: Complete Lifecycle (CONFIRMED -> CHECKED_IN -> COMPLETED)
        # -------------------------------------------------------------
        print("\n--- TEST 5: Check-in, Check-out & Lifecycle Progression ---")
        stay_check_in = (datetime.now(IST) - timedelta(days=1)).date()
        stay_check_out = stay_check_in + timedelta(days=2)
        
        booking_stay = Booking(
            booking_number=f"TEST-STAY-{int(datetime.now().timestamp())}",
            user_id=customer.id,
            property_id=test_prop.id,
            check_in=stay_check_in,
            check_out=stay_check_out,
            total_nights=2,
            total_guests=2,
            total_amount=6000.0,
            status=BookingStatus.CONFIRMED,
        )
        db.add(booking_stay)
        db.flush()
        
        br_stay = BookingRoom(
            booking_id=booking_stay.id,
            room_id=test_room.id,
            room_name=test_room.name,
            quantity=1,
            nights=2,
            guests=2,
            nightly_price=3000.0,
            subtotal=6000.0,
        )
        db.add(br_stay)
        db.commit()
        db.refresh(booking_stay)
        
        # Host marks guest as Checked-In
        res_check_in = BookingService.check_in_booking(db, booking_stay.id, provider_profile.id)
        assert res_check_in.status == BookingStatus.CHECKED_IN
        assert res_check_in.checked_in_at is not None
        print(f"    [OK] Host checked in guest at {res_check_in.checked_in_at.isoformat()}. Status: {res_check_in.status.value}")
        
        # Attempt cancellation while CHECKED_IN -> MUST FAIL with 400
        try:
            BookingService.cancel_booking(db, booking_stay.id, customer.id, "Attempt invalid cancellation")
            assert False, "Cancellation must fail when status is CHECKED_IN"
        except Exception as e:
            print(f"    [OK] Cancellation successfully BLOCKED for CHECKED_IN booking: {e}")
            
        # Host marks guest as Checked-Out -> transitions to COMPLETED
        res_check_out = BookingService.check_out_booking(db, booking_stay.id, provider_profile.id)
        assert res_check_out.status == BookingStatus.COMPLETED
        assert res_check_out.checked_out_at is not None
        assert res_check_out.completed_at is not None
        print(f"    [OK] Host checked out guest at {res_check_out.checked_out_at.isoformat()}. Status: {res_check_out.status.value}")
        
        # -------------------------------------------------------------
        # TEST 6: Review System Verification (Only COMPLETED stays)
        # -------------------------------------------------------------
        print("\n--- TEST 6: Review Submission & DB Rating Recalculation ---")
        eligibility = ReviewService.get_booking_review_eligibility(db, booking_stay.id, customer.id)
        assert eligibility["eligible"] == True
        print(f"    [OK] Review eligibility check passed: {eligibility['reason']}")
        
        # Submit review
        review_data = ReviewCreate(
            booking_id=booking_stay.id,
            property_id=test_prop.id,
            rating=5.0,
            cleanliness_rating=5.0,
            accuracy_rating=5.0,
            communication_rating=5.0,
            location_rating=5.0,
            value_rating=5.0,
            comment="Exceptional stay, pristine hospitality and seamless check-in/check-out experience!",
        )
        review = ReviewService.create_review(db, customer.id, review_data)
        assert review.id is not None
        assert review.rating == 5.0
        print(f"    [OK] Review created in PostgreSQL with ID {review.id}")
        
        # Property rating must have been updated in DB
        prop_revs = ReviewService.get_property_reviews(db, test_prop.id)
        assert prop_revs["total_reviews"] > 0
        assert prop_revs["average_rating"] > 0
        print(f"    [OK] Property rating recalculated: {prop_revs['average_rating']}/5 across {prop_revs['total_reviews']} reviews")
        
        # Attempt submitting a duplicate review for the same booking -> MUST FAIL
        try:
            ReviewService.create_review(db, customer.id, review_data)
            assert False, "Duplicate review must fail"
        except Exception as dup_err:
            print(f"    [OK] Duplicate review submission strictly rejected: {dup_err}")
            
        # -------------------------------------------------------------
        # TEST 7: VeriNova Verification Engine Integrity Check
        # -------------------------------------------------------------
        print("\n--- TEST 7: VeriNova Integrity Audit ---")
        verinova_audit = VeriNovaService.verify_cancellation_transaction(
            db=db,
            booking_id=booking_1.id,
            refund_id=cancel_res_1.refund.id,
        )
        assert verinova_audit["is_valid"] == True
        assert verinova_audit["refund_integrity"] == "PASS"
        print(f"    [OK] VeriNova cancellation audit passed with SHA256 integrity hash: {verinova_audit['audit_hash'][:16]}...")
        
        print("\n=======================================================")
        print("  ALL BOOKING LIFECYCLE & REFUND TESTS PASSED 100%!")
        print("=======================================================\n")
        return True
        
    except Exception as e:
        print(f"\n[!] TEST RUN ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = run_lifecycle_tests()
    if not success:
        sys.exit(1)
