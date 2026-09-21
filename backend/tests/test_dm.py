import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

async def get_admin_token() -> str:
    """Helper to obtain admin authorization token with MFA verified claim."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/auth/login", json={
            "email": "admin@demo.com",
            "password": "AdminDemo123!"
        })
        data = res.json()
        token = data["access_token"]
        
        if data.get("mfa_required"):
            import pyotp
            totp_code = pyotp.TOTP("JBSWY3DPEHPK3PXP").now()
            verify_res = await ac.post(
                "/api/auth/admin/supabase-2fa/verify-login",
                headers={"Authorization": f"Bearer {token}"},
                json={"totp_code": totp_code}
            )
            return verify_res.json()["access_token"]
            
        return token

@pytest.mark.asyncio
async def test_list_district_managers():
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/district-managers/", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert data["total"] >= 9

@pytest.mark.asyncio
async def test_create_and_get_dm():
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    unique_email = f"testdm_{uuid.uuid4().hex[:6]}@eod.internal"
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Create DM
        res = await ac.post("/api/district-managers/", headers=headers, json={
            "name": "Test DM User",
            "email": unique_email
        })
        assert res.status_code == 201
        created = res.json()
        assert created["name"] == "Test DM User"
        dm_id = created["id"]

        # 2. Get DM detail
        res = await ac.get(f"/api/district-managers/{dm_id}", headers=headers)
        assert res.status_code == 200
        assert res.json()["email"] == unique_email

@pytest.mark.asyncio
async def test_update_and_deactivate_dm():
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    unique_email = f"updatetarget_{uuid.uuid4().hex[:6]}@eod.internal"
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Create DM
        res = await ac.post("/api/district-managers/", headers=headers, json={
            "name": "Update Target DM",
            "email": unique_email
        })
        assert res.status_code == 201
        dm_id = res.json()["id"]

        # 2. Update DM
        res = await ac.patch(f"/api/district-managers/{dm_id}", headers=headers, json={
            "name": "Updated DM Name"
        })
        assert res.status_code == 200
        assert res.json()["name"] == "Updated DM Name"

        # 3. Reset password
        res = await ac.post(f"/api/district-managers/{dm_id}/reset-password", headers=headers)
        assert res.status_code == 200
        assert "temporary_password" in res.json()

        # 4. Deactivate DM
        res = await ac.post(f"/api/district-managers/{dm_id}/deactivate", headers=headers)
        assert res.status_code == 200
