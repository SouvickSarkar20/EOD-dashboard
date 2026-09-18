import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
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

    class Config:
        from_attributes = True

class UpdateCredentialsRequest(BaseModel):
    new_email: EmailStr
    new_password: str = Field(..., min_length=8, description="New strong password")

class Supabase2FAVerifyRequest(BaseModel):
    totp_code: str = Field(..., min_length=6, max_length=6, description="6-digit TOTP code from Authenticator app")
