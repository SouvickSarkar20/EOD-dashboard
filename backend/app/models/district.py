from datetime import datetime
from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class District(Base):
    __tablename__ = "districts"

    district_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    district_name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
