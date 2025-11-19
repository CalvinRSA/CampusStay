# app/routers/admin.py - FIXED DOCUMENT RETRIEVAL
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List
from sqlalchemy.orm import Session
from .. import models, database
from .auth import get_current_admin
import boto3
import os
from uuid import uuid4
from botocore.client import Config

router = APIRouter(prefix="/admin", tags=["Admin"])

# CLOUDFLARE R2
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_BUCKET = os.getenv("R2_BUCKET")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL")

if not all([R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET, R2_PUBLIC_URL]):
    raise RuntimeError("Missing R2 config")

R2_ENDPOINT = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

s3_client = boto3.client(
    "s3",
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    region_name="auto",
    config=Config(signature_version='s3v4')
)

def get_public_url(key: str) -> str:
    """Generate public URL for R2 object"""
    return f"{R2_PUBLIC_URL}/{key}"

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}

@router.post("/properties")
async def create_property(
    title: str = Form(...),
    address: str = Form(...),
    is_bachelor: bool = Form(False),
    available_flats: int = Form(...),
    space_per_student: float = Form(...),
    campus_intake: str = Form(...),
    images: List[UploadFile] = File(...),
    db: Session = Depends(database.get_db),
    admin: models.Admin = Depends(get_current_admin),
):
    if not (1 <= len(images) <= 5):
        raise HTTPException(400, "1-5 images required")

    prop = models.Property(
        title=title, address=address, is_bachelor=is_bachelor,
        available_flats=available_flats, total_flats=available_flats,
        space_per_student=space_per_student, campus_intake=campus_intake,
        admin_id=admin.id
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)

    for img in images:
        ext = os.path.splitext(img.filename)[1].lower()
        if ext not in ALLOWED_EXT:
            raise HTTPException(400, "Invalid image type")

        key = f"properties/{prop.id}/{uuid4().hex}{ext}"
        
        s3_client.put_object(
            Bucket=R2_BUCKET,
            Key=key,
            Body=await img.read(),
            ContentType=img.content_type or "image/jpeg",
            ACL="public-read"
        )

        url = get_public_url(key)
        db.add(models.PropertyImage(property_id=prop.id, image_url=url))

    db.commit()
    return {"message": "Property created successfully", "property_id": prop.id}


@router.put("/properties/{property_id}")
async def update_property(
    property_id: int,
    title: str = Form(None), 
    address: str = Form(None), 
    is_bachelor: bool = Form(None),
    available_flats: int = Form(None), 
    space_per_student: float = Form(None),
    campus_intake: str = Form(None),
    new_images: List[UploadFile] = File(default=[]),
    remove_images: List[str] = Form(default=[]),
    db: Session = Depends(database.get_db),
    admin: models.Admin = Depends(get_current_admin),
):
    prop = db.query(models.Property).filter(
        models.Property.id == property_id, 
        models.Property.admin_id == admin.id
    ).first()
    if not prop:
        raise HTTPException(404, "Property not found")

    if title: prop.title = title
    if address: prop.address = address
    if is_bachelor is not None: prop.is_bachelor = is_bachelor
    if available_flats is not None:
        prop.available_flats = available_flats
        if prop.total_flats == prop.available_flats:
            prop.total_flats = available_flats
    if space_per_student: prop.space_per_student = space_per_student
    if campus_intake: prop.campus_intake = campus_intake

    for url in remove_images:
        try:
            key = url.replace(f"{R2_PUBLIC_URL}/", "")
            s3_client.delete_object(Bucket=R2_BUCKET, Key=key)
        except Exception as e:
            print(f"Failed to delete image: {e}")
        db.query(models.PropertyImage).filter(
            models.PropertyImage.image_url == url
        ).delete()

    current = db.query(models.PropertyImage).filter(
        models.PropertyImage.property_id == property_id
    ).count()
    if current - len(remove_images) + len(new_images) > 5:
        raise HTTPException(400, "Max 5 images allowed")

    for img in new_images:
        ext = os.path.splitext(img.filename)[1].lower()
        if ext not in ALLOWED_EXT:
            raise HTTPException(400, "Invalid image type")
        
        key = f"properties/{property_id}/{uuid4().hex}{ext}"
        s3_client.put_object(
            Bucket=R2_BUCKET, 
            Key=key, 
            Body=await img.read(),
            ContentType=img.content_type or "image/jpeg",
            ACL="public-read"
        )
        url = get_public_url(key)
        db.add(models.PropertyImage(property_id=property_id, image_url=url))

    db.commit()
    return {"message": "Property updated successfully"}


@router.delete("/properties/{property_id}")
def delete_property(
    property_id: int, 
    db: Session = Depends(database.get_db), 
    admin: models.Admin = Depends(get_current_admin)
):
    prop = db.query(models.Property).filter(
        models.Property.id == property_id, 
        models.Property.admin_id == admin.id
    ).first()
    if not prop:
        raise HTTPException(404, "Property not found")

    for img in prop.images:
        try:
            key = img.image_url.replace(f"{R2_PUBLIC_URL}/", "")
            s3_client.delete_object(Bucket=R2_BUCKET, Key=key)
        except Exception as e:
            print(f"Failed to delete image: {e}")

    db.query(models.PropertyImage).filter(
        models.PropertyImage.property_id == property_id
    ).delete()
    db.query(models.Application).filter(
        models.Application.property_id == property_id
    ).delete()
    db.delete(prop)
    db.commit()
    return {"message": "Property deleted successfully"}


