# app/routers/property.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, database
from .auth import get_current_user
import boto3
import os
from uuid import uuid4
from botocore.client import Config

# ✅ IMPORTANT: Set redirect_slashes=False to prevent 307 redirects
router = APIRouter(prefix="/properties", tags=["Properties"], redirect_slashes=False)

# Cloudflare R2 Configuration (if you're using it)
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_BUCKET = os.getenv("R2_BUCKET")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL")

if all([R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET, R2_PUBLIC_URL]):
    R2_ENDPOINT = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    s3_client = boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name="auto",
        config=Config(signature_version='s3v4')
    )
else:
    s3_client = None


def get_public_url(key: str) -> str:
    """Generate public URL for R2 object"""
    return f"{R2_PUBLIC_URL}/{key}"


# ✅ GET ALL PROPERTIES (Public - No auth required)
@router.get("")  # This matches /properties exactly (no trailing slash)
def get_properties(db: Session = Depends(database.get_db)):
    """Get all properties (public endpoint)"""
    properties = db.query(models.Property).all()
    
    result = []
    for prop in properties:
        result.append({
            "id": prop.id,
            "title": prop.title,
            "address": prop.address,
            "is_bachelor": prop.is_bachelor,
            "available_flats": prop.available_flats,
            "total_flats": prop.total_flats,
            "space_per_student": prop.space_per_student,
            "campus_intake": prop.campus_intake,
            "image_urls": prop.image_urls or [],
        })
    
    return result


# ✅ GET SINGLE PROPERTY (Public)
@router.get("/{property_id}")
def get_property(property_id: int, db: Session = Depends(database.get_db)):
    """Get a single property by ID"""
    prop = db.query(models.Property).filter(models.Property.id == property_id).first()
    
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    return {
        "id": prop.id,
        "title": prop.title,
        "address": prop.address,
        "is_bachelor": prop.is_bachelor,
        "available_flats": prop.available_flats,
        "total_flats": prop.total_flats,
        "space_per_student": prop.space_per_student,
        "campus_intake": prop.campus_intake,
        "image_urls": prop.image_urls or [],
    }