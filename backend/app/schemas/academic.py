from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class FacultyOut(BaseModel):
    id: int
    code: str
    name: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ClassOut(BaseModel):
    id: int
    faculty_id: int
    code: str
    name: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)