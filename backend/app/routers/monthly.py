from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_monthly_data():
    return {"message": "Monthly analysis endpoint placeholder"}
