import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models.analytics import MonthlySummary, DailyRecord

async def count_records():
    async with AsyncSessionLocal() as db:
        num_monthly = (await db.execute(select(func.count(MonthlySummary.summary_id)))).scalar()
        num_daily = (await db.execute(select(func.count(DailyRecord.record_id)))).scalar()
        
        print(f"Total Monthly Summaries in DB: {num_monthly}")
        print(f"Total Daily Records in DB: {num_daily}")

if __name__ == "__main__":
    asyncio.run(count_records())
