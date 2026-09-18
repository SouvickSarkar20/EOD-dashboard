import uuid
from sqlalchemy import Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class StationAssignment(Base):
    __tablename__ = "station_assignments"

    assignment_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    station_id: Mapped[str] = mapped_column(String(50), ForeignKey("stations.station_id"), index=True)
    dm_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("admin_users.id"), index=True)
    district_id: Mapped[int] = mapped_column(Integer, ForeignKey("districts.district_id"), index=True)
    effective_month: Mapped[int] = mapped_column(Integer, index=True)  # YYYYMM format (e.g. 202401)

    __table_args__ = (
        UniqueConstraint("station_id", "effective_month", name="uq_station_effective_month"),
    )
