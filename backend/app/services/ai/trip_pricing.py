from typing import Dict, Any, List, Optional
from app.models.room import Room, RoomRule
from app.models.property import Property, PropertyRule
from app.models.experience import Experience
from app.schemas.trip_planner import PricingSummaryResponse

class TripPricingService:
    @staticmethod
    def calculate_stay_cost(
        room: Room,
        nights: int,
        adults: int,
        children: int = 0,
        child_ages: Optional[List[int]] = None,
        property_rule: Optional[PropertyRule] = None,
        room_rule: Optional[RoomRule] = None
    ) -> Dict[str, Any]:
        """
        Calculates authoritative stay pricing from PostgreSQL fields and rules.
        Never allows AI to calculate or mutate final pricing.
        """
        room_subtotal = round(float(room.base_price) * max(1, nights), 2)
        child_subtotal = 0.0

        # Evaluate child pricing rules if children are present
        if children > 0 and child_ages:
            rule = room_rule or (property_rule if hasattr(property_rule, 'children_charged_separately') else None)
            if rule:
                free_count = getattr(rule, 'free_additional_children', 0) or 0
                charge_amount = getattr(rule, 'child_charge_amount', 0.0) or getattr(rule, 'child_price', 0.0) or 0.0
                charge_unit = getattr(rule, 'child_charge_unit', 'Per night')
                
                chargeable_children = max(0, children - free_count)
                if chargeable_children > 0 and charge_amount > 0:
                    if charge_unit == 'Per night':
                        child_subtotal = round(charge_amount * chargeable_children * nights, 2)
                    else:  # Per stay
                        child_subtotal = round(charge_amount * chargeable_children, 2)

        total_stay_cost = round(room_subtotal + child_subtotal, 2)

        return {
            "price_per_night": float(room.base_price),
            "total_nights": nights,
            "room_subtotal": room_subtotal,
            "child_charge_subtotal": child_subtotal,
            "total_stay_cost": total_stay_cost
        }

    @staticmethod
    def calculate_experience_cost(
        experience: Experience,
        participants: int
    ) -> Dict[str, Any]:
        """
        Calculates authoritative experience pricing based on pricing_model.
        """
        unit_price = float(experience.price)
        pricing_model = str(experience.pricing_model).lower()

        if pricing_model in ["per_person", "per-person", "per person"]:
            total_cost = round(unit_price * max(1, participants), 2)
        else:  # fixed price per group/session
            total_cost = round(unit_price, 2)

        return {
            "unit_price": unit_price,
            "pricing_model": pricing_model,
            "participants": participants,
            "total_experience_cost": total_cost
        }

    @staticmethod
    def build_pricing_summary(
        accommodation_total: float,
        experiences_total: float,
        budget: Optional[float] = None,
        budget_type: str = "TOTAL"
    ) -> PricingSummaryResponse:
        """
        Constructs transparent pricing summary with budget compatibility evaluation.
        """
        known_cost = round(accommodation_total + experiences_total, 2)
        
        budget_status = "NO_BUDGET_SET"
        budget_difference = None

        if budget_type == "FLEXIBLE" or budget is None:
            budget_status = "FLEXIBLE"
        elif budget is not None and budget > 0:
            relevant_target = accommodation_total if budget_type == "ACCOMMODATION" else known_cost
            if relevant_target <= budget:
                budget_status = "WITHIN_BUDGET"
                budget_difference = round(budget - relevant_target, 2)
            else:
                budget_status = "EXCEEDS_BUDGET"
                budget_difference = round(relevant_target - budget, 2)

        return PricingSummaryResponse(
            accommodation_total=round(accommodation_total, 2),
            experiences_total=round(experiences_total, 2),
            known_cost=known_cost,
            currency="INR",
            disclaimer="This estimate includes your selected Voyara stay and verified experiences. Food, local transport, and personal expenses are not included.",
            budget_status=budget_status,
            budget_target=budget,
            budget_difference=budget_difference
        )
