import os
import sys

# Ensure backend root is in sys.path BEFORE importing app packages
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings
from app.dependencies.db import get_db
from app.main import app

@pytest_asyncio.fixture(autouse=True)
async def override_db():
    """Override get_db dependency with a fresh async engine per test loop."""
    test_engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
    TestSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)

    async def _get_test_db():
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()
    await test_engine.dispose()
