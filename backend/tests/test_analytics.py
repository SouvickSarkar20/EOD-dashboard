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
async def test_get_monthly_records():
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/monthly/?page=1&page_size=10", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert data["total"] == 1346
        assert len(data["items"]) == 10

@pytest.mark.asyncio
async def test_get_monthly_summary_overview():
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/monthly/summary", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "kpis" in data
        assert data["kpis"]["total_enrollment"] > 0
        assert len(data["district_comparison"]) > 0
        assert len(data["dm_comparison"]) > 0

@pytest.mark.asyncio
async def test_get_daily_records():
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/daily/?page=1&page_size=10", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 26018

@pytest.mark.asyncio
async def test_get_daily_breakdown():
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # First fetch a monthly row to get station_id & operator_code
        m_res = await ac.get("/api/monthly/?page=1&page_size=1", headers=headers)
        row = m_res.json()["items"][0]
        
        # Request breakdown
        b_res = await ac.get(
            f"/api/daily/breakdown?month={row['enroll_month']}&station_id={row['station_id']}&operator_code={row['operator_code']}",
            headers=headers
        )
        assert b_res.status_code == 200
        b_data = b_res.json()
        assert b_data["station_id"] == row["station_id"]
        assert b_data["operator_code"] == row["operator_code"]
        assert len(b_data["records"]) > 0

@pytest.mark.asyncio
async def test_get_filter_options():
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/filters/options", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data["available_months"]) > 0
        assert len(data["districts"]) > 0
        assert len(data["district_managers"]) > 0
