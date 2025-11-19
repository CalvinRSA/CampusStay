# app/models.py
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False, default="Admin User")
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(Text, nullable=True)  # Keep for backward compatibility
    hashed_password = Column(Text, nullable=True)  # ← ADD THIS LINE
    is_active = Column(Boolean, default=True)

    properties = relationship("Property", back_populates="admin")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone_number = Column(String(20), nullable=False)
    student_number = Column(String(9), unique=True, nullable=False, index=True)
    campus = Column(String(50), nullable=False)          # ← TEXT, not campus_id
    hashed_password = Column(Text, nullable=False)
    residence_id = Column(Integer, ForeignKey("properties.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    residence = relationship("Property", back_populates="residents")
    applications = relationship("Application", back_populates="student")


class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    address = Column(Text, nullable=False)
    is_bachelor = Column(Boolean, default=False)
    available_flats = Column(Integer, nullable=False)
    total_flats = Column(Integer, nullable=False)
    space_per_student = Column(Float, nullable=False)
    campus_intake = Column(String(50), nullable=False)  # ← NEW
    admin_id = Column(Integer, ForeignKey("admins.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    admin = relationship("Admin", back_populates="properties")
    images = relationship("PropertyImage", back_populates="property", cascade="all, delete-orphan")
    residents = relationship("Student", back_populates="residence")
    applications = relationship("Application", back_populates="property")


class PropertyImage(Base):
    __tablename__ = "property_images"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    property = relationship("Property", back_populates="images")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    property_id = Column(Integer, ForeignKey("properties.id"))
    status = Column(String, default="pending")  # pending, approved, rejected
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)
    
    # NEW FIELDS FOR DOCUMENT UPLOADS
    proof_of_registration = Column(String, nullable=True)  # Path to POR PDF
    id_copy = Column(String, nullable=True)  # Path to ID Copy PDF
    funding_approved = Column(Boolean, default=False)  # Funding approval status

    # Relationships
    student = relationship("Student", back_populates="applications")
    property = relationship("Property", back_populates="applications")
