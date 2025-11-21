# app/schemas.py
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime

# ==================== AUTH & TOKEN ====================
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    email: str
    full_name: Optional[str] = None


# ==================== STUDENT ====================
class StudentCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone_number: str
    student_number: str
    campus: str
    password: str

    class Config:
        from_attributes = True

    @validator("student_number")
    def check_student_number(cls, v):
        if not v.isdigit() or len(v) != 9:
            raise ValueError("Student number must be exactly 9 digits")
        return v

    @validator("campus")
    def validate_campus(cls, v):
        allowed = [
            "Soshanguve North", "Soshanguve South", "Garankuwa Campus",
            "Arts Campus", "Arcadia Campus", "Pretoria Campus"
        ]
        if v not in allowed:
            raise ValueError(f"Campus must be one of: {', '.join(allowed)}")
        return v

    @validator("password")
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class StudentResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone_number: str
    student_number: str
    campus: str
    created_at: datetime
    residence_id: Optional[int] = None

    class Config:
        from_attributes = True


# ==================== PROPERTY (Residence) ====================
class PropertyCreate(BaseModel):
    title: str
    address: str
    is_bachelor: bool
    available_flats: int
    space_per_student: float
    campus_intake: str        # NEW FIELD

class PropertyImageOut(BaseModel):
    id: int
    image_url: str

    class Config:
        from_attributes = True


class PropertyOut(BaseModel):
    id: int
    title: str
    address: str
    is_bachelor: bool
    available_flats: int
    total_flats: int
    space_per_student: float
    campus_intake: str         # NEW FIELD
    image_urls: List[str]

    class Config:
        from_attributes = True



class PropertyDetailOut(PropertyOut):
    images: List[PropertyImageOut] = []

    class Config:
        from_attributes = True


# ==================== APPLICATION ====================
class ApplicationCreate(BaseModel):
    property_id: int


class ApplicationOut(BaseModel):
    id: int
    student_id: int
    property_id: int
    property_title: str
    status: str
    applied_at: datetime

    class Config:
        from_attributes = True


# ==================== ADMIN (minimal) ====================
class AdminOut(BaseModel):
    id: int
    full_name: str
    email: str

    class Config:
        from_attributes = True