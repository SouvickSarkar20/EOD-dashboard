from decimal import Decimal
from sqlalchemy import Integer, String, Numeric, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class MonthlySummary(Base):
    __tablename__ = "monthly_summary"

    summary_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    enroll_month: Mapped[int] = mapped_column(Integer, index=True)  # YYYYMM format
    station_id: Mapped[str] = mapped_column(String(50), ForeignKey("stations.station_id"), index=True)
    operator_code: Mapped[str] = mapped_column(String(50), ForeignKey("operators.operator_code"), index=True)
    total_enrollment: Mapped[int] = mapped_column(Integer, default=0)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))

    # Fee tier breakdowns
    bmu_100: Mapped[int] = mapped_column(Integer, default=0)
    dmu_50: Mapped[int] = mapped_column(Integer, default=0)
    mbu_0: Mapped[int] = mapped_column(Integer, default=0)
    mbu_100: Mapped[int] = mapped_column(Integer, default=0)
    new_0: Mapped[int] = mapped_column(Integer, default=0)
    bmu_125: Mapped[int] = mapped_column(Integer, default=0)
    dmu_75: Mapped[int] = mapped_column(Integer, default=0)
    mbu_125: Mapped[int] = mapped_column(Integer, default=0)

    __table_args__ = (
        UniqueConstraint("enroll_month", "station_id", "operator_code", name="uq_month_station_operator"),
        Index("ix_monthly_station_month", "station_id", "enroll_month"),
        Index("ix_monthly_operator_month", "operator_code", "enroll_month"),
    )
