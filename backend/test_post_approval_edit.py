"""
Automated Test Suite: Post-Approval Property Editing Flow in Voyara
Tests:
1. Verified Property Normal Edits: Updating name, description, amenities, contact details, timings keeps property VERIFIED + ACTIVE.
2. Location Lockdown on Approved Stays: Location fields (city, state, address, lat, long) cannot be modified after approval; original verified location is preserved.
3. Room Details & Inventory Edits: Updating room rates, units, and amenities saves to PostgreSQL without affecting verification status.
4. Pre-Approval Editing: Unapproved/pending properties allow editing all fields including location.
5. Customer Live Discovery: Customer search reflects updated property data immediately without requiring re-verification.
"""

import sys
import os
import uuid

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.models.property import Property, PropertyVerificationStatus
from app.models.room import Room
from app.services.properties.property_service import PropertyService
from app.services.rooms.room_service import RoomService
from app.schemas.property import PropertyCreate, PropertyUpdate
from app.schemas.room import RoomCreate, RoomUpdate
from app.auth.password import hash_password

def run_tests():
    db = SessionLocal()
    print("\n" + "="*75)
    print("STARTING POST-APPROVAL PROPERTY EDITING FLOW TEST SUITE")
    print("="*75)

    try:
        # Step 0: Setup Host User and Provider Profile
        test_email = f"edit_host_{uuid.uuid4().hex[:6]}@voyara.test"
        host_user = User(
            email=test_email,
            name="Post Approval Host",
            hashed_password=hash_password("Secret123!"),
            role=UserRole.PROVIDER,
            is_active=True
        )
        db.add(host_user)
        db.commit()
        db.refresh(host_user)

        host_profile = ProviderProfile(
            user_id=host_user.id,
            business_name="Highland Luxury Retreats",
            verification_status="VERIFIED"
        )
        db.add(host_profile)
        db.commit()
        db.refresh(host_profile)

        print(f"[OK] Created Host Provider Profile: '{host_profile.business_name}' (ID: {host_profile.id})")

        # -------------------------------------------------------------
        # 1. Create Approved Property
        # -------------------------------------------------------------
        print("\n--- 1. Creating Approved Property (Munnar Tea Sanctuary) ---")
        prop_in = PropertyCreate(
            name="Munnar Tea Sanctuary",
            description="Original description of mountain stay",
            property_type="Resort",
            address="Pothamedu Viewpoint Road",
            city="Munnar",
            state="Kerala",
            country="India",
            contact_phone="9876543210",
            contact_email="reservations@teasanctuary.com",
            check_in_time="14:00",
            check_out_time="11:00",
            latitude=10.0889,
            longitude=77.0595,
            amenities=["Wi-Fi", "Mountain View"],
            images=["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb"]
        )
        prop = PropertyService.create_property(db, host_profile.id, prop_in)
        # Admin approves the property -> becomes VERIFIED and ACTIVE
        prop.verification_status = PropertyVerificationStatus.VERIFIED.value
        prop.is_active = True
        db.commit()
        db.refresh(prop)

        # Add initial room
        r_in = RoomCreate(
            name="Heritage Tea Cottage",
            room_type="Cottage",
            description="Cozy cottage with mist views",
            capacity=2,
            quantity=3,
            base_price=5000.0,
            amenities=["King Bed", "Wi-Fi"]
        )
        room = RoomService.create_room(db, prop.id, host_profile.id, r_in)

        assert prop.verification_status == PropertyVerificationStatus.VERIFIED.value
        assert prop.is_active == True
        print(f"[OK] Property Approved & Live: '{prop.name}' in {prop.city} (Status: {prop.verification_status}, Active: {prop.is_active})")

        # -------------------------------------------------------------
        # 2. Test Normal Post-Approval Listing Edits (Name, Description, Amenities, Contact, Timings)
        # -------------------------------------------------------------
        print("\n--- 2. Testing Post-Approval Normal Field Edits ---")
        update_normal = PropertyUpdate(
            name="Munnar Tea Sanctuary & Spa Resort",
            description="Updated luxury mountain stay with ayurvedic spa facilities and tea tasting.",
            contact_phone="9876543299",
            contact_email="concierge@teasanctuary.com",
            check_in_time="13:00",
            check_out_time="10:30",
            amenities=["Wi-Fi", "Mountain View", "Swimming Pool", "Spa & Wellness"],
            images=["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb", "https://images.unsplash.com/photo-1571896349842-33c89424de2d"]
        )
        updated_prop = PropertyService.update_property(db, prop.id, host_profile.id, update_normal)

        # Assertions
        assert updated_prop.name == "Munnar Tea Sanctuary & Spa Resort", f"Name should be updated, got {updated_prop.name}"
        assert "ayurvedic spa" in updated_prop.description
        assert updated_prop.contact_phone == "9876543299"
        assert updated_prop.check_in_time == "13:00"
        assert len(updated_prop.amenities) == 4
        # CRITICAL: Verification status must stay VERIFIED and is_active must stay True!
        assert updated_prop.verification_status == PropertyVerificationStatus.VERIFIED.value, f"Status must remain VERIFIED, got {updated_prop.verification_status}"
        assert updated_prop.is_active == True, f"Property must remain ACTIVE, got {updated_prop.is_active}"

        print("[OK] Normal Edits Saved: Property details updated successfully while remaining VERIFIED + ACTIVE.")

        # -------------------------------------------------------------
        # 3. Test Location Lockdown on Approved Property
        # -------------------------------------------------------------
        print("\n--- 3. Testing Location Lockdown on Approved Property ---")
        # Attempt to change city to "Goa", state to "Goa", address to "Candolim Beach Road", and coordinates to Goa
        update_location_attempt = PropertyUpdate(
            name="Munnar Tea Sanctuary & Spa Resort",
            city="Goa",
            state="Goa",
            address="Candolim Beach Road",
            latitude=15.5123,
            longitude=73.7654,
            location_details="Attempted move to beach"
        )
        locked_prop = PropertyService.update_property(db, prop.id, host_profile.id, update_location_attempt)

        # Assertions: Verified location MUST remain Munnar / Kerala / original coordinates
        assert locked_prop.city == "Munnar", f"City must remain Munnar, got {locked_prop.city}"
        assert locked_prop.state == "Kerala", f"State must remain Kerala, got {locked_prop.state}"
        assert locked_prop.address == "Pothamedu Viewpoint Road", f"Address must remain original, got {locked_prop.address}"
        assert locked_prop.latitude == 10.0889, f"Latitude must remain original, got {locked_prop.latitude}"
        assert locked_prop.longitude == 77.0595, f"Longitude must remain original, got {locked_prop.longitude}"
        assert locked_prop.verification_status == PropertyVerificationStatus.VERIFIED.value
        assert locked_prop.is_active == True

        print("[OK] Location Lockdown Enforced: City, State, Address, and Coordinates preserved; unauthorized location change discarded.")

        # -------------------------------------------------------------
        # 4. Test Room Details & Inventory Edits on Approved Property
        # -------------------------------------------------------------
        print("\n--- 4. Testing Room Inventory & Pricing Edits ---")
        room_update = RoomUpdate(
            name="Royal Heritage Tea Suite",
            description="Upgraded luxury suite with private balcony and jacuzzi",
            capacity=4,
            quantity=5,
            base_price=8500.0,
            amenities=["King Bed", "Free Wi-Fi", "Jacuzzi", "Private Balcony"]
        )
        updated_room = RoomService.update_room(db, room.id, host_profile.id, room_update)

        assert updated_room.name == "Royal Heritage Tea Suite"
        assert updated_room.capacity == 4
        assert updated_room.quantity == 5
        assert updated_room.base_price == 8500.0
        assert len(updated_room.amenities) == 4

        # Verify property remains VERIFIED + ACTIVE
        db.refresh(prop)
        assert prop.verification_status == PropertyVerificationStatus.VERIFIED.value
        assert prop.is_active == True
        print(f"[OK] Room Updates Saved: Room '{updated_room.name}' capacity={updated_room.capacity}, units={updated_room.quantity}, price={updated_room.base_price}. Property remains VERIFIED + ACTIVE.")

        # -------------------------------------------------------------
        # 5. Test Pre-Approval Editing on Pending Property
        # -------------------------------------------------------------
        print("\n--- 5. Testing Pre-Approval Editing on Pending Property ---")
        pending_prop_in = PropertyCreate(
            name="Draft Riverside Villa",
            description="Draft property under creation",
            property_type="Villa",
            address="Initial Draft Road",
            city="Kochi",
            state="Kerala",
            country="India",
            contact_phone="9876543211",
            contact_email="draft@voyara.test",
            latitude=9.9312,
            longitude=76.2673
        )
        pending_prop = PropertyService.create_property(db, host_profile.id, pending_prop_in)
        assert pending_prop.verification_status == PropertyVerificationStatus.PENDING_VERIFICATION.value
        assert pending_prop.is_active == False

        # Host edits location before approval (e.g. correcting address and city to Alappuzha)
        pre_approval_update = PropertyUpdate(
            name="Alappuzha Backwater Haven",
            city="Alappuzha",
            state="Kerala",
            address="Punnamada Lake Walkway",
            latitude=9.4981,
            longitude=76.3388,
            description="Corrected backwater sanctuary in Alappuzha"
        )
        edited_pending_prop = PropertyService.update_property(db, pending_prop.id, host_profile.id, pre_approval_update)

        # Location MUST update successfully before approval
        assert edited_pending_prop.name == "Alappuzha Backwater Haven"
        assert edited_pending_prop.city == "Alappuzha"
        assert edited_pending_prop.address == "Punnamada Lake Walkway"
        assert edited_pending_prop.latitude == 9.4981
        assert edited_pending_prop.longitude == 76.3388
        assert edited_pending_prop.verification_status == PropertyVerificationStatus.PENDING_VERIFICATION.value
        print("[OK] Pre-Approval Editing: Pending property location and details updated successfully before admin approval.")

        # -------------------------------------------------------------
        # 6. Test Customer Discovery with Updated Live Data
        # -------------------------------------------------------------
        print("\n--- 6. Testing Customer Discovery with Updated Live Property ---")
        search_results = PropertyService.search_properties(db=db, destination="Spa Resort")
        matched_prop_ids = [p["id"] for p in search_results]

        assert prop.id in matched_prop_ids, f"Updated property '{prop.name}' must be discoverable under 'Spa Resort'"
        matched_item = next(p for p in search_results if p["id"] == prop.id)
        assert matched_item["name"] == "Munnar Tea Sanctuary & Spa Resort"
        assert matched_item["city"] == "Munnar"
        print(f"[OK] Customer Discovery: Customer search immediately reflects updated property name '{matched_item['name']}' in {matched_item['city']}.")

        print("\n" + "="*75)
        print("ALL 6 POST-APPROVAL PROPERTY EDITING TESTS PASSED SUCCESSFULLY!")
        print("="*75 + "\n")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
