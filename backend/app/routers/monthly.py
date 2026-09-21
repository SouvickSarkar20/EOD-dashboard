import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.db import get_db
from app.dependencies.auth import require_mfa
from app.models import AdminUser
from app.schemas.monthly import MonthlyRow, MonthlySummaryResponse
from app.utils.pagination import PaginatedResponse, create_paginated_response
from app.services.analytics_service import AnalyticsService

from app.utils.security import validate_month_param

router = APIRouter()

@router.get("/", response_model=PaginatedResponse[MonthlyRow])
async def get_monthly_records(
    month: Optional[int] = Query(None, description="Enrollment month YYYYMM (e.g. 202601)"),
    dm_id: Optional[str] = Query(None, description="Filter by DM User UUID or DMID string"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    station_id: Optional[str] = Query(None, description="Filter by Station ID"),
    operator_code: Optional[str] = Query(None, description="Filter by Operator Code"),
    min_enrollment: Optional[int] = Query(None, description="Minimum total enrollment filter"),
    max_enrollment: Optional[int] = Query(None, description="Maximum total enrollment filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=200, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(require_mfa)
):
    """Fetch paginated Monthly summary records with filters."""
    validate_month_param(month)
    resolved_dm_uuid = await AnalyticsService.resolve_dm_uuid(db, dm_id)
    items, total = await AnalyticsService.get_monthly_records(
        db=db,
        month=month,
        dm_id=resolved_dm_uuid,
        district_id=district_id,
        station_id=station_id,
        operator_code=operator_code,
        min_enrollment=min_enrollment,
        max_enrollment=max_enrollment,
        page=page,
        page_size=page_size
    )
    return create_paginated_response(items=items, total=total, page=page, page_size=page_size)

@router.get("/summary", response_model=MonthlySummaryResponse)
async def get_monthly_summary_overview(
    month: Optional[int] = Query(None, description="Enrollment month YYYYMM"),
    dm_id: Optional[str] = Query(None, description="Filter by DM User UUID or DMID string"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(require_mfa)
):
    """
    Fetch complete Monthly Analytics Overview:
    KPI strip, District performance comparison, DM ranking, Category mix, and MoM trend.
    """
    resolved_dm_uuid = await AnalyticsService.resolve_dm_uuid(db, dm_id)
    return await AnalyticsService.get_monthly_summary_overview(
        db=db,
        month=month,
        dm_id=resolved_dm_uuid,
        district_id=district_id
    )
