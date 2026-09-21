from datetime import date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.monthly import CategoryMixItem

class DailyRow(BaseModel):
    record_id: int
    enroll_date: date
    station_id: str
    station_name: Optional[str] = None
    operator_code: str
    operator_name: Optional[str] = None
    district_id: Optional[int] = None
    district_name: Optional[str] = None
    dm_id: Optional[str] = None
    dm_name: Optional[str] = None
    total_enrollment: int
    total_amount: Decimal
    bmu_100: int
    dmu_50: int
    mbu_0: int
    mbu_100: int
    new_0: int
    bmu_125: int
    dmu_75: int
    mbu_125: int

    model_config = ConfigDict(from_attributes=True)

class DailyTrendPoint(BaseModel):
    enroll_date: date
    label: str
    total_enrollment: int
    total_revenue: Decimal

class TopStationData(BaseModel):
    station_id: str
    station_name: str
    district_name: str
    active_days: int
    total_enrollment: int
    total_revenue: Decimal

class DailySummaryResponse(BaseModel):
    total_enrollment: int
    total_revenue: Decimal
    active_days_count: int
    daily_trend: List[DailyTrendPoint]
    top_stations: List[TopStationData]
    category_mix: List[CategoryMixItem]

class DailyBreakdownResponse(BaseModel):
    enroll_month: int
    station_id: str
    station_name: Optional[str] = None
    operator_code: str
    operator_name: Optional[str] = None
    records: List[DailyRow]
    total_enrollment: int
    total_amount: Decimal
