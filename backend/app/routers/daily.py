import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.db import get_db
from app.dependencies.auth import require_mfa
from app.models import AdminUser
from app.schemas.daily import DailyRow, DailySummaryResponse, DailyBreakdownResponse
from app.utils.pagination import PaginatedResponse, create_paginated_response
from app.services.analytics_service import AnalyticsService

router = APIRouter()

@router.get("/", response_model=PaginatedResponse[DailyRow])
async def get_daily_records(
    start_date: Optional[date] = Query(None, description="Start date filter YYYY-MM-DD"),
    end_date: Optional[date] = Query(None, description="End date filter YYYY-MM-DD"),
    month: Optional[int] = Query(None, description="Enrollment month YYYYMM"),
    dm_id: Optional[uuid.UUID] = Query(None, description="Filter by DM User UUID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    station_id: Optional[str] = Query(None, description="Filter by Station ID"),
    operator_code: Optional[str] = Query(None, description="Filter by Operator Code"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=200, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(require_mfa)
):
    """Fetch paginated Daily records with filters."""
    items, total = await AnalyticsService.get_daily_records(
        db=db,
        start_date=start_date,
        end_date=end_date,
        month=month,
        dm_id=dm_id,
        district_id=district_id,
        station_id=station_id,
        operator_code=operator_code,
        page=page,
        page_size=page_size
    )
    return create_paginated_response(items=items, total=total, page=page, page_size=page_size)

@router.get("/summary", response_model=DailySummaryResponse)
async def get_daily_summary_overview(
    start_date: Optional[date] = Query(None, description="Start date filter YYYY-MM-DD"),
    end_date: Optional[date] = Query(None, description="End date filter YYYY-MM-DD"),
    month: Optional[int] = Query(None, description="Enrollment month YYYYMM"),
    dm_id: Optional[uuid.UUID] = Query(None, description="Filter by DM User UUID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(require_mfa)
):
    """Fetch Daily Analytics Overview: Daily trend line, Top performing stations, Category mix."""
    return await AnalyticsService.get_daily_summary_overview(
        db=db,
        start_date=start_date,
        end_date=end_date,
        month=month,
        dm_id=dm_id,
        district_id=district_id
    )

@router.get("/breakdown", response_model=DailyBreakdownResponse)
async def get_daily_breakdown(
    month: int = Query(..., description="Enrollment month YYYYMM (e.g. 202601)"),
    station_id: str = Query(..., description="Station ID"),
    operator_code: str = Query(..., description="Operator Code"),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(require_mfa)
):
    """
    View Daily Breakdown drill-through:
    Returns all daily record rows for a specific station + operator combination in a month.
    """
    return await AnalyticsService.get_daily_breakdown(
        db=db,
        month=month,
        station_id=station_id,
        operator_code=operator_code
    )
