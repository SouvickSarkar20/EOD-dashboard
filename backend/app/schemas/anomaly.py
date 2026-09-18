import uuid
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

class AnomalyItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Unique ID for the anomaly item")
    type: str = Field(..., description="Anomaly type: DM_DECLINE | SILENT_STATION | LOW_PERFORMER | ZERO_ACTIVITY")
    severity: str = Field(..., description="Severity level: HIGH | MEDIUM | LOW")
    title: str = Field(..., description="Short descriptive title of the anomaly")
    description: str = Field(..., description="Detailed explanation of detected anomaly")
    district_id: Optional[int] = None
    district_name: Optional[str] = None
    dm_user_id: Optional[uuid.UUID] = None
    dm_name: Optional[str] = None
    station_id: Optional[int] = None
    station_code: Optional[str] = None
    station_name: Optional[str] = None
    metrics: Dict[str, Any] = Field(default_factory=dict, description="Key operational metrics relating to the anomaly")
    detected_at: str = Field(..., description="ISO formatted timestamp when anomaly condition occurred/detected")

class AnomalyListResponse(BaseModel):
    total_anomalies: int
    dm_decline_count: int
    silent_station_count: int
    low_performer_count: int
    zero_activity_count: int
    high_severity_count: int
    medium_severity_count: int
    low_severity_count: int
    items: List[AnomalyItem]

class AnomalySummaryResponse(BaseModel):
    total_anomalies: int
    by_type: Dict[str, int]
    by_severity: Dict[str, int]
