from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class MonthlyRow(BaseModel):
    summary_id: int
    enroll_month: int
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

class KPICardData(BaseModel):
    total_enrollment: int
    total_amount: Decimal
    total_stations: int
    active_stations: int
    total_operators: int
    mom_growth_pct: float

class DistrictComparisonData(BaseModel):
    district_id: int
    district_name: str
    total_enrollment: int
    total_revenue: Decimal

class DMComparisonData(BaseModel):
    dm_user_id: str
    dmid: str
    dm_name: str
    district_name: Optional[str] = None
    station_count: int
    total_enrollment: int
    total_amount: Decimal

class CategoryMixItem(BaseModel):
    category: str
    count: int

class TrendPointData(BaseModel):
    month: int
    month_name: str
    total_enrollment: int
    total_revenue: Decimal

class MonthlySummaryResponse(BaseModel):
    kpis: KPICardData
    district_comparison: List[DistrictComparisonData]
    dm_comparison: List[DMComparisonData]
    category_mix: List[CategoryMixItem]
    trend: List[TrendPointData]
