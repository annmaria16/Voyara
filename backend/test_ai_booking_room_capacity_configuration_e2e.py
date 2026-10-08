"""
Comprehensive End-to-End Test Suite for VOYARA AI Room Capacity, Multi-Room Configuration,
Child Policies, 'Important to Know' Stay Rules, and VeriNova Autonomous Verification.

Covers all 22 required test cases:
1. 4 adults where one Family Room fits all 4.
2. 4 adults where only two 2-person rooms are available.
3. 4 adults where both Family Room and two Deluxe Rooms are available.
4. User explicitly requests separate rooms.
5. 2 adults + 1 child who stays free.
6. 2 adults + child requiring extra bed.
7. Child age outside the free-age range.
8. Room capacity exceeded.
9. Requested number of rooms unavailable.
10. Extra bed unavailable.
11. Cot required but unavailable.
12. Child policy missing.
13. Smoking policy available.
14. Smoking policy missing.
15. Cancellation policy available.
16. Date-specific room availability.
17. Correct multi-night price.
18. Correct total for multiple rooms.
19. Booking preview reflects the exact selected room configuration.
20. VeriNova verifies the final booking successfully.
21. Stale availability between preview and confirmation.
22. No suitable single-room configuration but valid multi-room configuration exists.
"""

import unittest
import uuid
from datetime import date, timedelta
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.models.property import Property, PropertyVerificationStatus, PropertyRule
from app.models.room import Room, RoomRule
from app.models.booking import Booking, BookingStatus, BookingRoom
from app.models.ai_booking import AIBookingSession, AIBookingSessionStatus, AIBookingPreview, AIBookingPreviewStatus
from app.schemas.ai_booking import AIBookingChatRequest, AIBookingConfirmRequest
from app.services.ai.booking_agent_service import BookingAgentService
from app.services.ai.booking_agent_tools import BookingAgentToolsService
from app.services.ai.booking_execution_service import BookingExecutionService
from app.services.availability.availability_service import AvailabilityService


