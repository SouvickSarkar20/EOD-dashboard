from fastapi import APIRouter

router = APIRouter()

@router.get("/options")
async def get_filter_options():
    return {"message": "Filter options endpoint placeholder"}
