from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.dependencies.db import get_db
from app.dependencies.auth import require_admin
from app.models import AuditLog, AdminUser

router = APIRouter()

@router.get("/")
async def list_audit_logs(
    action: Optional[str] = Query(None, description="Filter by audit action"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: AdminUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin Only: List and filter security audit logs with pagination.
    """
    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action.ilike(f"%{action.strip()}%"))
    if user_id:
        stmt = stmt.where(AuditLog.user_id == user_id)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = stmt.order_by(desc(AuditLog.created_at)).offset((page - 1) * page_size).limit(page_size)
    res = await db.execute(stmt)
    logs = res.scalars().all()

    return {
        "items": [
            {
                "log_id": log.log_id,
                "user_id": str(log.user_id) if log.user_id else None,
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "page_size": page_size
    }
