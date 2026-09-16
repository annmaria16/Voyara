from datetime import datetime, date
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, field_validator

# =============================================================================
# Property Rule Schemas
# =============================================================================

class PropertyRuleBase(BaseModel):
    # A. Children & Child Occupancy Policy
    children_allowed: str = Field(default="Yes", description="Yes or No")
    minimum_child_age: Optional[int] = Field(default=None, ge=0, le=18)
    maximum_children: Optional[int] = Field(default=None, ge=0)
    additional_children_allowed: int = Field(default=0, ge=0, description="How many additional children can stay in a room")
    max_child_age: Optional[int] = Field(default=None, ge=0, le=18, description="Maximum age allowed for an additional child")
    free_additional_children: int = Field(default=0, ge=0, description="How many additional children can stay free of charge")
    child_charge_enabled: bool = Field(default=False, description="Is there an extra charge for additional children")
    child_charge_amount: Optional[float] = Field(default=0.0, ge=0.0, description="Charge amount per child")
    child_charge_unit: Optional[str] = Field(default="Per night", description="Per night or Per stay")
    existing_bed_allowed: str = Field(default="Yes", description="Can an additional child use the existing adult bed (Yes/No)")
    existing_bed_explanation: Optional[str] = Field(default=None, max_length=500, description="Explanation for existing bed usage")
    extra_bed_available: str = Field(default="No", description="Is an extra bed available for an additional child (Yes/No)")
    extra_bed_charge_unit: Optional[str] = Field(default="Per night", description="Per night or Per stay")
    children_charged_separately: bool = False
    child_pricing_note: Optional[str] = Field(default=None, max_length=500)
    cot_policy: str = Field(default="Upon Request", description="Yes, No, or Upon Request")
    cot_available: str = Field(default="No", description="Is a baby cot available (Yes/No)")
    cot_quantity: Optional[int] = Field(default=0, ge=0)
    cot_price: Optional[float] = Field(default=0.0, ge=0.0)
    cot_charge_unit: Optional[str] = Field(default="Free", description="Free, Per night, or Per stay")

    # B. Pet Policy
    pets_policy: str = Field(default="No", description="Yes, Upon Request, or No")
    pet_fee: Optional[float] = Field(default=0.0, ge=0.0)
    pet_policy_description: Optional[str] = Field(default=None, max_length=500)

    # C. Smoking Policy
    smoking_policy: str = Field(default="No", description="Yes, No, or Designated Areas Only")
    smoking_policy_description: Optional[str] = Field(default=None, max_length=500)

    # D. Parties and Events
    parties_policy: str = Field(default="No", description="Yes, No, or Upon Request")
    party_policy_description: Optional[str] = Field(default=None, max_length=500)

    # E. Visitor Policy
    visitors_policy: str = Field(default="Upon Request", description="Yes, No, or Upon Request")
    overnight_visitors_allowed: bool = False
    visitor_policy_description: Optional[str] = Field(default=None, max_length=500)

    # F. Quiet Hours
    quiet_hours_enabled: bool = False
    quiet_hours_start: Optional[str] = Field(default="22:00", max_length=20)
    quiet_hours_end: Optional[str] = Field(default="07:00", max_length=20)

    # G. Check-in and Check-out
    check_in_start: Optional[str] = Field(default="14:00", max_length=20)
    check_in_end: Optional[str] = Field(default="22:00", max_length=20)
    check_out_time: Optional[str] = Field(default="11:00", max_length=20)
    early_checkin_policy: str = Field(default="Upon Request", description="Yes, No, or Upon Request")
    late_checkout_policy: str = Field(default="Upon Request", description="Yes, No, or Upon Request")

    # H. Identification and Safety
    government_id_required: bool = True
    minimum_checkin_age: Optional[int] = Field(default=18, ge=18, le=100)
    safety_instructions: Optional[str] = Field(default=None, max_length=2000)

    # I. Additional Rules
    additional_rules: Optional[str] = Field(default=None, max_length=3000)

    @field_validator("additional_rules")
    @classmethod
    def validate_rules_length(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v.strip()) > 3000:
            raise ValueError("Additional rules text cannot exceed 3000 characters.")
        return v

    @field_validator("free_additional_children")
    @classmethod
    def validate_free_children(cls, v: int, info) -> int:
        allowed = info.data.get("additional_children_allowed", 0) if info.data else 0
        if v is not None and allowed is not None and v > allowed:
            raise ValueError("Free additional children cannot exceed the number of additional children allowed.")
        return v

