import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select, delete, or_
from app.database import AsyncSessionLocal, engine
from app.models import AdminUser, UserRole, AuditLog

async def cleanup():
    async with AsyncSessionLocal() as db:
        # Find all test DMs created during testing
        stmt = select(AdminUser).where(
            AdminUser.role == UserRole.DISTRICT_MANAGER,
            or_(
                AdminUser.name.ilike('%Test DM%'),
                AdminUser.name.ilike('%Updated DM%'),
                AdminUser.email.ilike('testdm%'),
                AdminUser.email.ilike('updatetarget%')
            )
        )
        res = await db.execute(stmt)
        test_dms = res.scalars().all()

        print(f"Found {len(test_dms)} test DMs to delete.")
        for dm in test_dms:
            print(f"Deleting test DM: {dm.id} | {dm.dmid} | {dm.name} | {dm.email}")
            
            # Delete related audit logs first
            await db.execute(delete(AuditLog).where(AuditLog.resource_id == str(dm.id)))
            # Delete the DM
            await db.delete(dm)

        await db.commit()
        print("Successfully cleaned up all test mock data from database!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(cleanup())
