from typing import Optional

from pydantic import BaseModel, EmailStr, ConfigDict, Field


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: Optional[str] = Field(default=None, max_length=150) 
    role: Optional[str] = Field(default="personal", max_length=20)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    sub: Optional[str] = None
    model_config = ConfigDict(extra="ignore")
