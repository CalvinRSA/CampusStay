# app/routers/admin.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List
from sqlalchemy.orm import Session
from .. import models, database
from .auth import get_current_admin
import boto3
import os
from uuid import uuid4
from urllib.parse import urlparse

router = APIRouter(prefix="/admin", tags=["Admin"])

# ==================== B2 / S3 CONFIG ====================
S3_ENDPOINT = os.getenv("B2_ENDPOINT")
S3_REGION = os.getenv("B2_REGION")
S3_ACCESS_KEY = os.getenv("B2_ACCESS_KEY_ID")
S3_SECRET_KEY = os.getenv("B2_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv("B2_BUCKET")

if not all([S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET]):
    raise RuntimeError("Missing B2/S3 environment variables in .env!")

s3_client = boto3.client(
    "s3",
    endpoint_url=f"https://{S3_ENDPOINT}",
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY,
    region_name=S3_REGION,
)

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".pdf"}


# ==================== CORRECT KEY EXTRACTION FOR BACKBLAZE B2 ====================
def extract_key_from_url(url: str) -> str:
    """
    Backblaze B2 URLs are: https://s3.region.idrivee2.com/bucket-name/path/to/file.jpg
    This function correctly extracts: path/to/file.jpg
    """
    try:
        path = urlparse(url).path.lstrip("/")
        if path.startswith(f"{S3_BUCKET}/"):
            return path[len(f"{S3_BUCKET}/"):]
        return path
    except:
        return ""


# ==================== CREATE PROPERTY - FIXED URL FORMAT ====================
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
    current_admin: models.Admin = Depends(get_current_admin),
):
    if not (1 <= len(images) <= 5):
        raise HTTPException(status_code=400, detail="Please upload 1 to 5 images")

    for img in images:
        if not img.content_type or not img.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"{img.filename} is not a valid image")

    db_property = models.Property(
        title=title,
        address=address,
        is_bachelor=is_bachelor,
        available_flats=available_flats,
        total_flats=available_flats,
        space_per_student=space_per_student,
        campus_intake=campus_intake,
        admin_id=current_admin.id,
    )
    db.add(db_property)
    db.commit()
    db.refresh(db_property)

    for img in images:
        ext = os.path.splitext(img.filename)[1].lower()
        if ext not in ALLOWED_EXT:
            raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")

        key = f"properties/{db_property.id}/{uuid4().hex}{ext}"
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=await img.read(),
            ContentType=img.content_type or "application/octet-stream",
            ACL="public-read",
        )
        # CORRECT B2 URL: endpoint/bucket/key
        url = f"https://{S3_ENDPOINT}/{S3_BUCKET}/{key}"
        db_image = models.PropertyImage(property_id=db_property.id, image_url=url)
        db.add(db_image)

    db.commit()
    return {"message": "Property created successfully", "property_id": db_property.id}


# ==================== GET PROPERTIES ====================
@router.get("/properties")
def get_properties(
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    properties = db.query(models.Property).filter(models.Property.admin_id == current_admin.id).all()
    result = []
    for p in properties:
        images = [img.image_url for img in p.images]
        result.append({
            "id": p.id,
            "title": p.title,
            "address": p.address,
            "is_bachelor": p.is_bachelor,
            "available_flats": p.available_flats,
            "total_flats": p.total_flats,
            "space_per_student": p.space_per_student,
            "campus_intake": p.campus_intake,
            "image_urls": images,
        })
    return result


# ==================== UPDATE PROPERTY - FIXED URL + TYPO ====================
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
    current_admin: models.Admin = Depends(get_current_admin),
):
    db_property = db.query(models.Property).filter(
        models.Property.id == property_id,
        models.Property.admin_id == current_admin.id
    ).first()

    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")

    if title is not None: db_property.title = title
    if address is not None: db_property.address = address
    if is_bachelor is not None: db_property.is_bachelor = is_bachelor
    if available_flats is not None:
        db_property.available_flats = available_flats  # FIXED: was available_flats.available_flats
        if db_property.total_flats == db_property.available_flats:
            db_property.total_flats = available_flats
    if space_per_student is not None: db_property.space_per_student = space_per_student
    if campus_intake is not None: db_property.campus_intake = campus_intake

    # Delete removed images
    if remove_images:
        for url in remove_images:
            img_record = db.query(models.PropertyImage).filter(
                models.PropertyImage.property_id == property_id,
                models.PropertyImage.image_url == url
            ).first()
            if img_record:
                key = extract_key_from_url(url)
                try:
                    s3_client.delete_object(Bucket=S3_BUCKET, Key=key)
                except Exception:
                    pass
                db.delete(img_record)

    # Add new images
    current_images = db.query(models.PropertyImage).filter(models.PropertyImage.property_id == property_id).count()
    if new_images and (current_images - len(remove_images) + len(new_images) > 5):
        raise HTTPException(status_code=400, detail="Maximum 5 images allowed")

    for img in new_images:
        if not img.content_type or not img.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"{img.filename} is not a valid image")
        ext = os.path.splitext(img.filename)[1].lower()
        if ext not in ALLOWED_EXT:
            raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")

        key = f"properties/{property_id}/{uuid4().hex}{ext}"
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=await img.read(),
            ContentType=img.content_type or "application/octet-stream",
            ACL="public-read",
        )
        # CORRECT B2 URL
        url = f"https://{S3_ENDPOINT}/{S3_BUCKET}/{key}"
        db.add(models.PropertyImage(property_id=property_id, image_url=url))

    db.commit()
    return {"message": "Property updated successfully"}


