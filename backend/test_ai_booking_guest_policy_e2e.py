import unittest
import uuid
from datetime import date, timedelta
from typing import List

from app.database import SessionLocal
from app.models.provider import ProviderProfile
from app.models.user import User, UserRole
from app.models.property import Property, PropertyVerificationStatus, PropertyRule
from app.models.room import Room, RoomRule
from app.models.booking import Booking, BookingStatus, BookingRoom
from app.models.ai_booking import AIBookingSession, AIBookingSessionStatus, AIBookingPreview, AIBookingPreviewStatus
from app.schemas.booking import BookingCreate
from app.schemas.ai_booking import AIBookingConfirmRequest
from app.services.ai.booking_agent_tools import BookingAgentToolsService
from app.services.ai.booking_execution_service import BookingExecutionService
from app.services.bookings.booking_service import BookingService
from app.services.ai.trip_planner_validation import TripPlannerValidationService
from app.services.ai.trip_planner_tools import TripPlannerToolsService
from fastapi import HTTPException

class TestAIBookingGuestPolicyE2E(unittest.TestCase):
    """
    End-to-End Test Suite verifying the Unified Guest, Child Policy, and Room Recommendation Logic (Tests 1–20).
    Verifies that AI search, recommendations, preview, normal booking, and Trip Planner share ONE authoritative engine.
    """

    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()
        # Create unique test traveler
        uid = uuid.uuid4().hex[:6]
        cls.traveler = User(
            email=f"policy_traveler_{uid}@voyara.com",
            name="Policy Verification Traveler",
            role=UserRole.CUSTOMER,
            phone=f"+9198765{uid[:5]}",
            is_active=True,
            hashed_password="test_hashed_password"
        )
        cls.db.add(cls.traveler)

        cls.host = User(
            email=f"policy_host_{uid}@voyara.com",
            name="Policy Host",
            role=UserRole.PROVIDER,
            phone=f"+9191234{uid[:5]}",
            is_active=True,
            hashed_password="test_hashed_password"
        )
        cls.db.add(cls.host)
        cls.db.flush()

        cls.provider_profile = ProviderProfile(
            user_id=cls.host.id,
            business_name="Backwater Breeze Stays",
            contact_phone="+919123456789"
        )
        cls.db.add(cls.provider_profile)
        cls.db.commit()

    @classmethod
    def tearDownClass(cls):
        try:
            cls.db.close()
        except Exception:
            pass

    def setUp(self):
        self.db = SessionLocal()
        self.uid = uuid.uuid4().hex[:6]

        # Create authentic test property
        self.prop_a = Property(
            provider_id=self.provider_profile.id,
            name=f"Backwater Breeze Houseboat Stay {self.uid}",
            property_type="Houseboat",
            description="Authentic luxury houseboat in Alappuzha",
            address="Vembanad Lake Jetty",
            city="Alappuzha",
            state="Kerala",
            country="India",
            contact_phone="+919123456789",
            contact_email="houseboat@voyara.com",
            latitude=9.4981,
            longitude=76.3388,
            verification_status=PropertyVerificationStatus.VERIFIED.value,
            is_active=True,
            rating=4.85,
            review_count=18
        )
        self.db.add(self.prop_a)
        self.db.flush()

        self.prop_a_rules = PropertyRule(
            property_id=self.prop_a.id,
            children_allowed="Yes",
            minimum_child_age=1,
            max_child_age=12,
            maximum_children=2,
            free_additional_children=1,
            child_charge_enabled=True,
            child_charge_amount=500.0,
            child_charge_unit="Per night",
            extra_bed_available="Yes",
            cot_available="Yes",
            cot_quantity=1,
            cot_price=0.0
        )
        self.db.add(self.prop_a_rules)

        # Standard Room: Capacity 2, Max Adults 2, Max Children 1, Quantity 5
        self.standard_room = Room(
            property_id=self.prop_a.id,
            name=f"Standard Room {self.uid}",
            room_type="Standard Room",
            description="Comfortable Standard Room with lake view",
            capacity=2,
            quantity=5,
            base_price=3000.0,
            is_active=True
        )
        self.db.add(self.standard_room)
        self.db.flush()

        self.standard_room_rule = RoomRule(
            room_id=self.standard_room.id,
            maximum_total_guests=2,
            maximum_adults=2,
            maximum_children=1,
            children_allowed="Yes",
            minimum_child_age=1,
            max_child_age=12,
            free_additional_children=1,
            child_charge_enabled=True,
            child_charge_amount=500.0,
            extra_bed_available="No",
            maximum_extra_beds=0,
            cot_available="Yes",
            cot_quantity=1
        )
        self.db.add(self.standard_room_rule)

        # Family Room: Capacity 4, Max Adults 2, Max Children 2, Extra Bed Available
        self.family_room = Room(
            property_id=self.prop_a.id,
            name=f"Family Room {self.uid}",
            room_type="Family Room",
            description="Spacious Family Room for 4 guests",
            capacity=4,
            quantity=3,
            base_price=5500.0,
            is_active=True
        )
        self.db.add(self.family_room)
        self.db.flush()

        self.family_room_rule = RoomRule(
            room_id=self.family_room.id,
            maximum_total_guests=4,
            maximum_adults=2,
            maximum_children=2,
            children_allowed="Yes",
            minimum_child_age=1,
            max_child_age=12,
            free_additional_children=1,
            child_charge_enabled=True,
            child_charge_amount=500.0,
            extra_bed_available="Yes",
            maximum_extra_beds=1,
            extra_bed_price=800.0,
            cot_available="Yes",
            cot_quantity=1
        )
        self.db.add(self.family_room_rule)

        # Property B: Nearby Stay in Kumarakom
        self.prop_b = Property(
            provider_id=self.provider_profile.id,
            name=f"Kumarakom Lakefront Sanctuary {self.uid}",
            property_type="Resort",
            description="Luxury backwater resort in Kumarakom",
            address="Kumarakom Backwaters",
            city="Kumarakom",
            state="Kerala",
            country="India",
            contact_phone="+919123456789",
            contact_email="kumarakom@voyara.com",
            latitude=9.6175,
            longitude=76.4300,
            verification_status=PropertyVerificationStatus.VERIFIED.value,
            is_active=True,
            rating=4.9,
            review_count=42
        )
        self.db.add(self.prop_b)
        self.db.flush()

        self.prop_b_suite = Room(
            property_id=self.prop_b.id,
            name=f"Lakefront Family Suite {self.uid}",
            room_type="Family Room",
            description="Luxury suite for 4 guests",
            capacity=4,
            quantity=4,
            base_price=6000.0,
            is_active=True
        )
        self.db.add(self.prop_b_suite)
        self.db.flush()

        self.prop_b_rule = RoomRule(
            room_id=self.prop_b_suite.id,
            maximum_total_guests=4,
            maximum_adults=3,
            maximum_children=2,
            children_allowed="Yes",
            minimum_child_age=1,
            max_child_age=12
        )
        self.db.add(self.prop_b_rule)

        self.db.commit()

    def tearDown(self):
        self.db.rollback()
        self.db.close()

    # -------------------------------------------------------------------------
    # TEST 1: 2 Adults
    # -------------------------------------------------------------------------
    def test_01_two_adults_single_room(self):
        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.standard_room.id,
            adults=2,
            children=0
        )
        self.assertTrue(config["valid"])
        self.assertEqual(config["quantity"], 1)
        self.assertEqual(config["room_allocations"][0]["adults"], 2)
        self.assertEqual(config["room_allocations"][0]["children"], 0)

    # -------------------------------------------------------------------------
    # TEST 2: 2 Adults + 1 Child Age 2 (Free child under policy)
    # -------------------------------------------------------------------------
    def test_02_two_adults_one_child_age_2_free(self):
        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.family_room.id,
            adults=2,
            children=1,
            child_ages=[2]
        )
        self.assertTrue(config["valid"])
        self.assertEqual(config["quantity"], 1)
        self.assertEqual(config["pricing_summary"]["children_free"], 1)
        self.assertEqual(config["pricing_summary"]["children_charged"], 0)

        # Price check
        c_in = date.today() + timedelta(days=5)
        c_out = c_in + timedelta(days=2)
        price_calc = BookingAgentToolsService.calculate_booking_price(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.family_room.id,
            check_in=c_in,
            check_out=c_out,
            room_quantity=1,
            adults=2,
            children=1,
            child_ages=[2]
        )
        self.assertEqual(price_calc["child_supplement_total"], 0.0)

    # -------------------------------------------------------------------------
    # TEST 3: 2 Adults + 1 Child Age 7
    # -------------------------------------------------------------------------
    def test_03_two_adults_one_child_age_7(self):
        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.family_room.id,
            adults=2,
            children=1,
            child_ages=[7]
        )
        self.assertTrue(config["valid"])
        self.assertEqual(config["quantity"], 1)
        self.assertEqual(config["room_allocations"][0]["children"], 1)

    # -------------------------------------------------------------------------
    # TEST 4: 2 Adults + 2 Children Ages 2 and 7 (Room Max Children = 1)
    # Verifies that single room is rejected, and 2 rooms are allocated with 1 adult + 1 child in each
    # -------------------------------------------------------------------------
    def test_04_two_adults_two_children_multi_room_allocation(self):
        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.standard_room.id,
            adults=2,
            children=2,
            child_ages=[2, 7]
        )
        self.assertTrue(config["valid"])
        # Standard room has max_children=1, so 2 children require 2 rooms
        self.assertEqual(config["quantity"], 2)
        allocs = config["room_allocations"]
        self.assertEqual(len(allocs), 2)
        # Verify 1 adult + 1 child in each room (adult presence requirement obeyed)
        self.assertEqual(allocs[0]["adults"], 1)
        self.assertEqual(allocs[0]["children"], 1)
        self.assertEqual(allocs[1]["adults"], 1)
        self.assertEqual(allocs[1]["children"], 1)

    # -------------------------------------------------------------------------
    # TEST 5: 2 Adults + 2 Children where 1 Child is Free
    # -------------------------------------------------------------------------
    def test_05_two_adults_two_children_one_free_one_charged(self):
        # Set family room free_additional_children = 1
        self.family_room_rule.free_additional_children = 1
        self.family_room_rule.child_charge_enabled = True
        self.family_room_rule.child_charge_amount = 500.0
        self.db.commit()

        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.family_room.id,
            adults=2,
            children=2,
            child_ages=[2, 7]
        )
        self.assertTrue(config["valid"])
        self.assertEqual(config["pricing_summary"]["children_free"], 1)
        self.assertEqual(config["pricing_summary"]["children_charged"], 1)

        c_in = date.today() + timedelta(days=5)
        c_out = c_in + timedelta(days=2)  # 2 nights
        price_calc = BookingAgentToolsService.calculate_booking_price(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.family_room.id,
            check_in=c_in,
            check_out=c_out,
            room_quantity=1,
            adults=2,
            children=2,
            child_ages=[2, 7]
        )
        # 1 chargeable child * 500/night * 2 nights = 1000.0
        self.assertEqual(price_calc["child_supplement_total"], 1000.0)

    # -------------------------------------------------------------------------
    # TEST 6: Room Maximum Children = 1 (Single Unit Cannot Accept 2 Children)
    # -------------------------------------------------------------------------
    def test_06_single_room_max_children_1_rejects_2_children_if_only_1_room_exists(self):
        # Single unit room with max_children = 1
        single_unit_room = Room(
            property_id=self.prop_a.id,
            name=f"Single Unit Standard {self.uid}",
            room_type="Standard Room",
            description="Only 1 unit available",
            capacity=2,
            quantity=1,  # Only 1 unit in property
            base_price=2500.0,
            is_active=True
        )
        self.db.add(single_unit_room)
        self.db.flush()

        rule = RoomRule(
            room_id=single_unit_room.id,
            maximum_total_guests=2,
            maximum_adults=2,
            maximum_children=1,
            children_allowed="Yes"
        )
        self.db.add(rule)
        self.db.commit()

        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=single_unit_room.id,
            adults=2,
            children=2,
            child_ages=[2, 7]
        )
        self.assertFalse(config["valid"])
        self.assertIn("allows at most 1 child per room", config["error"])

    # -------------------------------------------------------------------------
    # TEST 7: Room Maximum Children = 2 (Accepts 2 Adults + 2 Children in 1 Room)
    # -------------------------------------------------------------------------
    def test_07_room_maximum_children_2_accepts_in_single_room(self):
        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.family_room.id,
            adults=2,
            children=2,
            child_ages=[3, 8]
        )
        self.assertTrue(config["valid"])
        self.assertEqual(config["quantity"], 1)
        self.assertEqual(config["room_allocations"][0]["adults"], 2)
        self.assertEqual(config["room_allocations"][0]["children"], 2)

    # -------------------------------------------------------------------------
    # TEST 8: Extra Bed Available
    # -------------------------------------------------------------------------
    def test_08_extra_bed_available_accepted(self):
        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.family_room.id,
            adults=2,
            children=1,
            extra_bed_count=1
        )
        self.assertTrue(config["valid"])
        self.assertEqual(config["extra_bed_count"], 1)

    # -------------------------------------------------------------------------
    # TEST 9: Extra Bed Unavailable
    # -------------------------------------------------------------------------
    def test_09_extra_bed_unavailable_rejected(self):
        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.standard_room.id,
            adults=2,
            children=0,
            extra_bed_count=1
        )
        self.assertFalse(config["valid"])
        self.assertIn("Extra beds are not available", config["error"])

    # -------------------------------------------------------------------------
    # TEST 10: Baby Cot Available
    # -------------------------------------------------------------------------
    def test_10_baby_cot_available_accepted(self):
        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.standard_room.id,
            adults=2,
            children=1,
            child_ages=[1],
            cot_count=1
        )
        self.assertTrue(config["valid"])
        self.assertEqual(config["cot_count"], 1)

    # -------------------------------------------------------------------------
    # TEST 11: Baby Cot Unavailable
    # -------------------------------------------------------------------------
    def test_11_baby_cot_unavailable_rejected(self):
        # Disable cot on room and property
        self.standard_room_rule.cot_available = "No"
        self.standard_room_rule.cot_quantity = 0
        self.prop_a_rules.cot_available = "No"
        self.prop_a_rules.cot_quantity = 0
        self.db.commit()

        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.standard_room.id,
            adults=2,
            children=1,
            child_ages=[1],
            cot_count=1
        )
        self.assertFalse(config["valid"])
        self.assertIn("Baby cots are not available", config["error"])

    # -------------------------------------------------------------------------
    # TEST 12: Multiple Rooms Required for 6 Adults
    # -------------------------------------------------------------------------
    def test_12_multiple_rooms_required_6_adults(self):
        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.standard_room.id,
            adults=6,
            children=0
        )
        self.assertTrue(config["valid"])
        self.assertEqual(config["quantity"], 3)
        self.assertEqual(len(config["room_allocations"]), 3)
        for alloc in config["room_allocations"]:
            self.assertEqual(alloc["adults"], 2)

    # -------------------------------------------------------------------------
    # TEST 13: Multiple Rooms but Adult Required in Every Room
    # (1 adult + 3 children across rooms with max 1 child -> rejected because 1 adult < 3 rooms)
    # -------------------------------------------------------------------------
    def test_13_adult_required_in_every_room_rejected_when_insufficient_adults(self):
        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.standard_room.id,
            adults=1,
            children=3,
            child_ages=[4, 6, 8]
        )
        self.assertFalse(config["valid"])
        self.assertIn("requires at least one adult in each room", config["error"])

    # -------------------------------------------------------------------------
    # TEST 14: No Valid Configuration at Property (Children Not Allowed)
    # -------------------------------------------------------------------------
    def test_14_no_valid_configuration_when_children_not_allowed(self):
        # Property does not allow children
        self.prop_a_rules.children_allowed = "No"
        self.db.commit()

        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.family_room.id,
            adults=2,
            children=1,
            child_ages=[5]
        )
        self.assertFalse(config["valid"])
        self.assertEqual(config["error"], "Children are not permitted in this room or property.")

    # -------------------------------------------------------------------------
    # TEST 15: Valid Configuration at Another Nearby Property Found
    # -------------------------------------------------------------------------
    def test_15_valid_configuration_at_nearby_property(self):
        c_in = date.today() + timedelta(days=10)
        c_out = c_in + timedelta(days=2)

        # Search nearby Alappuzha for 2 adults + 2 children
        nearby = BookingAgentToolsService.search_nearby_properties(
            db=self.db,
            destination="Alappuzha",
            check_in=c_in,
            check_out=c_out,
            adults=2,
            children=2,
            child_ages=[4, 9]
        )
        self.assertTrue(len(nearby) > 0)
        first_match = nearby[0]
        self.assertTrue(first_match["room_config"]["valid"])
        self.assertIsNotNone(first_match["distance_km"])
        self.assertIsNotNone(first_match["travel_time_text"])

    # -------------------------------------------------------------------------
    # TEST 16: Live Revalidation Detects Inventory Change Before Checkout
    # -------------------------------------------------------------------------
    def test_16_live_revalidation_detects_inventory_depletion(self):
        c_in = date.today() + timedelta(days=12)
        c_out = c_in + timedelta(days=2)

        # Create active preview for 3 units of standard room
        preview = BookingAgentToolsService.create_booking_preview(
            db=self.db,
            traveler_id=self.traveler.id,
            property_id=self.prop_a.id,
            room_id=self.standard_room.id,
            check_in=c_in,
            check_out=c_out,
            adults=4,
            children=0,
            room_quantity=2
        )

        # Simulate conflicting booking consuming inventory
        conflict_booking = Booking(
            user_id=self.traveler.id,
            property_id=self.prop_a.id,
            booking_number=f"CONF-{uuid.uuid4().hex[:4]}",
            check_in=c_in,
            check_out=c_out,
            total_guests=10,
            total_amount=15000.0,
            status=BookingStatus.CONFIRMED
        )
        self.db.add(conflict_booking)
        self.db.flush()

        conflict_item = BookingRoom(
            booking_id=conflict_booking.id,
            room_id=self.standard_room.id,
            room_name=self.standard_room.name,
            nightly_price=3000.0,
            nights=2,
            quantity=4,  # Leaves only 1 unit out of 5
            guests=8,
            subtotal=12000.0
        )
        self.db.add(conflict_item)
        self.db.commit()

        # Revalidation fails because 2 rooms were requested but only 1 remains
        confirm_req = AIBookingConfirmRequest(preview_id=preview["preview_id"], rules_accepted=True)
        resp = BookingExecutionService.confirm_and_execute_booking(
            db=self.db,
            traveler_id=self.traveler.id,
            request=confirm_req
        )
        self.assertFalse(resp.success)
        self.assertEqual(resp.status, "BOOKING_REVALIDATION_REQUIRED")
        self.assertTrue(
            "inventory" in resp.revalidation_error.lower()
            or "remaining" in resp.revalidation_error.lower()
            or "unit" in resp.revalidation_error.lower(),
            f"Expected inventory/capacity depletion error, got: {resp.revalidation_error}"
        )

    # -------------------------------------------------------------------------
    # TEST 17: Price Changes Before Confirmation
    # -------------------------------------------------------------------------
    def test_17_price_change_detected_during_revalidation(self):
        c_in = date.today() + timedelta(days=15)
        c_out = c_in + timedelta(days=2)

        preview = BookingAgentToolsService.create_booking_preview(
            db=self.db,
            traveler_id=self.traveler.id,
            property_id=self.prop_a.id,
            room_id=self.standard_room.id,
            check_in=c_in,
            check_out=c_out,
            adults=2,
            children=0,
            room_quantity=1
        )

        # Host updates base price in PostgreSQL before customer confirms
        self.standard_room.base_price = 4000.0  # Was 3000.0
        self.db.commit()

        confirm_req = AIBookingConfirmRequest(preview_id=preview["preview_id"], rules_accepted=True)
        resp = BookingExecutionService.confirm_and_execute_booking(
            db=self.db,
            traveler_id=self.traveler.id,
            request=confirm_req
        )
        self.assertFalse(resp.success)
        self.assertEqual(resp.status, "BOOKING_REVALIDATION_REQUIRED")
        self.assertTrue(
            "price" in resp.revalidation_error.lower()
            or "pricing" in resp.revalidation_error.lower()
            or "discrepancy" in resp.revalidation_error.lower(),
            f"Expected pricing discrepancy error, got: {resp.revalidation_error}"
        )

    # -------------------------------------------------------------------------
    # TEST 18: Booking Preview Never Created for Invalid Configuration
    # -------------------------------------------------------------------------
    def test_18_booking_preview_raises_for_invalid_configuration(self):
        c_in = date.today() + timedelta(days=20)
        c_out = c_in + timedelta(days=2)

        # Minimum child age is 5, but child is 2
        self.standard_room_rule.minimum_child_age = 5
        self.db.commit()

        with self.assertRaises(ValueError) as ctx:
            BookingAgentToolsService.create_booking_preview(
                db=self.db,
                traveler_id=self.traveler.id,
                property_id=self.prop_a.id,
                room_id=self.standard_room.id,
                check_in=c_in,
                check_out=c_out,
                adults=2,
                children=1,
                child_ages=[2]
            )
        self.assertIn("Children under 5 years", str(ctx.exception))

    # -------------------------------------------------------------------------
    # TEST 19: Normal Non-AI Booking Uses Same Policy Logic
    # -------------------------------------------------------------------------
    def test_19_normal_manual_booking_uses_shared_policy_logic(self):
        c_in = date.today() + timedelta(days=25)
        c_out = c_in + timedelta(days=2)

        # Minimum child age is 6, request has child age 3
        self.standard_room_rule.minimum_child_age = 6
        self.db.commit()

        booking_payload = BookingCreate(
            property_id=self.prop_a.id,
            room_id=self.standard_room.id,
            check_in=c_in,
            check_out=c_out,
            adults=2,
            children=1,
            child_ages=[3],
            room_quantity=1,
            rules_accepted=True
        )

        with self.assertRaises(HTTPException) as ctx:
            BookingService.create_booking(
                db=self.db,
                user_id=self.traveler.id,
                data=booking_payload
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Children under 6 years are not permitted", ctx.exception.detail)

    # -------------------------------------------------------------------------
    # TEST 20: Trip Planner Booking Uses Same Policy Logic
    # -------------------------------------------------------------------------
    def test_20_trip_planner_uses_shared_policy_logic(self):
        # 1. Test check_room_suitability
        self.standard_room_rule.children_allowed = "No"
        self.db.commit()

        is_suitable, reason = TripPlannerValidationService.check_room_suitability(
            room=self.standard_room,
            adults=2,
            children=1,
            child_ages=[4]
        )
        self.assertFalse(is_suitable)
        self.assertEqual(reason, "Children are not permitted in this room or property.")

        # 2. Test calculate_room_configuration in TripPlannerToolsService
        c_in_str = (date.today() + timedelta(days=30)).isoformat()
        c_out_str = (date.today() + timedelta(days=32)).isoformat()

        tp_config = TripPlannerToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_a.id,
            check_in=c_in_str,
            check_out=c_out_str,
            adults=2,
            children=1,
            child_ages=[4]
        )
        # Standard room cannot accommodate children -> only family room should be in valid configurations
        for cfg in tp_config["configurations"]:
            self.assertNotEqual(cfg["room_id"], self.standard_room.id)
            self.assertEqual(cfg["room_id"], self.family_room.id)

if __name__ == "__main__":
    unittest.main()
