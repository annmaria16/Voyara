import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User, UserRole, AccountStatus
from app.models.provider import ProviderProfile
from app.models.property import Property, PropertyVerificationStatus
from app.models.room import Room
from app.models.experience import Experience
from app.models.booking import Booking, BookingStatus
from app.models.review import Review
from app.services.search.provider_search_service import ProviderSearchService
from app.services.search.admin_search_service import AdminSearchService
from app.services.properties.property_service import PropertyService
from datetime import date, datetime

def run_tests():
    db = SessionLocal()
    try:
        print("=== RUNNING VOYARA ROLE-BASED SEARCH TESTS ===")

        # Find or ensure test users and providers
        provider_a = db.query(ProviderProfile).first()
        if not provider_a:
            print("Creating test Provider A...")
            user_a = User(
                name="Stay Partner Alpha",
                email="provider_a_test@voyara.com",
                password_hash="testhash",
                role=UserRole.PROVIDER,
                account_status=AccountStatus.ACTIVE
            )
            db.add(user_a)
            db.commit()
            provider_a = ProviderProfile(
                user_id=user_a.id,
                business_name="Alpha Hospitality Group",
                contact_phone="+919876543210",
                contact_email="provider_a_test@voyara.com"
            )
            db.add(provider_a)
            db.commit()

        # Find or create properties for Provider A
        prop_a = db.query(Property).filter(Property.provider_id == provider_a.id).first()
        if not prop_a:
            prop_a = Property(
                provider_id=provider_a.id,
                name="Misty Valley Retreat & Spa",
                property_type="Resort",
                description="Luxurious hill retreat in the tea gardens",
                address="Misty Valley Road, Tea Estate",
                city="Munnar",
                state="Kerala",
                country="India",
                contact_phone="+919876543210",
                contact_email=provider_a.contact_email,
                verification_status="VERIFIED",
                is_active=True
            )
            db.add(prop_a)
            db.commit()

        # Ensure a room for Prop A
        room_a = db.query(Room).filter(Room.property_id == prop_a.id).first()
        if not room_a:
            room_a = Room(
                property_id=prop_a.id,
                name="Deluxe Valley View Suite",
                room_type="Deluxe Room",
                description="Spacious suite overlooking the valley",
                capacity=2,
                quantity=3,
                base_price=5500.0,
                is_active=True
            )
            db.add(room_a)
            db.commit()

        # Ensure an experience for Prop A
        exp_a = db.query(Experience).filter(Experience.property_id == prop_a.id).first()
        if not exp_a:
            exp_a = Experience(
                property_id=prop_a.id,
                title="Guided Tea Plantation Trek",
                experience_type="Guided Trek",
                description="Morning trek through misty plantations",
                price=800.0,
                capacity=10,
                duration="2.5 Hours",
                is_active=True
            )
            db.add(exp_a)
            db.commit()

        # Ensure a customer user and booking for Prop A
        customer_user = db.query(User).filter(User.role == UserRole.CUSTOMER).first()
        if not customer_user:
            customer_user = User(
                name="Rahul Sharma",
                email="rahul_test@voyara.com",
                password_hash="testhash",
                role=UserRole.CUSTOMER,
                account_status=AccountStatus.ACTIVE
            )
            db.add(customer_user)
            db.commit()

        booking_a = db.query(Booking).filter(Booking.property_id == prop_a.id).first()
        if not booking_a:
            booking_a = Booking(
                booking_number="VY-TEST-99881",
                user_id=customer_user.id,
                property_id=prop_a.id,
                check_in=date(2026, 10, 1),
                check_out=date(2026, 10, 3),
                total_nights=2,
                total_guests=2,
                room_total=11000.0,
                total_amount=11000.0,
                original_total_amount=11000.0,
                status=BookingStatus.CONFIRMED
            )
            db.add(booking_a)
            db.commit()

        # Create a second Provider B with their own distinct property
        provider_b = db.query(ProviderProfile).filter(ProviderProfile.id != provider_a.id).first()
        if not provider_b:
            user_b = User(
                name="Stay Partner Beta",
                email="provider_b_test@voyara.com",
                password_hash="testhash",
                role=UserRole.PROVIDER,
                account_status=AccountStatus.ACTIVE
            )
            db.add(user_b)
            db.commit()
            provider_b = ProviderProfile(
                user_id=user_b.id,
                business_name="Beta Coastal Stays",
                contact_phone="+919876543211",
                contact_email="provider_b_test@voyara.com"
            )
            db.add(provider_b)
            db.commit()

        prop_b = db.query(Property).filter(Property.provider_id == provider_b.id).first()
        if not prop_b:
            prop_b = Property(
                provider_id=provider_b.id,
                name="Secret Beach Haven",
                property_type="Homestay",
                description="Private seaside villa",
                address="Cliff Road",
                city="Varkala",
                state="Kerala",
                country="India",
                contact_phone="+919876543211",
                contact_email=provider_b.contact_email,
                verification_status="VERIFIED",
                is_active=True
            )
            db.add(prop_b)
            db.commit()

        # -------------------------------------------------------------
        # TEST 1: TRAVELER PUBLIC SEARCH
        # -------------------------------------------------------------
        print("\n--- TEST 1: TRAVELER SEARCH ---")
        traveler_results = PropertyService.search_properties(db=db, destination="Munnar")
        print(f"Traveler search for 'Munnar' found {len(traveler_results)} stays.")
        assert len(traveler_results) > 0, "Traveler search should return Munnar stays"
        for stay in traveler_results:
            assert "city" in stay or "name" in stay
        print("[OK] TEST 1 PASSED: Traveler search returned public stays.")

        # -------------------------------------------------------------
        # TEST 2: STAY PARTNER PROPERTY SEARCH
        # -------------------------------------------------------------
        print("\n--- TEST 2: STAY PARTNER SEARCH (Property Name) ---")
        prov_results = ProviderSearchService.search(db, provider_a.id, prop_a.name[:5])
        print(f"Provider A search for '{prop_a.name[:5]}' returned {len(prov_results)} items:")
        prop_matches = [r for r in prov_results if r["type"] == "PROPERTY"]
        assert len(prop_matches) > 0, "Should find owned property"
        match = prop_matches[0]
        print(f"  Result Title: {match['title']}, Badge: {match['badge']}, Route: {match['route']}")
        assert match["route"].startswith("/provider/"), f"Route MUST start with /provider/, got {match['route']}"
        assert not match["route"].startswith("/properties/"), "Provider result MUST NOT navigate to /properties/"
        assert len(match.get("sub_actions", [])) > 0, "Provider property should include sub actions"
        print("[OK] TEST 2 PASSED: Stay Partner property search returned provider management route.")

        # -------------------------------------------------------------
        # TEST 3: STAY PARTNER ROOM SEARCH
        # -------------------------------------------------------------
        print("\n--- TEST 3: STAY PARTNER ROOM SEARCH ---")
        room_results = ProviderSearchService.search(db, provider_a.id, "Deluxe")
        room_matches = [r for r in room_results if r["type"] == "ROOM"]
        assert len(room_matches) > 0, "Should find Deluxe room"
        print(f"  Found Room: {room_matches[0]['title']}, Route: {room_matches[0]['route']}")
        assert room_matches[0]["route"] == "/provider/rooms"
        print("[OK] TEST 3 PASSED: Stay Partner room search returned /provider/rooms.")

        # -------------------------------------------------------------
        # TEST 4: STAY PARTNER BOOKING SEARCH
        # -------------------------------------------------------------
        print("\n--- TEST 4: STAY PARTNER BOOKING SEARCH ---")
        booking_results = ProviderSearchService.search(db, provider_a.id, booking_a.booking_number)
        booking_matches = [r for r in booking_results if r["type"] == "BOOKING"]
        assert len(booking_matches) > 0, "Should find booking by booking number"
        print(f"  Found Booking: {booking_matches[0]['title']}, Route: {booking_matches[0]['route']}")
        assert booking_matches[0]["route"] == "/provider/bookings"
        print("[OK] TEST 4 PASSED: Stay Partner booking search returned /provider/bookings.")

        # -------------------------------------------------------------
        # TEST 5: CROSS-PROVIDER SECURITY ISOLATION
        # -------------------------------------------------------------
        print("\n--- TEST 5: CROSS-PROVIDER SECURITY ISOLATION ---")
        # Provider A searches for Provider B's property name "Secret Beach Haven"
        leak_check = ProviderSearchService.search(db, provider_a.id, "Secret Beach")
        print(f"Provider A searching for Provider B's property returned: {leak_check}")
        # None of the results should belong to Provider B or mention prop_b.name
        leaked_items = [item for item in leak_check if prop_b.name.lower() in item.get("title", "").lower() or prop_b.name.lower() in item.get("subtitle", "").lower()]
        assert len(leaked_items) == 0, f"SECURITY VIOLATION: Provider A saw Provider B's property! {leaked_items}"
        print("[OK] TEST 5 PASSED: Cross-provider security isolation enforced. Zero leakage.")

        # -------------------------------------------------------------
        # TEST 6: ADMIN CONTROL CENTER SEARCH
        # -------------------------------------------------------------
        print("\n--- TEST 6: ADMIN SEARCH ---")
        search_kw = prop_a.name[:5]
        admin_results = AdminSearchService.search(db, search_kw)
        print(f"Admin search for '{search_kw}' returned {len(admin_results)} items.")
        assert len(admin_results) > 0, "Admin search should return matching accounts/stays"
        for res in admin_results:
            assert res["route"].startswith("/admin/"), f"Admin search route must start with /admin/, got {res['route']}"
        print("[OK] TEST 6 PASSED: Admin search returns platform management routes inside /admin/.")

        # -------------------------------------------------------------
        # TEST 7: ROLE PERSISTENCE
        # -------------------------------------------------------------
        print("\n--- TEST 7: ROLE PERSISTENCE & IN-DASHBOARD NAVIGATION ---")
        all_prov_search = ProviderSearchService.search(db, provider_a.id, "Valley")
        for item in all_prov_search:
            assert item["route"].startswith("/provider/"), f"Stay partner item has non-provider route: {item['route']}"
            if "sub_actions" in item:
                for sub in item["sub_actions"]:
                    assert sub["route"].startswith("/provider/"), f"Stay partner sub-action has non-provider route: {sub['route']}"
        print("[OK] TEST 7 PASSED: 100% of Provider search routes and sub-actions remain strictly inside /provider/.")

        print("\n==========================================")
        print("ALL 7 ROLE-BASED SEARCH TESTS PASSED 100%!")
        print("==========================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
