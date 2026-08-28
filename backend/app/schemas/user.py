from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=150)
    email: EmailStr
    full_name: Optional[str] = Field(default=None, max_length=150)
    role: str = Field(default="student", max_length=20)
    student_code: Optional[str] = Field(default=None, max_length=20)
    class_id: Optional[int] = None
    faculty_id: Optional[int] = None

class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)

class UserUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=3, max_length=150)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(default=None, max_length=150)
    role: Optional[str] = Field(default=None, max_length=20)
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)
    student_code: Optional[str] = Field(default=None, max_length=20)
    class_id: Optional[int] = None
    faculty_id: Optional[int] = None

class UserOut(UserBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)