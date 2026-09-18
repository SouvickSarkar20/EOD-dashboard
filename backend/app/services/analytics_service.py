import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, distinct, case, desc, asc

from app.models import (
    MonthlySummary, DailyRecord, StationAssignment,
    District, Station, Operator, AdminUser, UserRole
)
from app.schemas.monthly import (
    MonthlyRow, KPICardData, DistrictComparisonData, DMComparisonData,
    CategoryMixData, TrendPointData, MonthlySummaryResponse
)
from app.schemas.daily import (
    DailyRow, DailyTrendPoint, TopStationData, DailySummaryResponse, DailyBreakdownResponse
)
from app.schemas.filters import (
    FilterOptionsResponse, DistrictOption, DMOption, StationOption, OperatorOption
)

class AnalyticsService:

    @staticmethod
    async def get_monthly_records(
        db: AsyncSession,
        month: Optional[int] = None,
        dm_id: Optional[uuid.UUID] = None,
        district_id: Optional[int] = None,
        station_id: Optional[str] = None,
        operator_code: Optional[str] = None,
        min_enrollment: Optional[int] = None,
        max_enrollment: Optional[int] = None,
        page: int = 1,
        page_size: int = 25
    ) -> Tuple[List[MonthlyRow], int]:
        """Fetch paginated Monthly summary records with filters and time-variant DM/district joins."""
        
        # Base query joining MonthlySummary with StationAssignment on station_id + effective_month
        stmt = (
            select(
                MonthlySummary,
                Station.station_name,
                Operator.operator_name,
                District.district_id,
                District.district_name,
                AdminUser.id.label("dm_uuid"),
                AdminUser.name.label("dm_name")
            )
            .select_from(MonthlySummary)
            .join(Station, MonthlySummary.station_id == Station.station_id, isouter=True)
            .join(Operator, MonthlySummary.operator_code == Operator.operator_code, isouter=True)
            .join(
                StationAssignment,
                and_(
                    MonthlySummary.station_id == StationAssignment.station_id,
                    MonthlySummary.enroll_month == StationAssignment.effective_month
                ),
                isouter=True
            )
            .join(District, StationAssignment.district_id == District.district_id, isouter=True)
            .join(AdminUser, StationAssignment.dm_user_id == AdminUser.id, isouter=True)
        )

        # Apply filters
        if month:
            stmt = stmt.where(MonthlySummary.enroll_month == month)
        if dm_id:
            stmt = stmt.where(StationAssignment.dm_user_id == dm_id)
        if district_id:
            stmt = stmt.where(StationAssignment.district_id == district_id)
        if station_id:
            stmt = stmt.where(MonthlySummary.station_id == station_id)
        if operator_code:
            stmt = stmt.where(MonthlySummary.operator_code == operator_code)
        if min_enrollment is not None:
            stmt = stmt.where(MonthlySummary.total_enrollment >= min_enrollment)
        if max_enrollment is not None:
            stmt = stmt.where(MonthlySummary.total_enrollment <= max_enrollment)

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        # Pagination & ordering
        offset = (page - 1) * page_size
        stmt = stmt.order_by(MonthlySummary.enroll_month.desc(), MonthlySummary.total_enrollment.desc()).offset(offset).limit(page_size)

        res = await db.execute(stmt)
        rows = res.all()

        items = []
        for r in rows:
            ms: MonthlySummary = r[0]
            items.append(
                MonthlyRow(
                    summary_id=ms.summary_id,
                    enroll_month=ms.enroll_month,
                    station_id=ms.station_id,
                    station_name=r[1] or f"Station {ms.station_id}",
                    operator_code=ms.operator_code,
                    operator_name=r[2] or ms.operator_code,
                    district_id=r[3],
                    district_name=r[4] or "Unassigned",
                    dm_id=str(r[5]) if r[5] else None,
                    dm_name=r[6] or "Unassigned",
                    total_enrollment=ms.total_enrollment,
                    total_amount=ms.total_amount,
                    bmu_100=ms.bmu_100,
                    dmu_50=ms.dmu_50,
                    mbu_0=ms.mbu_0,
                    mbu_100=ms.mbu_100,
                    new_0=ms.new_0,
                    bmu_125=ms.bmu_125,
                    dmu_75=ms.dmu_75,
                    mbu_125=ms.mbu_125
                )
            )

        return items, total

    @staticmethod
    async def get_monthly_summary_overview(
        db: AsyncSession,
        month: Optional[int] = None,
        dm_id: Optional[uuid.UUID] = None,
        district_id: Optional[int] = None
    ) -> MonthlySummaryResponse:
        """Compute aggregated monthly analytics: KPIs, District comparison, DM ranking, Category Mix, and Trend."""
        
        # Build base filter condition for MonthlySummary
        filters = []
        if month:
            filters.append(MonthlySummary.enroll_month == month)

        sa_filters = []
        if dm_id:
            sa_filters.append(StationAssignment.dm_user_id == dm_id)
        if district_id:
            sa_filters.append(StationAssignment.district_id == district_id)

        # 1. Compute KPIs
        kpi_stmt = (
            select(
                func.coalesce(func.sum(MonthlySummary.total_enrollment), 0).label("tot_enroll"),
                func.coalesce(func.sum(MonthlySummary.total_amount), 0).label("tot_rev"),
                func.count(distinct(MonthlySummary.station_id)).label("active_stations"),
                func.count(distinct(MonthlySummary.operator_code)).label("active_ops"),
                func.coalesce(func.sum(MonthlySummary.bmu_100 + MonthlySummary.bmu_125), 0).label("bmu_tot")
            )
            .select_from(MonthlySummary)
        )
        if sa_filters:
            kpi_stmt = kpi_stmt.join(
                StationAssignment,
                and_(
                    MonthlySummary.station_id == StationAssignment.station_id,
                    MonthlySummary.enroll_month == StationAssignment.effective_month
                )
            )
            kpi_stmt = kpi_stmt.where(*sa_filters)
        if month:
            kpi_stmt = kpi_stmt.where(MonthlySummary.enroll_month == month)

        kpi_res = (await db.execute(kpi_stmt)).first()
        tot_enroll = kpi_res[0] if kpi_res else 0
        tot_rev = kpi_res[1] if kpi_res else Decimal("0.00")
        active_stations = kpi_res[2] if kpi_res else 0
        active_ops = kpi_res[3] if kpi_res else 0
        bmu_tot = kpi_res[4] if kpi_res else 0
        bmu_share_pct = round((bmu_tot / tot_enroll * 100), 2) if tot_enroll > 0 else 0.0

        # Prior month change % calculation
        enroll_change_pct = 0.0
        if month:
            # Derive prior month integer (e.g., 202602 -> 202601)
            y, m = divmod(month, 100)
            if m == 1:
                prior_m = (y - 1) * 100 + 12
            else:
                prior_m = y * 100 + (m - 1)

            prior_stmt = select(func.coalesce(func.sum(MonthlySummary.total_enrollment), 0)).where(MonthlySummary.enroll_month == prior_m)
            if sa_filters:
                prior_stmt = prior_stmt.join(
                    StationAssignment,
                    and_(
                        MonthlySummary.station_id == StationAssignment.station_id,
                        MonthlySummary.enroll_month == StationAssignment.effective_month
                    )
                ).where(*sa_filters)
            
            prior_enroll = (await db.execute(prior_stmt)).scalar() or 0
            if prior_enroll > 0:
                enroll_change_pct = round(((tot_enroll - prior_enroll) / prior_enroll * 100), 2)

        kpis = KPICardData(
            total_enrollment=tot_enroll,
            total_revenue=tot_rev,
            active_stations_count=active_stations,
            active_operators_count=active_ops,
            bmu_share_pct=bmu_share_pct,
            enrollment_change_pct=enroll_change_pct
        )

        # 2. District Comparison
        dist_stmt = (
            select(
                District.district_id,
                District.district_name,
                func.coalesce(func.sum(MonthlySummary.total_enrollment), 0).label("enrolls"),
                func.coalesce(func.sum(MonthlySummary.total_amount), 0).label("rev")
            )
            .select_from(MonthlySummary)
            .join(
                StationAssignment,
                and_(
                    MonthlySummary.station_id == StationAssignment.station_id,
                    MonthlySummary.enroll_month == StationAssignment.effective_month
                )
            )
            .join(District, StationAssignment.district_id == District.district_id)
        )
        if month:
            dist_stmt = dist_stmt.where(MonthlySummary.enroll_month == month)
        if dm_id:
            dist_stmt = dist_stmt.where(StationAssignment.dm_user_id == dm_id)
        if district_id:
            dist_stmt = dist_stmt.where(StationAssignment.district_id == district_id)

        dist_stmt = dist_stmt.group_by(District.district_id, District.district_name).order_by(desc("enrolls"))
        dist_rows = (await db.execute(dist_stmt)).all()

        district_comp = [
            DistrictComparisonData(
                district_id=r[0],
                district_name=r[1],
                total_enrollment=r[2],
                total_revenue=r[3]
            ) for r in dist_rows
        ]

        # 3. DM Comparison
        dm_stmt = (
            select(
                AdminUser.id,
                AdminUser.dmid,
                AdminUser.name,
                func.count(distinct(StationAssignment.station_id)).label("assigned_st"),
                func.coalesce(func.sum(MonthlySummary.total_enrollment), 0).label("enrolls"),
                func.coalesce(func.sum(MonthlySummary.total_amount), 0).label("rev")
            )
            .select_from(MonthlySummary)
            .join(
                StationAssignment,
                and_(
                    MonthlySummary.station_id == StationAssignment.station_id,
                    MonthlySummary.enroll_month == StationAssignment.effective_month
                )
            )
            .join(AdminUser, StationAssignment.dm_user_id == AdminUser.id)
            .where(AdminUser.role == UserRole.DISTRICT_MANAGER)
        )
        if month:
            dm_stmt = dm_stmt.where(MonthlySummary.enroll_month == month)
        if dm_id:
            dm_stmt = dm_stmt.where(StationAssignment.dm_user_id == dm_id)
        if district_id:
            dm_stmt = dm_stmt.where(StationAssignment.district_id == district_id)

        dm_stmt = dm_stmt.group_by(AdminUser.id, AdminUser.dmid, AdminUser.name).order_by(desc("enrolls"))
        dm_rows = (await db.execute(dm_stmt)).all()

        dm_comp = [
            DMComparisonData(
                dm_id=str(r[0]),
                dmid=r[1],
                dm_name=r[2],
                assigned_stations_count=r[3],
                total_enrollment=r[4],
                total_revenue=r[5]
            ) for r in dm_rows
        ]

        # 4. Category Mix
        mix_stmt = select(
            func.coalesce(func.sum(MonthlySummary.bmu_100 + MonthlySummary.bmu_125), 0).label("bmu"),
            func.coalesce(func.sum(MonthlySummary.dmu_50 + MonthlySummary.dmu_75), 0).label("dmu"),
            func.coalesce(func.sum(MonthlySummary.mbu_0 + MonthlySummary.mbu_100 + MonthlySummary.mbu_125), 0).label("mbu"),
            func.coalesce(func.sum(MonthlySummary.new_0), 0).label("new_tot")
        ).select_from(MonthlySummary)

        if sa_filters:
            mix_stmt = mix_stmt.join(
                StationAssignment,
                and_(
                    MonthlySummary.station_id == StationAssignment.station_id,
                    MonthlySummary.enroll_month == StationAssignment.effective_month
                )
            ).where(*sa_filters)
        if month:
            mix_stmt = mix_stmt.where(MonthlySummary.enroll_month == month)

        mix_res = (await db.execute(mix_stmt)).first()
        bmu = mix_res[0] if mix_res else 0
        dmu = mix_res[1] if mix_res else 0
        mbu = mix_res[2] if mix_res else 0
        new_tot = mix_res[3] if mix_res else 0
        grand_cat = bmu + dmu + mbu + new_tot

        cat_mix = CategoryMixData(
            bmu_total=bmu,
            dmu_total=dmu,
            mbu_total=mbu,
            new_total=new_tot,
            bmu_pct=round(bmu / grand_cat * 100, 2) if grand_cat > 0 else 0.0,
            dmu_pct=round(dmu / grand_cat * 100, 2) if grand_cat > 0 else 0.0,
            mbu_pct=round(mbu / grand_cat * 100, 2) if grand_cat > 0 else 0.0,
            new_pct=round(new_tot / grand_cat * 100, 2) if grand_cat > 0 else 0.0,
        )

        # 5. Month-over-Month Trend
        trend_stmt = (
            select(
                MonthlySummary.enroll_month,
                func.coalesce(func.sum(MonthlySummary.total_enrollment), 0).label("enrolls"),
                func.coalesce(func.sum(MonthlySummary.total_amount), 0).label("rev")
            )
            .select_from(MonthlySummary)
        )
        if sa_filters:
            trend_stmt = trend_stmt.join(
                StationAssignment,
                and_(
                    MonthlySummary.station_id == StationAssignment.station_id,
                    MonthlySummary.enroll_month == StationAssignment.effective_month
                )
            ).where(*sa_filters)

        trend_stmt = trend_stmt.group_by(MonthlySummary.enroll_month).order_by(asc(MonthlySummary.enroll_month))
        trend_rows = (await db.execute(trend_stmt)).all()

        trend_points = []
        for r in trend_rows:
            m_val = r[0]
            y, m = divmod(m_val, 100)
            month_label = f"{datetime(y, m, 1).strftime('%b %Y')}"
            trend_points.append(
                TrendPointData(
                    enroll_month=m_val,
                    label=month_label,
                    total_enrollment=r[1],
                    total_revenue=r[2]
                )
            )

        return MonthlySummaryResponse(
            kpis=kpis,
            district_comparison=district_comp,
            dm_comparison=dm_comp,
            category_mix=cat_mix,
            monthly_trend=trend_points
        )

    @staticmethod
    async def get_daily_records(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        month: Optional[int] = None,
        dm_id: Optional[uuid.UUID] = None,
        district_id: Optional[int] = None,
        station_id: Optional[str] = None,
        operator_code: Optional[str] = None,
        page: int = 1,
        page_size: int = 25
    ) -> Tuple[List[DailyRow], int]:
        """Fetch paginated Daily records with filters."""
        stmt = (
            select(
                DailyRecord,
                Station.station_name,
                Operator.operator_name,
                District.district_id,
                District.district_name,
                AdminUser.id.label("dm_uuid"),
                AdminUser.name.label("dm_name")
            )
            .select_from(DailyRecord)
            .join(Station, DailyRecord.station_id == Station.station_id, isouter=True)
            .join(Operator, DailyRecord.operator_code == Operator.operator_code, isouter=True)
            .join(
                StationAssignment,
                and_(
                    DailyRecord.station_id == StationAssignment.station_id,
                    (func.extract('year', DailyRecord.enroll_date) * 100 + func.extract('month', DailyRecord.enroll_date)) == StationAssignment.effective_month
                ),
                isouter=True
            )
            .join(District, StationAssignment.district_id == District.district_id, isouter=True)
            .join(AdminUser, StationAssignment.dm_user_id == AdminUser.id, isouter=True)
        )

        if start_date:
            stmt = stmt.where(DailyRecord.enroll_date >= start_date)
        if end_date:
            stmt = stmt.where(DailyRecord.enroll_date <= end_date)
        if month:
            y, m = divmod(month, 100)
            stmt = stmt.where(
                func.extract('year', DailyRecord.enroll_date) == y,
                func.extract('month', DailyRecord.enroll_date) == m
            )
        if dm_id:
            stmt = stmt.where(StationAssignment.dm_user_id == dm_id)
        if district_id:
            stmt = stmt.where(StationAssignment.district_id == district_id)
        if station_id:
            stmt = stmt.where(DailyRecord.station_id == station_id)
        if operator_code:
            stmt = stmt.where(DailyRecord.operator_code == operator_code)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        offset = (page - 1) * page_size
        stmt = stmt.order_by(DailyRecord.enroll_date.desc(), DailyRecord.total_enrollment.desc()).offset(offset).limit(page_size)

        res = await db.execute(stmt)
        rows = res.all()

        items = []
        for r in rows:
            dr: DailyRecord = r[0]
            items.append(
                DailyRow(
                    record_id=dr.record_id,
                    enroll_date=dr.enroll_date,
                    station_id=dr.station_id,
                    station_name=r[1] or f"Station {dr.station_id}",
                    operator_code=dr.operator_code,
                    operator_name=r[2] or dr.operator_code,
                    district_id=r[3],
                    district_name=r[4] or "Unassigned",
                    dm_id=str(r[5]) if r[5] else None,
                    dm_name=r[6] or "Unassigned",
                    total_enrollment=dr.total_enrollment,
                    total_amount=dr.total_amount,
                    bmu_100=dr.bmu_100,
                    dmu_50=dr.dmu_50,
                    mbu_0=dr.mbu_0,
                    mbu_100=dr.mbu_100,
                    new_0=dr.new_0,
                    bmu_125=dr.bmu_125,
                    dmu_75=dr.dmu_75,
                    mbu_125=dr.mbu_125
                )
            )

        return items, total

    @staticmethod
    async def get_daily_summary_overview(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        month: Optional[int] = None,
        dm_id: Optional[uuid.UUID] = None,
        district_id: Optional[int] = None
    ) -> DailySummaryResponse:
        """Compute aggregated Daily analytics: Trend, Top Stations, Category Mix."""
        
        sa_filters = []
        if dm_id:
            sa_filters.append(StationAssignment.dm_user_id == dm_id)
        if district_id:
            sa_filters.append(StationAssignment.district_id == district_id)

        # Base statement
        base_stmt = select(DailyRecord).select_from(DailyRecord)
        if sa_filters:
            base_stmt = base_stmt.join(
                StationAssignment,
                and_(
                    DailyRecord.station_id == StationAssignment.station_id,
                    (func.extract('year', DailyRecord.enroll_date) * 100 + func.extract('month', DailyRecord.enroll_date)) == StationAssignment.effective_month
                )
            ).where(*sa_filters)

        if start_date:
            base_stmt = base_stmt.where(DailyRecord.enroll_date >= start_date)
        if end_date:
            base_stmt = base_stmt.where(DailyRecord.enroll_date <= end_date)
        if month:
            y, m = divmod(month, 100)
            base_stmt = base_stmt.where(
                func.extract('year', DailyRecord.enroll_date) == y,
                func.extract('month', DailyRecord.enroll_date) == m
            )

        # 1. Total KPI totals & active days
        kpi_stmt = select(
            func.coalesce(func.sum(DailyRecord.total_enrollment), 0),
            func.coalesce(func.sum(DailyRecord.total_amount), 0),
            func.count(distinct(DailyRecord.enroll_date))
        ).select_from(base_stmt.subquery())
        
        kpi_res = (await db.execute(kpi_stmt)).first()
        tot_enroll = kpi_res[0] if kpi_res else 0
        tot_rev = kpi_res[1] if kpi_res else Decimal("0.00")
        active_days = kpi_res[2] if kpi_res else 0

        # 2. Daily Trend
        trend_stmt = (
            select(
                DailyRecord.enroll_date,
                func.coalesce(func.sum(DailyRecord.total_enrollment), 0).label("enrolls"),
                func.coalesce(func.sum(DailyRecord.total_amount), 0).label("rev")
            )
            .select_from(base_stmt.subquery())
            .group_by(DailyRecord.enroll_date)
            .order_by(asc(DailyRecord.enroll_date))
        )
        trend_rows = (await db.execute(trend_stmt)).all()
        trend_points = [
            DailyTrendPoint(
                enroll_date=r[0],
                label=r[0].strftime("%d %b %Y"),
                total_enrollment=r[1],
                total_revenue=r[2]
            ) for r in trend_rows
        ]

        # 3. Top 10 Stations
        top_stmt = (
            select(
                DailyRecord.station_id,
                Station.station_name,
                District.district_name,
                func.count(distinct(DailyRecord.enroll_date)).label("days"),
                func.coalesce(func.sum(DailyRecord.total_enrollment), 0).label("enrolls"),
                func.coalesce(func.sum(DailyRecord.total_amount), 0).label("rev")
            )
            .select_from(DailyRecord)
            .join(Station, DailyRecord.station_id == Station.station_id, isouter=True)
            .join(
                StationAssignment,
                and_(
                    DailyRecord.station_id == StationAssignment.station_id,
                    (func.extract('year', DailyRecord.enroll_date) * 100 + func.extract('month', DailyRecord.enroll_date)) == StationAssignment.effective_month
                ),
                isouter=True
            )
            .join(District, StationAssignment.district_id == District.district_id, isouter=True)
        )
        if sa_filters:
            top_stmt = top_stmt.where(*sa_filters)
        if start_date:
            top_stmt = top_stmt.where(DailyRecord.enroll_date >= start_date)
        if end_date:
            top_stmt = top_stmt.where(DailyRecord.enroll_date <= end_date)
        if month:
            y, m = divmod(month, 100)
            top_stmt = top_stmt.where(
                func.extract('year', DailyRecord.enroll_date) == y,
                func.extract('month', DailyRecord.enroll_date) == m
            )

        top_stmt = top_stmt.group_by(
            DailyRecord.station_id, Station.station_name, District.district_name
        ).order_by(desc("enrolls")).limit(10)

        top_rows = (await db.execute(top_stmt)).all()
        top_stations = [
            TopStationData(
                station_id=r[0],
                station_name=r[1] or f"Station {r[0]}",
                district_name=r[2] or "Unassigned",
                active_days=r[3],
                total_enrollment=r[4],
                total_revenue=r[5]
            ) for r in top_rows
        ]

        # 4. Category Mix
        mix_stmt = select(
            func.coalesce(func.sum(DailyRecord.bmu_100 + DailyRecord.bmu_125), 0),
            func.coalesce(func.sum(DailyRecord.dmu_50 + DailyRecord.dmu_75), 0),
            func.coalesce(func.sum(DailyRecord.mbu_0 + DailyRecord.mbu_100 + DailyRecord.mbu_125), 0),
            func.coalesce(func.sum(DailyRecord.new_0), 0)
        ).select_from(base_stmt.subquery())

        mix_res = (await db.execute(mix_stmt)).first()
        bmu = mix_res[0] if mix_res else 0
        dmu = mix_res[1] if mix_res else 0
        mbu = mix_res[2] if mix_res else 0
        new_tot = mix_res[3] if mix_res else 0
        grand_cat = bmu + dmu + mbu + new_tot

        cat_mix = CategoryMixData(
            bmu_total=bmu,
            dmu_total=dmu,
            mbu_total=mbu,
            new_total=new_tot,
            bmu_pct=round(bmu / grand_cat * 100, 2) if grand_cat > 0 else 0.0,
            dmu_pct=round(dmu / grand_cat * 100, 2) if grand_cat > 0 else 0.0,
            mbu_pct=round(mbu / grand_cat * 100, 2) if grand_cat > 0 else 0.0,
            new_pct=round(new_tot / grand_cat * 100, 2) if grand_cat > 0 else 0.0,
        )

        return DailySummaryResponse(
            total_enrollment=tot_enroll,
            total_revenue=tot_rev,
            active_days_count=active_days,
            daily_trend=trend_points,
            top_stations=top_stations,
            category_mix=cat_mix
        )

    @staticmethod
    async def get_daily_breakdown(
        db: AsyncSession,
        month: int,
        station_id: str,
        operator_code: str
    ) -> DailyBreakdownResponse:
        """Fetch detailed daily breakdown records for a specific station + operator in a month."""
        y, m = divmod(month, 100)

        # Get station & operator names
        st_res = (await db.execute(select(Station.station_name).where(Station.station_id == station_id))).scalar()
        op_res = (await db.execute(select(Operator.operator_name).where(Operator.operator_code == operator_code))).scalar()

        # Query daily records
        stmt = (
            select(
                DailyRecord,
                District.district_id,
                District.district_name,
                AdminUser.id,
                AdminUser.name
            )
            .select_from(DailyRecord)
            .join(
                StationAssignment,
                and_(
                    DailyRecord.station_id == StationAssignment.station_id,
                    (func.extract('year', DailyRecord.enroll_date) * 100 + func.extract('month', DailyRecord.enroll_date)) == StationAssignment.effective_month
                ),
                isouter=True
            )
            .join(District, StationAssignment.district_id == District.district_id, isouter=True)
            .join(AdminUser, StationAssignment.dm_user_id == AdminUser.id, isouter=True)
            .where(
                DailyRecord.station_id == station_id,
                DailyRecord.operator_code == operator_code,
                func.extract('year', DailyRecord.enroll_date) == y,
                func.extract('month', DailyRecord.enroll_date) == m
            )
            .order_by(asc(DailyRecord.enroll_date))
        )

        rows = (await db.execute(stmt)).all()

        records = []
        tot_enroll = 0
        tot_amount = Decimal("0.00")

        for r in rows:
            dr: DailyRecord = r[0]
            tot_enroll += dr.total_enrollment
            tot_amount += dr.total_amount
            records.append(
                DailyRow(
                    record_id=dr.record_id,
                    enroll_date=dr.enroll_date,
                    station_id=dr.station_id,
                    station_name=st_res or f"Station {station_id}",
                    operator_code=dr.operator_code,
                    operator_name=op_res or operator_code,
                    district_id=r[1],
                    district_name=r[2] or "Unassigned",
                    dm_id=str(r[3]) if r[3] else None,
                    dm_name=r[4] or "Unassigned",
                    total_enrollment=dr.total_enrollment,
                    total_amount=dr.total_amount,
                    bmu_100=dr.bmu_100,
                    dmu_50=dr.dmu_50,
                    mbu_0=dr.mbu_0,
                    mbu_100=dr.mbu_100,
                    new_0=dr.new_0,
                    bmu_125=dr.bmu_125,
                    dmu_75=dr.dmu_75,
                    mbu_125=dr.mbu_125
                )
            )

        return DailyBreakdownResponse(
            enroll_month=month,
            station_id=station_id,
            station_name=st_res or f"Station {station_id}",
            operator_code=operator_code,
            operator_name=op_res or operator_code,
            records=records,
            total_enrollment=tot_enroll,
            total_amount=tot_amount
        )

    @staticmethod
    async def get_cascading_filter_options(
        db: AsyncSession,
        month: Optional[int] = None,
        district_id: Optional[int] = None,
        dm_id: Optional[uuid.UUID] = None
    ) -> FilterOptionsResponse:
        """Fetch cascading, period-aware filter choices."""
        
        # Available months
        months_stmt = select(distinct(MonthlySummary.enroll_month)).order_by(desc(MonthlySummary.enroll_month))
        months = (await db.execute(months_stmt)).scalars().all()
        selected_m = month if month else (months[0] if months else None)

        # Base station assignment subquery for period-aware cascading
        sa_stmt = select(StationAssignment).select_from(StationAssignment)
        if selected_m:
            sa_stmt = sa_stmt.where(StationAssignment.effective_month == selected_m)
        if district_id:
            sa_stmt = sa_stmt.where(StationAssignment.district_id == district_id)
        if dm_id:
            sa_stmt = sa_stmt.where(StationAssignment.dm_user_id == dm_id)

        # Available districts
        dist_stmt = select(distinct(District.district_id), District.district_name).select_from(District)
        if selected_m or dm_id:
            dist_stmt = dist_stmt.join(StationAssignment, District.district_id == StationAssignment.district_id)
            if selected_m:
                dist_stmt = dist_stmt.where(StationAssignment.effective_month == selected_m)
            if dm_id:
                dist_stmt = dist_stmt.where(StationAssignment.dm_user_id == dm_id)
        dist_stmt = dist_stmt.order_by(District.district_name.asc())
        dist_rows = (await db.execute(dist_stmt)).all()
        districts = [DistrictOption(district_id=r[0], district_name=r[1]) for r in dist_rows]

        # Available District Managers
        dm_stmt = select(distinct(AdminUser.id), AdminUser.dmid, AdminUser.name).select_from(AdminUser).where(AdminUser.role == UserRole.DISTRICT_MANAGER)
        if selected_m or district_id:
            dm_stmt = dm_stmt.join(StationAssignment, AdminUser.id == StationAssignment.dm_user_id)
            if selected_m:
                dm_stmt = dm_stmt.where(StationAssignment.effective_month == selected_m)
            if district_id:
                dm_stmt = dm_stmt.where(StationAssignment.district_id == district_id)
        dm_stmt = dm_stmt.order_by(AdminUser.name.asc())
        dm_rows = (await db.execute(dm_stmt)).all()
        dms = [DMOption(id=r[0], dmid=r[1], name=r[2]) for r in dm_rows]

        # Available Stations
        st_stmt = select(distinct(Station.station_id), Station.station_name).select_from(Station)
        if selected_m or district_id or dm_id:
            st_stmt = st_stmt.join(StationAssignment, Station.station_id == StationAssignment.station_id)
            if selected_m:
                st_stmt = st_stmt.where(StationAssignment.effective_month == selected_m)
            if district_id:
                st_stmt = st_stmt.where(StationAssignment.district_id == district_id)
            if dm_id:
                st_stmt = st_stmt.where(StationAssignment.dm_user_id == dm_id)
        st_stmt = st_stmt.order_by(Station.station_id.asc())
        st_rows = (await db.execute(st_stmt)).all()
        stations = [StationOption(station_id=r[0], station_name=r[1] or f"Station {r[0]}") for r in st_rows]

        # Available Operators
        op_stmt = select(distinct(Operator.operator_code), Operator.operator_name).select_from(Operator).order_by(Operator.operator_code.asc())
        op_rows = (await db.execute(op_stmt)).all()
        operators = [OperatorOption(operator_code=r[0], operator_name=r[1]) for r in op_rows]

        return FilterOptionsResponse(
            available_months=list(months),
            selected_month=selected_m,
            districts=districts,
            district_managers=dms,
            stations=stations,
            operators=operators
        )
