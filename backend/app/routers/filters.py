import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.db import get_db
from app.dependencies.auth import require_mfa
from app.models import AdminUser
from app.schemas.filters import FilterOptionsResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter()

@router.get("/options", response_model=FilterOptionsResponse)
async def get_filter_options(
    month: Optional[int] = Query(None, description="Selected enrollment month YYYYMM"),
    district_id: Optional[int] = Query(None, description="Selected District ID"),
    dm_id: Optional[uuid.UUID] = Query(None, description="Selected DM User UUID"),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(require_mfa)
):
    """
    Fetch period-aware cascading filter choices:
    Returns available months, districts, DMs, stations, and operators based on selected period and filters.
    """
    return await AnalyticsService.get_cascading_filter_options(
        db=db,
        month=month,
        district_id=district_id,
        dm_id=dm_id
    )
