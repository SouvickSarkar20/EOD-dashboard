import asyncio
from sqlalchemy import select, and_, func
from app.database import AsyncSessionLocal
from app.models.analytics import DailyRecord, MonthlySummary
from app.models.station import StationAssignment, Station
from app.models.user import AdminUser

async def test_join():
    async with AsyncSessionLocal() as db:
        # First, let's see an example StationAssignment
        res = await db.execute(select(StationAssignment).limit(1))
        sa = res.scalar()
        if sa:
            print(f"Sample StationAssignment: station={sa.station_id}, month={sa.effective_month}, dist={sa.district_id}")
            
        # Example DailyRecord
        res = await db.execute(select(DailyRecord).limit(1))
        dr = res.scalar()
        if dr:
            print(f"Sample DailyRecord: station={dr.station_id}, date={dr.enroll_date}")
            
        stmt = (
            select(
                DailyRecord.station_id,
                DailyRecord.enroll_date,
                (func.extract('year', DailyRecord.enroll_date) * 100 + func.extract('month', DailyRecord.enroll_date)).label("calc_month"),
                StationAssignment.effective_month
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
            .limit(5)
        )
        res = await db.execute(stmt)
        for r in res.all():
            print(f"Record: station={r.station_id}, date={r.enroll_date}, calc_month={r.calc_month}, sa_month={r.effective_month}")

if __name__ == "__main__":
    asyncio.run(test_join())
