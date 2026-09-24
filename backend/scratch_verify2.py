import asyncio
import bcrypt
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.user import AdminUser

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(AdminUser).where(AdminUser.email == 'admin@demo.com'))
        user = res.scalar_one_or_none()
        if user:
            print(f"User found: {user.email}")
            print(f"Password Hash: {user.password_hash}")
            try:
                is_valid = bcrypt.checkpw(b"AdminDemo123!", user.password_hash.encode('utf-8'))
                print(f"Password matches AdminDemo123! : {is_valid}")
            except Exception as e:
                print(f"Bcrypt checkpw exception: {e}")
        else:
            print("User not found")

if __name__ == "__main__":
    asyncio.run(check())
