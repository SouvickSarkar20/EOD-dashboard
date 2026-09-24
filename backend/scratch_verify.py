import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.user import AdminUser
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(AdminUser).where(AdminUser.email == 'admin@demo.com'))
        user = res.scalar_one_or_none()
        if user:
            print(f"User found: {user.email}")
            is_valid = pwd_context.verify("AdminDemo123!", user.password_hash)
            print(f"Password matches AdminDemo123! : {is_valid}")
        else:
            print("User not found")

if __name__ == "__main__":
    asyncio.run(check())
