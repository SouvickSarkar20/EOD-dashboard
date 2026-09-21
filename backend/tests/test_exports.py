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
async def test_export_monthly_xlsx():
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/exports/monthly?format=xlsx", headers=headers)
        assert res.status_code == 200
        assert res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        assert "Content-Disposition" in res.headers
        assert "attachment; filename=" in res.headers["Content-Disposition"]
        assert len(res.content) > 0

@pytest.mark.asyncio
async def test_export_monthly_csv():
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/exports/monthly?format=csv", headers=headers)
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("text/csv")
        assert "Content-Disposition" in res.headers
        csv_text = res.content.decode("utf-8")
        assert "Month (YYYYMM)" in csv_text
        assert "District Name" in csv_text
        assert "Station ID" in csv_text

@pytest.mark.asyncio
async def test_export_daily_xlsx_and_csv():
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # XLSX format
        res_xlsx = await ac.get("/api/exports/daily?format=xlsx", headers=headers)
        assert res_xlsx.status_code == 200
        assert res_xlsx.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        
        # CSV format
        res_csv = await ac.get("/api/exports/daily?format=csv", headers=headers)
        assert res_csv.status_code == 200
        assert res_csv.headers["content-type"].startswith("text/csv")
        csv_text = res_csv.content.decode("utf-8")
        assert "Enrollment Date" in csv_text

@pytest.mark.asyncio
async def test_export_anomalies_xlsx_and_csv():
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # XLSX format
        res_xlsx = await ac.get("/api/exports/anomalies?format=xlsx", headers=headers)
        assert res_xlsx.status_code == 200
        assert res_xlsx.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        
        # CSV format
        res_csv = await ac.get("/api/exports/anomalies?format=csv", headers=headers)
        assert res_csv.status_code == 200
        assert res_csv.headers["content-type"].startswith("text/csv")
        csv_text = res_csv.content.decode("utf-8")
        assert "Anomaly ID" in csv_text
        assert "Severity" in csv_text

@pytest.mark.asyncio
async def test_export_unauthorized():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/exports/monthly")
        assert res.status_code == 401
