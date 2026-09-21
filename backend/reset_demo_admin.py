import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import AdminUser, UserRole, UserStatus
from app.utils.security import get_password_hash

async def reset_demo_admin():
    print("Resetting Admin Demo User Credentials...")
    async with AsyncSessionLocal() as db:
        # Check if another user is holding dmid ClabDM01
        res_dmid = await db.execute(select(AdminUser).where(AdminUser.dmid == "ClabDM01"))
        dmid_holder = res_dmid.scalars().first()
        
        # Search for Admin user or admin@demo.com
        res = await db.execute(select(AdminUser).where(AdminUser.role == UserRole.ADMIN))
        admin = res.scalars().first()
        if not admin:
            res = await db.execute(select(AdminUser).where(AdminUser.email == "admin@demo.com"))
            admin = res.scalars().first()

        if dmid_holder and admin and dmid_holder.id != admin.id:
            dmid_holder.dmid = "ClabDM99"
            await db.flush()

        if admin:
            admin.email = "admin@demo.com"
            admin.dmid = "ClabDM01"
            admin.name = "System Administrator"
            admin.role = UserRole.ADMIN
            admin.status = UserStatus.ACTIVE
            admin.password_hash = get_password_hash("AdminDemo123!")
            admin.is_2fa_enabled = False
            admin.is_demo_creds = True
            admin.must_change_password = False
            await db.commit()
            print("Successfully updated Admin user:")
            print("  Email: admin@demo.com")
            print("  DM ID: ClabDM01")
            print("  Password: AdminDemo123!")
            print("  Status: Active")
            print("  2FA Enabled: False")
        else:
            new_admin = AdminUser(
                dmid="ClabDM01",
                name="System Administrator",
                email="admin@demo.com",
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE,
                password_hash=get_password_hash("AdminDemo123!"),
                is_2fa_enabled=False,
                is_demo_creds=True,
                must_change_password=False
            )
            db.add(new_admin)
            await db.commit()
            print("Successfully created fresh Admin user:")
            print("  Email: admin@demo.com")
            print("  DM ID: ClabDM01")
            print("  Password: AdminDemo123!")

if __name__ == "__main__":
    asyncio.run(reset_demo_admin())
