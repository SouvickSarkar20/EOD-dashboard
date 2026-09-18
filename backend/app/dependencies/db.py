from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injection helper for obtaining AsyncSession in FastAPI routers."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
