import asyncio
import sys
import os

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select
from app.database import AsyncSessionLocal, engine
from app.models import AdminUser, UserRole
from app.utils.security import get_password_hash

async def reset_admin_2fa():
    """Reset Admin 2FA status and restore initial demo credentials."""
    async with AsyncSessionLocal() as db:
        stmt = select(AdminUser).where(AdminUser.role == UserRole.ADMIN)
        result = await db.execute(stmt)
        admin = result.scalar_one_or_none()

        if not admin:
            print("Error: Admin user account not found in database.")
            return

        admin.is_2fa_enabled = False
        admin.supabase_user_id = None
        admin.is_demo_creds = True
        admin.must_change_password = False
        admin.password_hash = get_password_hash("AdminDemo123!")

        await db.commit()
        print("Successfully reset Admin 2FA enrollment and restored initial demo credentials!")
        print(f"Email: {admin.email}")
        print("Password: AdminDemo123!")
        print("2FA Enabled: False")

    # Clean engine shutdown
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(reset_admin_2fa())
