import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.db import get_db
from app.dependencies.auth import require_mfa
from app.models import AdminUser
from app.schemas.anomaly import AnomalyListResponse, AnomalySummaryResponse
from app.services.anomaly_service import AnomalyService

router = APIRouter()

@router.get("/", response_model=AnomalyListResponse)
async def get_anomalies(
    month: Optional[int] = Query(None, description="Target enrollment month YYYYMM (e.g. 202601)"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    dm_id: Optional[uuid.UUID] = Query(None, description="Filter by District Manager UUID"),
    anomaly_type: Optional[str] = Query(None, description="Filter by Anomaly Type: DM_DECLINE | SILENT_STATION | LOW_PERFORMER | ZERO_ACTIVITY"),
    severity: Optional[str] = Query(None, description="Filter by Severity: HIGH | MEDIUM | LOW"),
    threshold_decline_pct: float = Query(20.0, ge=1.0, le=100.0, description="DM decline percentage threshold"),
    silent_days_threshold: int = Query(7, ge=1, le=60, description="Silent station days threshold"),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(require_mfa)
):
    """
    Fetch comprehensive anomaly detection report.
    Detects DM performance declines (>=20% MoM drop), silent stations (>=7 days inactive),
    low performing stations (bottom 10th percentile), and zero activity operational days.
    """
    return await AnomalyService.get_anomalies(
        db=db,
        month=month,
        district_id=district_id,
        dm_id=dm_id,
        anomaly_type=anomaly_type,
        severity=severity,
        threshold_decline_pct=threshold_decline_pct,
        silent_days_threshold=silent_days_threshold
    )

@router.get("/summary", response_model=AnomalySummaryResponse)
async def get_anomalies_summary(
    month: Optional[int] = Query(None, description="Target enrollment month YYYYMM"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    dm_id: Optional[uuid.UUID] = Query(None, description="Filter by District Manager UUID"),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(require_mfa)
):
    """
    Fetch aggregate summary of anomalies grouped by anomaly type and severity.
    """
    return await AnomalyService.get_anomalies_summary(
        db=db,
        month=month,
        district_id=district_id,
        dm_id=dm_id
    )
