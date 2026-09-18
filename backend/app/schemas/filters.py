import uuid
from typing import Optional, List
from pydantic import BaseModel

class OptionItem(BaseModel):
    id: str
    name: str

class DistrictOption(BaseModel):
    district_id: int
    district_name: str

class DMOption(BaseModel):
    id: uuid.UUID
    dmid: str
    name: str

class StationOption(BaseModel):
    station_id: str
    station_name: str

class OperatorOption(BaseModel):
    operator_code: str
    operator_name: Optional[str] = None

class FilterOptionsResponse(BaseModel):
    available_months: List[int]
    selected_month: Optional[int] = None
    districts: List[DistrictOption]
    district_managers: List[DMOption]
    stations: List[StationOption]
    operators: List[OperatorOption]
