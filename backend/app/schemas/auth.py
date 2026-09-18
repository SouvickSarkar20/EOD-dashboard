import uuid
from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.models.user import UserRole, UserStatus

class LoginRequest(BaseModel):
    email: str = Field(..., description="Email or DMID")
    password: str = Field(..., min_length=1)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    mfa_required: bool = False
    is_demo_creds: bool = False
    user: Optional["UserProfileSchema"] = None

class UserProfileSchema(BaseModel):
    id: uuid.UUID
    dmid: str
    name: str
    email: str
    role: UserRole
    status: UserStatus
    is_2fa_enabled: bool
    is_demo_creds: bool
    must_change_password: bool

    model_config = ConfigDict(from_attributes=True)

class UpdateCredentialsRequest(BaseModel):
    new_email: EmailStr
    new_password: str = Field(..., min_length=8, description="New strong password (min 8 characters)")

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, description="New strong password")

class MFAEnrollResponse(BaseModel):
    secret: str
    qr_code: str
    uri: str
    factor_id: str

class Verify2FARequest(BaseModel):
    totp_code: str = Field(..., min_length=6, max_length=6, description="6-digit TOTP code")
    secret: Optional[str] = Field(None, description="Optional TOTP secret if verifying enrollment")

class MFAVerifyResponse(BaseModel):
    success: bool
    message: str
    access_token: Optional[str] = None
    user: Optional[UserProfileSchema] = None
