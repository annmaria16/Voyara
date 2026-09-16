import os
import re
import json
import httpx
from datetime import datetime, date
from typing import Dict, Any, List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.config import settings
from app.models.property import Property, PropertyRule
from app.models.room import Room, RoomRule
from app.models.booking import Booking, BookingRuleSnapshot
from app.schemas.stayguide import (
    PropertyRuleCreate,
    PropertyRuleUpdate,
    PropertyRuleResponse,
    RoomRuleCreate,
    RoomRuleUpdate,
    RoomRuleResponse,
    StayGuideAskRequest,
    StayGuideAskResponse,
)

class StayGuideService:
    @staticmethod
    def get_or_create_property_rules(db: Session, property_id: int) -> PropertyRule:
        """Fetch existing property home rules or instantiate default rules record."""
        rule = db.query(PropertyRule).filter(PropertyRule.property_id == property_id).first()
        if not rule:
            rule = PropertyRule(
                property_id=property_id,
                children_allowed="Yes",
                minimum_child_age=None,
                maximum_children=None,
                children_charged_separately=False,
                child_pricing_note=None,
                cot_policy="Upon Request",
                cot_quantity=0,
                pets_policy="No",
                pet_fee=0.0,
                pet_policy_description=None,
                smoking_policy="No",
                smoking_policy_description=None,
                parties_policy="No",
                party_policy_description=None,
                visitors_policy="Upon Request",
                overnight_visitors_allowed=False,
                visitor_policy_description=None,
                quiet_hours_enabled=False,
                quiet_hours_start="22:00",
                quiet_hours_end="07:00",
                check_in_start="14:00",
                check_in_end="22:00",
                check_out_time="11:00",
                early_checkin_policy="Upon Request",
                late_checkout_policy="Upon Request",
                government_id_required=True,
                minimum_checkin_age=18,
                safety_instructions=None,
                additional_rules=None
            )
            db.add(rule)
            db.commit()
            db.refresh(rule)
        return rule

    @staticmethod
    def update_property_rules(db: Session, property_id: int, data: PropertyRuleUpdate) -> PropertyRule:
        """Update property home rules with validation."""
        rule = StayGuideService.get_or_create_property_rules(db, property_id)
        update_dict = data.model_dump(exclude_unset=True)

        # Validation: check_in times
        if "check_in_start" in update_dict and "check_in_end" in update_dict:
            start = update_dict.get("check_in_start")
            end = update_dict.get("check_in_end")
            if start and end and start == end:
                raise HTTPException(status_code=400, detail="Check-in start time and end time cannot be identical.")

        # Validation: positive numbers & non-negative checks
        if "pet_fee" in update_dict and update_dict["pet_fee"] is not None and update_dict["pet_fee"] < 0:
            raise HTTPException(status_code=400, detail="Pet fee cannot be negative.")
        if "cot_quantity" in update_dict and update_dict["cot_quantity"] is not None and update_dict["cot_quantity"] < 0:
            raise HTTPException(status_code=400, detail="Cot quantity cannot be negative.")
        if "cot_price" in update_dict and update_dict["cot_price"] is not None and update_dict["cot_price"] < 0:
            raise HTTPException(status_code=400, detail="Baby cot charge cannot be negative.")
        if "additional_children_allowed" in update_dict and update_dict["additional_children_allowed"] is not None and update_dict["additional_children_allowed"] < 0:
            raise HTTPException(status_code=400, detail="Additional children allowed cannot be negative.")
        if "max_child_age" in update_dict and update_dict["max_child_age"] is not None and update_dict["max_child_age"] < 0:
            raise HTTPException(status_code=400, detail="Maximum child age cannot be negative.")
        if "free_additional_children" in update_dict and update_dict["free_additional_children"] is not None and update_dict["free_additional_children"] < 0:
            raise HTTPException(status_code=400, detail="Free additional children cannot be negative.")
        if "child_charge_amount" in update_dict and update_dict["child_charge_amount"] is not None and update_dict["child_charge_amount"] < 0:
            raise HTTPException(status_code=400, detail="Additional child charge cannot be negative.")

        eff_allowed = update_dict.get("additional_children_allowed", getattr(rule, "additional_children_allowed", 0)) or 0
        eff_free = update_dict.get("free_additional_children", getattr(rule, "free_additional_children", 0)) or 0
        if eff_free > eff_allowed:
            raise HTTPException(status_code=400, detail="Free additional children cannot exceed the number of additional children allowed.")

        for k, v in update_dict.items():
            setattr(rule, k, v)

        db.commit()
        db.refresh(rule)
        return rule

    @staticmethod
    def get_or_create_room_rules(db: Session, room_id: int) -> RoomRule:
        """Fetch existing room occupancy rules or instantiate defaults aligned with room.capacity."""
        rule = db.query(RoomRule).filter(RoomRule.room_id == room_id).first()
        if not rule:
            room = db.query(Room).filter(Room.id == room_id).first()
            cap = room.capacity if room else 2
            rule = RoomRule(
                room_id=room_id,
                maximum_total_guests=cap,
                maximum_adults=cap,
                maximum_children=max(0, cap - 1),
                additional_children_allowed=0,
                max_child_age=None,
                free_additional_children=0,
                child_charge_enabled=False,
                child_charge_amount=0.0,
                child_charge_unit="Per night",
                existing_bed_allowed="Yes",
                existing_bed_explanation=None,
                extra_bed_available="No",
                extra_bed_charge_unit="Per night",
                children_allowed="Yes",
                minimum_child_age=None,
                cot_policy="Upon Request",
                cot_available="No",
                cot_quantity=0,
                cot_price=0.0,
                cot_charge_unit="Free",
                extra_bed_policy="Upon Request",
                maximum_extra_beds=0,
                extra_bed_price=0.0,
                child_price=0.0,
                room_specific_rules=None
            )
            db.add(rule)
            db.commit()
            db.refresh(rule)
        return rule

    @staticmethod
    def update_room_rules(db: Session, room_id: int, data: RoomRuleUpdate) -> RoomRule:
        """Update room occupancy rules with validation."""
        rule = StayGuideService.get_or_create_room_rules(db, room_id)
        update_dict = data.model_dump(exclude_unset=True)

        room = db.query(Room).filter(Room.id == room_id).first()
        cap = room.capacity if room else 2

        if "maximum_adults" in update_dict and update_dict["maximum_adults"] is not None:
            if update_dict["maximum_adults"] > cap:
                raise HTTPException(
                    status_code=400,
                    detail=f"Maximum adults ({update_dict['maximum_adults']}) cannot exceed room capacity ({cap})."
                )
            if update_dict["maximum_adults"] < 1:
                raise HTTPException(status_code=400, detail="Maximum adults must be at least 1.")

        if "maximum_children" in update_dict and update_dict["maximum_children"] is not None:
            if update_dict["maximum_children"] > cap:
                raise HTTPException(
                    status_code=400,
                    detail=f"Maximum children ({update_dict['maximum_children']}) cannot exceed room capacity ({cap})."
                )
            if update_dict["maximum_children"] < 0:
                raise HTTPException(status_code=400, detail="Maximum children cannot be negative.")

        if "additional_children_allowed" in update_dict and update_dict["additional_children_allowed"] is not None and update_dict["additional_children_allowed"] < 0:
            raise HTTPException(status_code=400, detail="Additional children allowed cannot be negative.")
        if "max_child_age" in update_dict and update_dict["max_child_age"] is not None and update_dict["max_child_age"] < 0:
            raise HTTPException(status_code=400, detail="Maximum child age cannot be negative.")
        if "free_additional_children" in update_dict and update_dict["free_additional_children"] is not None and update_dict["free_additional_children"] < 0:
            raise HTTPException(status_code=400, detail="Free additional children cannot be negative.")
        if "child_charge_amount" in update_dict and update_dict["child_charge_amount"] is not None and update_dict["child_charge_amount"] < 0:
            raise HTTPException(status_code=400, detail="Additional child charge cannot be negative.")
        if "extra_bed_price" in update_dict and update_dict["extra_bed_price"] is not None and update_dict["extra_bed_price"] < 0:
            raise HTTPException(status_code=400, detail="Extra bed charge cannot be negative.")
        if "cot_price" in update_dict and update_dict["cot_price"] is not None and update_dict["cot_price"] < 0:
            raise HTTPException(status_code=400, detail="Baby cot charge cannot be negative.")
        if "child_price" in update_dict and update_dict["child_price"] is not None and update_dict["child_price"] < 0:
            raise HTTPException(status_code=400, detail="Child price cannot be negative.")

        eff_allowed = update_dict.get("additional_children_allowed", getattr(rule, "additional_children_allowed", 0)) or 0
        eff_free = update_dict.get("free_additional_children", getattr(rule, "free_additional_children", 0)) or 0
        if eff_free > eff_allowed:
            raise HTTPException(status_code=400, detail="Free additional children cannot exceed the number of additional children allowed.")

        for k, v in update_dict.items():
            setattr(rule, k, v)

        db.commit()
        db.refresh(rule)
        return rule

    @staticmethod
    def serialize_property_rules(rule: Optional[PropertyRule]) -> Optional[Dict[str, Any]]:
        if not rule:
            return None
        c_at = getattr(rule, "created_at", None)
        u_at = getattr(rule, "updated_at", None)
        return {
            "id": getattr(rule, "id", None),
            "property_id": getattr(rule, "property_id", None),
            "created_at": c_at.isoformat() if hasattr(c_at, "isoformat") else c_at,
            "updated_at": u_at.isoformat() if hasattr(u_at, "isoformat") else u_at,
            "children_allowed": getattr(rule, "children_allowed", "Yes"),
            "minimum_child_age": getattr(rule, "minimum_child_age", None),
            "maximum_children": getattr(rule, "maximum_children", None),
            "additional_children_allowed": getattr(rule, "additional_children_allowed", 0),
            "max_child_age": getattr(rule, "max_child_age", None),
            "free_additional_children": getattr(rule, "free_additional_children", 0),
            "child_charge_enabled": getattr(rule, "child_charge_enabled", False),
            "child_charge_amount": getattr(rule, "child_charge_amount", 0.0),
            "child_charge_unit": getattr(rule, "child_charge_unit", "Per night"),
            "existing_bed_allowed": getattr(rule, "existing_bed_allowed", "Yes"),
            "existing_bed_explanation": getattr(rule, "existing_bed_explanation", None),
            "extra_bed_available": getattr(rule, "extra_bed_available", "No"),
            "extra_bed_charge_unit": getattr(rule, "extra_bed_charge_unit", "Per night"),
            "children_charged_separately": getattr(rule, "children_charged_separately", False),
            "child_pricing_note": getattr(rule, "child_pricing_note", None),
            "cot_policy": getattr(rule, "cot_policy", "Upon Request"),
            "cot_available": getattr(rule, "cot_available", "No"),
            "cot_quantity": getattr(rule, "cot_quantity", 0),
            "cot_price": getattr(rule, "cot_price", 0.0),
            "cot_charge_unit": getattr(rule, "cot_charge_unit", "Free"),
            "pets_policy": getattr(rule, "pets_policy", "No"),
            "pet_fee": getattr(rule, "pet_fee", 0.0),
            "pet_policy_description": getattr(rule, "pet_policy_description", None),
            "smoking_policy": getattr(rule, "smoking_policy", "No"),
            "smoking_policy_description": getattr(rule, "smoking_policy_description", None),
            "parties_policy": getattr(rule, "parties_policy", "No"),
            "party_policy_description": getattr(rule, "party_policy_description", None),
            "visitors_policy": getattr(rule, "visitors_policy", "Upon Request"),
            "overnight_visitors_allowed": getattr(rule, "overnight_visitors_allowed", False),
            "visitor_policy_description": getattr(rule, "visitor_policy_description", None),
            "quiet_hours_enabled": getattr(rule, "quiet_hours_enabled", False),
            "quiet_hours_start": getattr(rule, "quiet_hours_start", "22:00"),
            "quiet_hours_end": getattr(rule, "quiet_hours_end", "07:00"),
            "check_in_start": getattr(rule, "check_in_start", "14:00"),
            "check_in_end": getattr(rule, "check_in_end", "22:00"),
            "check_out_time": getattr(rule, "check_out_time", "11:00"),
            "early_checkin_policy": getattr(rule, "early_checkin_policy", "Upon Request"),
            "late_checkout_policy": getattr(rule, "late_checkout_policy", "Upon Request"),
            "government_id_required": getattr(rule, "government_id_required", True),
            "minimum_checkin_age": getattr(rule, "minimum_checkin_age", 18),
            "safety_instructions": getattr(rule, "safety_instructions", None),
            "additional_rules": getattr(rule, "additional_rules", None),
        }

    @staticmethod
    def serialize_room_rules(rule: Optional[RoomRule], room: Optional[Room] = None) -> Optional[Dict[str, Any]]:
        if not rule and not room:
            return None
        c_at = getattr(rule, "created_at", None) if rule else None
        u_at = getattr(rule, "updated_at", None) if rule else None
        return {
            "id": getattr(rule, "id", None) if rule else None,
            "room_id": getattr(rule, "room_id", room.id if room else None),
            "created_at": c_at.isoformat() if hasattr(c_at, "isoformat") else c_at,
            "updated_at": u_at.isoformat() if hasattr(u_at, "isoformat") else u_at,
            "maximum_total_guests": getattr(rule, "maximum_total_guests", room.capacity if room else 2),
            "maximum_adults": getattr(rule, "maximum_adults", room.capacity if room else 2),
            "maximum_children": getattr(rule, "maximum_children", max(0, (room.capacity - 1) if room and room.capacity > 1 else 0)),
            "additional_children_allowed": getattr(rule, "additional_children_allowed", 0),
            "max_child_age": getattr(rule, "max_child_age", None),
            "free_additional_children": getattr(rule, "free_additional_children", 0),
            "child_charge_enabled": getattr(rule, "child_charge_enabled", False),
            "child_charge_amount": getattr(rule, "child_charge_amount", 0.0),
            "child_charge_unit": getattr(rule, "child_charge_unit", "Per night"),
            "existing_bed_allowed": getattr(rule, "existing_bed_allowed", "Yes"),
            "existing_bed_explanation": getattr(rule, "existing_bed_explanation", None),
            "extra_bed_available": getattr(rule, "extra_bed_available", "No"),
            "extra_bed_charge_unit": getattr(rule, "extra_bed_charge_unit", "Per night"),
            "children_allowed": getattr(rule, "children_allowed", "Yes"),
            "minimum_child_age": getattr(rule, "minimum_child_age", None),
            "cot_policy": getattr(rule, "cot_policy", "Upon Request"),
            "cot_available": getattr(rule, "cot_available", "No"),
            "cot_quantity": getattr(rule, "cot_quantity", 0),
            "cot_price": getattr(rule, "cot_price", 0.0),
            "cot_charge_unit": getattr(rule, "cot_charge_unit", "Free"),
            "extra_bed_policy": getattr(rule, "extra_bed_policy", "Upon Request"),
            "maximum_extra_beds": getattr(rule, "maximum_extra_beds", 0),
            "extra_bed_price": getattr(rule, "extra_bed_price", 0.0),
            "child_price": getattr(rule, "child_price", 0.0),
            "room_specific_rules": getattr(rule, "room_specific_rules", None),
        }

    @staticmethod
    def validate_rules_consistency(prop: Property) -> List[str]:
        """Detect inconsistent or conflicting rules for admin review dossier."""
        warnings: List[str] = []
        hr = prop.home_rules
        if not hr:
            return warnings

        # Check room-level vs capacity consistency
        for r in prop.rooms:
            rr = r.rules
            if rr:
                if rr.maximum_adults and rr.maximum_adults > r.capacity:
                    warnings.append(f"Room '{r.name}' capacity is {r.capacity} but maximum adults is configured as {rr.maximum_adults}.")
                if rr.maximum_children and rr.maximum_children > r.capacity:
                    warnings.append(f"Room '{r.name}' maximum children ({rr.maximum_children}) exceeds total room capacity ({r.capacity}).")
                if rr.extra_bed_price and rr.extra_bed_price < 0:
                    warnings.append(f"Room '{r.name}' extra bed price is negative.")
                if rr.children_allowed == "No" and hr.children_allowed == "Yes":
                    warnings.append(f"Property allows children globally, but Room '{r.name}' restricts children.")
                if hr.children_allowed == "No" and rr.children_allowed == "Yes":
                    warnings.append(f"Property restricts children globally, but Room '{r.name}' allows children.")

        # Check check-in/out times
        if hr.check_in_start and hr.check_in_end and hr.check_in_start == hr.check_in_end:
            warnings.append("Property check-in start and end times are identical.")

        return warnings

    @staticmethod
    def create_booking_rule_snapshot(
        db: Session,
        booking_id: int,
        prop: Property,
        room: Room,
        adults: int = 1,
        children: int = 0,
        child_ages: Optional[List[int]] = None,
        cot_count: int = 0,
        extra_bed_count: int = 0,
        accepted_by_customer: bool = True
    ) -> BookingRuleSnapshot:
        """Create and store immutable rules snapshot for this confirmed booking."""
        prop_snapshot = StayGuideService.serialize_property_rules(prop.home_rules)
        room_snapshot = StayGuideService.serialize_room_rules(room.rules, room)

        snapshot = BookingRuleSnapshot(
            booking_id=booking_id,
            property_rules_snapshot=prop_snapshot,
            room_rules_snapshot=room_snapshot,
            adults=adults,
            children=children,
            child_ages=child_ages or [],
            cot_count=cot_count,
            extra_bed_count=extra_bed_count,
            accepted_by_customer=accepted_by_customer,
            accepted_at=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        db.add(snapshot)
        db.flush()
        return snapshot

    @staticmethod
    async def ask_stayguide(db: Session, req: StayGuideAskRequest) -> StayGuideAskResponse:
        """
        Voyara AI – Property Information Assistant.
        Answers traveler questions strictly grounded in PostgreSQL property, room, availability, and rule records.
        Enforces verified property access, security allowlists, and context locks.
        """
        from app.services.availability.availability_service import AvailabilityService

        # 1. Verify property exists
        prop = db.query(Property).filter(Property.id == req.property_id).first()
        if not prop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Property #{req.property_id} not found."
            )

        # 2. Verify property is approved, active, and visible to Travelers
        if getattr(prop, "verification_status", None) != "VERIFIED" or not getattr(prop, "is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Voyara AI is only available for verified and active properties."
            )

        # 3. Verify selected room belongs to selected property and is active
        room = None
        if req.room_id:
            room = db.query(Room).filter(Room.id == req.room_id, Room.property_id == prop.id).first()
            if not room:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Room #{req.room_id} does not belong to Property '{prop.name}'."
                )
            if not room.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Room '{room.name}' is currently not active."
                )

        hr: Optional[PropertyRule] = prop.home_rules
        rr: Optional[RoomRule] = room.rules if room else None

        question = req.effective_question
        q_lower = question.lower().strip()
        adults = req.effective_adults
        children = req.effective_children
        child_ages = req.child_ages or []
        total_guests = adults + children

        # Fallback response strings required by prompt specification
        FALLBACK_MISSING = "This information has not been specified by the Stay Partner for this property or room. Please contact the Stay Partner for confirmation."
        FALLBACK_SECURITY = "I can only help with public information about the selected property and room."
        FALLBACK_OTHER_PROP = "I can only answer questions about the property currently selected."
        FALLBACK_UNCLEAR = "Could you please clarify what you would like to know about this property or room?"

        # -------------------------------------------------------------------------
        # Check for empty or unclear query
        # -------------------------------------------------------------------------
        cleaned_alpha = re.sub(r'[^a-zA-Z0-9]', '', q_lower)
        if len(cleaned_alpha) < 2:
            return StayGuideAskResponse(
                answer=FALLBACK_UNCLEAR,
                source="fallback",
                rule_references=[f"Property: {prop.name}"],
                confidence=1.0
            )

        # -------------------------------------------------------------------------
        # Security & Privacy Guard (Never expose private/system/admin/backend data)
        # -------------------------------------------------------------------------
        security_patterns = [
            r'\bpasswords?\b', r'\bjwt\b', r'\btokens?\b', r'\bapi[-_ ]?keys?\b', r'\bsecrets?\b',
            r'\bdatabases?\b', r'\btables?\b', r'\bsql\b', r'\bselect\s+\*|\bselect\s+.+\s+from\b|\binsert\s+into\b|\bdelete\s+from\b',
            r'\bdrop\s+table\b', r'\bcredentials?\b', r'\bconnection[-_ ]?strings?\b', r'\badmin[-_ ]?notes?\b',
            r'\bownership[-_ ]?proof\b', r'\bownership[-_ ]?documents?\b', r'\blegal[-_ ]?evidence\b',
            r'\bverinova\b', r'\btrust[-_ ]?scores?\b',
            r'\brisk[-_ ]?flags?\b', r'\bduplicate[-_ ]?detection\b', r'\bbackend[-_ ]?architecture\b',
            r'\bsystem[-_ ]?prompts?\b', r'\bai[-_ ]?prompts?\b', r'\bsecurity[-_ ]?rules?\b',
            r'\binternal[-_ ]?logs?\b', r'\buser[-_ ]?hashes?\b', r'\bother[-_ ]?users?\b',
            r'\bcustomer[-_ ]?lists?\b', r'\bprovider[-_ ]?bank\b', r'\bpayout[-_ ]?details?\b',
            r'\badmin[-_ ]?discussions?\b', r'\bmoderation[-_ ]?details?\b', r'\bcolumns?\b'
        ]
        if any(re.search(pat, q_lower) for pat in security_patterns):
            return StayGuideAskResponse(
                answer=FALLBACK_SECURITY,
                source="security_guard",
                rule_references=["Public traveler information policy enforced"],
                confidence=1.0
            )

        # -------------------------------------------------------------------------
        # Cross-Property Context Guard (Reject queries asking about other properties)
        # -------------------------------------------------------------------------
        cross_prop_patterns = [
            r'\bother\s+(?:properties|hotels|stays|resorts|homestays|villas|cottages|accommodations)\b',
            r'\banother\s+(?:property|hotel|stay|resort|homestay|villa|cottage)\b',
            r'\bdifferent\s+(?:property|hotel|stay|resort)\b',
            r'\blist\s+all\s+(?:properties|hotels|stays)\b',
            r'\bshow\s+(?:me\s+)?(?:all|other)\s+(?:properties|hotels|stays)\b',
            r'\brecommend\s+other\s+(?:properties|hotels|stays)\b',
            r'\bcompare\s+with\s+(?:another|other)\b'
        ]
        if any(re.search(pat, q_lower) for pat in cross_prop_patterns):
            return StayGuideAskResponse(
                answer=FALLBACK_OTHER_PROP,
                source="context_guard",
                rule_references=[f"Locked context: {prop.name}"],
                confidence=1.0
            )

        # Word-to-number mapping
        word_num = {
            "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
            "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
            "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10
        }

        # Check explicit guest counts mentioned in question
        adult_match = re.search(r'\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+adults?', q_lower)
        child_match = re.search(r'\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:children|child|kid|kids|baby|babies)', q_lower)
        guest_match = re.search(r'\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:guests?|members?|people|persons?|pax|travellers?|travelers?)', q_lower)
        we_are_match = re.search(r'\b(?:we\s+are|group\s+of|family\s+of|for)\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)(?:\s+(?:members?|people|persons?|guests?|adults?|pax))?', q_lower)

        extracted_adults = adults
        extracted_children = children
        if adult_match:
            raw_a = adult_match.group(1)
            extracted_adults = word_num.get(raw_a, int(raw_a) if raw_a.isdigit() else adults)
        if child_match:
            raw_c = child_match.group(1)
            extracted_children = word_num.get(raw_c, int(raw_c) if raw_c.isdigit() else children)

        if adult_match or child_match:
            total_guests = extracted_adults + extracted_children
        elif guest_match:
            raw_g = guest_match.group(1)
            total_guests = word_num.get(raw_g, int(raw_g) if raw_g.isdigit() else total_guests)
        elif we_are_match:
            raw_w = we_are_match.group(1)
            total_guests = word_num.get(raw_w, int(raw_w) if raw_w.isdigit() else total_guests)

        room_capacity = room.capacity if room else 2
        max_adults = rr.maximum_adults if rr and rr.maximum_adults else room_capacity
        max_children = rr.maximum_children if rr and rr.maximum_children is not None else max(0, room_capacity - 1)
        prop_children_allowed = hr.children_allowed if hr else "Yes"
        room_children_allowed = rr.children_allowed if rr else prop_children_allowed
        active_rooms = [r for r in prop.rooms if r.is_active]

        # Clean query for conversational exact matches
        q_clean = re.sub(r'[\s!?.…]+$', '', q_lower).strip()

        # -------------------------------------------------------------------------
        # A. GREETINGS (Section 2)
        # -------------------------------------------------------------------------
        if re.search(r'^(?:hello|hallo|namaste|hola)(?:\s+(?:there|voyara|ai|assistant))?[!?.]*$', q_lower) or q_clean in ["hello", "hello there", "hello voyara", "hello ai", "hello assistant", "hallo", "namaste", "hola"]:
            return StayGuideAskResponse(
                answer="Hello! 👋 Welcome to Voyara AI. I can help you learn more about this property, its rooms, amenities, guest policies, and available experiences. What would you like to know?",
                source="conversational_greeting",
                rule_references=[f"Property: {prop.name}"],
                booking_allowed=True
            )

        if re.search(r'^(?:hi|hi\s+there|hi\s+voyara|hi\s+ai)(?:\s+(?:there|voyara|ai|assistant))?[!?.]*$', q_lower) or q_clean in ["hi", "hi there", "hi voyara", "hi ai", "hi assistant"]:
            return StayGuideAskResponse(
                answer="Hi there! 😊 What would you like to know about this property or room?",
                source="conversational_greeting",
                rule_references=[f"Property: {prop.name}"],
                booking_allowed=True
            )

        if re.search(r'^(?:good\s+morning)(?:\s+(?:voyara|ai|there))?[!?.]*$', q_lower) or q_clean in ["good morning", "good morning there", "good morning voyara", "good morning ai"]:
            return StayGuideAskResponse(
                answer="Good morning! ☀️ How can I help you with this property today?",
                source="conversational_greeting",
                rule_references=[f"Property: {prop.name}"],
                booking_allowed=True
            )

        if re.search(r'^(?:good\s+afternoon)(?:\s+(?:voyara|ai|there))?[!?.]*$', q_lower) or q_clean in ["good afternoon", "good afternoon there", "good afternoon voyara", "good afternoon ai"]:
            return StayGuideAskResponse(
                answer="Good afternoon! 🌿 What would you like to know about your selected stay?",
                source="conversational_greeting",
                rule_references=[f"Property: {prop.name}"],
                booking_allowed=True
            )

        if re.search(r'^(?:good\s+evening)(?:\s+(?:voyara|ai|there))?[!?.]*$', q_lower) or q_clean in ["good evening", "good evening there", "good evening voyara", "good evening ai"]:
            return StayGuideAskResponse(
                answer="Good evening! 🌅 I’m here to help you explore this property and its available information.",
                source="conversational_greeting",
                rule_references=[f"Property: {prop.name}"],
                booking_allowed=True
            )

        if re.search(r'^(?:hey|howdy|greetings|good\s+day)(?:\s+(?:there|voyara|ai))?[!?.]*$', q_lower) or q_clean in ["hey", "hey there", "hey voyara", "hey ai", "greetings", "howdy", "good day"]:
            return StayGuideAskResponse(
                answer="Hey! 👋 Ask me anything about this selected property or room.",
                source="conversational_greeting",
                rule_references=[f"Property: {prop.name}"],
                booking_allowed=True
            )

        if re.search(r'^(?:how\s+are\s+you(?:r\s+day|\s+doing|\s+today)?|how\'?s\s+it\s+going|hope\s+you\s+are\s+well)[!?.]*$', q_lower) or q_clean in ["how are you", "how are you doing", "how are you today", "how's it going", "how is it going", "hope you are well"]:
            return StayGuideAskResponse(
                answer=f"I'm doing great, thank you! 😊 I'm ready to help you with anything you need to know about {prop.name}. How can I assist you today?",
                source="conversational_greeting",
                rule_references=[f"Property: {prop.name}"],
                booking_allowed=True
            )

        if re.search(r'^(?:wishes|best\s+wishes|warm\s+wishes|warmest\s+wishes)[!?.]*$', q_lower) or q_clean in ["wishes", "best wishes", "warm wishes", "warmest wishes"]:
            return StayGuideAskResponse(
                answer=f"Warmest wishes to you as well! 🌟 How may I help you with {prop.name} today?",
                source="conversational_greeting",
                rule_references=[f"Property: {prop.name}"],
                booking_allowed=True
            )

        # -------------------------------------------------------------------------
        # B. BASIC HELP & IDENTITY RESPONSES (Section 5)
        # -------------------------------------------------------------------------
        # Who are you / Identity
        is_identity_q = any(re.search(pat, q_lower) for pat in [
            r'^(?:who\s+are\s+(?:you|u)|what\s+is\s+your\s+(?:name|purpose|role)|what\s+are\s+you)[!?.]*$'
        ]) or q_clean in ["who are you", "what is your purpose", "what is your role", "who is this", "what are you", "who are u", "what is your name"]
        if is_identity_q:
            return StayGuideAskResponse(
                answer="I’m Voyara AI, your property information assistant. I can help you understand the public information available about the property and room you selected.",
                source="assistant_identity",
                rule_references=[f"Property: {prop.name}"],
                booking_allowed=True
            )

        # What can you do / Capabilities
        is_what_can_you_do = any(re.search(pat, q_lower) for pat in [
            r'^(?:what\s+can\s+(?:you|u)\s+do(?:\s+for\s+me)?|what\s+(?:you|u)\s+can\s+do(?:\s+for\s+me)?|what\s+are\s+your\s+capabilities|what\s+do\s+you\s+do)[!?.]*$'
        ]) or q_clean in ["what can you do", "what can you do for me", "what you can do", "what you can do for me", "tell me what you can do", "what are your capabilities", "what do you do", "what can u do"]
        if is_what_can_you_do:
            return StayGuideAskResponse(
                answer="I can help you learn about this selected property and room. You can ask me about amenities, room details, child policies, extra beds, baby cots, home rules, check-in and check-out times, availability, prices, and available experiences.",
                source="assistant_capabilities",
                rule_references=[f"Property: {prop.name}"],
                booking_allowed=True
            )

        # Can you help me / How can you help me
        is_can_you_help = (any(re.search(pat, q_lower) for pat in [
            r'^(?:can\s+(?:you|u)\s+help\s+me|how\s+can\s+(?:you|u)\s+help(?:\s+me)?|how\s+(?:you|u)\s+can\s+help(?:\s+me)?)[!?.]*$'
        ]) or q_clean in ["can you help me", "how can you help me", "how can you help", "how you can help me", "how you can help", "can u help me"]) and not any(k in q_lower for k in ["extra bed", "cot", "wifi", "pool", "book", "cancel", "refund", "pet", "smoke", "child", "children", "room", "price", "amenit", "rule"])
        if is_can_you_help:
            return StayGuideAskResponse(
                answer="Of course! 😊 You can ask me about this property’s rooms, amenities, guest policies, child rules, extra beds, baby cots, check-in times, prices, availability, and experiences.",
                source="assistant_help",
                rule_references=[f"Property: {prop.name}"],
                booking_allowed=True
            )

        # What can I ask you
        is_what_can_i_ask = any(re.search(pat, q_lower) for pat in [
            r'^(?:what\s+can\s+i\s+ask(?:\s+(?:you|u))?|what\s+should\s+i\s+ask(?:\s+(?:you|u))?|what\s+questions\s+can\s+i\s+ask)[!?.]*$'
        ]) or q_clean in ["what can i ask you", "what can i ask", "what should i ask", "what should i ask you", "what questions can i ask", "what can i ask u"]
        if is_what_can_i_ask:
            return StayGuideAskResponse(
                answer="You can ask about room details, amenities, child occupancy, additional charges, extra beds, baby cots, home rules, check-in and check-out, availability, prices, and experiences available at this property.",
                source="assistant_help",
                rule_references=[f"Property: {prop.name}"],
                booking_allowed=True
            )

        # Single word or short Help
        is_help_q = any(re.search(pat, q_lower) for pat in [
            r'^(?:help|help\s+me|i\s+need\s+help|support|guide\s+me|need\s+help|please\s+help)[!?.]*$'
        ]) or q_clean in ["help", "help me", "i need help", "support", "guide me", "need help", "please help"]
        if is_help_q:
            return StayGuideAskResponse(
                answer="I can help you understand this selected property. Try asking: 'Is an extra bed available?', 'Are children allowed?', or 'What amenities does this room have?'",
                source="assistant_help",
                rule_references=[f"Property: {prop.name}"],
                booking_allowed=True
            )

        # -------------------------------------------------------------------------
        # C. THANK-YOU RESPONSES (Section 3)
        # -------------------------------------------------------------------------
        thanks_patterns = [
            r'^(?:thank\s*you|thanks|thankyou|thx|many\s+thanks|thanks\s+a\s+lot|okay\s+thank\s*you|ok\s+thank\s*you|great\s+thanks|perfect\s+thank\s*you|that\s+helped)(?:\s+(?:very\s+much|so\s+much|a\s+lot|voyara|ai))?[!?.]*$'
        ]
        is_thanks = any(re.match(pat, q_lower) for pat in thanks_patterns) or q_clean in [
            "thank you", "thanks", "thanks a lot", "okay thank you", "ok thank you", "that helped", "great thanks", "perfect thank you", "thank you so much", "thanks!", "thank you very much", "many thanks", "thx"
        ]
        if is_thanks:
            return StayGuideAskResponse(
                answer="You're very welcome! Let me know if you have any other questions about this property.",
                source="conversational_gratitude",
                rule_references=[f"Property: {prop.name}"],
                booking_allowed=True
            )

        # -------------------------------------------------------------------------
        # D. GOODBYE RESPONSES (Section 4)
        # -------------------------------------------------------------------------
        goodbye_patterns = [
            r'^(?:bye|goodbye|see\s+you(?:\s+later)?|good\s+night|i\'?m\s+done|that\'?s\s+all|farewell|cya)(?:\s+(?:voyara|ai|for\s+now))?[!?.]*$'
        ]
        is_goodbye = any(re.match(pat, q_lower) for pat in goodbye_patterns) or q_clean in [
            "bye", "goodbye", "see you", "see you later", "good night", "i'm done", "that's all", "im done", "thats all", "farewell", "cya", "bye for now"
        ]
        if is_goodbye:
            if "night" in q_lower:
                ans = "Good night! 🌙 Feel free to return if you have more questions."
            elif "see you" in q_lower:
                ans = "See you later! We hope you have a lovely stay."
            elif "bye" in q_lower:
                ans = "Goodbye! 👋 Have a wonderful journey with Voyara."
            else:
                ans = "Have a great trip! 🌿 Feel free to return if you have more questions."
            return StayGuideAskResponse(
                answer=ans,
                source="conversational_farewell",
                rule_references=[f"Property: {prop.name}"],
                booking_allowed=True
            )

        # -------------------------------------------------------------------------
        # E. SHORT ACKNOWLEDGEMENT RESPONSES (Section 6)
        # -------------------------------------------------------------------------
        ack_patterns = [
            r'^(?:ok|okay|alright|got\s+it|i\s+understand|nice|great|perfect|sounds\s+good|that\'?s\s+helpful|cool|awesome|wonderful)[!?.]*$'
        ]
        is_ack = any(re.match(pat, q_lower) for pat in ack_patterns) or q_clean in [
            "okay", "ok", "alright", "got it", "i understand", "nice", "great", "perfect", "sounds good", "that's helpful", "thats helpful", "cool", "awesome", "wonderful"
        ]
        if is_ack:
            if q_clean in ["okay", "ok", "alright", "sounds good"]:
                ans = "Great! 😊 Let me know if you have another question about this property."
            elif q_clean in ["got it", "i understand"]:
                ans = "Perfect! I’m here if you need any more information."
            else:
                ans = "Glad that helped! Would you like to know more about the room, amenities, or guest policies?"
            return StayGuideAskResponse(
                answer=ans,
                source="conversational_acknowledgement",
                rule_references=[f"Property: {prop.name}"],
                booking_allowed=True
            )

        # -------------------------------------------------------------------------
        # 0. Property Name, Type & Overview Questions
        # -------------------------------------------------------------------------
        is_prop_overview_q = any(k in q_lower for k in [
            "name of this property", "property name", "what type of stay", "what kind of property",
            "type of property", "tell me about this property", "about this property", "what is this property",
            "what property is this"
        ])
        if is_prop_overview_q:
            return StayGuideAskResponse(
                answer=f"{prop.name} is a {prop.property_type} located in {prop.city}, {prop.state}. {prop.description}",
                source="property_data",
                rule_references=[f"Property: {prop.name}", f"Type: {prop.property_type}", f"Location: {prop.city}, {prop.state}"],
                booking_allowed=True
            )

        # -------------------------------------------------------------------------
        # 1. Booking Flow Questions
        # -------------------------------------------------------------------------
        is_book_q = any(k in q_lower for k in [
            "can i book this room", "how do i book", "how to book", "how can i book",
            "make a reservation", "reserve this room", "booking process", "book now"
        ])
        if is_book_q:
            return StayGuideAskResponse(
                answer="To book this room, select your check-in and check-out dates, specify your guest counts, review the Property Home Rules & Guest Policies, and click 'Reserve Stay' to complete your reservation through the secure booking flow.",
                source="booking_flow",
                rule_references=["Direct booking process on Voyara"],
                booking_allowed=True,
                requires_stay_partner_confirmation=False
            )

        # -------------------------------------------------------------------------
        # 2. Host's Public Guest Information Message
        # -------------------------------------------------------------------------
        is_guest_msg_q = any(k in q_lower for k in [
            "guest message", "host message", "message from host", "message from stay partner",
            "guest information message", "host's message", "host note"
        ])
        if is_guest_msg_q:
            if prop.guest_information_message and prop.guest_information_message.strip():
                return StayGuideAskResponse(
                    answer=f"Message from the Stay Partner for {prop.name}: \"{prop.guest_information_message.strip()}\"",
                    source="property_data",
                    rule_references=["Host guest information message"],
                    booking_allowed=True
                )
            else:
                return StayGuideAskResponse(
                    answer=FALLBACK_MISSING,
                    source="fallback",
                    rule_references=["Guest information message: Not specified"],
                    requires_stay_partner_confirmation=True
                )

        # -------------------------------------------------------------------------
        # 3. Room Pricing Questions
        # -------------------------------------------------------------------------
        is_price_q = any(k in q_lower for k in [
            "what is the price of this room", "what is the price of the room", "how much is this room",
            "how much does this room cost", "price of this room", "price of the room", "room price",
            "room prices", "prices of rooms", "cost of this room", "nightly rate", "nightly price",
            "nightly rates", "room rate", "room rates", "what are the prices", "how much does it cost",
            "how much to stay", "pricing", "cost of stay", "price list"
        ]) and not any(k in q_lower for k in ["extra bed", "cot", "child", "pet", "refund", "cancel"])

        if is_price_q:
            if room and ("this room" in q_lower or "the room" in q_lower):
                other_text = ""
                if len(active_rooms) > 1:
                    other_rooms = [r for r in active_rooms if r.id != room.id]
                    other_text = f" Other rooms at {prop.name} start from ₹{min(r.base_price for r in other_rooms):,.0f} per night."
                return StayGuideAskResponse(
                    answer=f"'{room.name}' ({room.room_type}) is priced at ₹{room.base_price:,.0f} per night with a standard capacity of {room.capacity} guests.{other_text}",
                    source="room_data",
                    rule_references=[f"Room: {room.name}", f"Base price: ₹{room.base_price:,.0f}/night", f"Capacity: {room.capacity}"],
                    booking_allowed=True
                )
            elif active_rooms:
                room_prices = [f"• {r.name} ({r.room_type}): ₹{r.base_price:,.0f}/night (capacity: {r.capacity})" for r in active_rooms]
                return StayGuideAskResponse(
                    answer=f"Room prices at {prop.name} start from ₹{min(r.base_price for r in active_rooms):,.0f} per night:\n" + "\n".join(room_prices),
                    source="room_data",
                    rule_references=[f"Active rooms: {len(active_rooms)}"],
                    booking_allowed=True
                )

        # -------------------------------------------------------------------------
        # 4. Room Types, Comparisons & Capacity Search
        # -------------------------------------------------------------------------
        has_ac_term = bool(re.search(r'\b(?:a/?c|air[- ]?conditioning|air[- ]?conditioner|air[- ]?conditioned)\b', q_lower))
        has_room_term = bool(re.search(
            r'\b(?:types?\s+of\s+rooms?|room\s+types?|room\s+categories|room\s+options?|other\s+rooms?|another\s+room|all\s+rooms?|more\s+rooms?|different\s+rooms?|rooms?\s+available|available\s+rooms?|no\s+other\s+type|any\s+other\s+room|what\s+rooms?|which\s+rooms?|list\s+(?:all\s+)?rooms?|show\s+(?:all\s+)?rooms?|tell\s+me\s+about\s+(?:all\s+)?rooms?|other\s+types?\s+of\s+rooms?|different\s+types?\s+of\s+rooms?)\b',
            q_lower
        ))
        has_suitability_term = bool(re.search(
            r'\b(?:which\s+(?:room\s+)?is\s+suitable|which\s+is\s+suitable|which\s+room\s+suits|suitable\s+for|which\s+room\s+is\s+(?:best|good|recommended)|recommend\s+(?:a\s+)?room|which\s+room\s+should\s+(?:i|we)\s+(?:book|choose|select|take)|room\s+recommendations?|best\s+room\s+for|we\s+are\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+members?|suitable\s+room|which\s+room\s+for|we\s+are\s+\d+)\b',
            q_lower
        ))
        is_room_type_q = has_ac_term or has_room_term or has_suitability_term or any(k in q_lower for k in [
            "what room types are available", "which room is suitable", "does this property have a family",
            "cheapest room", "cheapest", "lowest price", "most affordable", "largest room", "largest",
            "highest capacity", "biggest room", "does the property have a villa", "does the property have a cottage",
            "what is the difference between", "which room has", "which room allows children", "room types",
            "room options", "balcony", "attached bathroom", "private bathroom",
            "room amenities", "room features", "which rooms are available",
            "no other type of rooms", "no other type", "no other room", "other type of rooms", "other types of rooms",
            "other room", "other rooms", "what rooms", "what room", "types of room", "types of rooms",
            "room categories", "room category", "tell me about the rooms", "different room", "different rooms",
            "are there other rooms", "is there another room", "what other rooms", "what other room",
            "show all rooms", "list all rooms", "rooms in this property", "rooms available",
            "which is suitable", "which room is good", "which room should we take", "recommend a room",
            "which room for", "room for family", "room for couple", "best room", "we are"
        ])

        if is_room_type_q:
            if not active_rooms:
                return StayGuideAskResponse(
                    answer=f"There are currently no active room units listed for {prop.name}.",
                    source="room_data",
                    rule_references=[f"Property: {prop.name}"],
                    booking_allowed=False,
                    requires_stay_partner_confirmation=False
                )

            # Cheapest room
            if "cheapest" in q_lower or "lowest price" in q_lower or "most affordable" in q_lower:
                cheapest = min(active_rooms, key=lambda r: r.base_price)
                return StayGuideAskResponse(
                    answer=f"The most affordable room at {prop.name} is '{cheapest.name}' ({cheapest.room_type}) at ₹{cheapest.base_price:,.0f} per night (capacity: {cheapest.capacity} guests).",
                    source="room_data",
                    rule_references=[f"Cheapest room: {cheapest.name} (₹{cheapest.base_price:,.0f}/night)"],
                    booking_allowed=True,
                    requires_stay_partner_confirmation=False
                )

            # Largest room
            if "largest" in q_lower or "biggest" in q_lower or "highest capacity" in q_lower:
                largest = max(active_rooms, key=lambda r: r.capacity)
                return StayGuideAskResponse(
                    answer=f"The largest room at {prop.name} is '{largest.name}' ({largest.room_type}) with a maximum capacity of {largest.capacity} guests at ₹{largest.base_price:,.0f} per night.",
                    source="room_data",
                    rule_references=[f"Largest room: {largest.name} (Capacity: {largest.capacity})"],
                    booking_allowed=True,
                    requires_stay_partner_confirmation=False
                )

            # Suitable for X guests / Group recommendations (e.g. "we are 5 members which is suitable")
            is_suitability = (
                has_suitability_term
                or "suitable" in q_lower
                or "which is suitable" in q_lower
                or "which room is suitable" in q_lower
                or "recommend" in q_lower
                or "good for" in q_lower
                or "best room" in q_lower
                or we_are_match is not None
                or "suitable for two adults and one child" in q_lower
            ) and not any(k in q_lower for k in ["cheapest", "lowest price", "largest", "biggest", "balcony", " ac", "air conditioning", "bathroom", "other type", "no other"])

            if is_suitability:
                target_count = total_guests if total_guests > 0 else 2
                if we_are_match:
                    raw_w = we_are_match.group(1)
                    target_count = word_num.get(raw_w, int(raw_w) if raw_w.isdigit() else target_count)
                elif guest_match:
                    raw_g = guest_match.group(1)
                    target_count = word_num.get(raw_g, int(raw_g) if raw_g.isdigit() else target_count)
                elif adult_match or child_match:
                    target_count = extracted_adults + extracted_children

                suitable_rooms = [r for r in active_rooms if r.capacity >= target_count]
                if suitable_rooms:
                    rooms_text = "\n".join([f"• '{r.name}' ({r.room_type}): Accommodates up to {r.capacity} guests • ₹{r.base_price:,.0f}/night" for r in suitable_rooms])
                    return StayGuideAskResponse(
                        answer=f"For a group of {target_count} member(s)/guest(s), the following room(s) at {prop.name} are suitable:\n{rooms_text}",
                        source="room_data",
                        rule_references=[f"Target capacity: {target_count} guests", f"Matching rooms: {len(suitable_rooms)}"],
                        booking_allowed=True,
                        requires_stay_partner_confirmation=False
                    )
                else:
                    max_cap = max(r.capacity for r in active_rooms)
                    largest = max(active_rooms, key=lambda r: r.capacity)
                    return StayGuideAskResponse(
                        answer=(
                            f"At {prop.name}, the maximum single room capacity is {max_cap} guests ('{largest.name}' accommodates {largest.capacity} guests at ₹{largest.base_price:,.0f}/night).\n\n"
                            f"For a group of {target_count} members, we recommend booking multiple rooms (for example, 2 or more rooms) to comfortably accommodate everyone."
                        ),
                        source="room_data",
                        rule_references=[f"Max room capacity: {max_cap}", f"Group size: {target_count}"],
                        booking_allowed=True,
                        requires_stay_partner_confirmation=False
                    )

            # Specific feature: Balcony, AC, Private Bathroom, etc.
            if "balcony" in q_lower:
                has_balcony = [r for r in active_rooms if any("balcony" in (a.amenity_name or "").lower() for a in r.amenities)]
                if has_balcony:
                    return StayGuideAskResponse(
                        answer=f"The following room(s) feature a private balcony: {', '.join([r.name for r in has_balcony])}.",
                        source="room_amenities",
                        rule_references=["Balcony amenity configured"],
                        booking_allowed=True
                    )
                else:
                    return StayGuideAskResponse(
                        answer=f"None of the listed rooms at {prop.name} specifically advertise a private balcony.",
                        source="room_amenities",
                        rule_references=["Balcony: Not listed"]
                    )

            if "air conditioning" in q_lower or " ac" in q_lower or "ac " in q_lower or "a/c" in q_lower:
                has_ac = [r for r in active_rooms if any("air conditioning" in (a.amenity_name or "").lower() or "ac" in (a.amenity_name or "").lower() or "a/c" in (a.amenity_name or "").lower() for a in r.amenities)]
                if has_ac:
                    return StayGuideAskResponse(
                        answer=f"The following room(s) feature Air Conditioning: {', '.join([r.name for r in has_ac])}.",
                        source="room_amenities",
                        rule_references=["Air Conditioning amenity configured"],
                        booking_allowed=True
                    )
                elif room:
                    room_has_ac = any("air conditioning" in (a.amenity_name or "").lower() or "ac" in (a.amenity_name or "").lower() or "a/c" in (a.amenity_name or "").lower() for a in room.amenities)
                    return StayGuideAskResponse(
                        answer=f"{'Yes, Air Conditioning is available' if room_has_ac else 'Air Conditioning is not listed'} in '{room.name}'.",
                        source="room_amenities",
                        rule_references=[f"Air Conditioning: {'Available' if room_has_ac else 'Not listed'} in {room.name}"]
                    )
                else:
                    return StayGuideAskResponse(
                        answer=f"Air Conditioning is not listed among the room amenities at {prop.name}.",
                        source="room_amenities",
                        rule_references=["Air Conditioning: Not listed"]
                    )

            if "private bathroom" in q_lower or "attached bathroom" in q_lower:
                has_bath = [r for r in active_rooms if any("bathroom" in (a.amenity_name or "").lower() for a in r.amenities)]
                if has_bath:
                    return StayGuideAskResponse(
                        answer=f"The following room(s) have an attached/private bathroom: {', '.join([r.name for r in has_bath])}.",
                        source="room_amenities",
                        rule_references=["Attached bathroom configured"],
                        booking_allowed=True
                    )

            # Asking specifically about other rooms / other room types
            is_asking_other = any(k in q_lower for k in [
                "other type", "other types", "other room", "other rooms", "another room", "different room", "different rooms", "no other"
            ])
            if is_asking_other:
                if room and len(active_rooms) > 1:
                    other_rooms = [r for r in active_rooms if r.id != room.id]
                    if other_rooms:
                        other_list = [f"• '{r.name}' ({r.room_type}): Max {r.capacity} guests • ₹{r.base_price:,.0f}/night" for r in other_rooms]
                        return StayGuideAskResponse(
                            answer=f"In addition to '{room.name}', {prop.name} also offers the following room type(s):\n" + "\n".join(other_list),
                            source="room_data",
                            rule_references=[f"Other room types: {len(other_rooms)}"],
                            booking_allowed=True,
                            requires_stay_partner_confirmation=False
                        )
                elif room and len(active_rooms) == 1:
                    return StayGuideAskResponse(
                        answer=f"'{room.name}' ({room.room_type}) is currently the primary room type available at {prop.name} (Capacity: {room.capacity} guests, ₹{room.base_price:,.0f}/night).",
                        source="room_data",
                        rule_references=[f"Single room type: {room.name}"],
                        booking_allowed=True,
                        requires_stay_partner_confirmation=False
                    )

            # List all available room types at the property
            types_list = [f"• '{r.name}' ({r.room_type}): Max {r.capacity} guests • ₹{r.base_price:,.0f}/night" for r in active_rooms]
            return StayGuideAskResponse(
                answer=f"Available room types at {prop.name}:\n" + "\n".join(types_list),
                source="room_data",
                rule_references=[f"Total room types: {len(active_rooms)}"],
                booking_allowed=True,
                requires_stay_partner_confirmation=False
            )

        # -------------------------------------------------------------------------
        # 5. Room Unit & Real-Time Availability Questions
        # -------------------------------------------------------------------------
        is_avail_q = any(k in q_lower for k in [
            "how many deluxe rooms are available", "are there two rooms available", "are there 2 rooms available",
            "can i book three rooms", "can i book 3 rooms", "can i book two rooms", "can i book 2 rooms",
            "available from", "are all rooms booked", "which room types are available for my dates",
            "how many units are left", "how many rooms are available", "is this room available",
            "is the property fully booked", "are any family rooms available", "is this room available for my selected dates",
            "units left", "rooms left", "units available", "available units"
        ]) or (
            ("available" in q_lower or "availability" in q_lower) and not any(k in q_lower for k in [
                "cot", "cots", "bed", "beds", "pet", "pets", "smoke", "smoking", "party", "parties",
                "visitor", "visitors", "quiet", "id", "age", "wifi", "parking", "pool", "amenit", "type"
            ])
        )

        if is_avail_q:
            if not req.check_in or not req.check_out:
                if room:
                    return StayGuideAskResponse(
                        answer=f"'{room.name}' has a total inventory of {room.quantity} unit(s). Please enter your check-in and check-out dates to check real-time availability.",
                        source="availability_service",
                        rule_references=[f"Total units: {room.quantity}", "Dates required for live inventory query"],
                        booking_allowed=None,
                        requires_stay_partner_confirmation=False,
                        availability_checked=False
                    )
                return StayGuideAskResponse(
                    answer="Please enter your check-in and check-out dates so I can check current room availability.",
                    source="availability_service",
                    rule_references=["Dates required for real-time inventory query"],
                    booking_allowed=None,
                    requires_stay_partner_confirmation=False,
                    availability_checked=False
                )

            # Dates provided -> Query PostgreSQL real-time availability
            if room:
                avail = AvailabilityService.check_room_availability(db, room.id, req.check_in, req.check_out)
                avail_qty = avail.get("available_quantity", 0)
                if avail_qty > 0:
                    ans = f"For your selected dates ({req.check_in} to {req.check_out}), {avail_qty} of {room.quantity} unit(s) of '{room.name}' are available at ₹{room.base_price:,.0f} per night."
                    return StayGuideAskResponse(
                        answer=ans,
                        source="availability_service",
                        rule_references=[f"Available units: {avail_qty}/{room.quantity}", f"Dates: {req.check_in} to {req.check_out}"],
                        booking_allowed=True,
                        requires_stay_partner_confirmation=False,
                        availability_checked=True
                    )
                else:
                    return StayGuideAskResponse(
                        answer=f"For your selected dates ({req.check_in} to {req.check_out}), '{room.name}' is currently fully booked or unavailable. Please choose different dates or select another room type.",
                        source="availability_service",
                        rule_references=["Available units: 0", f"Dates: {req.check_in} to {req.check_out}"],
                        booking_allowed=False,
                        requires_stay_partner_confirmation=False,
                        availability_checked=True
                    )
            else:
                avail_summaries = []
                for r in active_rooms:
                    r_avail = AvailabilityService.check_room_availability(db, r.id, req.check_in, req.check_out)
                    r_qty = r_avail.get("available_quantity", 0)
                    avail_summaries.append(f"• {r.name}: {r_qty} of {r.quantity} available (₹{r.base_price:,.0f}/night)")

                ans = f"For your dates ({req.check_in} to {req.check_out}), availability at {prop.name}:\n" + "\n".join(avail_summaries)
                return StayGuideAskResponse(
                    answer=ans,
                    source="availability_service",
                    rule_references=[f"Property: {prop.name}", f"Dates: {req.check_in} to {req.check_out}"],
                    booking_allowed=True,
                    requires_stay_partner_confirmation=False,
                    availability_checked=True
                )

        # -------------------------------------------------------------------------
        # 6. Child Occupancy & Additional Child Policy Questions
        # -------------------------------------------------------------------------
        # A. Additional children allowed
        is_add_child_q = any(k in q_lower for k in [
            "how many additional children are allowed", "how many additional children",
            "additional children allowed", "additional children can stay", "number of additional children",
            "additional child allowance", "how many extra children", "how many additional kids"
        ]) and not any(k in q_lower for k in ["free", "charge", "cost", "pay", "fee", "age", "old", "years"])
        if is_add_child_q:
            add_allowed = (
                rr.additional_children_allowed if (rr and hasattr(rr, 'additional_children_allowed') and rr.additional_children_allowed is not None)
                else (hr.additional_children_allowed if (hr and hasattr(hr, 'additional_children_allowed') and hr.additional_children_allowed is not None) else None)
            )
            if add_allowed is not None:
                room_str = f" in '{room.name}'" if room else ""
                return StayGuideAskResponse(
                    answer=f"Up to {add_allowed} additional child(ren) can stay{room_str} in addition to the standard room occupancy.",
                    source="room_rules" if rr else "property_rules",
                    rule_references=[f"Additional children allowed: {add_allowed}"],
                    booking_allowed=True,
                    requires_stay_partner_confirmation=False
                )
            else:
                return StayGuideAskResponse(
                    answer=FALLBACK_MISSING,
                    source="fallback",
                    rule_references=["Additional children: Not specified"],
                    requires_stay_partner_confirmation=True
                )

        # B. Maximum child age / Age limit
        is_max_child_age_q = any(k in q_lower for k in [
            "what is the maximum age allowed for an additional child", "what is the maximum age for an additional child",
            "maximum age for an additional child", "maximum age allowed for an additional child",
            "maximum age for a child", "maximum child age", "max child age", "child age limit",
            "up to what age can a child stay", "age limit for an additional child", "maximum permitted child age"
        ])
        if is_max_child_age_q:
            max_age = (
                rr.max_child_age if (rr and hasattr(rr, 'max_child_age') and rr.max_child_age is not None)
                else (hr.max_child_age if (hr and hasattr(hr, 'max_child_age') and hr.max_child_age is not None) else None)
            )
            if max_age is not None:
                return StayGuideAskResponse(
                    answer=f"The maximum permitted age for an additional child is {max_age} years (below {max_age + 1} years).",
                    source="room_rules" if rr else "property_rules",
                    rule_references=[f"Maximum child age: {max_age} years"],
                    booking_allowed=True,
                    requires_stay_partner_confirmation=False
                )
            else:
                return StayGuideAskResponse(
                    answer=FALLBACK_MISSING,
                    source="fallback",
                    rule_references=["Maximum child age: Not specified"],
                    requires_stay_partner_confirmation=True
                )

        # C. Free additional children
        is_free_child_q = any(k in q_lower for k in [
            "how many children can stay free", "how many additional children can stay free",
            "free additional children", "stay free of charge", "children stay free",
            "children can stay free", "child stay free", "how many kids stay free",
            "can additional children stay free"
        ])
        if is_free_child_q:
            free_cnt = (
                rr.free_additional_children if (rr and hasattr(rr, 'free_additional_children') and rr.free_additional_children is not None)
                else (hr.free_additional_children if (hr and hasattr(hr, 'free_additional_children') and hr.free_additional_children is not None) else None)
            )
            if free_cnt is not None:
                if free_cnt > 0:
                    ans = f"{free_cnt} additional child(ren) can stay free of charge."
                else:
                    ans = "Additional children do not stay free of charge at this property. Extra child charges may apply."
                return StayGuideAskResponse(
                    answer=ans,
                    source="room_rules" if rr else "property_rules",
                    rule_references=[f"Free additional children: {free_cnt}"],
                    booking_allowed=True,
                    requires_stay_partner_confirmation=False
                )
            else:
                return StayGuideAskResponse(
                    answer=FALLBACK_MISSING,
                    source="fallback",
                    rule_references=["Free children: Not specified"],
                    requires_stay_partner_confirmation=True
                )

        # D. Child charge / pay extra for child
        is_child_charge_q = any(k in q_lower for k in [
            "do i need to pay extra for my child", "how much is the additional child charge",
            "additional child charge", "extra charge for additional children", "extra charge for child",
            "extra charge for children", "pay extra for my child", "pay extra for child", "child charge",
            "additional child charges", "child fee"
        ])
        if is_child_charge_q:
            chg_enabled = (
                rr.child_charge_enabled if (rr and hasattr(rr, 'child_charge_enabled'))
                else (hr.child_charge_enabled if (hr and hasattr(hr, 'child_charge_enabled')) else False)
            )
            chg_amt = (
                rr.child_charge_amount if (rr and hasattr(rr, 'child_charge_amount') and rr.child_charge_amount is not None)
                else (hr.child_charge_amount if (hr and hasattr(hr, 'child_charge_amount') and hr.child_charge_amount is not None) else 0.0)
            )
            chg_unit = (
                rr.child_charge_unit if (rr and hasattr(rr, 'child_charge_unit') and rr.child_charge_unit)
                else (hr.child_charge_unit if (hr and hasattr(hr, 'child_charge_unit') and hr.child_charge_unit) else "Per night")
            )
            free_cnt = (
                rr.free_additional_children if (rr and hasattr(rr, 'free_additional_children') and rr.free_additional_children is not None)
                else (hr.free_additional_children if (hr and hasattr(hr, 'free_additional_children') and hr.free_additional_children is not None) else 0)
            )
            note = (
                rr.room_specific_rules if (rr and rr.room_specific_rules)
                else (hr.child_pricing_note if (hr and hr.child_pricing_note) else None)
            )
            if chg_enabled and chg_amt > 0:
                ans = f"The additional child charge is ₹{chg_amt:,.0f} per child {chg_unit.lower()}. Up to {free_cnt} additional child(ren) can stay free of charge."
                if note:
                    ans += f" Note: {note}"
                return StayGuideAskResponse(
                    answer=ans,
                    source="room_rules" if rr else "property_rules",
                    rule_references=[f"Extra child charge: ₹{chg_amt:,.0f} per child {chg_unit.lower()}", f"Free allowance: {free_cnt}"],
                    booking_allowed=True,
                    requires_stay_partner_confirmation=False
                )
            else:
                return StayGuideAskResponse(
                    answer=f"There is no extra charge for additional children permitted within the stay allowance ({free_cnt} child(ren) stay free).",
                    source="room_rules" if rr else "property_rules",
                    rule_references=["Child charge: No extra charge", f"Free allowance: {free_cnt}"],
                    booking_allowed=True,
                    requires_stay_partner_confirmation=False
                )

        # E. Existing bed sharing
        is_bed_share_q = any(k in q_lower for k in [
            "can my child share the existing adult bed", "can an additional child use the existing adult bed",
            "share the existing adult bed", "share the existing bed", "share existing bed",
            "can my child share the bed", "can a child share existing bed", "use the existing adult bed",
            "existing bed policy", "bed sharing", "existing bed-sharing"
        ])
        if is_bed_share_q:
            bed_sharing = (
                rr.existing_bed_allowed if (rr and hasattr(rr, 'existing_bed_allowed') and rr.existing_bed_allowed)
                else (hr.existing_bed_allowed if (hr and hasattr(hr, 'existing_bed_allowed') and hr.existing_bed_allowed) else None)
            )
            bed_expl = (
                rr.existing_bed_explanation if (rr and hasattr(rr, 'existing_bed_explanation') and rr.existing_bed_explanation)
                else (hr.existing_bed_explanation if (hr and hasattr(hr, 'existing_bed_explanation') and hr.existing_bed_explanation) else None)
            )
            if bed_sharing is not None:
                is_yes = str(bed_sharing).lower() in ["yes", "true", "1"]
                ans = "Yes, an additional child may share the existing adult bed." if is_yes else "No, an additional child cannot share the existing adult bed."
                if bed_expl:
                    ans += f" Note: {bed_expl}"
                return StayGuideAskResponse(
                    answer=ans,
                    source="room_rules" if rr else "property_rules",
                    rule_references=[f"Existing bed sharing: {bed_sharing}"] + ([bed_expl] if bed_expl else []),
                    booking_allowed=is_yes,
                    requires_stay_partner_confirmation=False
                )
            else:
                return StayGuideAskResponse(
                    answer=FALLBACK_MISSING,
                    source="fallback",
                    rule_references=["Existing bed sharing: Not specified"],
                    requires_stay_partner_confirmation=True
                )

        # -------------------------------------------------------------------------
        # 7. Baby Cots & Infant Beds Questions
        # -------------------------------------------------------------------------
        is_cot_q = any(k in q_lower for k in [
            "baby cot", "cot", "cots", "crib", "cribs", "infant bed", "is a baby cot available",
            "how much does a baby cot cost", "how much does the baby cot cost", "is the baby cot free",
            "how many baby cots", "baby cot policy"
        ])

        if is_cot_q:
            cot_avail = (
                rr.cot_available if (rr and hasattr(rr, 'cot_available') and rr.cot_available)
                else (hr.cot_available if (hr and hasattr(hr, 'cot_available') and hr.cot_available) else None)
            )
            cot_pol = rr.cot_policy if (rr and rr.cot_policy) else (hr.cot_policy if hr else None)
            cot_qty = (rr.cot_quantity if rr and rr.cot_quantity else (hr.cot_quantity if hr else 0)) or 0
            cot_price = (
                rr.cot_price if (rr and hasattr(rr, 'cot_price') and rr.cot_price is not None)
                else (hr.cot_price if (hr and hasattr(hr, 'cot_price') and hr.cot_price is not None) else 0.0)
            )
            cot_unit = (
                rr.cot_charge_unit if (rr and hasattr(rr, 'cot_charge_unit') and rr.cot_charge_unit)
                else (hr.cot_charge_unit if (hr and hasattr(hr, 'cot_charge_unit') and hr.cot_charge_unit) else "Free")
            )

            is_cot_no = (str(cot_avail).lower() in ["no", "false", "0"]) or (cot_pol == "No")
            is_cot_yes = (str(cot_avail).lower() in ["yes", "true", "1"]) or (cot_pol in ["Yes", "Upon Request"]) or (cot_qty > 0)

            if is_cot_no and not cot_qty:
                return StayGuideAskResponse(
                    answer="Baby cots are not available for this room/property according to the Stay Partner's rules.",
                    source="property_rules",
                    rule_references=["Baby cot: No"],
                    booking_allowed=False,
                    requires_stay_partner_confirmation=False
                )
            elif is_cot_yes:
                if cot_price > 0 and cot_unit != "Free":
                    price_str = f"₹{cot_price:,.0f} {cot_unit.lower()}"
                else:
                    price_str = "free of charge (complimentary)"

                if ("how many" in q_lower or "quantity" in q_lower) and not any(k in q_lower for k in ["cost", "price", "charge", "fee", "available"]):
                    return StayGuideAskResponse(
                        answer=f"There are {cot_qty} baby cot(s) available upon request.",
                        source="property_rules",
                        rule_references=[f"Baby cot quantity: {cot_qty}"],
                        booking_allowed=True,
                        requires_stay_partner_confirmation=True
                    )

                qty_str = f"({cot_qty} baby cot(s) available)" if cot_qty > 0 else "upon request"
                ans = f"Yes, a baby cot is available {qty_str}. The baby cot cost is {price_str}. Baby cot availability should be confirmed during booking."
                return StayGuideAskResponse(
                    answer=ans,
                    source="property_rules",
                    rule_references=[f"Baby cot available: Yes", f"Quantity: {cot_qty}", f"Cost: {price_str}"],
                    booking_allowed=True,
                    requires_stay_partner_confirmation=True
                )
            else:
                return StayGuideAskResponse(
                    answer=FALLBACK_MISSING,
                    source="fallback",
                    rule_references=["Baby cot: Not specified"],
                    requires_stay_partner_confirmation=True
                )

        # -------------------------------------------------------------------------
        # 8. Extra Beds Questions
        # -------------------------------------------------------------------------
        is_bed_q = any(k in q_lower for k in [
            "extra bed", "extra beds", "rollaway", "additional bed", "add another bed",
            "how much does an extra bed cost", "can i add another bed", "is an extra bed available",
            "can i add two extra beds", "how many extra beds are available", "extra-bed",
            "extra bed policy", "extra bed availability"
        ])

        if is_bed_q:
            bed_avail = (
                rr.extra_bed_available if (rr and hasattr(rr, 'extra_bed_available') and rr.extra_bed_available)
                else (hr.extra_bed_available if (hr and hasattr(hr, 'extra_bed_available') and hr.extra_bed_available) else None)
            )
            bed_pol = rr.extra_bed_policy if (rr and rr.extra_bed_policy) else None
            max_beds = (rr.maximum_extra_beds if rr else 0) or 0
            bed_price = (rr.extra_bed_price if rr and rr.extra_bed_price is not None else 0.0) or 0.0
            bed_unit = (
                rr.extra_bed_charge_unit if (rr and hasattr(rr, 'extra_bed_charge_unit') and rr.extra_bed_charge_unit)
                else (hr.extra_bed_charge_unit if (hr and hasattr(hr, 'extra_bed_charge_unit') and hr.extra_bed_charge_unit) else "Per night")
            )

            is_bed_no = (str(bed_avail).lower() in ["no", "false", "0"]) or (bed_pol == "No")
            is_bed_yes = (str(bed_avail).lower() in ["yes", "true", "1"]) or (bed_pol in ["Yes", "Upon Request"]) or (max_beds > 0)

            if is_bed_no and not max_beds:
                return StayGuideAskResponse(
                    answer="Extra beds are not available for this room according to the Stay Partner's rules.",
                    source="room_rules",
                    rule_references=["Extra beds: No"],
                    booking_allowed=False,
                    requires_stay_partner_confirmation=False
                )
            elif is_bed_yes:
                price_str = f"₹{bed_price:,.0f} {bed_unit.lower()}" if bed_price > 0 else "complimentary (free)"
                beds_count = max_beds if max_beds > 0 else 1

                if ("how many" in q_lower or "quantity" in q_lower) and not any(k in q_lower for k in ["cost", "price", "charge", "fee", "available"]):
                    return StayGuideAskResponse(
                        answer=f"Up to {beds_count} extra bed(s) can be requested for this room.",
                        source="room_rules",
                        rule_references=[f"Max extra beds: {beds_count}"],
                        booking_allowed=True,
                        requires_stay_partner_confirmation=True
                    )

                ans = f"Yes, an extra bed is available ({beds_count} extra bed(s) available). The extra bed charge is {price_str}. Extra beds cannot be used to exceed room total occupancy limits."
                return StayGuideAskResponse(
                    answer=ans,
                    source="room_rules",
                    rule_references=[f"Extra beds: Yes", f"Max extra beds: {beds_count}", f"Price: {price_str}"],
                    booking_allowed=True,
                    requires_stay_partner_confirmation=True
                )
            else:
                return StayGuideAskResponse(
                    answer=FALLBACK_MISSING,
                    source="fallback",
                    rule_references=["Extra beds: Not specified"],
                    requires_stay_partner_confirmation=True
                )

        # -------------------------------------------------------------------------
        # 9. Capacity, Multi-Guest & Family Calculations
        # -------------------------------------------------------------------------
        is_capacity_q = any(k in q_lower for k in [
            "can two adults and one", "can 2 adults and 1", "can two adults", "can 2 adults",
            "two adults and two children", "2 adults and 2 children", "capacity of 2",
            "capacity", "how many guests", "maximum guests", "maximum capacity",
            "does a child count as one guest", "do i need to book another room for my child",
            "is an extra bed required for my child", "accommodate",
            "stay in this room", "how many people", "can an additional child stay without exceeding"
        ])

        if is_capacity_q:
            if not room:
                return StayGuideAskResponse(
                    answer=f"At {prop.name}, room capacities vary by room unit. Please select a room on the page to view exact guest limits.",
                    source="property_rules",
                    rule_references=[f"Property: {prop.name} ({prop.property_type})"],
                    booking_allowed=None,
                    requires_stay_partner_confirmation=False
                )

            # Check if total guests exceeds room capacity
            if total_guests > room_capacity:
                if extracted_children > 0 and (prop_children_allowed == "Yes" and room_children_allowed == "Yes"):
                    ans = (
                        f"This room has a maximum capacity of {room_capacity} guests. "
                        f"{extracted_adults} adult{'s' if extracted_adults != 1 else ''} and {extracted_children} child{'ren' if extracted_children != 1 else ''} "
                        f"would make {total_guests} guests, so this room may not accommodate your group. "
                        f"Please check whether the Stay Partner allows a child to share existing bedding or choose a room with capacity for at least {total_guests} guests."
                    )
                else:
                    ans = (
                        f"This room has a maximum capacity of {room_capacity} guests. "
                        f"{extracted_adults} adult{'s' if extracted_adults != 1 else ''} and {extracted_children} child{'ren' if extracted_children != 1 else ''} "
                        f"would make {total_guests} guests. Children may be allowed at the property, but this room’s maximum capacity is {room_capacity} guests. "
                        f"Please select a larger room or contact the Stay Partner for confirmation."
                    )
                return StayGuideAskResponse(
                    answer=ans,
                    source="room_capacity_and_children_policy",
                    rule_references=[
                        f"Maximum total guests: {room_capacity}",
                        f"Maximum adults: {max_adults}",
                        f"Children allowed: {room_children_allowed}"
                    ],
                    booking_allowed=False,
                    requires_stay_partner_confirmation=True
                )

            # Check if children disallowed in this room
            if extracted_children > 0 and (prop_children_allowed == "No" or room_children_allowed == "No"):
                return StayGuideAskResponse(
                    answer=f"Children are not permitted in this room type. The maximum permitted adult occupancy is {max_adults} guests.",
                    source="room_rules",
                    rule_references=["Children allowed: No", f"Maximum adults: {max_adults}"],
                    booking_allowed=False,
                    requires_stay_partner_confirmation=False
                )

            # Check adult limit
            if extracted_adults > max_adults:
                return StayGuideAskResponse(
                    answer=f"This room allows a maximum of {max_adults} adults (you specified {extracted_adults} adults). Please select another room.",
                    source="room_rules",
                    rule_references=[f"Maximum adults: {max_adults}", f"Maximum total guests: {room_capacity}"],
                    booking_allowed=False,
                    requires_stay_partner_confirmation=False
                )

            # Within capacity
            if room:
                ans = f"'{room.name}' ({room.room_type}) has a maximum capacity of {room_capacity} guests (priced at ₹{room.base_price:,.0f}/night) and can accommodate your party of {total_guests} ({extracted_adults} adult{'s' if extracted_adults != 1 else ''}{f' and {extracted_children} child(ren)' if extracted_children else ''})."
            else:
                ans = f"Yes, this room has a maximum capacity of {room_capacity} guests and can accommodate your party of {total_guests} ({extracted_adults} adult{'s' if extracted_adults != 1 else ''}{f' and {extracted_children} child(ren)' if extracted_children else ''})."
            return StayGuideAskResponse(
                answer=ans,
                source="room_rules",
                rule_references=[
                    f"Maximum total guests: {room_capacity}",
                    f"Maximum adults: {max_adults}",
                    f"Children allowed: {room_children_allowed}"
                ],
                booking_allowed=True,
                requires_stay_partner_confirmation=False
            )

        # -------------------------------------------------------------------------
        # 10. General Children & Baby Welcome Questions
        # -------------------------------------------------------------------------
        is_child_q = any(k in q_lower for k in [
            "are children allowed", "does this property allow children", "children allowed", "child policy", "child policies", "baby policy", "bring children", "bring a child",
            "bring my child", "bring a baby", "baby allowed", "infant", "kids allowed",
            "child stay", "children stay", "baby stay", "kid stay", "year-old", "year old",
            "child", "children", "kid", "kids", "toddler"
        ])

        if is_child_q:
            if prop_children_allowed == "No" or room_children_allowed == "No":
                return StayGuideAskResponse(
                    answer="Children are not allowed at this property according to the Stay Partner's policy.",
                    source="property_rules",
                    rule_references=["Children allowed: No"],
                    booking_allowed=False,
                    requires_stay_partner_confirmation=False
                )

            # Age checks
            age_match = re.search(r'(\d+)[-\s]year[-\s]old', q_lower) or re.search(r'(\d+)\s+years?', q_lower)
            age_val = int(age_match.group(1)) if age_match else (child_ages[0] if child_ages else None)
            min_age = rr.minimum_child_age if (rr and rr.minimum_child_age is not None) else (hr.minimum_child_age if hr else None)

            if age_val is not None and min_age is not None and age_val < min_age:
                return StayGuideAskResponse(
                    answer=f"Children are allowed at this property, but the minimum age requirement is {min_age} years. A {age_val}-year-old does not meet this requirement.",
                    source="property_rules",
                    rule_references=[f"Minimum child age: {min_age} years"],
                    booking_allowed=False,
                    requires_stay_partner_confirmation=False
                )

            if room:
                ans = f"Children are allowed in '{room.name}'. This room has a maximum capacity of {room_capacity} guests (Max adults: {max_adults}, Max children: {max_children})."
            else:
                ans = f"Children are welcome at {prop.name}" + (f" (minimum age: {min_age} years)" if min_age else "") + "."

            return StayGuideAskResponse(
                answer=ans,
                source="property_rules",
                rule_references=["Children allowed: Yes", *( [f"Minimum child age: {min_age}"] if min_age else [] )],
                booking_allowed=True,
                requires_stay_partner_confirmation=False
            )

        # -------------------------------------------------------------------------
        # 11. Identification, Minimum Age & Safety Instructions
        # -------------------------------------------------------------------------
        is_id_q = any(k in q_lower for k in ["id required", "government id", "identification", "passport", "aadhaar", "minimum checkin age", "safety", "safety instructions", "safety information"])
        if is_id_q:
            id_req = "A valid government-issued photo ID is required for all adult guests at check-in." if (not hr or hr.government_id_required) else "Government ID is not strictly required."
            min_age_str = f" The primary guest must be at least {hr.minimum_checkin_age} years of age." if (hr and hr.minimum_checkin_age) else " Minimum check-in age is 18."
            safety_str = f" Safety instructions: {hr.safety_instructions}" if (hr and hr.safety_instructions) else ""
            return StayGuideAskResponse(
                answer=f"{id_req}{min_age_str}{safety_str}",
                source="property_rules",
                rule_references=["Government ID required: Yes", f"Minimum check-in age: {hr.minimum_checkin_age if hr else 18}"]
            )

        # -------------------------------------------------------------------------
        # 12. Check-in & Check-out Timings
        # -------------------------------------------------------------------------
        is_checkin_q = any(k in q_lower for k in ["check in", "check-in", "checkin", "arrival time", "what time is check-in", "what is the check-in time", "early check-in", "early check in"])
        is_checkout_q = any(k in q_lower for k in ["check out", "check-out", "checkout", "departure time", "what time is check-out", "what is the check-out time", "late check-out", "late check out"])

        if is_checkin_q or is_checkout_q:
            ci_start = (hr.check_in_start if hr and hr.check_in_start else prop.check_in_time) or "14:00"
            ci_end = hr.check_in_end if hr and hr.check_in_end else "22:00"
            co_time = (hr.check_out_time if hr and hr.check_out_time else prop.check_out_time) or "11:00"
            early_ci = hr.early_checkin_policy if hr else "Upon Request"
            late_co = hr.late_checkout_policy if hr else "Upon Request"

            if "early" in q_lower:
                return StayGuideAskResponse(
                    answer=f"Early check-in is available {early_ci.lower()} at this property. Standard check-in starts at {ci_start}.",
                    source="property_rules",
                    rule_references=[f"Early check-in: {early_ci}", f"Standard check-in: {ci_start}"],
                    requires_stay_partner_confirmation=(early_ci == "Upon Request")
                )
            if "late" in q_lower:
                return StayGuideAskResponse(
                    answer=f"Late check-out is available {late_co.lower()} at this property. Standard check-out is by {co_time}.",
                    source="property_rules",
                    rule_references=[f"Late check-out: {late_co}", f"Standard check-out: {co_time}"],
                    requires_stay_partner_confirmation=(late_co == "Upon Request")
                )

            return StayGuideAskResponse(
                answer=f"Check-in is from {ci_start} to {ci_end}, and check-out is by {co_time}.",
                source="property_rules",
                rule_references=[f"Check-in window: {ci_start} - {ci_end}", f"Check-out time: {co_time}"]
            )

        # -------------------------------------------------------------------------
        # 13. Quiet Hours
        # -------------------------------------------------------------------------
        is_quiet_q = any(k in q_lower for k in ["quiet hours", "quiet time", "noise", "loud", "silence", "night hours", "what are the quiet hours"])
        if is_quiet_q:
            if hr and hr.quiet_hours_enabled:
                return StayGuideAskResponse(
                    answer=f"Quiet hours are observed between {hr.quiet_hours_start} and {hr.quiet_hours_end}. Please keep noise to a minimum during this period.",
                    source="property_rules",
                    rule_references=[f"Quiet hours: {hr.quiet_hours_start} - {hr.quiet_hours_end}"]
                )
            else:
                return StayGuideAskResponse(
                    answer="Specific quiet hours have not been configured by the Stay Partner, but guests are requested to be considerate of neighbors.",
                    source="property_rules",
                    rule_references=["Quiet hours: Not specified"]
                )

        # -------------------------------------------------------------------------
        # 14. Visitors Policy
        # -------------------------------------------------------------------------
        is_visitor_q = any(k in q_lower for k in ["visitor", "visitors", "guests visit", "day visitors", "overnight visitor", "outside guests", "can visitors enter"])
        if is_visitor_q:
            vis_pol = hr.visitors_policy if hr and hr.visitors_policy else "Upon Request"
            overnight = "Overnight visitors are allowed." if (hr and hr.overnight_visitors_allowed) else "Overnight visitors are not permitted."
            desc = f" Note: {hr.visitor_policy_description}" if hr and hr.visitor_policy_description else ""
            return StayGuideAskResponse(
                answer=f"Day visitors are {vis_pol.lower()}. {overnight}{desc}",
                source="property_rules",
                rule_references=[f"Visitors allowed: {vis_pol}", overnight],
                requires_stay_partner_confirmation=(vis_pol == "Upon Request")
            )

        # -------------------------------------------------------------------------
        # 15. Pets Policy
        # -------------------------------------------------------------------------
        is_pet_q = bool(re.search(r'\b(?:pets?|dogs?|cats?|puppy|puppies|kitten|kittens|animals?)\b', q_lower)) or any(k in q_lower for k in [
            "are pets allowed", "pet policy", "bring a pet", "bring my dog", "allow pets"
        ])
        if is_pet_q:
            if not hr or not hr.pets_policy:
                return StayGuideAskResponse(
                    answer=FALLBACK_MISSING,
                    source="fallback",
                    rule_references=["Pets policy: Not specified"],
                    requires_stay_partner_confirmation=True
                )

            if hr.pets_policy == "Yes":
                fee_str = f" (Pet fee: ₹{hr.pet_fee:,.0f})" if hr.pet_fee and hr.pet_fee > 0 else " (No extra pet fee)"
                desc_str = f" Details: {hr.pet_policy_description}" if hr.pet_policy_description else ""
                return StayGuideAskResponse(
                    answer=f"Pets are allowed at this property{fee_str}.{desc_str}",
                    source="property_rules",
                    rule_references=[f"Pets allowed: Yes{fee_str}"],
                    booking_allowed=True
                )
            elif hr.pets_policy == "Upon Request":
                desc_str = f" Note: {hr.pet_policy_description}" if hr.pet_policy_description else ""
                return StayGuideAskResponse(
                    answer=f"Pets are allowed upon request only. Please contact the Stay Partner for confirmation before arrival.{desc_str}",
                    source="property_rules",
                    rule_references=["Pets allowed: Upon Request"],
                    requires_stay_partner_confirmation=True
                )
            else:
                return StayGuideAskResponse(
                    answer="Pets are not allowed at this property.",
                    source="property_rules",
                    rule_references=["Pets allowed: No"],
                    booking_allowed=False
                )

        # -------------------------------------------------------------------------
        # 16. Smoking Policy
        # -------------------------------------------------------------------------
        is_smoke_q = any(k in q_lower for k in ["smoke", "smoking", "cigarette", "cigar", "tobacco", "vape", "vaping", "is smoking allowed"])
        if is_smoke_q:
            if not hr or not hr.smoking_policy:
                return StayGuideAskResponse(
                    answer=FALLBACK_MISSING,
                    source="fallback",
                    rule_references=["Smoking policy: Not specified"],
                    requires_stay_partner_confirmation=True
                )

            if hr.smoking_policy == "No":
                return StayGuideAskResponse(
                    answer="Smoking is strictly prohibited at this property.",
                    source="property_rules",
                    rule_references=["Smoking allowed: No"],
                    booking_allowed=None
                )
            elif hr.smoking_policy == "Designated Areas Only":
                desc_str = f" Note: {hr.smoking_policy_description}" if hr.smoking_policy_description else ""
                return StayGuideAskResponse(
                    answer=f"Smoking is permitted in designated outdoor areas only.{desc_str}",
                    source="property_rules",
                    rule_references=["Smoking allowed: Designated Areas Only"]
                )
            else:
                return StayGuideAskResponse(
                    answer="Smoking is allowed at this property.",
                    source="property_rules",
                    rule_references=["Smoking allowed: Yes"]
                )

        # -------------------------------------------------------------------------
        # 17. Parties & Events
        # -------------------------------------------------------------------------
        is_party_q = any(k in q_lower for k in ["party", "parties", "event", "events", "celebration", "gathering", "bachelor", "birthday", "are parties allowed"])
        if is_party_q:
            if not hr or not hr.parties_policy:
                return StayGuideAskResponse(
                    answer=FALLBACK_MISSING,
                    source="fallback",
                    rule_references=["Parties policy: Not specified"],
                    requires_stay_partner_confirmation=True
                )

            if hr.parties_policy == "No":
                return StayGuideAskResponse(
                    answer="Parties and events are not allowed at this property.",
                    source="property_rules",
                    rule_references=["Parties allowed: No"],
                    booking_allowed=False
                )
            elif hr.parties_policy == "Upon Request":
                desc_str = f" Note: {hr.party_policy_description}" if hr.party_policy_description else ""
                return StayGuideAskResponse(
                    answer=f"Parties and events are permitted upon request only. Please contact the Stay Partner for confirmation.{desc_str}",
                    source="property_rules",
                    rule_references=["Parties allowed: Upon Request"],
                    requires_stay_partner_confirmation=True
                )
            else:
                return StayGuideAskResponse(
                    answer="Parties and events are allowed at this property.",
                    source="property_rules",
                    rule_references=["Parties allowed: Yes"],
                    booking_allowed=True
                )

        # -------------------------------------------------------------------------
        # 18. Cancellation & Refund Policy
        # -------------------------------------------------------------------------
        is_cancel_q = any(k in q_lower for k in ["cancellation", "refund", "cancel my booking", "cancellation policy", "cancel policy", "how do i cancel", "what is the cancellation policy"])
        if is_cancel_q:
            pct = prop.cancellation_refund_percentage if prop.cancellation_refund_percentage is not None else 50
            if pct > 0:
                ans = f"Cancellation Policy for {prop.name}: Free cancellation (100% full refund) is available up to 2 days before check-in. If cancelled within 2 days of arrival, a {pct}% refund is issued."
            else:
                ans = f"Cancellation Policy for {prop.name}: Free cancellation (100% full refund) is available up to 2 days before check-in. If cancelled within 2 days of arrival, no refund (0%) is issued."
            return StayGuideAskResponse(
                answer=ans,
                source="cancellation_policy",
                rule_references=[f"Refund percentage within 2 days: {pct}%", "Full refund cutoff: 2 days before check-in"],
                booking_allowed=True
            )

        # -------------------------------------------------------------------------
        # 19. Amenities & Facilities Questions
        # -------------------------------------------------------------------------
        is_amenity_q = any(k in q_lower for k in [
            "wifi", "wi-fi", "internet", "parking", "pool", "swimming pool", "breakfast",
            "restaurant", "food", "kitchen", "cook", "cooking", "campfire", "bonfire",
            "amenities", "what amenities", "facilities", "what amenities does this property provide",
            "is parking available", "does the property provide wi-fi"
        ])

        if is_amenity_q:
            prop_am_names = [a.amenity_name for a in prop.amenities]
            
            # Specific queries
            if "wifi" in q_lower or "wi-fi" in q_lower or "internet" in q_lower:
                has_wifi = any("wi-fi" in a.lower() or "wifi" in a.lower() for a in prop_am_names)
                return StayGuideAskResponse(
                    answer=f"{'Yes, Free Wi-Fi is available' if has_wifi else 'Wi-Fi is not listed among the amenities'} at {prop.name}.",
                    source="property_amenities",
                    rule_references=[f"Wi-Fi: {'Available' if has_wifi else 'Not listed'}"]
                )

            if "parking" in q_lower:
                has_parking = any("parking" in a.lower() for a in prop_am_names)
                return StayGuideAskResponse(
                    answer=f"{'Yes, parking is available' if has_parking else 'Dedicated parking is not specified'} at {prop.name}.",
                    source="property_amenities",
                    rule_references=[f"Parking: {'Available' if has_parking else 'Not listed'}"]
                )

            if "pool" in q_lower or "swimming" in q_lower:
                has_pool = any("pool" in a.lower() or "swimming" in a.lower() for a in prop_am_names)
                return StayGuideAskResponse(
                    answer=f"{'Yes, a swimming pool is available' if has_pool else 'A swimming pool is not available'} at {prop.name}.",
                    source="property_amenities",
                    rule_references=[f"Swimming pool: {'Available' if has_pool else 'Not listed'}"]
                )

            if "breakfast" in q_lower or "food" in q_lower or "restaurant" in q_lower:
                has_food = [a for a in prop_am_names if any(f in a.lower() for f in ["breakfast", "restaurant", "dining", "food"])]
                if has_food:
                    return StayGuideAskResponse(
                        answer=f"Yes, the following dining facilities are listed at {prop.name}: {', '.join(has_food)}.",
                        source="property_amenities",
                        rule_references=has_food
                    )
                else:
                    return StayGuideAskResponse(
                        answer=f"Restaurant and breakfast options are not specifically listed for {prop.name}. Please contact the Stay Partner for meal arrangements.",
                        source="property_amenities",
                        rule_references=["Dining: Not listed"]
                    )

            if "kitchen" in q_lower or "cook" in q_lower or "cooking" in q_lower:
                has_kitchen = [a for a in prop_am_names if any(k in a.lower() for k in ["kitchen", "kitchenette", "cook"])]
                if has_kitchen:
                    return StayGuideAskResponse(
                        answer=f"Yes, kitchen facilities ({', '.join(has_kitchen)}) are available at {prop.name}.",
                        source="property_amenities",
                        rule_references=has_kitchen
                    )
                else:
                    return StayGuideAskResponse(
                        answer=f"Private cooking and kitchen facilities are not listed as available for {prop.name}.",
                        source="property_amenities",
                        rule_references=["Kitchen: Not listed"]
                    )

            # General amenities list
            if prop_am_names:
                return StayGuideAskResponse(
                    answer=f"Amenities available at {prop.name}: {', '.join(prop_am_names)}.",
                    source="property_amenities",
                    rule_references=prop_am_names,
                    booking_allowed=True
                )
            else:
                return StayGuideAskResponse(
                    answer=f"The Stay Partner has not listed specific property amenities for {prop.name}.",
                    source="property_amenities",
                    rule_references=["Amenities: Not configured"]
                )

        # -------------------------------------------------------------------------
        # 20. Public Experiences Connected to Property
        # -------------------------------------------------------------------------
        is_exp_q = any(k in q_lower for k in [
            "experience", "experiences", "activities", "things to do", "tours", "adventures",
            "does this property offer any experiences"
        ])
        if is_exp_q:
            active_exp = [e for e in prop.experiences if getattr(e, "is_active", True)]
            if active_exp:
                exp_list = []
                for e in active_exp:
                    cat = getattr(e, "experience_type", None) or getattr(e, "category", "Experience")
                    dur = getattr(e, "duration", None) or f"{getattr(e, 'duration_hours', '')} hrs"
                    exp_list.append(f"• {e.title} ({cat}): ₹{e.price:,.0f}/person ({dur})")
                return StayGuideAskResponse(
                    answer=f"Experiences offered at {prop.name}:\n" + "\n".join(exp_list),
                    source="property_data",
                    rule_references=[f"Experiences count: {len(active_exp)}"],
                    booking_allowed=True
                )
            else:
                return StayGuideAskResponse(
                    answer=f"No specialized on-site experiences are currently listed for {prop.name}.",
                    source="property_data",
                    rule_references=["Experiences: None listed"]
                )

        # -------------------------------------------------------------------------
        # 21. Nearby Attractions & Location Details
        # -------------------------------------------------------------------------
        is_attractions_q = any(k in q_lower for k in [
            "attraction", "attractions", "nearby attractions", "places nearby", "sightseeing",
            "places to visit", "what attractions are nearby"
        ])
        if is_attractions_q:
            if prop.location_details and prop.location_details.strip():
                return StayGuideAskResponse(
                    answer=f"Nearby location details and attractions for {prop.name}: {prop.location_details.strip()}",
                    source="property_data",
                    rule_references=["Location details & attractions"]
                )
            else:
                return StayGuideAskResponse(
                    answer=FALLBACK_MISSING,
                    source="fallback",
                    rule_references=["Attractions: Not specified"],
                    requires_stay_partner_confirmation=True
                )

        # -------------------------------------------------------------------------
        # 22. Reach / Directions / Address
        # -------------------------------------------------------------------------
        is_reach_q = any(k in q_lower for k in [
            "how do i reach", "how to reach", "directions", "location", "where is", "address",
            "what is the property address", "pincode", "city", "state"
        ])
        if is_reach_q:
            loc_text = f" Located at {prop.address}, {prop.city}, {prop.state}, {prop.country}."
            directions_text = f" Directions/Location info: {prop.location_details}" if prop.location_details else ""
            return StayGuideAskResponse(
                answer=f"{prop.name} is a {prop.property_type}.{loc_text}{directions_text}",
                source="property_data",
                rule_references=[f"Address: {prop.address}, {prop.city}"]
            )

        # -------------------------------------------------------------------------
        # 23. Public Visible Listing Photos
        # -------------------------------------------------------------------------
        is_photos_q = any(k in q_lower for k in ["photo", "photos", "picture", "pictures", "image", "images", "gallery"])
        if is_photos_q:
            photo_count = len(prop.images) if prop.images else 0
            if room:
                room_photo_count = len(room.images) if room.images else 0
                return StayGuideAskResponse(
                    answer=f"'{room.name}' has {room_photo_count} photo(s) available on this listing, and {prop.name} has a total of {photo_count} listing photo(s).",
                    source="property_data",
                    rule_references=[f"Room photos: {room_photo_count}", f"Property photos: {photo_count}"]
                )
            return StayGuideAskResponse(
                answer=f"{prop.name} has {photo_count} publicly visible photo(s) available on this listing.",
                source="property_data",
                rule_references=[f"Property photos: {photo_count}"]
            )

        # -------------------------------------------------------------------------
        # 24. General Home Rules Summary
        # -------------------------------------------------------------------------
        is_home_rules_summary_q = any(k in q_lower for k in [
            "what are the home rules", "what are the house rules", "home rules", "house rules",
            "rules of the property", "property rules", "what rules apply"
        ])
        if is_home_rules_summary_q:
            rules_summary = [
                f"• Check-in: {hr.check_in_start if hr and hr.check_in_start else prop.check_in_time} - {hr.check_in_end if hr and hr.check_in_end else '22:00'} | Check-out: {hr.check_out_time if hr and hr.check_out_time else prop.check_out_time}",
                f"• Children allowed: {hr.children_allowed if hr else 'Yes'}",
                f"• Pets: {hr.pets_policy if hr else 'No'}",
                f"• Smoking: {hr.smoking_policy if hr else 'No'}",
                f"• Parties & Events: {hr.parties_policy if hr else 'No'}",
                f"• Visitors: {hr.visitors_policy if hr else 'Upon Request'}",
                f"• Government ID: {'Required for all adult guests' if (not hr or hr.government_id_required) else 'Not mandatory'}",
            ]
            if hr and hr.quiet_hours_enabled:
                rules_summary.append(f"• Quiet Hours: {hr.quiet_hours_start} to {hr.quiet_hours_end}")
            if hr and hr.additional_rules:
                rules_summary.append(f"• Additional Rules: {hr.additional_rules}")

            return StayGuideAskResponse(
                answer=f"Key Home Rules for {prop.name}:\n" + "\n".join(rules_summary),
                source="property_rules",
                rule_references=["Comprehensive Property Home Rules"],
                booking_allowed=True
            )

        # -------------------------------------------------------------------------
        # 25. Additional Rules Text Search
        # -------------------------------------------------------------------------
        if hr and hr.additional_rules:
            words = [w for w in re.findall(r'\w+', q_lower) if len(w) > 3]
            if any(w in hr.additional_rules.lower() for w in words):
                return StayGuideAskResponse(
                    answer=f"According to the Stay Partner's additional house rules: {hr.additional_rules}",
                    source="property_rules",
                    rule_references=["Additional house rules"]
                )

        # -------------------------------------------------------------------------
        # 26. Unknown / Unrelated Questions Fallback (Section 10)
        # -------------------------------------------------------------------------
        return StayGuideAskResponse(
            answer="I can help with public information about the selected property and room. You can ask me about amenities, rooms, child policies, extra beds, baby cots, home rules, check-in times, prices, availability, or experiences.",
            source="fallback",
            rule_references=[f"Property: {prop.name}"],
            requires_stay_partner_confirmation=False
        )
