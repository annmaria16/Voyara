from datetime import datetime
from typing import Optional

from pydantic import (
    BaseModel,
    Field,
    EmailStr,
    ConfigDict,
)


# ============================================================
# ADMIN AUTH SCHEMAS
# ============================================================

class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class AdminToken(BaseModel):
    access_token: str
    token_type: str


# ============================================================
# TASK SCHEMAS
# ============================================================

class TaskCreate(BaseModel):
    title: str = Field(
        ...,
        min_length=1,
        max_length=200
    )

    description: Optional[str] = None

    task_type: str = Field(
        default="verification",
        max_length=100
    )


class TaskStatusUpdate(BaseModel):
    status: str = Field(
        ...,
        min_length=1,
        max_length=30
    )


class TaskResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    task_type: str
    status: str
    execution_status: str
    confidence_score: Optional[float] = None
    final_result: Optional[str] = None
    reference_count: int = 0
    review_status: str
    plan: Optional[dict] = None
    verification_status: Optional[str] = None
    verification_explanation: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# USER AUTH SCHEMAS
# ============================================================

class UserBase(BaseModel):
    email: EmailStr
    fullname: str


class UserCreate(UserBase):
    password: str = Field(
        ...,
        min_length=6,
        max_length=128
    )
    accepted_terms: bool


class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ============================================================
# USER RESPONSE
# ============================================================

class UserResponse(UserBase):
    id: int

    provider: str

    # --------------------------------------------------------
    # IMPORTANT
    # Frontend uses this to decide:
    #
    # user  -> User Dashboard
    # admin -> Admin Dashboard
    # --------------------------------------------------------

    role: str

    created_at: datetime

    profile_image: Optional[str] = None

    terms_accepted: bool
    privacy_accepted: bool
    legal_accepted_at: Optional[datetime] = None
    terms_version: Optional[str] = None
    privacy_version: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True
    )

    # ============================================================
# USER DASHBOARD SCHEMAS
# ============================================================

class UserProfileUpdate(BaseModel):
    fullname: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=100
    )
    profile_image: Optional[str] = Field(
        default=None,
        max_length=500
    )


class PasswordChange(BaseModel):
    current_password: str = Field(
        ...,
        min_length=1
    )
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128
    )


class DashboardStats(BaseModel):
    total_verifications: int
    pending_verifications: int
    running_verifications: int
    verified_verifications: int
    failed_verifications: int


# ============================================================
# TOKEN SCHEMAS
# ============================================================

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


# ============================================================
# OAUTH SCHEMAS
# ============================================================

class OAuthLoginRequest(BaseModel):
    provider: str
    email: EmailStr
    fullname: str
    code: Optional[str] = None


# ============================================================
# PASSWORD RESET SCHEMAS
# ============================================================

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128
    )


# ============================================================
# CONTACT MESSAGE SCHEMAS
# ============================================================

class ContactMessageCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=10, max_length=2000)


class ContactMessageStatusUpdate(BaseModel):
    status: str = Field(..., min_length=1, max_length=30)


class ContactMessageReply(BaseModel):
    admin_reply: str = Field(..., min_length=1, max_length=2000)


class ContactMessageResponse(BaseModel):
    id: int
    user_id: int
    name: str
    email: EmailStr
    subject: str
    message: str
    status: str
    admin_reply: Optional[str] = None
    user_read: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )

# ============================================================
# VERIFICATION ASSISTANT SCHEMAS
# ============================================================

class VerificationMessageCreate(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=5000,
    )


class VerificationMessageResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    sender: str
    message: str
    message_type: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class VerificationDetailResponse(TaskResponse):
    messages: list[VerificationMessageResponse] = []


class AdminTaskUpdate(BaseModel):
    status: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=30,
    )
    confidence_score: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
    )
    final_result: Optional[str] = Field(
        default=None,
        max_length=10000,
    )
    review_status: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=30,
    )


# ============================================================
# AGENT PLAN SCHEMAS
# ============================================================

class AgentStep(BaseModel):
    step_number: int
    description: str
    action: str
    tool: str
    expected_output: str
    requires_confirmation: bool

class AgentPlan(BaseModel):
    objective: str
    task_type: str
    steps: list[AgentStep]
    required_tools: list[str]
    evidence_requirements: list[str]
    verification_requirements: list[str]
    risk_level: str

class AgentPlanRequest(BaseModel):
    task_text: str = Field(..., min_length=5, max_length=1000)

class AgentPlanResponse(BaseModel):
    task_id: int
    plan: AgentPlan


class AgentExecuteRequest(BaseModel):
    task_id: int
    confirm_action_id: Optional[int] = None


class AgentExecuteResponse(BaseModel):
    task_id: int
    status: str
    result: str


class AdminAgentActionResponse(BaseModel):
    id: int
    user_id: int
    task_id: Optional[int] = None
    tool_name: str
    input_data: Optional[dict] = None
    result_data: Optional[dict] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AdminProductSearchResponse(BaseModel):
    id: int
    user_id: int
    query: str
    filters: Optional[dict] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogResponse(BaseModel):
    id: int
    admin_user_id: int
    task_id: int
    action: str
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReviewActionRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=2000)
    confidence_score: Optional[float] = Field(None, ge=0, le=100)
    final_result: Optional[str] = Field(None, max_length=10000)


class UserSettingsUpdateRequest(BaseModel):
    memory_enabled: bool


class TaskFeedbackRequest(BaseModel):
    rating: str = Field(..., min_length=1, max_length=30)
    comment: Optional[str] = Field(None, max_length=2000)


class ConnectionCreateRequest(BaseModel):
    provider: str = Field(..., min_length=1, max_length=50)
    provider_account_id: str = Field(..., min_length=1, max_length=100)
    scopes: Optional[str] = None
    credentials: str = Field(..., min_length=1, max_length=5000)


class AgentFeedbackCreateRequest(BaseModel):
    task_id: int
    agent_id: Optional[str] = None
    rating: str = Field(..., min_length=1, max_length=20) # thumbs_up, thumbs_down, incorrect
    comment: Optional[str] = Field(None, max_length=2000)


class ActionConfirmRequest(BaseModel):
    confirmation_id: str = Field(..., min_length=1, max_length=50)
    tool_id: str = Field(..., min_length=1, max_length=50)
    arguments: dict = Field(..., description="Action parameter arguments to verify hash integrity.")


class AgentRunRequest(BaseModel):
    message: str = Field(..., min_length=1)
    conversation_id: Optional[str] = None
    task_id: Optional[int] = None
    user_id: Optional[int] = None


class AgentRunResponse(BaseModel):
    success: bool
    task: Optional[dict] = None
    answer: str
    results: Optional[list] = None
    sources: Optional[list] = None
    verification: Optional[dict] = None
    tools_used: Optional[list] = None
    requires_confirmation: bool
