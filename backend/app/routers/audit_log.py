from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_audit_log():
    return {"message": "Audit log endpoint placeholder"}
