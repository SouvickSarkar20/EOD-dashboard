import uuid
import secrets
import string
from typing import Optional, List, Tuple
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, update, distinct

from app.models import (
    AdminUser, UserRole, UserStatus,
    StationAssignment, District, Station, AuditLog
)
from app.utils.security import get_password_hash
from app.schemas.district_manager import (
    CreateDMRequest, UpdateDMRequest, DMListItem, DMDetail, DMStationAssignmentSchema
)

def generate_temp_password(length: int = 12) -> str:
    """Generate a secure temporary password."""
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(chars) for _ in range(length))

class DMService:
    @staticmethod
    async def list_dms(
        db: AsyncSession,
        status_filter: Optional[str] = None,
        district_id: Optional[int] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 25
    ) -> Tuple[List[DMListItem], int]:
        """List District Managers with filtering and pagination."""
        query = select(AdminUser).where(AdminUser.role == UserRole.DISTRICT_MANAGER)

        if status_filter:
            try:
                st_enum = UserStatus(status_filter.lower())
                query = query.where(AdminUser.status == st_enum)
            except ValueError:
                pass

        if search:
            s = f"%{search.strip()}%"
            query = query.where(
                or_(
                    AdminUser.name.ilike(s),
                    AdminUser.email.ilike(s),
                    AdminUser.dmid.ilike(s)
                )
            )

        if district_id:
            subq = select(StationAssignment.dm_user_id).where(StationAssignment.district_id == district_id)
            query = query.where(AdminUser.id.in_(subq))

        count_stmt = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        offset = (page - 1) * page_size
        query = query.order_by(AdminUser.name.asc()).offset(offset).limit(page_size)
        res = await db.execute(query)
        dms = res.scalars().all()

        dm_items = []
        for dm in dms:
            assignments_query = (
                select(
                    func.count(distinct(StationAssignment.station_id)),
                    func.array_agg(distinct(District.district_name))
                )
                .select_from(StationAssignment)
                .join(District, StationAssignment.district_id == District.district_id)
                .where(StationAssignment.dm_user_id == dm.id)
            )
            asgn_res = await db.execute(assignments_query)
            row = asgn_res.first()
            station_count = row[0] if row and row[0] else 0
            district_names = [d for d in row[1] if d] if row and row[1] else []

            dm_items.append(
                DMListItem(
                    id=dm.id,
                    dmid=dm.dmid,
                    name=dm.name,
                    email=dm.email,
                    status=dm.status,
                    assigned_stations_count=station_count,
                    assigned_districts=district_names,
                    last_login_at=dm.last_login_at,
                    created_at=dm.created_at
                )
            )

        return dm_items, total

    @staticmethod
    async def get_dm_detail(db: AsyncSession, dm_id: uuid.UUID) -> Optional[DMDetail]:
        """Get full DM profile and station assignments."""
        stmt = select(AdminUser).where(AdminUser.id == dm_id, AdminUser.role == UserRole.DISTRICT_MANAGER)
        res = await db.execute(stmt)
        dm = res.scalar_one_or_none()
        if not dm:
            return None

        asgn_stmt = (
            select(
                StationAssignment.station_id,
                Station.station_name,
                StationAssignment.district_id,
                District.district_name,
                StationAssignment.effective_month
            )
            .select_from(StationAssignment)
            .join(Station, StationAssignment.station_id == Station.station_id, isouter=True)
            .join(District, StationAssignment.district_id == District.district_id, isouter=True)
            .where(StationAssignment.dm_user_id == dm.id)
            .order_by(StationAssignment.effective_month.desc())
        )
        asgn_rows = (await db.execute(asgn_stmt)).all()

        assignments = []
        districts_set = set()
        for r in asgn_rows:
            dist_name = r[3] or "Unknown"
            districts_set.add(dist_name)
            assignments.append(
                DMStationAssignmentSchema(
                    station_id=r[0],
                    station_name=r[1] or f"Station {r[0]}",
                    district_id=r[2],
                    district_name=dist_name,
                    effective_month=r[4]
                )
            )

        return DMDetail(
            id=dm.id,
            dmid=dm.dmid,
            name=dm.name,
            email=dm.email,
            status=dm.status,
            assigned_stations=assignments,
            assigned_districts=sorted(list(districts_set)),
            last_login_at=dm.last_login_at,
            created_at=dm.created_at,
            updated_at=dm.updated_at
        )

    @staticmethod
    async def create_dm(
        db: AsyncSession,
        admin_user: AdminUser,
        payload: CreateDMRequest,
        ip_address: Optional[str] = None
    ) -> Tuple[DMDetail, str]:
        """Create a new District Manager account with initial temp password."""
        email_clean = payload.email.strip().lower()
        
        # Check email uniqueness
        existing_email = (await db.execute(select(AdminUser).where(AdminUser.email == email_clean))).scalar_one_or_none()
        if existing_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"User with email '{email_clean}' already exists")

        # Generate DMID if not supplied
        if not payload.dmid:
            count_stmt = select(func.count()).where(AdminUser.role == UserRole.DISTRICT_MANAGER)
            cnt = (await db.execute(count_stmt)).scalar() or 0
            payload.dmid = f"ClabDM{cnt + 1:02d}"

        dmid_clean = payload.dmid.strip()
        existing_dmid = (await db.execute(select(AdminUser).where(AdminUser.dmid == dmid_clean))).scalar_one_or_none()
        if existing_dmid:
            payload.dmid = f"ClabDM{uuid.uuid4().hex[:4].upper()}"

        temp_password = generate_temp_password()
        new_dm = AdminUser(
            dmid=payload.dmid.strip(),
            name=payload.name.strip(),
            email=email_clean,
            role=UserRole.DISTRICT_MANAGER,
            status=UserStatus.ACTIVE,
            password_hash=get_password_hash(temp_password),
            is_demo_creds=True,
            must_change_password=True,
        )
        db.add(new_dm)
        await db.flush()

        log = AuditLog(
            user_id=admin_user.id,
            action="DM_CREATED",
            resource_type="AdminUser",
            resource_id=str(new_dm.id),
            details={"dmid": new_dm.dmid, "name": new_dm.name, "email": new_dm.email},
            ip_address=ip_address
        )
        db.add(log)
        await db.commit()

        detail = await DMService.get_dm_detail(db, new_dm.id)
        return detail, temp_password

    @staticmethod
    async def update_dm(
        db: AsyncSession,
        admin_user: AdminUser,
        dm_id: uuid.UUID,
        payload: UpdateDMRequest,
        ip_address: Optional[str] = None
    ) -> Optional[DMDetail]:
        """Update District Manager profile fields and status."""
        stmt = select(AdminUser).where(AdminUser.id == dm_id, AdminUser.role == UserRole.DISTRICT_MANAGER)
        res = await db.execute(stmt)
        dm = res.scalar_one_or_none()
        if not dm:
            return None

        diffs = {}
        if payload.name and payload.name != dm.name:
            diffs["name"] = {"before": dm.name, "after": payload.name}
            dm.name = payload.name.strip()
        if payload.email and payload.email.strip().lower() != dm.email:
            new_e = payload.email.strip().lower()
            existing_email = (await db.execute(select(AdminUser).where(AdminUser.email == new_e))).scalar_one_or_none()
            if existing_email:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Email '{new_e}' is already used by another user")
            diffs["email"] = {"before": dm.email, "after": new_e}
            dm.email = new_e
        if payload.status and payload.status != dm.status:
            diffs["status"] = {"before": dm.status.value, "after": payload.status.value}
            dm.status = payload.status

        if diffs:
            log = AuditLog(
                user_id=admin_user.id,
                action="DM_UPDATED",
                resource_type="AdminUser",
                resource_id=str(dm.id),
                details=diffs,
                ip_address=ip_address
            )
            db.add(log)
            await db.commit()

        return await DMService.get_dm_detail(db, dm.id)

    @staticmethod
    async def deactivate_dm(
        db: AsyncSession,
        admin_user: AdminUser,
        dm_id: uuid.UUID,
        ip_address: Optional[str] = None
    ) -> bool:
        """Deactivate (soft delete) a District Manager."""
        stmt = select(AdminUser).where(AdminUser.id == dm_id, AdminUser.role == UserRole.DISTRICT_MANAGER)
        res = await db.execute(stmt)
        dm = res.scalar_one_or_none()
        if not dm:
            return False

        dm.status = UserStatus.INACTIVE
        log = AuditLog(
            user_id=admin_user.id,
            action="DM_DEACTIVATED",
            resource_type="AdminUser",
            resource_id=str(dm.id),
            details={"dmid": dm.dmid, "name": dm.name},
            ip_address=ip_address
        )
        db.add(log)
        await db.commit()
        return True

    @staticmethod
    async def reset_dm_password(
        db: AsyncSession,
        admin_user: AdminUser,
        dm_id: uuid.UUID,
        ip_address: Optional[str] = None
    ) -> Optional[Tuple[AdminUser, str]]:
        """Reset a District Manager's password and return fresh temp password."""
        stmt = select(AdminUser).where(AdminUser.id == dm_id, AdminUser.role == UserRole.DISTRICT_MANAGER)
        res = await db.execute(stmt)
        dm = res.scalar_one_or_none()
        if not dm:
            return None

        temp_password = generate_temp_password()
        dm.password_hash = get_password_hash(temp_password)
        dm.must_change_password = True

        log = AuditLog(
            user_id=admin_user.id,
            action="DM_PASSWORD_RESET",
            resource_type="AdminUser",
            resource_id=str(dm.id),
            details={"dmid": dm.dmid, "name": dm.name},
            ip_address=ip_address
        )
        db.add(log)
        await db.commit()
        return dm, temp_password
