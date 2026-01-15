# app/models.py
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
from datetime import datetime


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False, default="Admin User")
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(Text, nullable=True)  # Legacy plain text
    hashed_password = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    properties = relationship("Property", back_populates="admin")


class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone_number = Column(String(20), nullable=False)
    student_number = Column(String(9), unique=True, nullable=False)
    campus = Column(String(50), nullable=False)
    hashed_password = Column(Text, nullable=False)
    
    # Email verification fields
    email_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(255), nullable=True, unique=True)
    verification_token_expires = Column(DateTime(timezone=True), nullable=True)
    
    # Password reset fields
    password_reset_token = Column(String(255), nullable=True, unique=True)
    password_reset_token_expires = Column(DateTime(timezone=True), nullable=True)
    
    # Document URLs from R2
    id_document_url = Column(Text, nullable=True)
    proof_of_registration_url = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Only applications — no residence relationship
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
    campus_intake = Column(String(255), nullable=False)
    admin_id = Column(Integer, ForeignKey("admins.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    admin = relationship("Admin", back_populates="properties")
    images = relationship("PropertyImage", back_populates="property", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="property")


class PropertyImage(Base):
    __tablename__ = "property_images"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    property = relationship("Property", back_populates="images")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="pending")
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)
    funding_approved = Column(Boolean, default=False)

    student = relationship("Student", back_populates="applications")
    property = relationship("Property", back_populates="applications")