class PropertyRuleCreate(PropertyRuleBase):
    pass

class PropertyRuleUpdate(BaseModel):
    children_allowed: Optional[str] = None
    minimum_child_age: Optional[int] = None
    maximum_children: Optional[int] = None
    additional_children_allowed: Optional[int] = None
    max_child_age: Optional[int] = None
    free_additional_children: Optional[int] = None
    child_charge_enabled: Optional[bool] = None
    child_charge_amount: Optional[float] = None
    child_charge_unit: Optional[str] = None
    existing_bed_allowed: Optional[str] = None
    existing_bed_explanation: Optional[str] = None
    extra_bed_available: Optional[str] = None
    extra_bed_charge_unit: Optional[str] = None
    children_charged_separately: Optional[bool] = None
    child_pricing_note: Optional[str] = None
    cot_policy: Optional[str] = None
    cot_available: Optional[str] = None
    cot_quantity: Optional[int] = None
    cot_price: Optional[float] = None
    cot_charge_unit: Optional[str] = None
    pets_policy: Optional[str] = None
    pet_fee: Optional[float] = None
    pet_policy_description: Optional[str] = None
    smoking_policy: Optional[str] = None
    smoking_policy_description: Optional[str] = None
    parties_policy: Optional[str] = None
    party_policy_description: Optional[str] = None
    visitors_policy: Optional[str] = None
    overnight_visitors_allowed: Optional[bool] = None
    visitor_policy_description: Optional[str] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    check_in_start: Optional[str] = None
    check_in_end: Optional[str] = None
    check_out_time: Optional[str] = None
    early_checkin_policy: Optional[str] = None
    late_checkout_policy: Optional[str] = None
    government_id_required: Optional[bool] = None
    minimum_checkin_age: Optional[int] = None
    safety_instructions: Optional[str] = None
    additional_rules: Optional[str] = None

class PropertyRuleResponse(PropertyRuleBase):
    id: Optional[int] = None
    property_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# =============================================================================
# Room Rule Schemas
# =============================================================================

class RoomRuleBase(BaseModel):
    maximum_total_guests: int = Field(default=2, ge=1)
    maximum_adults: Optional[int] = Field(default=2, ge=1)
    maximum_children: Optional[int] = Field(default=1, ge=0)
    additional_children_allowed: int = Field(default=0, ge=0, description="How many additional children can stay in a room")
    max_child_age: Optional[int] = Field(default=None, ge=0, le=18, description="Maximum age allowed for an additional child")
    free_additional_children: int = Field(default=0, ge=0, description="How many additional children can stay free of charge")
    child_charge_enabled: bool = Field(default=False, description="Is there an extra charge for additional children")
    child_charge_amount: Optional[float] = Field(default=0.0, ge=0.0, description="Charge amount per child")
    child_charge_unit: Optional[str] = Field(default="Per night", description="Per night or Per stay")
    existing_bed_allowed: str = Field(default="Yes", description="Can an additional child use the existing adult bed (Yes/No)")
    existing_bed_explanation: Optional[str] = Field(default=None, max_length=500, description="Explanation for existing bed usage")
    extra_bed_available: str = Field(default="No", description="Is an extra bed available for an additional child (Yes/No)")
    extra_bed_charge_unit: Optional[str] = Field(default="Per night", description="Per night or Per stay")
    children_allowed: str = Field(default="Yes", description="Yes, No, or Upon Request")
    minimum_child_age: Optional[int] = Field(default=None, ge=0, le=18)
    cot_policy: str = Field(default="Upon Request", description="Yes, No, or Upon Request")
    cot_available: str = Field(default="No", description="Is a baby cot available (Yes/No)")
    cot_quantity: Optional[int] = Field(default=0, ge=0)
    cot_price: Optional[float] = Field(default=0.0, ge=0.0)
    cot_charge_unit: Optional[str] = Field(default="Free", description="Free, Per night, or Per stay")
    extra_bed_policy: str = Field(default="Upon Request", description="Yes, No, or Upon Request")
    maximum_extra_beds: Optional[int] = Field(default=0, ge=0)
    extra_bed_price: Optional[float] = Field(default=0.0, ge=0.0)
    child_price: Optional[float] = Field(default=0.0, ge=0.0)
    room_specific_rules: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("free_additional_children")
    @classmethod
    def validate_free_children(cls, v: int, info) -> int:
        allowed = info.data.get("additional_children_allowed", 0) if info.data else 0
        if v is not None and allowed is not None and v > allowed:
            raise ValueError("Free additional children cannot exceed the number of additional children allowed.")
        return v

