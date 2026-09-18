import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.db import get_db
from app.dependencies.auth import require_mfa
from app.models import AdminUser
from app.services.export_service import ExportService

router = APIRouter()

@router.get("/monthly")
async def export_monthly(
    month: Optional[int] = Query(None, description="Enrollment month YYYYMM"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    dm_id: Optional[uuid.UUID] = Query(None, description="Filter by DM User UUID"),
    station_id: Optional[str] = Query(None, description="Filter by Station ID"),
    operator_code: Optional[str] = Query(None, description="Filter by Operator Code"),
    format: str = Query("xlsx", pattern="^(xlsx|csv)$", description="File format: xlsx | csv"),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(require_mfa)
) -> Response:
    """Export Monthly Summary Report in Excel (.xlsx) or CSV format."""
    return await ExportService.export_monthly(
        db=db,
        month=month,
        district_id=district_id,
        dm_id=dm_id,
        station_id=station_id,
        operator_code=operator_code,
        export_format=format
    )

@router.get("/daily")
async def export_daily(
    month: Optional[int] = Query(None, description="Enrollment month YYYYMM"),
    start_date: Optional[date] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[date] = Query(None, description="End date YYYY-MM-DD"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    dm_id: Optional[uuid.UUID] = Query(None, description="Filter by DM User UUID"),
    station_id: Optional[str] = Query(None, description="Filter by Station ID"),
    operator_code: Optional[str] = Query(None, description="Filter by Operator Code"),
    format: str = Query("xlsx", pattern="^(xlsx|csv)$", description="File format: xlsx | csv"),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(require_mfa)
) -> Response:
    """Export Daily Operational Log Report in Excel (.xlsx) or CSV format."""
    return await ExportService.export_daily(
        db=db,
        month=month,
        start_date=start_date,
        end_date=end_date,
        district_id=district_id,
        dm_id=dm_id,
        station_id=station_id,
        operator_code=operator_code,
        export_format=format
    )

@router.get("/anomalies")
async def export_anomalies(
    month: Optional[int] = Query(None, description="Enrollment month YYYYMM"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    dm_id: Optional[uuid.UUID] = Query(None, description="Filter by DM User UUID"),
    anomaly_type: Optional[str] = Query(None, description="Filter by Anomaly Type: DM_DECLINE | SILENT_STATION | LOW_PERFORMER | ZERO_ACTIVITY"),
    severity: Optional[str] = Query(None, description="Filter by Severity: HIGH | MEDIUM | LOW"),
    format: str = Query("xlsx", pattern="^(xlsx|csv)$", description="File format: xlsx | csv"),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(require_mfa)
) -> Response:
    """Export Operational Anomaly Report in Excel (.xlsx) or CSV format."""
    return await ExportService.export_anomalies(
        db=db,
        month=month,
        district_id=district_id,
        dm_id=dm_id,
        anomaly_type=anomaly_type,
        severity=severity,
        export_format=format
    )
