from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List
from sqlalchemy.orm import Session
from .. import models, schemas, database
from .auth import get_current_admin
import os
import uuid

router = APIRouter(prefix="/admin", tags=["Admin"])

# ==================== CREATE PROPERTY ====================
@router.post("/properties")
async def create_property(
    title: str = Form(...),
    address: str = Form(...),
    is_bachelor: bool = Form(False),
    available_flats: int = Form(...),
    space_per_student: float = Form(...),
    campus_intake: str = Form(...),    # NEW FIELD
    images: List[UploadFile] = File(...),
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    if not (1 <= len(images) <= 5):
        raise HTTPException(status_code=400, detail="Please upload 1 to 5 images")

    for img in images:
        if not img.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"{img.filename} is not an image")

    db_property = models.Property(
    title=title,
    address=address,
    is_bachelor=is_bachelor,
    available_flats=available_flats,
    total_flats=available_flats,
    space_per_student=space_per_student,
    campus_intake=campus_intake,       # NEW FIELD
    admin_id=current_admin.id,
)

    db.add(db_property)
    db.commit()
    db.refresh(db_property)

    upload_dir = "static/uploads/properties"
    os.makedirs(upload_dir, exist_ok=True)

    for img in images:
        file_ext = img.filename.split(".")[-1].lower()
        filename = f"{uuid.uuid4()}.{file_ext}"
        file_path = os.path.join(upload_dir, filename)

        with open(file_path, "wb") as f:
            content = await img.read()
            f.write(content)

        db_image = models.PropertyImage(
            property_id=db_property.id,
            image_url=f"/uploads/properties/{filename}"
        )
        db.add(db_image)

    db.commit()

    return {"message": "Property created", "property_id": db_property.id}


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
            "campus_intake": p.campus_intake,    # NEW FIELD INCLUDED
            "image_urls": images,
        })

    return result

# ==================== UPDATE PROPERTY ====================
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
    remove_images: List[str] = Form(default=[]),  # List of image URLs to delete
    db: Session = Depends(database.get_db),
    current_admin: models.Admin = Depends(get_current_admin),
):
    # Find the property
    db_property = db.query(models.Property).filter(
        models.Property.id == property_id,
        models.Property.admin_id == current_admin.id
    ).first()

    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")

    # Update text fields if provided
    if title is not None:
        db_property.title = title
    if address is not None:
        db_property.address = address
    if is_bachelor is not None:
        db_property.is_bachelor = is_bachelor
    if available_flats is not None:
        db_property.available_flats = available_flats
        # Update total_flats only if it's currently equal to old available_flats
        if db_property.total_flats == db_property.available_flats:
            db_property.total_flats = available_flats
    if space_per_student is not None:
        db_property.space_per_student = space_per_student
    if campus_intake is not None:
        db_property.campus_intake = campus_intake

    # Handle image removal
    if remove_images:
        for url in remove_images:
            # Remove from database
            image_to_remove = db.query(models.PropertyImage).filter(
                models.PropertyImage.property_id == property_id,
                models.PropertyImage.image_url == url
            ).first()
            if image_to_remove:
                db.delete(image_to_remove)
                # Also delete physical file
                file_path = os.path.join("static", url.lstrip("/"))
                if os.path.exists(file_path):
                    os.remove(file_path)

    # Handle new image uploads
    if new_images:
        if len(new_images) + len(db_property.images) - len(remove_images) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 images allowed")

        upload_dir = "static/uploads/properties"
        os.makedirs(upload_dir, exist_ok=True)

        for img in new_images:
            if not img.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail=f"{img.filename} is not an image")

            file_ext = img.filename.split(".")[-1].lower()
            filename = f"{uuid.uuid4()}.{file_ext}"
            file_path = os.path.join(upload_dir, filename)

            with open(file_path, "wb") as f:
                content = await img.read()
                f.write(content)

            db_image = models.PropertyImage(
                property_id=db_property.id,
                image_url=f"/uploads/properties/{filename}"
            )
            db.add(db_image)

    db.commit()
    db.refresh(db_property)

    return {"message": "Property updated successfully", "property_id": db_property.id}

# ==================== GET APPLICATIONS ====================
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


# ==================== GET STATS ====================
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
def approve_application(app_id: int, db: Session = Depends(database.get_db), admin: models.Admin = Depends(get_current_admin)):
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(404, "Application not found")
    if app.status != "pending":
        raise HTTPException(400, "Application already processed")
    
    app.status = "approved"
    # Decrease available flats
    prop = app.property
    if prop.available_flats > 0:
        prop.available_flats -= 1
    db.commit()
    return {"message": "Application approved"}

@router.post("/applications/{app_id}/rejected")
def reject_application(app_id: int, db: Session = Depends(database.get_db), admin: models.Admin = Depends(get_current_admin)):
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(404, "Application not found")
    app.status = "rejected"
    db.commit()
    return {"message": "Application rejected"}