@router.get("/properties")
def get_properties(
    db: Session = Depends(database.get_db), 
    admin: models.Admin = Depends(get_current_admin)
):
    props = db.query(models.Property).filter(
        models.Property.admin_id == admin.id
    ).all()
    return [{
        "id": p.id, 
        "title": p.title, 
        "address": p.address, 
        "is_bachelor": p.is_bachelor,
        "available_flats": p.available_flats, 
        "total_flats": p.total_flats,
        "space_per_student": p.space_per_student, 
        "campus_intake": p.campus_intake,
        "image_urls": [i.image_url for i in p.images]
    } for p in props]


@router.get("/applications")
def get_applications(
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    """Get minimal application details for list view"""
    applications = (
        db.query(models.Application, models.Student, models.Property)
        .join(models.Student, models.Application.student_id == models.Student.id)
        .join(models.Property, models.Application.property_id == models.Property.id)
        .filter(models.Property.admin_id == current_admin.id)
        .all()
    )
    result = []
    for app, student, prop in applications:
        result.append({
            "id": app.id,
            "student_name": student.full_name,
            "student_email": student.email,
            "property_id": prop.id,
            "property_title": prop.title,
            "status": app.status,
            "applied_at": app.applied_at.isoformat(),
            "funding_approved": app.funding_approved,
        })
    return result


@router.get("/applications/{app_id}")
def get_application_details(
    app_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    """Get full application details including documents for viewing"""
    result = (
        db.query(models.Application, models.Student, models.Property)
        .join(models.Student, models.Application.student_id == models.Student.id)
        .join(models.Property, models.Application.property_id == models.Property.id)
        .filter(
            models.Application.id == app_id,
            models.Property.admin_id == current_admin.id
        )
        .first()
    )
    
    if not result:
        raise HTTPException(404, "Application not found")
    
    app, student, prop = result
    
    return {
        "id": app.id,
        "student_name": student.full_name,
        "student_email": student.email,
        "student_phone": student.phone_number,
        "student_number": student.student_number,
        "property_id": prop.id,
        "property_title": prop.title,
        "property_address": prop.address,
        "status": app.status,
        "applied_at": app.applied_at.isoformat(),
        "notes": app.notes,
        "funding_approved": app.funding_approved,
        "proof_of_registration": getattr(student, 'proof_of_registration_url', None),
        "id_copy": getattr(student, 'id_document_url', None),
    }


@router.delete("/applications/{app_id}")
def delete_application(
    app_id: int,
    db: Session = Depends(database.get_db),
    admin: models.Admin = Depends(get_current_admin)
):
    """Delete a handled application (approved or rejected only)"""
    result = (
        db.query(models.Application, models.Property)
        .join(models.Property, models.Application.property_id == models.Property.id)
        .filter(
            models.Application.id == app_id,
            models.Property.admin_id == admin.id
        )
        .first()
    )
    
    if not result:
        raise HTTPException(404, "Application not found")
    
    app, prop = result
    
    if app.status == "pending":
        raise HTTPException(400, "Cannot delete pending applications. Please approve or reject first.")
    
    db.delete(app)
    db.commit()
    return {"message": "Application deleted successfully"}


@router.get("/stats")
def get_stats(
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    properties = db.query(models.Property).filter(
        models.Property.admin_id == current_admin.id
    ).all()
    total_properties = len(properties)
    total_applications = db.query(models.Application).join(models.Property).filter(
        models.Property.admin_id == current_admin.id
    ).count()
    pending = db.query(models.Application).join(models.Property).filter(
        models.Property.admin_id == current_admin.id, 
        models.Application.status == "pending"
    ).count()
    approved = db.query(models.Application).join(models.Property).filter(
        models.Property.admin_id == current_admin.id, 
        models.Application.status == "approved"
    ).count()

    total_spaces = sum(p.total_flats for p in properties)
    occupied = sum(p.total_flats - p.available_flats for p in properties)
    occupancy_rate = round((occupied / total_spaces * 100), 2) if total_spaces > 0 else 0

    return {
        "total_properties": total_properties,
        "total_applications": total_applications,
        "pending_applications": pending,
        "approved_applications": approved,
        "occupancy_rate": occupancy_rate,
    }


@router.post("/applications/{app_id}/approved")
def approve_application(
    app_id: int,
    db: Session = Depends(database.get_db),
    admin: models.Admin = Depends(get_current_admin)
):
    app = db.query(models.Application).filter(
        models.Application.id == app_id
    ).first()
    if not app:
        raise HTTPException(404, "Application not found")
    if app.status != "pending":
        raise HTTPException(400, "Application already processed")

    app.status = "approved"
    prop = app.property
    if prop.available_flats > 0:
        prop.available_flats -= 1
    db.commit()
    return {"message": "Application approved successfully"}


@router.post("/applications/{app_id}/rejected")
def reject_application(
    app_id: int,
    db: Session = Depends(database.get_db),
    admin: models.Admin = Depends(get_current_admin)
):
    app = db.query(models.Application).filter(
        models.Application.id == app_id
    ).first()
    if not app:
        raise HTTPException(404, "Application not found")
    app.status = "rejected"
    db.commit()
    return {"message": "Application rejected successfully"}