class RoomRuleCreate(RoomRuleBase):
    pass

class RoomRuleUpdate(BaseModel):
    maximum_total_guests: Optional[int] = None
    maximum_adults: Optional[int] = None
    maximum_children: Optional[int] = None
    additional_children_allowed: Optional[int] = None
    max_child_age: Optional[int] = None
    free_additional_children: Optional[int] = None
    child_charge_enabled: Optional[bool] = None
    child_charge_amount: Optional[float] = None
    child_charge_unit: Optional[str] = None
    existing_bed_allowed: Optional[str] = None
    existing_bed_explanation: Optional[str] = None
    extra_bed_available: Optional[str] = None
    extra_bed_charge_unit: Optional[str] = None
    children_allowed: Optional[str] = None
    minimum_child_age: Optional[int] = None
    cot_policy: Optional[str] = None
    cot_available: Optional[str] = None
    cot_quantity: Optional[int] = None
    cot_price: Optional[float] = None
    cot_charge_unit: Optional[str] = None
    extra_bed_policy: Optional[str] = None
    maximum_extra_beds: Optional[int] = None
    extra_bed_price: Optional[float] = None
    child_price: Optional[float] = None
    room_specific_rules: Optional[str] = None

class RoomRuleResponse(RoomRuleBase):
    id: Optional[int] = None
    room_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# =============================================================================
# Booking Rule Snapshot Schemas
# =============================================================================

class BookingRuleSnapshotResponse(BaseModel):
    id: int
    booking_id: int
    property_rules_snapshot: Optional[Dict[str, Any]] = None
    room_rules_snapshot: Optional[Dict[str, Any]] = None
    adults: int = 1
    children: int = 0
    child_ages: Optional[List[int]] = None
    cot_count: int = 0
    extra_bed_count: int = 0
    accepted_by_customer: bool = True
    accepted_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

# =============================================================================
# Voyara AI Property Information Assistant Query Schemas
# =============================================================================

class PropertyChatRequest(BaseModel):
    property_id: int
    room_id: Optional[int] = None
    user_question: Optional[str] = None
    question: Optional[str] = None
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    number_of_adults: Optional[int] = None
    adults: Optional[int] = None
    number_of_children: Optional[int] = None
    children: Optional[int] = None
    child_ages: Optional[List[int]] = Field(default_factory=list)
    requested_rooms: Optional[int] = 1
    cot_requested: Optional[bool] = False
    extra_bed_requested: Optional[bool] = False

    @property
    def effective_question(self) -> str:
        return (self.user_question or self.question or "").strip()

    @property
    def effective_adults(self) -> int:
        if self.number_of_adults is not None:
            return self.number_of_adults
        if self.adults is not None:
            return self.adults
        return 1

    @property
    def effective_children(self) -> int:
        if self.number_of_children is not None:
            return self.number_of_children
        if self.children is not None:
            return self.children
        return 0

class PropertyChatResponse(BaseModel):
    answer: str
    source: str = "property_rules"  # "property_rules", "room_rules", "general_policy", "fallback", "property_data", "room_data", "cancellation_policy", "security_guard", "context_guard"
    rule_references: List[str] = Field(default_factory=list)
    booking_allowed: Optional[bool] = None
    requires_stay_partner_confirmation: bool = False
    availability_checked: bool = False
    rule_category: Optional[str] = None
    confidence: Optional[float] = 1.0

# Aliases for backwards compatibility with existing codebase
StayGuideAskRequest = PropertyChatRequest
StayGuideAskResponse = PropertyChatResponse
