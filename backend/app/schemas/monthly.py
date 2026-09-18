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
    total_revenue: Decimal
    active_stations_count: int
    active_operators_count: int
    bmu_share_pct: float
    enrollment_change_pct: float

class DistrictComparisonData(BaseModel):
    district_id: int
    district_name: str
    total_enrollment: int
    total_revenue: Decimal

class DMComparisonData(BaseModel):
    dm_id: str
    dmid: str
    dm_name: str
    assigned_stations_count: int
    total_enrollment: int
    total_revenue: Decimal

class CategoryMixData(BaseModel):
    bmu_total: int
    dmu_total: int
    mbu_total: int
    new_total: int
    bmu_pct: float
    dmu_pct: float
    mbu_pct: float
    new_pct: float

class TrendPointData(BaseModel):
    enroll_month: int
    label: str
    total_enrollment: int
    total_revenue: Decimal

class MonthlySummaryResponse(BaseModel):
    kpis: KPICardData
    district_comparison: List[DistrictComparisonData]
    dm_comparison: List[DMComparisonData]
    category_mix: CategoryMixData
    monthly_trend: List[TrendPointData]
