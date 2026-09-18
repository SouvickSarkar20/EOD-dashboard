from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user
from app.models import AdminUser, UserStatus
from app.schemas.auth import LoginRequest, TokenResponse, UserProfileSchema
from app.utils.security import verify_password, create_access_token, create_refresh_token

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user with email/DMID and password."""
    identifier = payload.email.strip()
    
    # Search by email or dmid
    stmt = select(AdminUser).where(
        (AdminUser.email == identifier) | (AdminUser.dmid == identifier)
    )
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/DMID or password",
        )

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact administrator.",
        )

    # Check if MFA is required for Admin
    mfa_required = user.role.value == "admin" and user.is_2fa_enabled

    token_data = {
        "sub": str(user.id),
        "role": user.role.value,
        "mfa_verified": not mfa_required,
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Set httpOnly refresh cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,
    )

    user_profile = UserProfileSchema.model_validate(user)

    return TokenResponse(
        access_token=access_token,
        mfa_required=mfa_required,
        is_demo_creds=user.is_demo_creds,
        user=user_profile,
    )

@router.get("/me", response_model=UserProfileSchema)
async def get_me(current_user: AdminUser = Depends(get_current_user)):
    """Return currently authenticated user profile."""
    return UserProfileSchema.model_validate(current_user)

@router.post("/logout")
async def logout(response: Response):
    """Logout user by clearing refresh cookie."""
    response.delete_cookie("refresh_token")
    return {"message": "Successfully logged out"}
