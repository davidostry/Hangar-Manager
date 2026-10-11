from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)