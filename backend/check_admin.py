import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import AdminUser

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(AdminUser).where(AdminUser.email == 'admin@demo.com'))
        admin = res.scalar_one_or_none()
        if admin:
            print(f"User: {admin.email}")
            print(f"is_2fa_enabled: {admin.is_2fa_enabled}")
            print(f"is_demo_creds: {admin.is_demo_creds}")

if __name__ == "__main__":
    asyncio.run(check())
