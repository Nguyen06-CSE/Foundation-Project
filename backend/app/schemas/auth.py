from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=150)
    email: str
    password: str = Field(min_length=8, max_length=128)
    full_name: Optional[str] = Field(default=None, max_length=150)
    role: Optional[str] = Field(default="student", max_length=20)
    student_code: Optional[str] = Field(default=None, max_length=20)
    class_id: Optional[int] = None
    faculty_id: Optional[int] = None


class UserLogin(BaseModel):
    identifier: str = Field(..., description="MSSV, email hoặc username")
    password: str = Field(min_length=1, max_length=128)


class UserInfo(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    role: str
    student_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfo


class TokenData(BaseModel):
    sub: Optional[str] = None
    model_config = ConfigDict(extra="ignore")