# ==================== DELETE PROPERTY - SAFE & WORKING ====================
@router.delete("/properties/{property_id}")
def delete_property(
    property_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    db_property = db.query(models.Property).filter(
        models.Property.id == property_id,
        models.Property.admin_id == current_admin.id
    ).first()

    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")

    # Delete all images from B2
    for img in db_property.images:
        key = extract_key_from_url(img.image_url)
        try:
            s3_client.delete_object(Bucket=S3_BUCKET, Key=key)
        except Exception as e:
            print(f"Warning: Could not delete S3 object {key}: {e}")

    # Clean up relationships first
    db.query(models.Application).filter(models.Application.property_id == property_id).delete()
    db.query(models.PropertyImage).filter(models.PropertyImage.property_id == property_id).delete()

    # Delete property
    db.delete(db_property)
    db.commit()

    return {"message": "Property and all images permanently deleted"}


# ==================== VIEW STUDENT DOCUMENTS ====================
@router.get("/applications/{app_id}/documents")
def get_student_documents(
    app_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    student = app.student
    return {
        "student_name": student.full_name,
        "id_document_url": student.id_document_url or None,
        "proof_of_registration_url": student.proof_of_registration_url or None,
    }


# ==================== APPLICATIONS & STATS (unchanged) ====================
@router.get("/applications")
def get_applications(
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    applications = (
        db.query(models.Application, models.Student, models.Property)
        .join(models.Student, models.Application.student_id == models.Student.id)
        .join(models.Property, models.Application.property_id == models.Property.id)
        .all()
    )
    result = []
    for app, student, prop in applications:
        result.append({
            "id": app.id,
            "student_name": student.full_name,
            "student_email": student.email,
            "student_phone": student.phone_number,
            "property_id": prop.id,
            "property_title": prop.title,
            "status": app.status,
            "applied_at": app.applied_at.isoformat(),
        })
    return result


@router.get("/stats")
def get_stats(
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    properties = db.query(models.Property).filter(models.Property.admin_id == current_admin.id).all()
    total_properties = len(properties)
    total_applications = db.query(models.Application).join(models.Property).filter(models.Property.admin_id == current_admin.id).count()
    pending = db.query(models.Application).join(models.Property).filter(models.Property.admin_id == current_admin.id, models.Application.status == "pending").count()
    approved = db.query(models.Application).join(models.Property).filter(models.Property.admin_id == current_admin.id, models.Application.status == "approved").count()

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
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(404, "Application not found")
    if app.status != "pending":
        raise HTTPException(400, "Application already processed")

    app.status = "approved"
    prop = app.property
    if prop.available_flats > 0:
        prop.available_flats -= 1
    db.commit()
    return {"message": "Application approved"}


@router.post("/applications/{app_id}/rejected")
def reject_application(
    app_id: int,
    db: Session = Depends(database.get_db),
    admin: models.Admin = Depends(get_current_admin)
):
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(404, "Application not found")
    app.status = "rejected"
    db.commit()
    return {"message": "Application rejected"}