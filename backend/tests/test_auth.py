import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.database import AsyncSessionLocal
from app.models import AdminUser

@pytest.mark.asyncio
async def test_admin_demo_login():
    """Test initial Admin login using demo credentials."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/auth/login", json={
            "email": "admin@demo.com",
            "password": "AdminDemo123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["is_demo_creds"] is True
        assert data["user"]["email"] == "admin@demo.com"
        assert data["user"]["role"] == "admin"

@pytest.mark.asyncio
async def test_invalid_login():
    """Test login rejection with wrong password."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/auth/login", json={
            "email": "admin@demo.com",
            "password": "WrongPassword123!"
        })
        assert res.status_code == 401

@pytest.mark.asyncio
async def test_get_me_endpoint():
    """Test getting current user profile with JWT bearer token."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post("/api/auth/login", json={
            "email": "admin@demo.com",
            "password": "AdminDemo123!"
        })
        token = login_res.json()["access_token"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        me_res = await ac.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "admin@demo.com"

@pytest.mark.asyncio
async def test_supabase_2fa_enrollment_and_verification():
    """Test Supabase 2FA enrollment and verification endpoints."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post("/api/auth/login", json={
            "email": "admin@demo.com",
            "password": "AdminDemo123!"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

    # 1. Enroll 2FA
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        enroll_res = await ac.post("/api/auth/admin/supabase-2fa/enroll", headers=headers)
        assert enroll_res.status_code == 200
        enroll_data = enroll_res.json()
        assert "secret" in enroll_data

    # 2. Verify Enrollment
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        verify_res = await ac.post("/api/auth/admin/supabase-2fa/verify-enrollment", headers=headers, json={
            "totp_code": "123456",
            "secret": enroll_data["secret"]
        })
        assert verify_res.status_code == 200
        assert verify_res.json()["success"] is True

    # 3. Cleanup: reset is_2fa_enabled to False so test run doesn't leave DB with 2FA enabled
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(AdminUser).where(AdminUser.email == "admin@demo.com"))
        admin = res.scalar_one_or_none()
        if admin:
            admin.is_2fa_enabled = False
            await db.commit()
