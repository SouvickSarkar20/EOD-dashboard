import uuid
import numpy as np
from datetime import date, datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct, desc, and_

from app.models import (
    MonthlySummary,
    DailyRecord,
    StationAssignment,
    Station,
    District,
    AdminUser,
)
from app.schemas.anomaly import AnomalyItem, AnomalyListResponse, AnomalySummaryResponse

class AnomalyService:

    @staticmethod
    def _get_prev_month(month: int) -> int:
        year, m = month // 100, month % 100
        if m == 1:
            return (year - 1) * 100 + 12
        return month - 1

    @classmethod
    async def detect_dm_declines(
        cls,
        db: AsyncSession,
        month: int,
        district_id: Optional[int] = None,
        dm_id: Optional[uuid.UUID] = None,
        threshold_decline_pct: float = 20.0
    ) -> List[AnomalyItem]:
        """Detect DMs whose total monthly enrollments dropped by >= threshold_decline_pct MoM."""
        prev_month = cls._get_prev_month(month)

        stmt = (
            select(
                StationAssignment.dm_user_id,
                MonthlySummary.enroll_month,
                func.sum(MonthlySummary.total_enrollment).label("total_enrollment"),
                AdminUser.name.label("dm_name"),
                District.district_id,
                District.district_name
            )
            .join(
                StationAssignment,
                (StationAssignment.station_id == MonthlySummary.station_id) & 
                (StationAssignment.effective_month == MonthlySummary.enroll_month)
            )
            .join(AdminUser, StationAssignment.dm_user_id == AdminUser.id)
            .join(District, StationAssignment.district_id == District.district_id)
            .where(MonthlySummary.enroll_month.in_([month, prev_month]))
            .group_by(
                StationAssignment.dm_user_id,
                MonthlySummary.enroll_month,
                AdminUser.name,
                District.district_id,
                District.district_name
            )
        )

        if dm_id:
            stmt = stmt.where(StationAssignment.dm_user_id == dm_id)
        if district_id:
            stmt = stmt.where(District.district_id == district_id)

        res = await db.execute(stmt)
        rows = res.all()

        dm_map: Dict[uuid.UUID, Dict[str, Any]] = {}
        for r in rows:
            uid = r.dm_user_id
            if uid not in dm_map:
                dm_map[uid] = {
                    "dm_name": r.dm_name,
                    "district_id": r.district_id,
                    "district_name": r.district_name,
                    "curr_tot": 0,
                    "prev_tot": 0
                }
            if r.enroll_month == month:
                dm_map[uid]["curr_tot"] += int(r.total_enrollment or 0)
            elif r.enroll_month == prev_month:
                dm_map[uid]["prev_tot"] += int(r.total_enrollment or 0)

        anomalies: List[AnomalyItem] = []
        for uid, data in dm_map.items():
            prev_tot = data["prev_tot"]
            curr_tot = data["curr_tot"]
            if prev_tot > 0:
                drop_pct = ((prev_tot - curr_tot) / prev_tot) * 100.0
                if drop_pct >= threshold_decline_pct:
                    severity = "HIGH" if drop_pct >= 40.0 else "MEDIUM"
                    anomalies.append(
                        AnomalyItem(
                            id=f"dm_decline_{uid}_{month}",
                            type="DM_DECLINE",
                            severity=severity,
                            title=f"DM Performance Drop: {data['dm_name']} (-{drop_pct:.1f}%)",
                            description=(
                                f"District Manager {data['dm_name']} experienced a {drop_pct:.1f}% decline in enrollments "
                                f"MoM ({prev_tot:,} in {prev_month} vs {curr_tot:,} in {month})."
                            ),
                            district_id=data["district_id"],
                            district_name=data["district_name"],
                            dm_user_id=uid,
                            dm_name=data["dm_name"],
                            metrics={
                                "month": month,
                                "prev_month": prev_month,
                                "prev_enrollments": prev_tot,
                                "curr_enrollments": curr_tot,
                                "decline_percentage": round(drop_pct, 1),
                                "threshold_percentage": threshold_decline_pct,
                            },
                            detected_at=datetime.now(timezone.utc).isoformat()
                        )
                    )
        return anomalies

    @classmethod
    async def detect_silent_stations(
        cls,
        db: AsyncSession,
        month: int,
        district_id: Optional[int] = None,
        dm_id: Optional[uuid.UUID] = None,
        silent_days_threshold: int = 7
    ) -> List[AnomalyItem]:
        """Detect stations assigned in the given month that had no activity for >= silent_days_threshold days."""
        max_date_stmt = select(func.max(DailyRecord.enroll_date))
        max_date_res = await db.execute(max_date_stmt)
        ref_date = max_date_res.scalar() or date.today()

        sa_stmt = (
            select(
                StationAssignment.station_id,
                Station.station_name,
                District.district_id,
                District.district_name,
                AdminUser.id.label("dm_user_id"),
                AdminUser.name.label("dm_name"),
                func.max(DailyRecord.enroll_date).label("last_active_date")
            )
            .join(Station, StationAssignment.station_id == Station.station_id)
            .join(District, StationAssignment.district_id == District.district_id)
            .join(AdminUser, StationAssignment.dm_user_id == AdminUser.id)
            .join(DailyRecord, (DailyRecord.station_id == StationAssignment.station_id) & (DailyRecord.enroll_date <= ref_date), isouter=True)
            .where(StationAssignment.effective_month == month)
            .group_by(
                StationAssignment.station_id,
                Station.station_name,
                District.district_id,
                District.district_name,
                AdminUser.id,
                AdminUser.name
            )
        )

        if district_id:
            sa_stmt = sa_stmt.where(StationAssignment.district_id == district_id)
        if dm_id:
            sa_stmt = sa_stmt.where(StationAssignment.dm_user_id == dm_id)

        rows = (await db.execute(sa_stmt)).all()

        anomalies: List[AnomalyItem] = []
        for r in rows:
            last_date = r.last_active_date
            if last_date:
                silent_days = (ref_date - last_date).days
            else:
                silent_days = 30

            if silent_days >= silent_days_threshold:
                severity = "HIGH" if silent_days >= 14 else "MEDIUM"
                last_active_str = str(last_date) if last_date else "No recorded history"
                anomalies.append(
                    AnomalyItem(
                        id=f"silent_st_{r.station_id}_{month}",
                        type="SILENT_STATION",
                        severity=severity,
                        title=f"Silent Station: {r.station_id} ({silent_days} days inactive)",
                        description=(
                            f"Station '{r.station_name or r.station_id}' ({r.station_id}) in {r.district_name} has had zero recorded "
                            f"activity for {silent_days} days (Last active: {last_active_str})."
                        ),
                        district_id=r.district_id,
                        district_name=r.district_name,
                        dm_user_id=r.dm_user_id,
                        dm_name=r.dm_name,
                        station_id=None,
                        station_code=r.station_id,
                        station_name=r.station_name or r.station_id,
                        metrics={
                            "reference_date": str(ref_date),
                            "last_active_date": last_active_str,
                            "silent_days": silent_days,
                            "threshold_days": silent_days_threshold
                        },
                        detected_at=datetime.now(timezone.utc).isoformat()
                    )
                )
        return anomalies

    @classmethod
    async def detect_low_performers(
        cls,
        db: AsyncSession,
        month: int,
        district_id: Optional[int] = None,
        dm_id: Optional[uuid.UUID] = None
    ) -> List[AnomalyItem]:
        """Detect stations in the bottom 10th percentile of monthly enrollments."""
        stmt = (
            select(
                MonthlySummary.station_id,
                Station.station_name,
                District.district_id,
                District.district_name,
                AdminUser.id.label("dm_user_id"),
                AdminUser.name.label("dm_name"),
                func.sum(MonthlySummary.total_enrollment).label("total_enrollment")
            )
            .join(Station, MonthlySummary.station_id == Station.station_id)
            .join(
                StationAssignment,
                (StationAssignment.station_id == MonthlySummary.station_id) & 
                (StationAssignment.effective_month == month),
                isouter=True
            )
            .join(District, StationAssignment.district_id == District.district_id, isouter=True)
            .join(AdminUser, StationAssignment.dm_user_id == AdminUser.id, isouter=True)
            .where(MonthlySummary.enroll_month == month)
            .group_by(
                MonthlySummary.station_id,
                Station.station_name,
                District.district_id,
                District.district_name,
                AdminUser.id,
                AdminUser.name
            )
        )

        if district_id:
            stmt = stmt.where(District.district_id == district_id)
        if dm_id:
            stmt = stmt.where(StationAssignment.dm_user_id == dm_id)

        rows = (await db.execute(stmt)).all()
        if not rows:
            return []

        totals = [r.total_enrollment for r in rows if r.total_enrollment is not None]
        if not totals:
            return []

        p10_threshold = float(np.percentile(totals, 10))
        avg_enrollment = float(np.mean(totals))

        anomalies: List[AnomalyItem] = []
        for r in rows:
            tot = r.total_enrollment or 0
            if tot <= p10_threshold:
                severity = "LOW" if tot > 0 else "MEDIUM"
                anomalies.append(
                    AnomalyItem(
                        id=f"low_perf_{r.station_id}_{month}",
                        type="LOW_PERFORMER",
                        severity=severity,
                        title=f"Low Performer: Station {r.station_id} ({tot:,} enrollments)",
                        description=(
                            f"Station '{r.station_name or r.station_id}' ({r.station_id}) ranks in the bottom 10th percentile with "
                            f"only {tot:,} enrollments in {month} (10th percentile threshold: {p10_threshold:.1f}, average: {avg_enrollment:.1f})."
                        ),
                        district_id=r.district_id,
                        district_name=r.district_name,
                        dm_user_id=r.dm_user_id,
                        dm_name=r.dm_name,
                        station_id=None,
                        station_code=r.station_id,
                        station_name=r.station_name or r.station_id,
                        metrics={
                            "month": month,
                            "enrollments": tot,
                            "p10_threshold": round(p10_threshold, 1),
                            "average_enrollment": round(avg_enrollment, 1)
                        },
                        detected_at=datetime.now(timezone.utc).isoformat()
                    )
                )
        return anomalies

    @classmethod
    async def detect_zero_activity_days(
        cls,
        db: AsyncSession,
        month: int,
        district_id: Optional[int] = None,
        dm_id: Optional[uuid.UUID] = None,
        limit: int = 50
    ) -> List[AnomalyItem]:
        """Detect daily records where total enrollment is 0."""
        year = month // 100
        m = month % 100
        start_date = date(year, m, 1)
        if m == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, m + 1, 1) - timedelta(days=1)

        stmt = (
            select(
                DailyRecord.record_id,
                DailyRecord.enroll_date,
                DailyRecord.total_enrollment,
                DailyRecord.operator_code,
                Station.station_id,
                Station.station_name,
                District.district_id,
                District.district_name,
                AdminUser.id.label("dm_user_id"),
                AdminUser.name.label("dm_name")
            )
            .join(Station, DailyRecord.station_id == Station.station_id)
            .join(
                StationAssignment,
                (StationAssignment.station_id == Station.station_id) & 
                (StationAssignment.effective_month == month),
                isouter=True
            )
            .join(District, StationAssignment.district_id == District.district_id, isouter=True)
            .join(AdminUser, StationAssignment.dm_user_id == AdminUser.id, isouter=True)
            .where(
                and_(
                    DailyRecord.enroll_date >= start_date,
                    DailyRecord.enroll_date <= end_date,
                    DailyRecord.total_enrollment == 0
                )
            )
            .order_by(desc(DailyRecord.enroll_date))
            .limit(limit)
        )

        if district_id:
            stmt = stmt.where(District.district_id == district_id)
        if dm_id:
            stmt = stmt.where(StationAssignment.dm_user_id == dm_id)

        rows = (await db.execute(stmt)).all()

        anomalies: List[AnomalyItem] = []
        for r in rows:
            anomalies.append(
                AnomalyItem(
                    id=f"zero_act_{r.record_id}",
                    type="ZERO_ACTIVITY",
                    severity="MEDIUM",
                    title=f"Zero Activity: Station {r.station_id} on {r.enroll_date}",
                    description=(
                        f"Station '{r.station_name or r.station_id}' logged operator {r.operator_code} with "
                        f"0 enrollments on {r.enroll_date}."
                    ),
                    district_id=r.district_id,
                    district_name=r.district_name,
                    dm_user_id=r.dm_user_id,
                    dm_name=r.dm_name,
                    station_id=None,
                    station_code=r.station_id,
                    station_name=r.station_name or r.station_id,
                    metrics={
                        "enroll_date": str(r.enroll_date),
                        "operator_code": r.operator_code,
                        "total_enrollment": r.total_enrollment
                    },
                    detected_at=datetime.now(timezone.utc).isoformat()
                )
            )
        return anomalies

    @classmethod
    async def get_anomalies(
        cls,
        db: AsyncSession,
        month: Optional[int] = None,
        district_id: Optional[int] = None,
        dm_id: Optional[uuid.UUID] = None,
        anomaly_type: Optional[str] = None,
        severity: Optional[str] = None,
        threshold_decline_pct: float = 20.0,
        silent_days_threshold: int = 7,
        summary_only: bool = False,
        page: int = 1,
        page_size: int = 50
    ) -> AnomalyListResponse:
        """Fetch all detected anomalies with filtering, severity sorting, pagination, and counts."""
        if not month:
            months_stmt = select(distinct(MonthlySummary.enroll_month)).order_by(desc(MonthlySummary.enroll_month))
            months = (await db.execute(months_stmt)).scalars().all()
            month = months[0] if months else 202601

        items: List[AnomalyItem] = []

        if not anomaly_type or anomaly_type == "DM_DECLINE":
            items.extend(await cls.detect_dm_declines(db, month, district_id, dm_id, threshold_decline_pct))
        
        if not anomaly_type or anomaly_type == "SILENT_STATION":
            items.extend(await cls.detect_silent_stations(db, month, district_id, dm_id, silent_days_threshold))

        if not anomaly_type or anomaly_type == "LOW_PERFORMER":
            items.extend(await cls.detect_low_performers(db, month, district_id, dm_id))

        if not anomaly_type or anomaly_type == "ZERO_ACTIVITY":
            items.extend(await cls.detect_zero_activity_days(db, month, district_id, dm_id))

        if severity:
            items = [item for item in items if item.severity.upper() == severity.upper()]

        severity_rank = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        items.sort(key=lambda x: severity_rank.get(x.severity, 3))

        dm_decline_count = sum(1 for i in items if i.type == "DM_DECLINE")
        silent_station_count = sum(1 for i in items if i.type == "SILENT_STATION")
        low_performer_count = sum(1 for i in items if i.type == "LOW_PERFORMER")
        zero_activity_count = sum(1 for i in items if i.type == "ZERO_ACTIVITY")

        high_count = sum(1 for i in items if i.severity == "HIGH")
        medium_count = sum(1 for i in items if i.severity == "MEDIUM")
        low_count = sum(1 for i in items if i.severity == "LOW")

        start_idx = (page - 1) * page_size
        paginated_items = [] if summary_only else items[start_idx : start_idx + page_size]

        return AnomalyListResponse(
            total_anomalies=len(items),
            dm_decline_count=dm_decline_count,
            silent_station_count=silent_station_count,
            low_performer_count=low_performer_count,
            zero_activity_count=zero_activity_count,
            high_severity_count=high_count,
            medium_severity_count=medium_count,
            low_severity_count=low_count,
            items=paginated_items
        )

    @classmethod
    async def get_anomalies_summary(
        cls,
        db: AsyncSession,
        month: Optional[int] = None,
        district_id: Optional[int] = None,
        dm_id: Optional[uuid.UUID] = None
    ) -> AnomalySummaryResponse:
        """Fetch lightweight aggregate counts of anomalies by type and severity."""
        full_res = await cls.get_anomalies(db, month=month, district_id=district_id, dm_id=dm_id, summary_only=True)

        by_type = {
            "DM_DECLINE": full_res.dm_decline_count,
            "SILENT_STATION": full_res.silent_station_count,
            "LOW_PERFORMER": full_res.low_performer_count,
            "ZERO_ACTIVITY": full_res.zero_activity_count
        }

        by_severity = {
            "HIGH": full_res.high_severity_count,
            "MEDIUM": full_res.medium_severity_count,
            "LOW": full_res.low_severity_count
        }

        return AnomalySummaryResponse(
            total_anomalies=full_res.total_anomalies,
            by_type=by_type,
            by_severity=by_severity
        )
