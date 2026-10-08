"""
End-to-End Automated Test Suite for VOYARA AI Natural Assistant & Geographic Intelligence:
1. Exact requirement extraction & preservation (no defaulting or overriding of dates, traveler count, or destination)
2. International / Non-India destination detection (immediate natural explanation + suggested Indian destinations)
3. Indian location disambiguation (e.g. Bilaspur HP vs Bilaspur Chhattisgarh without guessing)
4. Indian confirmed destination search & real nearby verified fallbacks
5. Zero database jargon / PostgreSQL mentions / hardcoded radius in user-facing dialog
"""

import unittest
from datetime import date, timedelta
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.property import Property, PropertyVerificationStatus, PropertyImage
from app.models.room import Room
from app.models.ai_booking import AIBookingSession, AIBookingSessionStatus, AIBookingMessage
from app.schemas.ai_booking import AIBookingChatRequest
from app.services.ai.booking_agent_service import BookingAgentService
from app.services.ai.booking_agent_tools import BookingAgentToolsService


class TestAIBookingNaturalAssistantGeoE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()
        cls._setup_test_data()

    @classmethod
    def tearDownClass(cls):
        try:
            cls.db.rollback()
        finally:
            cls.db.close()

    @classmethod
    def _setup_test_data(cls):
        # 1. Traveler
        cls.traveler = cls.db.query(User).filter(
            (User.email == "traveler_geo_e2e@voyara.com") | (User.phone == "+919876540099")
        ).first()
        if not cls.traveler:
            cls.traveler = User(
                email="traveler_geo_e2e@voyara.com",
                hashed_password="mock_hashed_password_123",
                name="Aarav Sharma",
                role=UserRole.CUSTOMER,
                phone="+919876540099",
                is_active=True
            )
            cls.db.add(cls.traveler)
            cls.db.commit()

        # 2. Provider Profile
        from app.models.provider import ProviderProfile
        cls.provider = cls.db.query(ProviderProfile).filter(ProviderProfile.user_id == cls.traveler.id).first()
        if not cls.provider:
            cls.provider = ProviderProfile(
                user_id=cls.traveler.id,
                business_name="Voyara Sanctuaries Provider",
                contact_phone="+919876540099"
            )
            cls.db.add(cls.provider)
            cls.db.commit()

        # 3. Verified Indian Properties
        # A. Munnar Sanctuary
        from app.models.property import PropertyRule
        from app.models.room import RoomRule

        cls.prop_munnar = cls.db.query(Property).filter(Property.name == "Munnar Tea Sanctuary Geo").first()
        if not cls.prop_munnar:
            cls.prop_munnar = Property(
                provider_id=cls.provider.id,
                name="Munnar Tea Sanctuary Geo",
                property_type="Resort",
                description="Luxury Tea Sanctuary in Munnar",
                city="Munnar",
                state="Kerala",
                country="India",
                address="Chithirapuram, Munnar",
                contact_phone="+919876540099",
                contact_email="munnar_geo@voyara.com",
                latitude=10.0889,
                longitude=77.0595,
                is_active=True,
                verification_status=PropertyVerificationStatus.VERIFIED.value,
                rating=4.9,
                review_count=24
            )
            cls.db.add(cls.prop_munnar)
            cls.db.flush()

            cls.prop_munnar_rules = PropertyRule(
                property_id=cls.prop_munnar.id,
                children_allowed="Yes",
                minimum_child_age=1,
                max_child_age=12,
                maximum_children=2,
                free_additional_children=1,
                child_charge_enabled=True,
                child_charge_amount=500.0,
                extra_bed_available="Yes",
                cot_available="Yes"
            )
            cls.db.add(cls.prop_munnar_rules)

            cls.room_munnar = Room(
                property_id=cls.prop_munnar.id,
                name="Deluxe Tea View Room",
                room_type="Deluxe Room",
                description="Deluxe Room overlooking tea plantations",
                base_price=5000.0,
                capacity=2,
                quantity=5,
                is_active=True
            )
            cls.db.add(cls.room_munnar)
            cls.db.flush()

            cls.room_munnar_rules = RoomRule(
                room_id=cls.room_munnar.id,
                maximum_total_guests=3,
                maximum_adults=2,
                maximum_children=2,
                children_allowed="Yes",
                extra_bed_available="Yes",
                maximum_extra_beds=1,
                cot_available="Yes"
            )
            cls.db.add(cls.room_munnar_rules)

        # B. Alappuzha Nearby Sanctuary (near Kuttikkanam)
        cls.prop_alappuzha = cls.db.query(Property).filter(Property.name == "Backwater Breeze Geo").first()
        if not cls.prop_alappuzha:
            cls.prop_alappuzha = Property(
                provider_id=cls.provider.id,
                name="Backwater Breeze Geo",
                property_type="Houseboat",
                description="Authentic luxury houseboat in Alappuzha",
                city="Alappuzha",
                state="Kerala",
                country="India",
                address="Punnamada, Alappuzha",
                contact_phone="+919876540099",
                contact_email="alappuzha_geo@voyara.com",
                latitude=9.4981,
                longitude=76.3388,
                is_active=True,
                verification_status=PropertyVerificationStatus.VERIFIED.value,
                rating=4.85,
                review_count=18
            )
            cls.db.add(cls.prop_alappuzha)
            cls.db.flush()

            cls.prop_alappuzha_rules = PropertyRule(
                property_id=cls.prop_alappuzha.id,
                children_allowed="Yes",
                minimum_child_age=1,
                max_child_age=12,
                maximum_children=2,
                free_additional_children=1,
                child_charge_enabled=True,
                child_charge_amount=500.0,
                extra_bed_available="Yes",
                cot_available="Yes"
            )
            cls.db.add(cls.prop_alappuzha_rules)

            cls.room_alappuzha = Room(
                property_id=cls.prop_alappuzha.id,
                name="Premium Lake Villa",
                room_type="Villa",
                description="Spacious villa by the lake",
                base_price=6000.0,
                capacity=4,
                quantity=3,
                is_active=True
            )
            cls.db.add(cls.room_alappuzha)
            cls.db.flush()

            cls.room_alappuzha_rules = RoomRule(
                room_id=cls.room_alappuzha.id,
                maximum_total_guests=6,
                maximum_adults=4,
                maximum_children=2,
                children_allowed="Yes",
                extra_bed_available="Yes",
                maximum_extra_beds=2,
                cot_available="Yes"
            )
            cls.db.add(cls.room_alappuzha_rules)

        cls.db.commit()

    # -------------------------------------------------------------------------
    # TEST 1: Exact Extraction & Preservation of "book an stay in canada for 4 menber on oct1 to oct 4"
    # -------------------------------------------------------------------------
    def test_01_extract_exact_parameters_with_typos_and_no_spaces(self):
        msg = "book an stay in canada for 4 menber on oct1 to oct 4"
        parsed = BookingAgentToolsService.extract_booking_requirements(msg, {})
        ext = parsed["extracted"]

        self.assertEqual(ext["destination"], "Canada")
        self.assertEqual(ext["adults"], 4)
        self.assertEqual(ext["children"], 0)
        self.assertTrue(ext["check_in"].endswith("-10-01"), f"Expected October 1st, got: {ext['check_in']}")
        self.assertTrue(ext["check_out"].endswith("-10-04"), f"Expected October 4th, got: {ext['check_out']}")
        self.assertIn("destination", parsed["explicitly_provided"])
        self.assertIn("adults", parsed["explicitly_provided"])
        self.assertIn("check_in", parsed["explicitly_provided"])
        self.assertIn("check_out", parsed["explicitly_provided"])

    # -------------------------------------------------------------------------
    # TEST 2: International Destination (Canada) -> Immediate Natural India Scope Explanation
    # -------------------------------------------------------------------------
    def test_02_international_destination_canada_explains_india_scope(self):
        req = AIBookingChatRequest(
            message="book an stay in canada for 4 menber on oct1 to oct 4"
        )
        resp = BookingAgentService.handle_chat_message(
            db=self.db,
            traveler_id=self.traveler.id,
            request=req
        )

        self.assertEqual(resp.intent, "UNSUPPORTED_REGION")
        self.assertEqual(resp.action, "PROVIDE_INDIAN_DESTINATION")
        self.assertTrue(resp.requires_user_action)
        self.assertIn("India", resp.message)
        self.assertIn("Canada", resp.message)
        self.assertNotIn("PostgreSQL", resp.message)
        self.assertNotIn("database", resp.message.lower())
        self.assertNotIn("80 km", resp.message)

        # Active request context snapshot must preserve the traveler's exact inputs (Canada, 4 adults, Oct 1 - Oct 4)
        snap = resp.context_snapshot
        self.assertEqual(snap.get("destination"), "Canada")
        self.assertEqual(snap.get("adults"), 4)
        self.assertTrue(snap.get("check_in", "").endswith("-10-01"), f"Expected October 1st, got: {snap.get('check_in')}")
        self.assertTrue(snap.get("check_out", "").endswith("-10-04"), f"Expected October 4th, got: {snap.get('check_out')}")

        # Must provide Indian destination suggestions
        self.assertTrue(len(resp.suggested_destinations) > 0)
        dest_names = [d["name"] for d in resp.suggested_destinations]
        self.assertTrue(any("Munnar" in n or "Goa" in n for n in dest_names))

    # -------------------------------------------------------------------------
    # TEST 3: Other International Destinations (Paris, New York, London, Bali)
    # -------------------------------------------------------------------------
    def test_03_other_international_destinations_detected(self):
        for place in ["Paris", "New York", "London", "Bali", "Dubai", "Switzerland", "Tokyo"]:
            geo = BookingAgentToolsService.analyze_destination(self.db, place)
            self.assertFalse(geo["is_supported_in_india"], f"{place} should be recognized as non-Indian")
            self.assertEqual(geo["reason"], "INTERNATIONAL_DESTINATION")
            self.assertIn("India", geo["message"])

    # -------------------------------------------------------------------------
    # TEST 4: Ambiguous Indian Place Name (Bilaspur) -> Asks for Clarification without Guessing
    # -------------------------------------------------------------------------
    def test_04_ambiguous_indian_location_bilaspur_asks_clarification(self):
        req = AIBookingChatRequest(
            message="book a stay in bilaspur for 2 adults from 10 Oct to 12 Oct 2026"
        )
        resp = BookingAgentService.handle_chat_message(
            db=self.db,
            traveler_id=self.traveler.id,
            request=req
        )

        self.assertEqual(resp.intent, "LOCATION_DISAMBIGUATION_REQUIRED")
        self.assertEqual(resp.action, "SELECT_LOCATION")
        self.assertTrue(resp.requires_user_action)
        self.assertIn("Bilaspur", resp.message)
        self.assertNotIn("PostgreSQL", resp.message)
        self.assertNotIn("database", resp.message.lower())

        # Must provide interactive clarification options
        self.assertTrue(len(resp.location_options) >= 2)
        labels = [opt["label"] for opt in resp.location_options]
        self.assertTrue(any("Himachal Pradesh" in l for l in labels))
        self.assertTrue(any("Chhattisgarh" in l for l in labels))

    # -------------------------------------------------------------------------
    # TEST 5: Ambiguous Indian Place Name (Aurangabad) -> Asks for Clarification
    # -------------------------------------------------------------------------
    def test_05_ambiguous_indian_location_aurangabad_asks_clarification(self):
        geo = BookingAgentToolsService.analyze_destination(self.db, "Aurangabad")
        self.assertTrue(geo["is_supported_in_india"])
        self.assertTrue(geo["is_ambiguous"])
        self.assertEqual(geo["reason"], "MULTIPLE_LOCATIONS_IN_INDIA")
        self.assertTrue(len(geo["location_options"]) >= 2)

    # -------------------------------------------------------------------------
    # TEST 6: Disambiguated Destination (Bilaspur, Himachal Pradesh) -> Confirmed
    # -------------------------------------------------------------------------
    def test_06_disambiguated_destination_confirmed(self):
        geo = BookingAgentToolsService.analyze_destination(self.db, "Bilaspur, Himachal Pradesh")
        self.assertTrue(geo["is_supported_in_india"])
        self.assertFalse(geo["is_ambiguous"])
        self.assertEqual(geo["reason"], "SUPPORTED_INDIAN_DESTINATION")

    # -------------------------------------------------------------------------
    # TEST 7: Confirmed Indian Destination Search (Munnar) -> Direct Match & Preview
    # -------------------------------------------------------------------------
    def test_07_confirmed_indian_destination_finds_stay(self):
        req = AIBookingChatRequest(
            message="book a deluxe room in Munnar for 2 adults from 10 Oct to 12 Oct 2026"
        )
        resp = BookingAgentService.handle_chat_message(
            db=self.db,
            traveler_id=self.traveler.id,
            request=req
        )

        self.assertEqual(resp.intent, "PAYMENT_CONFIRMATION_REQUIRED")
        self.assertIsNotNone(resp.booking_preview)
        self.assertIn("Munnar", resp.booking_preview["property_name"])
        self.assertEqual(resp.booking_preview["adults"], 2)
        self.assertEqual(resp.booking_preview["check_in"], "2026-10-10")
        self.assertEqual(resp.booking_preview["check_out"], "2026-10-12")
        self.assertNotIn("PostgreSQL", resp.message)
        self.assertNotIn("database", resp.message.lower())

    # -------------------------------------------------------------------------
    # TEST 8: Confirmed Destination with No Stays (Vagamon) -> Real Nearby Fallback in DB
    # -------------------------------------------------------------------------
    def test_08_no_stay_in_destination_provides_real_nearby_fallback(self):
        req = AIBookingChatRequest(
            message="book a stay in Vagamon for 4 guests from 10 Oct to 12 Oct 2026"
        )
        resp = BookingAgentService.handle_chat_message(
            db=self.db,
            traveler_id=self.traveler.id,
            request=req
        )

        self.assertEqual(resp.intent, "SELECTION_REQUIRED")
        self.assertEqual(resp.search_state, "NEARBY_MATCH")
        self.assertTrue(len(resp.alternatives) > 0)
        
        # Check first alternative
        first_alt = resp.alternatives[0]
        self.assertEqual(first_alt["adults"], 4)
        self.assertIsNotNone(first_alt["distance_km"])
        self.assertIsNotNone(first_alt["travel_time_text"])
        self.assertNotIn("PostgreSQL", resp.message)
        self.assertNotIn("database", resp.message.lower())

    # -------------------------------------------------------------------------
    # TEST 9: Traveler Variations Extraction ("4 pax", "group of 4", "party of 6")
    # -------------------------------------------------------------------------
    def test_09_traveler_variations_extraction(self):
        test_cases = [
            ("book stay in munnar for 4 pax from 10 oct to 12 oct", 4, 0),
            ("trip to goa for party of 6 from 10 oct to 12 oct", 6, 0),
            ("stay in udaipur for group of 3 from 10 oct to 12 oct", 3, 0),
            ("hotel in manali for 5 travelers from 10 oct to 12 oct", 5, 0),
            ("sanctuary in wayanad for 4 of us from 10 oct to 12 oct", 4, 0),
        ]
        for prompt, exp_adults, exp_children in test_cases:
            res = BookingAgentToolsService.extract_booking_requirements(prompt, {})
            self.assertEqual(res["extracted"]["adults"], exp_adults, f"Failed on prompt: {prompt}")
            self.assertEqual(res["extracted"]["children"], exp_children, f"Failed on prompt: {prompt}")

    # -------------------------------------------------------------------------
    # TEST 10: Date Formats Extraction ("1-4 oct", "oct1-4", "1st to 4th oct")
    # -------------------------------------------------------------------------
    def test_10_date_formats_extraction(self):
        test_cases = [
            ("book stay in munnar for 2 adults on oct1 to oct 4", "-10-01", "-10-04"),
            ("stay in munnar for 2 adults on 1 oct to 4 oct", "-10-01", "-10-04"),
            ("stay in goa for 2 adults from 1st to 4th oct", "-10-01", "-10-04"),
            ("stay in goa for 2 adults on oct 1 - oct 4", "-10-01", "-10-04"),
        ]
        for prompt, exp_in, exp_out in test_cases:
            res = BookingAgentToolsService.extract_booking_requirements(prompt, {})
            self.assertTrue(res["extracted"]["check_in"].endswith(exp_in), f"Failed check_in on prompt: {prompt}, got: {res['extracted']['check_in']}")
            self.assertTrue(res["extracted"]["check_out"].endswith(exp_out), f"Failed check_out on prompt: {prompt}, got: {res['extracted']['check_out']}")


if __name__ == "__main__":
    unittest.main()
