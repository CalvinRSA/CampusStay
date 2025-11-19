# app/routers/students.py - UPDATED VERSION
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from .. import models, database
from .auth import get_current_user
import boto3
import os
from uuid import uuid4
from botocore.client import Config

router = APIRouter()

# Cloudflare R2 Configuration
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_BUCKET = os.getenv("R2_BUCKET")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL")

if not all([R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET, R2_PUBLIC_URL]):
    raise RuntimeError("Missing R2 configuration. Please check environment variables.")

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


def get_current_student(user=Depends(get_current_user)):
    """Verify the current user is a student"""
    if not hasattr(user, "campus"):
        raise HTTPException(403, "Student access only")
    return user


@router.get("/applications/my-applications")
def get_my_applications(
    db: Session = Depends(database.get_db),
    student: models.Student = Depends(get_current_student)
):
    """Get all applications for the current student"""
    apps = db.query(models.Application).filter(
        models.Application.student_id == student.id
    ).all()
    
    result = []
    for app in apps:
        result.append({
            "id": app.id,
            "property_id": app.property.id,
            "property_title": app.property.title,
            "property_address": app.property.address,
            "status": app.status,
            "applied_at": app.applied_at.isoformat(),
            "notes": app.notes,
            "funding_approved": app.funding_approved,
            "proof_of_registration": getattr(student, 'proof_of_registration_url', None),
            "id_copy": getattr(student, 'id_document_url', None),
        })
    
    return result


@router.post("/applications/my-applications")
def create_application(
    data: dict,
    db: Session = Depends(database.get_db),
    student: models.Student = Depends(get_current_student)
):
    """Submit a new application for a property"""
    property_id = data.get("property_id")
    notes = data.get("notes", "")
    
    # Validate property exists
    prop = db.query(models.Property).filter(
        models.Property.id == property_id
    ).first()
    if not prop:
        raise HTTPException(404, "Property not found")
    
    # Check if student already applied
    existing = db.query(models.Application).filter(
        models.Application.student_id == student.id,
        models.Application.property_id == property_id
    ).first()
    if existing:
        raise HTTPException(400, "You have already applied to this property")
    
    # Check availability
    if prop.available_flats <= 0:
        raise HTTPException(400, "This property is fully booked")
    
    # Create application
    app = models.Application(
        student_id=student.id,
        property_id=property_id,
        notes=notes,
        status="pending"
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    
    return {
        "message": "Application submitted successfully",
        "application_id": app.id
    }


@router.put("/applications/my-applications/{app_id}")
async def update_application(
    app_id: int,
    proof_of_registration: UploadFile = File(None),
    id_copy: UploadFile = File(None),
    funding_approved: bool = Form(False),
    db: Session = Depends(database.get_db),
    student: models.Student = Depends(get_current_student),
):
    """Update application with documents and funding status"""
    # Verify application belongs to student
    app = db.query(models.Application).filter(
        models.Application.id == app_id,
        models.Application.student_id == student.id
    ).first()
    
    if not app:
        raise HTTPException(404, "Application not found")
    
    if app.status != "pending":
        raise HTTPException(400, "Can only update pending applications")

    # Upload proof of registration to R2
    if proof_of_registration:
        if proof_of_registration.content_type != "application/pdf":
            raise HTTPException(400, "Proof of registration must be a PDF file")
        
        # Delete old file if exists
        if hasattr(student, 'proof_of_registration_url') and student.proof_of_registration_url:
            try:
                old_key = student.proof_of_registration_url.replace(f"{R2_PUBLIC_URL}/", "")
                s3_client.delete_object(Bucket=R2_BUCKET, Key=old_key)
            except Exception as e:
                print(f"Failed to delete old proof of registration: {e}")
        
        key = f"documents/{student.id}/por_{uuid4().hex}.pdf"
        s3_client.put_object(
            Bucket=R2_BUCKET,
            Key=key,
            Body=await proof_of_registration.read(),
            ContentType="application/pdf",
            ACL="public-read"
        )
        student.proof_of_registration_url = get_public_url(key)

    # Upload ID copy to R2
    if id_copy:
        if id_copy.content_type != "application/pdf":
            raise HTTPException(400, "ID copy must be a PDF file")
        
        # Delete old file if exists
        if hasattr(student, 'id_document_url') and student.id_document_url:
            try:
                old_key = student.id_document_url.replace(f"{R2_PUBLIC_URL}/", "")
                s3_client.delete_object(Bucket=R2_BUCKET, Key=old_key)
            except Exception as e:
                print(f"Failed to delete old ID copy: {e}")
        
        key = f"documents/{student.id}/id_{uuid4().hex}.pdf"
        s3_client.put_object(
            Bucket=R2_BUCKET,
            Key=key,
            Body=await id_copy.read(),
            ContentType="application/pdf",
            ACL="public-read"
        )
        student.id_document_url = get_public_url(key)

    # Update funding status
    app.funding_approved = funding_approved
    
    db.commit()
    
    return {
        "message": "Application updated successfully",
        "proof_of_registration": getattr(student, 'proof_of_registration_url', None),
        "id_copy": getattr(student, 'id_document_url', None),
        "funding_approved": app.funding_approved
    }


@router.delete("/applications/my-applications/{app_id}")
def delete_my_application(
    app_id: int,
    db: Session = Depends(database.get_db),
    student: models.Student = Depends(get_current_student)
):
    """Delete a student's own application (only if pending)"""
    app = db.query(models.Application).filter(
        models.Application.id == app_id,
        models.Application.student_id == student.id
    ).first()
    
    if not app:
        raise HTTPException(404, "Application not found")
    
    if app.status != "pending":
        raise HTTPException(
            400, 
            "Cannot delete applications that have been processed. Please contact administration."
        )
    
    db.delete(app)
    db.commit()
    
    return {"message": "Application deleted successfully"}