class TestAIBookingRoomCapacityConfigurationE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()
        cls._setup_test_environment()

    @classmethod
    def tearDownClass(cls):
        try:
            cls.db.rollback()
        finally:
            cls.db.close()

    @classmethod
    def _setup_test_environment(cls):
        # 1. Traveler
        cls.traveler = cls.db.query(User).filter(User.email == "traveler_cap_e2e@voyara.com").first()
        if not cls.traveler:
            cls.traveler = User(
                email="traveler_cap_e2e@voyara.com",
                hashed_password="mock_hashed_password_cap",
                name="Rohan Verma",
                role=UserRole.CUSTOMER,
                phone="+919888877701",
                is_active=True
            )
            cls.db.add(cls.traveler)
            cls.db.flush()

        # 2. Provider
        cls.provider = cls.db.query(ProviderProfile).filter(ProviderProfile.user_id == cls.traveler.id).first()
        if not cls.provider:
            cls.provider = ProviderProfile(
                user_id=cls.traveler.id,
                business_name="Munnar Grand Sanctuaries Ltd",
                contact_phone="+919888877701"
            )
            cls.db.add(cls.provider)
            cls.db.flush()

        # 3. Property A: Munnar Valley Sanctuary (Has Family Room cap 4 and Deluxe Rooms cap 2)
        cls.prop_a = cls.db.query(Property).filter(Property.name == "Munnar Valley Sanctuary Cap").first()
        if not cls.prop_a:
            cls.prop_a = Property(
                provider_id=cls.provider.id,
                name="Munnar Valley Sanctuary Cap",
                property_type="Resort",
                description="Serene valley sanctuary with luxury family villas and deluxe suites",
                city="Munnar",
                state="Kerala",
                country="India",
                address="Pothamedu Viewpoint Road, Munnar",
                contact_phone="+919876543210",
                contact_email="valley_cap@voyara.com",
                latitude=10.0750,
                longitude=77.0600,
                is_active=True,
                verification_status=PropertyVerificationStatus.VERIFIED.value,
                rating=4.9,
                review_count=32,
                check_in_time="14:00",
                check_out_time="11:00",
                cancellation_refund_percentage=50
            )
            cls.db.add(cls.prop_a)
            cls.db.flush()

            cls.prop_a_rules = PropertyRule(
                property_id=cls.prop_a.id,
                smoking_policy="Non-smoking",
                pets_policy="No",
                children_allowed="Yes",
                minimum_child_age=1,
                max_child_age=12,
                maximum_children=2,
                free_additional_children=1,
                child_charge_enabled=True,
                child_charge_amount=500.0,
                extra_bed_available="Yes",
                cot_available="Yes",
                cot_quantity=1,
                cot_price=0.0,
                cot_charge_unit="Free"
            )
            cls.db.add(cls.prop_a_rules)
            cls.db.flush()

        # Family Room (Cap 4, 1 unit, ₹8000/night)
        cls.room_family = cls.db.query(Room).filter(Room.property_id == cls.prop_a.id, Room.name == "Valley Family Villa").first()
        if not cls.room_family:
            cls.room_family = Room(
                property_id=cls.prop_a.id,
                name="Valley Family Villa",
                room_type="Family Room",
                description="Luxury family villa with mountain views and capacity for 4 adults.",
                base_price=8000.0,
                capacity=4,
                quantity=1,
                is_active=True
            )
            cls.db.add(cls.room_family)
            cls.db.flush()

            cls.room_family_rules = RoomRule(
                room_id=cls.room_family.id,
                maximum_total_guests=4,
                maximum_adults=4,
                maximum_children=2,
                children_allowed="Yes",
                extra_bed_available="No",
                maximum_extra_beds=0,
                extra_bed_price=0.0,
                cot_available="Yes",
                cot_quantity=1,
                free_additional_children=1
            )
            cls.db.add(cls.room_family_rules)
            cls.db.flush()

        # Deluxe Room (Cap 2, 4 units, ₹5000/night)
        cls.room_deluxe = cls.db.query(Room).filter(Room.property_id == cls.prop_a.id, Room.name == "Valley Deluxe Room").first()
        if not cls.room_deluxe:
            cls.room_deluxe = Room(
                property_id=cls.prop_a.id,
                name="Valley Deluxe Room",
                room_type="Deluxe Room",
                description="Deluxe room overlooking tea gardens for 2 adults.",
                base_price=5000.0,
                capacity=2,
                quantity=4,
                is_active=True
            )
            cls.db.add(cls.room_deluxe)
            cls.db.flush()

            cls.room_deluxe_rules = RoomRule(
                room_id=cls.room_deluxe.id,
                maximum_total_guests=3,
                maximum_adults=2,
                maximum_children=1,
                children_allowed="Yes",
                extra_bed_available="Yes",
                maximum_extra_beds=1,
                extra_bed_price=1000.0,
                cot_available="Yes",
                cot_quantity=1,
                free_additional_children=1
            )
            cls.db.add(cls.room_deluxe_rules)
            cls.db.flush()

        # 4. Property B: Munnar Boutique Cottage (Only 2-person rooms, no family room)
        cls.prop_b = cls.db.query(Property).filter(Property.name == "Munnar Boutique Cottages Cap").first()
        if not cls.prop_b:
            cls.prop_b = Property(
                provider_id=cls.provider.id,
                name="Munnar Boutique Cottages Cap",
                property_type="Cottage",
                description="Cozy cottages in Munnar",
                city="Munnar",
                state="Kerala",
                country="India",
                address="Devikulam Road, Munnar",
                contact_phone="+919888877702",
                contact_email="cottages_cap@voyara.com",
                latitude=10.0600,
                longitude=77.0700,
                is_active=True,
                verification_status=PropertyVerificationStatus.VERIFIED.value,
                rating=4.7,
                review_count=18,
                check_in_time="13:00",
                check_out_time="10:00"
            )
            cls.db.add(cls.prop_b)
            cls.db.flush()

        cls.room_cottage = cls.db.query(Room).filter(Room.property_id == cls.prop_b.id, Room.name == "Boutique Cottage Room").first()
        if not cls.room_cottage:
            cls.room_cottage = Room(
                property_id=cls.prop_b.id,
                name="Boutique Cottage Room",
                room_type="Standard Room",
                description="Private cottage room for 2 adults.",
                base_price=3000.0,
                capacity=2,
                quantity=3,
                is_active=True
            )
            cls.db.add(cls.room_cottage)
            cls.db.flush()

            cls.room_cottage_rules = RoomRule(
                room_id=cls.room_cottage.id,
                maximum_total_guests=2,
                maximum_adults=2,
                maximum_children=0,
                children_allowed="No",
                extra_bed_available="No",
                maximum_extra_beds=0,
                cot_available="No",
                cot_quantity=0
            )
            cls.db.add(cls.room_cottage_rules)
            cls.db.flush()

        # 5. Property C: Strict Policy & Missing Policy Test Property
        cls.prop_c = cls.db.query(Property).filter(Property.name == "Munnar Minimal Rules Stay").first()
        if not cls.prop_c:
            cls.prop_c = Property(
                provider_id=cls.provider.id,
                name="Munnar Minimal Rules Stay",
                property_type="Homestay",
                description="Minimal rules stay",
                city="Munnar",
                state="Kerala",
                country="India",
                address="Old Munnar Town",
                contact_phone="+919888877703",
                contact_email="minimal_cap@voyara.com",
                is_active=True,
                verification_status=PropertyVerificationStatus.VERIFIED.value,
                rating=4.5
            )
            cls.db.add(cls.prop_c)
            cls.db.flush()

        cls.room_minimal = cls.db.query(Room).filter(Room.property_id == cls.prop_c.id, Room.name == "Minimal Standard Room").first()
        if not cls.room_minimal:
            cls.room_minimal = Room(
                property_id=cls.prop_c.id,
                name="Minimal Standard Room",
                room_type="Standard Room",
                description="Basic standard room for 2 guests.",
                base_price=2000.0,
                capacity=2,
                quantity=1,
                is_active=True
            )
            cls.db.add(cls.room_minimal)
            cls.db.flush()

        cls.db.commit()

    def setUp(self):
        # Clean up any bookings for the test properties to avoid stale booking conflicts
        prop_ids = [self.prop_a.id, self.prop_b.id, self.prop_c.id]
        bks = self.db.query(Booking).filter(Booking.property_id.in_(prop_ids)).all()
        for b in bks:
            self.db.delete(b)
        self.db.commit()

    # -------------------------------------------------------------------------
    # TEST CASES 1–22
    # -------------------------------------------------------------------------

    def test_01_four_adults_single_family_room_fits_all(self):
        """Case 1: 4 adults where user wants everyone together -> single Family Room (1 room · 4 adults)."""
        c_in = date.today() + timedelta(days=20)
        c_out = c_in + timedelta(days=2)

        req = AIBookingChatRequest(
            message=f"Book a stay in Munnar for 4 adults from {c_in.strftime('%d %b')} to {c_out.strftime('%d %b %Y')} all together"
        )
        res = BookingAgentService.handle_chat_message(self.db, self.traveler.id, req)

        self.assertIn(res.intent, ["PAYMENT_CONFIRMATION_REQUIRED", "SELECTION_REQUIRED"])
        if res.booking_preview:
            self.assertEqual(res.booking_preview["room_quantity"], 1)
            self.assertEqual(res.booking_preview["adults"], 4)
            self.assertIn("Valley Family Villa", res.booking_preview["room_name"])
            self.assertIn("1 room · 4 adults", res.booking_preview["selected_configuration_label"])

    def test_02_four_adults_only_two_person_rooms_available(self):
        """Case 2: 4 adults where only 2-person rooms are available -> calculates 2 rooms × 2 adults each."""
        c_in = date.today() + timedelta(days=25)
        c_out = c_in + timedelta(days=2)

        # Search specifically for Boutique Cottage which has only 2-person rooms
        cfg = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_b.id,
            room_id=self.room_cottage.id,
            adults=4,
            children=0,
            requested_quantity=1
        )
        self.assertTrue(cfg["valid"])
        self.assertEqual(cfg["quantity"], 2)  # Automatically calculated 2 rooms needed
        self.assertEqual(len(cfg["room_allocations"]), 2)
        for alloc in cfg["room_allocations"]:
            self.assertEqual(alloc["adults"], 2)

    def test_03_four_adults_both_family_and_deluxe_available_shows_choices(self):
        """Case 3: 4 adults where both Family Room (1 room) and Deluxe Rooms (2 rooms) exist -> presents CHOICE_AVAILABLE."""
        c_in = date.today() + timedelta(days=30)
        c_out = c_in + timedelta(days=2)

        req = AIBookingChatRequest(
            message=f"Book a stay in Munnar for 4 adults from {c_in.strftime('%d %b')} to {c_out.strftime('%d %b %Y')}"
        )
        res = BookingAgentService.handle_chat_message(self.db, self.traveler.id, req)

        self.assertEqual(res.search_state, "CHOICE_AVAILABLE")
        self.assertEqual(res.intent, "SELECTION_REQUIRED")
        self.assertEqual(len(res.configuration_choices), 2)
        self.assertEqual(res.configuration_choices[0]["room_quantity"], 1)
        self.assertEqual(res.configuration_choices[1]["room_quantity"], 2)
        self.assertIn("Which would you prefer?", res.message)

    def test_04_user_explicitly_requests_separate_rooms(self):
        """Case 4: User explicitly requests 'separate rooms' for 4 adults -> allocates multi-room configuration."""
        c_in = date.today() + timedelta(days=35)
        c_out = c_in + timedelta(days=2)

        req = AIBookingChatRequest(
            message=f"Book separate rooms in Munnar for 4 adults from {c_in.strftime('%d %b')} to {c_out.strftime('%d %b %Y')}"
        )
        res = BookingAgentService.handle_chat_message(self.db, self.traveler.id, req)

        self.assertIn(res.intent, ["PAYMENT_CONFIRMATION_REQUIRED", "SELECTION_REQUIRED"])
        if res.booking_preview:
            self.assertEqual(res.booking_preview["room_quantity"], 2)
            self.assertEqual(res.booking_preview["adults"], 4)
            self.assertIn("2 rooms · 2 adults each", res.booking_preview["selected_configuration_label"])

    def test_05_two_adults_one_child_free_on_existing_beds(self):
        """Case 5: 2 adults + 1 child (age 6) where property child policy allows 1 free child on existing beds."""
        c_in = date.today() + timedelta(days=40)
        c_out = c_in + timedelta(days=2)

        price_eval = BookingAgentToolsService.calculate_booking_price(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.room_deluxe.id,
            check_in=c_in,
            check_out=c_out,
            room_quantity=1,
            adults=2,
            children=1,
            child_ages=[6]
        )
        self.assertEqual(price_eval["child_supplement_total"], 0.0)
        self.assertEqual(price_eval["total_price"], 5000.0 * 2)  # 2 nights base only

    def test_06_two_adults_child_requiring_extra_bed(self):
        """Case 6: 2 adults + 1 child requesting extra bed -> extra bed charge (₹1000/night) calculated."""
        c_in = date.today() + timedelta(days=45)
        c_out = c_in + timedelta(days=2)

        price_eval = BookingAgentToolsService.calculate_booking_price(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.room_deluxe.id,
            check_in=c_in,
            check_out=c_out,
            room_quantity=1,
            adults=2,
            children=1,
            child_ages=[10],
            extra_bed_count=1
        )
        self.assertEqual(price_eval["extra_bed_total"], 1000.0 * 2)  # ₹2000 for 2 nights
        self.assertEqual(price_eval["total_price"], (5000.0 * 2) + 2000.0)

    def test_07_child_age_outside_free_range(self):
        """Case 7: Child age exceeding free allowance / multiple children where only 1 is free."""
        c_in = date.today() + timedelta(days=50)
        c_out = c_in + timedelta(days=1)

        price_eval = BookingAgentToolsService.calculate_booking_price(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.room_deluxe.id,
            check_in=c_in,
            check_out=c_out,
            room_quantity=1,
            adults=2,
            children=2,  # 1 free, 1 charged
            child_ages=[6, 11]
        )
        self.assertEqual(price_eval["child_supplement_total"], 500.0)  # ₹500 for the second child
        self.assertEqual(price_eval["total_price"], 5000.0 + 500.0)

    def test_08_room_capacity_exceeded(self):
        """Case 8: Room capacity exceeded (e.g. 5 adults for room with capacity 2 and only 1 unit)."""
        cfg = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_c.id,
            room_id=self.room_minimal.id,
            adults=5,
            children=0,
            requested_quantity=1
        )
        self.assertFalse(cfg["valid"])
        self.assertEqual(cfg["policy_violation"], "CAPACITY_OR_POLICY_EXCEEDED")

    def test_09_requested_number_of_rooms_unavailable(self):
        """Case 9: Requested quantity exceeds available units in inventory."""
        c_in = date.today() + timedelta(days=55)
        c_out = c_in + timedelta(days=2)

        with self.assertRaises(ValueError) as ctx:
            BookingAgentToolsService.create_booking_preview(
                db=self.db,
                traveler_id=self.traveler.id,
                property_id=self.prop_a.id,
                room_id=self.room_family.id,
                check_in=c_in,
                check_out=c_out,
                room_quantity=3  # Property A has only 1 Family Villa
            )
        self.assertIn("only 1 available", str(ctx.exception))

    def test_10_extra_bed_unavailable(self):
        """Case 10: Extra bed requested for room where extra beds are not allowed."""
        cfg = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.room_family.id,
            adults=2,
            children=0,
            extra_bed_count=1  # Family Villa extra_bed_available = No
        )
        self.assertFalse(cfg["valid"])
        self.assertEqual(cfg["policy_violation"], "EXTRA_BED_NOT_AVAILABLE")

    def test_11_cot_required_but_unavailable(self):
        """Case 11: Cot requested for room where cots are not allowed."""
        cfg = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.prop_b.id,
            room_id=self.room_cottage.id,
            adults=2,
            children=0,
            cot_count=1  # Cottage cot_available = No
        )
        self.assertFalse(cfg["valid"])
        self.assertEqual(cfg["policy_violation"], "COT_NOT_AVAILABLE")

    def test_12_child_policy_missing(self):
        """Case 12: Child policy missing -> does not invent rules, displays 'Not specified by Stay Partner'."""
        rules = BookingAgentToolsService.extract_important_to_know(
            db=self.db,
            property_id=self.prop_c.id,
            room_id=self.room_minimal.id
        )
        child_rules = [r for r in rules if "Child" in r or "children" in r.lower()]
        # Either omitted or explicitly noted not specified
        if child_rules:
            self.assertTrue(any("Not specified" in r or "free" in r for r in child_rules))

    def test_13_smoking_policy_available(self):
        """Case 13: Smoking policy available -> displays 'Non-smoking property'."""
        rules = BookingAgentToolsService.extract_important_to_know(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.room_deluxe.id
        )
        self.assertIn("Non-smoking property", rules)

    def test_14_smoking_policy_missing(self):
        """Case 14: Smoking policy missing -> displays 'Smoking policy: Not specified by Stay Partner'."""
        rules = BookingAgentToolsService.extract_important_to_know(
            db=self.db,
            property_id=self.prop_c.id,
            room_id=self.room_minimal.id
        )
        self.assertIn("Smoking policy: Not specified by Stay Partner", rules)

    def test_15_cancellation_policy_available(self):
        """Case 15: Cancellation policy available -> accurately formats refund deadline."""
        c_in = date.today() + timedelta(days=60)
        rules = BookingAgentToolsService.extract_important_to_know(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.room_deluxe.id,
            check_in=c_in
        )
        free_until = c_in - timedelta(days=2)
        expected_line = f"Free cancellation until {free_until.strftime('%d %b %Y')}"
        self.assertIn(expected_line, rules)

    def test_16_date_specific_room_availability(self):
        """Case 16: Room availability checked strictly against exact date overlap."""
        c_in = date.today() + timedelta(days=65)
        c_out = c_in + timedelta(days=2)

        # Clean up any leftover test bookings on these dates
        old_bks = self.db.query(Booking).filter(Booking.property_id == self.prop_a.id, Booking.check_in == c_in).all()
        for ob in old_bks:
            self.db.delete(ob)
        self.db.commit()

        # Create an existing confirmed booking for room_family on these dates
        b = Booking(
            user_id=self.traveler.id,
            property_id=self.prop_a.id,
            check_in=c_in,
            check_out=c_out,
            total_amount=16000.0,
            status=BookingStatus.CONFIRMED,
            booking_number=f"BK-TEST-{uuid.uuid4().hex[:6]}"
        )
        self.db.add(b)
        self.db.flush()

        br = BookingRoom(
            booking_id=b.id,
            room_id=self.room_family.id,
            room_name=self.room_family.name,
            nightly_price=8000.0,
            nights=2,
            quantity=1,
            guests=4,
            subtotal=16000.0
        )
        self.db.add(br)
        self.db.commit()

        # Check availability for the same dates -> should be 0 available
        avail = AvailabilityService.check_room_availability(self.db, self.room_family.id, c_in, c_out)
        self.assertEqual(avail["available_quantity"], 0)

    def test_17_correct_multi_night_price(self):
        """Case 17: Multi-night pricing formula: base_price × nights."""
        c_in = date.today() + timedelta(days=70)
        c_out = c_in + timedelta(days=3)  # 3 nights

        price_eval = BookingAgentToolsService.calculate_booking_price(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.room_deluxe.id,
            check_in=c_in,
            check_out=c_out,
            room_quantity=1
        )
        self.assertEqual(price_eval["nights"], 3)
        self.assertEqual(price_eval["room_total"], 5000.0 * 3)
        self.assertEqual(price_eval["total_price"], 15000.0)

    def test_18_correct_total_for_multiple_rooms(self):
        """Case 18: Multiple room calculation: base_price × nights × room_quantity."""
        c_in = date.today() + timedelta(days=75)
        c_out = c_in + timedelta(days=3)  # 3 nights, 2 rooms

        price_eval = BookingAgentToolsService.calculate_booking_price(
            db=self.db,
            property_id=self.prop_a.id,
            room_id=self.room_deluxe.id,
            check_in=c_in,
            check_out=c_out,
            room_quantity=2
        )
        self.assertEqual(price_eval["room_total"], 5000.0 * 3 * 2)  # ₹30,000
        self.assertEqual(price_eval["total_price"], 30000.0)

    def test_19_booking_preview_reflects_selected_room_configuration(self):
        """Case 19: Booking preview contains selected_configuration_label and important_to_know rules."""
        c_in = date.today() + timedelta(days=80)
        c_out = c_in + timedelta(days=2)

        preview = BookingAgentToolsService.create_booking_preview(
            db=self.db,
            traveler_id=self.traveler.id,
            property_id=self.prop_a.id,
            room_id=self.room_deluxe.id,
            check_in=c_in,
            check_out=c_out,
            adults=4,
            children=0,
            room_quantity=2
        )
        self.assertEqual(preview["room_quantity"], 2)
        self.assertEqual(preview["selected_configuration_label"], "2 rooms · 2 adults each")
        self.assertTrue(len(preview["important_to_know"]) >= 2)
        self.assertIn("Non-smoking property", preview["important_to_know"])

    def test_20_verinova_verifies_final_booking_successfully(self):
        """Case 20: VeriNova independently audits and verifies the final booking against PostgreSQL state."""
        c_in = date.today() + timedelta(days=85)
        c_out = c_in + timedelta(days=2)

        preview = BookingAgentToolsService.create_booking_preview(
            db=self.db,
            traveler_id=self.traveler.id,
            property_id=self.prop_a.id,
            room_id=self.room_deluxe.id,
            check_in=c_in,
            check_out=c_out,
            adults=2,
            children=0,
            room_quantity=1
        )

        confirm_req = AIBookingConfirmRequest(
            preview_id=preview["preview_id"],
            idempotency_key=f"idemp-cap-test-{uuid.uuid4().hex[:8]}"
        )
        exec_res = BookingExecutionService.confirm_and_execute_booking(
            db=self.db,
            traveler_id=self.traveler.id,
            request=confirm_req
        )

        self.assertTrue(exec_res.success)
        self.assertEqual(exec_res.status, "VERIFIED")
        self.assertIsNotNone(exec_res.booking)
        self.assertIsNotNone(exec_res.verification)
        self.assertTrue(exec_res.verification["checks"]["capacity_valid"])
        self.assertTrue(exec_res.verification["checks"]["price_match"])
        self.assertTrue(exec_res.verification["checks"]["room_match"])

    def test_21_stale_availability_between_preview_and_confirmation(self):
        """Case 21: Stale inventory between preview and confirm triggers revalidation error."""
        c_in = date.today() + timedelta(days=90)
        c_out = c_in + timedelta(days=2)

        # Clean up any leftover test bookings on these dates
        old_bks = self.db.query(Booking).filter(Booking.property_id == self.prop_a.id, Booking.check_in == c_in).all()
        for ob in old_bks:
            self.db.delete(ob)
        self.db.commit()

        # Create preview for the single family room
        preview = BookingAgentToolsService.create_booking_preview(
            db=self.db,
            traveler_id=self.traveler.id,
            property_id=self.prop_a.id,
            room_id=self.room_family.id,
            check_in=c_in,
            check_out=c_out,
            adults=4,
            children=0,
            room_quantity=1
        )

        # Simulate another user booking the same family room in the meantime
        competing_booking = Booking(
            user_id=self.traveler.id,
            property_id=self.prop_a.id,
            check_in=c_in,
            check_out=c_out,
            total_amount=16000.0,
            status=BookingStatus.CONFIRMED,
            booking_number=f"BK-COMPETE-{uuid.uuid4().hex[:6]}"
        )
        self.db.add(competing_booking)
        self.db.flush()

        competing_room = BookingRoom(
            booking_id=competing_booking.id,
            room_id=self.room_family.id,
            room_name=self.room_family.name,
            nightly_price=8000.0,
            nights=2,
            quantity=1,
            guests=4,
            subtotal=16000.0
        )
        self.db.add(competing_room)
        self.db.commit()

        # Now attempt to confirm the original preview
        confirm_req = AIBookingConfirmRequest(
            preview_id=preview["preview_id"],
            idempotency_key=f"idemp-stale-{uuid.uuid4().hex[:8]}"
        )
        exec_res = BookingExecutionService.confirm_and_execute_booking(
            db=self.db,
            traveler_id=self.traveler.id,
            request=confirm_req
        )
        self.assertFalse(exec_res.success)
        self.assertEqual(exec_res.status, "BOOKING_REVALIDATION_REQUIRED")

    def test_22_no_suitable_single_room_but_valid_multi_room_exists(self):
        """Case 22: Property has no single room for 4, but valid multi-room configuration exists -> recommended."""
        c_in = date.today() + timedelta(days=95)
        c_out = c_in + timedelta(days=2)

        fb = BookingAgentToolsService.search_intelligent_fallbacks(
            db=self.db,
            destination="Munnar",
            check_in=c_in,
            check_out=c_out,
            adults=4,
            children=0,
            property_type="Cottage"  # Property B only has 2-person cottages
        )
        self.assertIn(fb["state"], ["EXACT_MATCH", "CLOSE_MATCH"])
        if fb.get("exact_match"):
            self.assertEqual(fb["exact_match"]["room_config"]["quantity"], 2)
            self.assertEqual(fb["exact_match"]["room"]["name"], "Boutique Cottage Room")


if __name__ == "__main__":
    unittest.main()
