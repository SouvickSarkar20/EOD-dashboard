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
async def test_get_anomalies_list():
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/anomalies/", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total_anomalies" in data
        assert "high_severity_count" in data
        assert "medium_severity_count" in data
        assert "low_severity_count" in data
        assert data["total_anomalies"] == len(data["items"])

@pytest.mark.asyncio
async def test_get_anomalies_summary():
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/anomalies/summary", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "total_anomalies" in data
        assert "by_type" in data
        assert "by_severity" in data
        assert "DM_DECLINE" in data["by_type"]
        assert "SILENT_STATION" in data["by_type"]

@pytest.mark.asyncio
async def test_get_anomalies_with_filters():
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Filter by anomaly_type=SILENT_STATION
        res = await ac.get("/api/anomalies/?anomaly_type=SILENT_STATION", headers=headers)
        assert res.status_code == 200
        data = res.json()
        for item in data["items"]:
            assert item["type"] == "SILENT_STATION"

        # Filter by severity=HIGH
        sev_res = await ac.get("/api/anomalies/?severity=HIGH", headers=headers)
        assert sev_res.status_code == 200
        sev_data = sev_res.json()
        for item in sev_data["items"]:
            assert item["severity"] == "HIGH"

@pytest.mark.asyncio
async def test_anomalies_unauthorized():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/anomalies/")
        assert res.status_code == 401
