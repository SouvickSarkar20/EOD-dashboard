from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

def utc_now():
    return datetime.utcnow()

class Operator(Base):
    __tablename__ = "operators"

    operator_code: Mapped[str] = mapped_column(String(50), primary_key=True)
    operator_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
