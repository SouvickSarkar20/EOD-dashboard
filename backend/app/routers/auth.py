from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models import AdminUser, UserStatus, UserRole, AuditLog
from app.schemas.auth import (
    LoginRequest, TokenResponse, UserProfileSchema,
    UpdateCredentialsRequest, ChangePasswordRequest,
    MFAEnrollResponse, Verify2FARequest, MFAVerifyResponse
)
from app.utils.security import (
    verify_password, get_password_hash, create_access_token,
    create_refresh_token, decode_token
)
from app.services.auth_service import AuthService

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user with email/DMID and password."""
    identifier = payload.email.strip()
    
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

    # Check if 2FA is required for Admin
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

    # Record login timestamp & audit log
    user.last_login_at = datetime.utcnow()
    log = AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        resource_type="AdminUser",
        resource_id=str(user.id),
        details={"mfa_required": mfa_required},
        ip_address=request.client.host if request.client else None
    )
    db.add(log)
    await db.commit()

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

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Obtain a new access token using the httpOnly refresh cookie."""
    cookie_token = request.cookies.get("refresh_token")
    if not cookie_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token cookie missing",
        )
    
    payload = decode_token(cookie_token)
    if not payload or payload.get("token_type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    
    user_id_str = payload.get("sub")
    stmt = select(AdminUser).where(AdminUser.id == user_id_str)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is invalid or deactivated",
        )
    
    mfa_required = user.role.value == "admin" and user.is_2fa_enabled
    new_token_data = {
        "sub": str(user.id),
        "role": user.role.value,
        "mfa_verified": not mfa_required,
    }
    
    new_access_token = create_access_token(new_token_data)
    return TokenResponse(
        access_token=new_access_token,
        mfa_required=mfa_required,
        is_demo_creds=user.is_demo_creds,
        user=UserProfileSchema.model_validate(user),
    )

@router.post("/admin/update-credentials", response_model=UserProfileSchema)
async def update_admin_credentials(
    payload: UpdateCredentialsRequest,
    request: Request,
    current_user: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin Only: Update email & password from initial demo credentials.
    Sets is_demo_creds = False and syncs with Supabase Auth.
    """
    updated_user = await AuthService.update_admin_credentials(
        db=db,
        user=current_user,
        new_email=payload.new_email,
        new_password=payload.new_password,
        ip_address=request.client.host if request.client else None
    )
    return UserProfileSchema.model_validate(updated_user)

@router.post("/admin/supabase-2fa/enroll", response_model=MFAEnrollResponse)
async def enroll_supabase_2fa(
    current_user: AdminUser = Depends(require_admin)
):
    """
    Admin Only: Generate Supabase 2FA TOTP enrollment details (Secret & QR Code).
    """
    mfa_data = await AuthService.generate_mfa_enrollment(current_user)
    return MFAEnrollResponse(**mfa_data)

@router.post("/admin/supabase-2fa/verify-enrollment", response_model=MFAVerifyResponse)
async def verify_supabase_2fa_enrollment(
    payload: Verify2FARequest,
    request: Request,
    current_user: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin Only: Verify 6-digit TOTP code to confirm 2FA setup and activate Supabase 2FA.
    """
    success = await AuthService.verify_mfa_code(
        db=db,
        user=current_user,
        totp_code=payload.totp_code,
        secret=payload.secret,
        ip_address=request.client.host if request.client else None
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit TOTP code. Please check your Authenticator app and try again."
        )

    # Return upgraded token with mfa_verified=True
    token_data = {
        "sub": str(current_user.id),
        "role": current_user.role.value,
        "mfa_verified": True
    }
    upgraded_token = create_access_token(token_data)

    return MFAVerifyResponse(
        success=True,
        message="Supabase 2FA enabled successfully!",
        access_token=upgraded_token,
        user=UserProfileSchema.model_validate(current_user)
    )

@router.post("/admin/supabase-2fa/verify-login", response_model=MFAVerifyResponse)
async def verify_supabase_2fa_login(
    payload: Verify2FARequest,
    request: Request,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin Only: Verify 6-digit TOTP code during login challenge to issue final mfa_verified access token.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="2FA login verification is for Admin users")

    success = await AuthService.verify_mfa_code(
        db=db,
        user=current_user,
        totp_code=payload.totp_code,
        ip_address=request.client.host if request.client else None
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit 2FA code."
        )

    token_data = {
        "sub": str(current_user.id),
        "role": current_user.role.value,
        "mfa_verified": True
    }
    upgraded_token = create_access_token(token_data)

    return MFAVerifyResponse(
        success=True,
        message="2FA authentication verified successfully!",
        access_token=upgraded_token,
        user=UserProfileSchema.model_validate(current_user)
    )

@router.post("/change-password", response_model=UserProfileSchema)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change current user password."""
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    current_user.password_hash = get_password_hash(payload.new_password)
    current_user.must_change_password = False
    await db.commit()
    await db.refresh(current_user)

    return UserProfileSchema.model_validate(current_user)
