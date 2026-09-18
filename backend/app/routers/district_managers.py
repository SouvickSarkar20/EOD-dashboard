import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.db import get_db
from app.dependencies.auth import require_admin, require_mfa
from app.models import AdminUser
from app.schemas.district_manager import (
    DMListItem, DMDetail, CreateDMRequest, UpdateDMRequest, ResetPasswordResponse
)
from app.utils.pagination import PaginatedResponse, create_paginated_response
from app.services.dm_service import DMService

router = APIRouter()

@router.get("/", response_model=PaginatedResponse[DMListItem])
async def list_district_managers(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: active / inactive"),
    district_id: Optional[int] = Query(None, description="Filter by assigned district ID"),
    search: Optional[str] = Query(None, description="Search by name, email, or DMID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(require_mfa)
):
    """List District Managers with filtering, search, and pagination."""
    items, total = await DMService.list_dms(
        db=db,
        status_filter=status_filter,
        district_id=district_id,
        search=search,
        page=page,
        page_size=page_size
    )
    return create_paginated_response(items=items, total=total, page=page, page_size=page_size)

@router.post("/", response_model=DMDetail, status_code=status.HTTP_201_CREATED)
async def create_district_manager(
    payload: CreateDMRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(require_mfa)
):
    """Create a new District Manager account (generates temporary password)."""
    detail, temp_pw = await DMService.create_dm(
        db=db,
        admin_user=admin_user,
        payload=payload,
        ip_address=request.client.host if request.client else None
    )
    return detail

@router.get("/{dm_id}", response_model=DMDetail)
async def get_district_manager(
    dm_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(require_mfa)
):
    """Get full details and station assignments of a single District Manager."""
    detail = await DMService.get_dm_detail(db, dm_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"District Manager with ID '{dm_id}' not found"
        )
    return detail

@router.patch("/{dm_id}", response_model=DMDetail)
async def update_district_manager(
    dm_id: uuid.UUID,
    payload: UpdateDMRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(require_mfa)
):
    """Update District Manager details (name, email, status)."""
    detail = await DMService.update_dm(
        db=db,
        admin_user=admin_user,
        dm_id=dm_id,
        payload=payload,
        ip_address=request.client.host if request.client else None
    )
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"District Manager with ID '{dm_id}' not found"
        )
    return detail

@router.post("/{dm_id}/deactivate")
async def deactivate_district_manager(
    dm_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(require_mfa)
):
    """Deactivate (soft delete) a District Manager account."""
    success = await DMService.deactivate_dm(
        db=db,
        admin_user=admin_user,
        dm_id=dm_id,
        ip_address=request.client.host if request.client else None
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"District Manager with ID '{dm_id}' not found"
        )
    return {"message": f"District Manager '{dm_id}' has been deactivated successfully."}

@router.post("/{dm_id}/reset-password", response_model=ResetPasswordResponse)
async def reset_district_manager_password(
    dm_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(require_mfa)
):
    """Reset password for a District Manager (generates fresh temporary password)."""
    res = await DMService.reset_dm_password(
        db=db,
        admin_user=admin_user,
        dm_id=dm_id,
        ip_address=request.client.host if request.client else None
    )
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"District Manager with ID '{dm_id}' not found"
        )
    dm_user, temp_pw = res
    return ResetPasswordResponse(
        dm_id=dm_user.id,
        dmid=dm_user.dmid,
        temporary_password=temp_pw,
        message=f"Password for DM {dm_user.name} ({dm_user.dmid}) has been reset successfully."
    )
