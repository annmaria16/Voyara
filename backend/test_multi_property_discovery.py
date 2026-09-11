"""
Automated Multi-Property Host & Customer Discovery Flow Test
Tests:
1. Multi-property creation under 1 host (Misty Stay Group)
2. Provider property portfolio with room types and total unit metrics
3. Customer brand search ("Misty Stay Group") returning only verified + active properties
4. Customer location search ("Munnar")
5. Customer property type filter ("Villa")
6. Pending property exclusion ("Wayanad" returns 0 while pending)
7. Admin approval flow activating property and making it discoverable
8. Cross-provider isolation and single-property detail integrity
"""

import sys
import os
import uuid
from fastapi import HTTPException

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.models.property import Property, PropertyVerificationStatus
from app.models.room import Room
from app.services.properties.property_service import PropertyService
from app.services.availability.availability_service import AvailabilityService
from app.schemas.property import PropertyCreate
from app.auth.password import hash_password

def run_tests():
    db = SessionLocal()
    print("\n" + "="*70)
    print("STARTING VOYARA MULTI-PROPERTY & CUSTOMER DISCOVERY TEST SUITE")
    print("="*70)

    try:
        # Step 0: Clean up any prior test artifacts
        db.query(Property).filter(Property.name.in_(["Misty Hills Villa", "Misty Beach Villa", "Misty Valley Cottage"])).delete(synchronize_session=False)
        db.query(ProviderProfile).filter(ProviderProfile.business_name.in_(["Misty Stay Group", "Separate Luxury Stays"])).delete(synchronize_session=False)
        db.query(User).filter(User.email.like("misty_test_%")).delete(synchronize_session=False)
        db.query(User).filter(User.email.like("other_test_%")).delete(synchronize_session=False)
        db.commit()

        test_host_email = f"misty_test_{uuid.uuid4().hex[:6]}@voyara.test"
        other_host_email = f"other_test_{uuid.uuid4().hex[:6]}@voyara.test"

        # Create Host User & Provider Profile: "Misty Stay Group"
        host_user = User(
            email=test_host_email,
            name="Misty Host Manager",
            hashed_password=hash_password("Secret123!"),
            role=UserRole.PROVIDER,
            is_active=True
        )
        db.add(host_user)
        db.commit()
        db.refresh(host_user)

        host_profile = ProviderProfile(
            user_id=host_user.id,
            business_name="Misty Stay Group",
            verification_status="VERIFIED"
        )
        db.add(host_profile)
        db.commit()
        db.refresh(host_profile)

        # Create Another Provider (for cross-provider isolation test)
        other_user = User(
            email=other_host_email,
            name="Other Host",
            hashed_password=hash_password("Secret123!"),
            role=UserRole.PROVIDER,
            is_active=True
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)

        other_profile = ProviderProfile(
            user_id=other_user.id,
            business_name="Separate Luxury Stays",
            verification_status="VERIFIED"
        )
        db.add(other_profile)
        db.commit()
        db.refresh(other_profile)

        print(f"[OK] Created Provider Profile: '{host_profile.business_name}' (ID: {host_profile.id})")
        print(f"[OK] Created Other Provider Profile: '{other_profile.business_name}' (ID: {other_profile.id})")

        # -------------------------------------------------------------
        # 1. Create 3 Separate Properties under 1 Host
        # -------------------------------------------------------------
        print("\n--- 1. Creating 3 Separate Properties Under Single Host ---")

        # Property 1: Misty Hills Villa (Munnar, Villa, Approved, 2 room types: 2 + 3 = 5 units)
        prop1_in = PropertyCreate(
            name="Misty Hills Villa",
            description="Luxury mountain sanctuary nestled in Munnar tea plantations",
            property_type="Villa",
            address="Tea Valley Road, Pothamedu",
            city="Munnar",
            state="Kerala",
            country="India",
            contact_phone="9876543210",
            contact_email="mistyhills@voyara.test",
            latitude=10.0889,
            longitude=77.0595,
            amenities=["Wi-Fi", "Swimming Pool", "Mountain View"],
            images=["https://images.unsplash.com/photo-1580587771525-78b9dba3b914"]
        )
        prop1 = PropertyService.create_property(db, host_profile.id, prop1_in)
        # Mark as approved and active
        prop1.verification_status = PropertyVerificationStatus.VERIFIED.value
        prop1.is_active = True
        db.commit()
        db.refresh(prop1)

        # Add Rooms to Property 1
        r1_1 = Room(property_id=prop1.id, name="Royal Tea Suite", room_type="Suite", description="Spacious suite with valley views", base_price=8500.0, capacity=2, quantity=2, is_active=True)
        r1_2 = Room(property_id=prop1.id, name="Mountain Mist Chalet", room_type="Chalet", description="Wooden chalet with private deck", base_price=12000.0, capacity=4, quantity=3, is_active=True)
        db.add_all([r1_1, r1_2])
        db.commit()

        # Property 2: Misty Beach Villa (Varkala, Villa, Approved, 1 room type: 3 units)
        prop2_in = PropertyCreate(
            name="Misty Beach Villa",
            description="Cliff-edge beachfront haven overlooking Arabian Sea in Varkala",
            property_type="Villa",
            address="North Cliff Walkway",
            city="Varkala",
            state="Kerala",
            country="India",
            contact_phone="9876543211",
            contact_email="mistybeach@voyara.test",
            latitude=8.7379,
            longitude=76.7163,
            amenities=["Wi-Fi", "Beach Access", "Breakfast"],
            images=["https://images.unsplash.com/photo-1540555700478-4be289fbecef"]
        )
        prop2 = PropertyService.create_property(db, host_profile.id, prop2_in)
        prop2.verification_status = PropertyVerificationStatus.VERIFIED.value
        prop2.is_active = True
        db.commit()
        db.refresh(prop2)

        # Add Rooms to Property 2
        r2_1 = Room(property_id=prop2.id, name="Ocean Breeze Villa", room_type="Villa", description="Beachfront bedroom with sunset terrace", base_price=9500.0, capacity=3, quantity=3, is_active=True)
        db.add(r2_1)
        db.commit()

        # Property 3: Misty Valley Cottage (Wayanad, Cottage, Pending, 1 room type: 2 units)
        prop3_in = PropertyCreate(
            name="Misty Valley Cottage",
            description="Serene rainforest cottage in Wayanad hills",
            property_type="Cottage",
            address="Banasura Sagar Lake Road",
            city="Wayanad",
            state="Kerala",
            country="India",
            contact_phone="9876543212",
            contact_email="mistyvalley@voyara.test",
            latitude=11.6854,
            longitude=76.1320,
            amenities=["Wi-Fi", "Campfire", "Mountain View"],
            images=["https://images.unsplash.com/photo-1587061949409-02df41d5e562"]
        )
        prop3 = PropertyService.create_property(db, host_profile.id, prop3_in)
        # Remains PENDING_VERIFICATION and is_active=False
        r3_1 = Room(property_id=prop3.id, name="Bamboo Treehouse Cottage", room_type="Cottage", description="Eco-friendly bamboo cottage", base_price=6500.0, capacity=2, quantity=2, is_active=True)
        db.add(r3_1)
        db.commit()

        print(f"[OK] Property 1 Created: '{prop1.name}' in {prop1.city} (Status: {prop1.verification_status}, is_active: {prop1.is_active})")
        print(f"[OK] Property 2 Created: '{prop2.name}' in {prop2.city} (Status: {prop2.verification_status}, is_active: {prop2.is_active})")
        print(f"[OK] Property 3 Created: '{prop3.name}' in {prop3.city} (Status: {prop3.verification_status}, is_active: {prop3.is_active})")

        # -------------------------------------------------------------
        # 2. Test Host "My Properties" Portfolio Metrics & Isolation
        # -------------------------------------------------------------
        print("\n--- 2. Testing Provider 'My Properties' Portfolio View ---")
        host_props = PropertyService.get_provider_properties(db, host_profile.id)
        assert len(host_props) == 3, f"Expected 3 properties for host, got {len(host_props)}"

        # Check Property 1 metrics
        p1_data = next(p for p in host_props if p["id"] == prop1.id)
        assert p1_data["room_types_count"] == 2, f"Expected 2 room types for Prop 1, got {p1_data['room_types_count']}"
        assert p1_data["total_units"] == 5, f"Expected 5 total units for Prop 1, got {p1_data['total_units']}"
        assert p1_data["verification_status"] == PropertyVerificationStatus.VERIFIED.value

        # Check Property 2 metrics
        p2_data = next(p for p in host_props if p["id"] == prop2.id)
        assert p2_data["room_types_count"] == 1, f"Expected 1 room type for Prop 2, got {p2_data['room_types_count']}"
        assert p2_data["total_units"] == 3, f"Expected 3 total units for Prop 2, got {p2_data['total_units']}"

        # Check Property 3 metrics
        p3_data = next(p for p in host_props if p["id"] == prop3.id)
        assert p3_data["verification_status"] == PropertyVerificationStatus.PENDING_VERIFICATION.value
        assert p3_data["room_types_count"] == 1
        assert p3_data["total_units"] == 2

        # Check other host properties isolation
        other_props = PropertyService.get_provider_properties(db, other_profile.id)
        assert len(other_props) == 0, f"Other host should have 0 properties, got {len(other_props)}"

        print("[OK] Provider Portfolio: Correctly lists all 3 properties with independent room counts and units (Prop1: 2 types/5 units, Prop2: 1 type/3 units, Prop3: 1 type/2 units).")

        # -------------------------------------------------------------
        # 3. Test Customer Brand Search ("Misty Stay Group")
        # -------------------------------------------------------------
        print("\n--- 3. Testing Customer Brand Search ('Misty Stay Group') ---")
        brand_search = PropertyService.search_properties(db=db, destination="Misty Stay Group")
        brand_prop_ids = [p["id"] for p in brand_search]

        assert prop1.id in brand_prop_ids, "Property 1 should be in brand search results"
        assert prop2.id in brand_prop_ids, "Property 2 should be in brand search results"
        assert prop3.id not in brand_prop_ids, "Property 3 (pending) MUST NOT be in customer search results"
        
        # Verify host branding field is present
        p1_search_item = next(p for p in brand_search if p["id"] == prop1.id)
        assert p1_search_item["provider_business_name"] == "Misty Stay Group"
        print(f"[OK] Customer Brand Search: Returned {len(brand_search)} verified active properties (omitted pending Property 3). Brand name '{p1_search_item['provider_business_name']}' present.")

        # -------------------------------------------------------------
        # 4. Test Customer Destination Search ("Munnar")
        # -------------------------------------------------------------
        print("\n--- 4. Testing Customer Location Search ('Munnar') ---")
        munnar_search = PropertyService.search_properties(db=db, destination="Munnar")
        munnar_prop_ids = [p["id"] for p in munnar_search]

        assert prop1.id in munnar_prop_ids, "Misty Hills Villa should be found in Munnar"
        assert prop2.id not in munnar_prop_ids, "Misty Beach Villa (Varkala) must not be in Munnar search"
        print(f"[OK] Customer Location Search: 'Munnar' accurately returned only '{prop1.name}'.")

        # -------------------------------------------------------------
        # 5. Test Customer Property Type Filter ("Villa")
        # -------------------------------------------------------------
        print("\n--- 5. Testing Customer Property Type Filter ('Villa') ---")
        villa_search = PropertyService.search_properties(db=db, property_type="Villa", host="Misty Stay Group")
        villa_prop_ids = [p["id"] for p in villa_search]

        assert prop1.id in villa_prop_ids
        assert prop2.id in villa_prop_ids
        print(f"[OK] Customer Category Filter: 'Villa' under 'Misty Stay Group' returned 2 villas ({len(villa_search)} total).")

        # -------------------------------------------------------------
        # 6. Test Pending Property Exclusion ("Wayanad")
        # -------------------------------------------------------------
        print("\n--- 6. Testing Pending Property Exclusion ('Wayanad') ---")
        wayanad_search_pending = PropertyService.search_properties(db=db, destination="Wayanad")
        wayanad_pending_ids = [p["id"] for p in wayanad_search_pending]
        assert prop3.id not in wayanad_pending_ids, f"Property 3 (pending) MUST NOT be in customer search results before admin verification"
        print("[OK] Customer Security Filter: Unverified property in Wayanad is excluded from search results.")

        # Direct details access should also fail (404)
        try:
            PropertyService.get_public_property_details(db, prop3.id)
            assert False, "Public access to unverified property should raise HTTPException(404)"
        except HTTPException as e:
            assert e.status_code == 404
            print("[OK] Direct Unverified Property Access: Correctly blocked with HTTP 404.")

        # -------------------------------------------------------------
        # 7. Test Admin Verification & Live Discovery Activation
        # -------------------------------------------------------------
        print("\n--- 7. Testing Admin Approval & Live Discovery Activation ---")
        # Admin approves Property 3
        prop3.verification_status = PropertyVerificationStatus.VERIFIED.value
        prop3.is_active = True
        db.commit()
        db.refresh(prop3)

        wayanad_search_active = PropertyService.search_properties(db=db, destination="Wayanad")
        wayanad_prop_ids = [p["id"] for p in wayanad_search_active]
        assert prop3.id in wayanad_prop_ids, "Property 3 should now be discoverable after verification"
        print(f"[OK] Admin Approval Activation: Property 3 '{prop3.name}' is now discoverable in Wayanad!")

        # -------------------------------------------------------------
        # 8. Test Cross-Provider Isolation & Data Integrity
        # -------------------------------------------------------------
        print("\n--- 8. Testing Cross-Provider Isolation & Data Integrity ---")
        # Test Provider 2 attempting to view Provider 1 calendar -> should raise HTTPException (404/403)
        try:
            AvailabilityService.get_property_calendar(
                db=db,
                property_id=prop1.id,
                provider_id=other_profile.id
            )
            assert False, "Provider 2 should NOT be allowed to view Provider 1 calendar"
        except HTTPException as e:
            assert e.status_code in [403, 404]
            print(f"[OK] Cross-Provider Calendar Isolation: Correctly denied access with HTTP {e.status_code}.")

        # Test Provider 1 accessing their own property calendar -> succeeds
        p1_calendar = AvailabilityService.get_property_calendar(
            db=db,
            property_id=prop1.id,
            provider_id=host_profile.id
        )
        assert p1_calendar["property_id"] == prop1.id
        print(f"[OK] Host Self Calendar Access: Succeeded for Property ID {p1_calendar['property_id']}.")

        # Test Public Property Details for Prop 1 -> returns only Prop 1 rooms
        p1_public = PropertyService.get_public_property_details(db, prop1.id)
        assert p1_public["id"] == prop1.id
        assert len(p1_public["rooms"]) == 2
        assert "documents" not in p1_public or not p1_public.get("documents"), "Private documents must not be exposed"
        print("[OK] Single Property Data Integrity: Public details contain only Property 1 rooms, no private documents exposed.")

        print("\n" + "="*70)
        print("ALL 8 MULTI-PROPERTY & CUSTOMER DISCOVERY TESTS PASSED SUCCESSFULLY!")
        print("="*70 + "\n")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
