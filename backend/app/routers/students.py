# app/routers/students.py - CLEAN VERSION

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from .. import models, database
from .auth import get_current_user
from ..core.email_utils import send_application_confirmation_email
from pydantic import BaseModel
import boto3
import os
from uuid import uuid4
from botocore.client import Config

# ✅ Set redirect_slashes=False
router = APIRouter(prefix="/applications", tags=["Students"], redirect_slashes=False)

# Cloudflare R2 Configuration
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_BUCKET = os.getenv("R2_BUCKET")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL")

if not all([R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET, R2_PUBLIC_URL]):
    print("⚠️ Warning: R2 configuration missing. File uploads will not work.")
    s3_client = None
else:
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


class ApplicationCreate(BaseModel):
    property_id: int
    notes: str = ""


# ✅ GET MY APPLICATIONS
@router.get("/my-applications")
def get_my_applications(
    db: Session = Depends(database.get_db),
    student: models.Student = Depends(get_current_student)
):
    """Get all applications for the current student"""
    applications = db.query(models.Application).filter(
        models.Application.student_id == student.id
    ).all()
    
    result = []
    for app in applications:
        prop = db.query(models.Property).filter(models.Property.id == app.property_id).first()
        
        result.append({
            "id": app.id,
            "property_id": app.property_id,
            "property_title": prop.title if prop else "Unknown Property",
            "property_address": prop.address if prop else "Unknown Address",
            "status": app.status,
            "applied_at": app.applied_at.isoformat(),
            "notes": app.notes,
            "funding_approved": app.funding_approved,
            # Documents from STUDENT table
            "proof_of_registration": getattr(student, 'proof_of_registration_url', None),
            "id_copy": getattr(student, 'id_document_url', None),
        })
    
    return result


# ✅ CREATE APPLICATION
@router.post("/my-applications")
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(database.get_db),
    student: models.Student = Depends(get_current_student)
):
    """Submit a new application for a property"""
    # Check if email is verified
    if not student.email_verified:
        raise HTTPException(
            status_code=403,
            detail="You must verify your email before applying. Please check your inbox for the verification link."
        )
    
    # Check if student already applied
    existing = db.query(models.Application).filter(
        models.Application.student_id == student.id,
        models.Application.property_id == payload.property_id
    ).first()
    if existing:
        raise HTTPException(400, "You have already applied to this property")
    
    # Validate property exists
    prop = db.query(models.Property).filter(
        models.Property.id == payload.property_id
    ).first()
    if not prop:
        raise HTTPException(404, "Property not found")
    
    # Check availability
    if prop.available_flats <= 0:
        raise HTTPException(400, "This property is fully booked")
    
    # Create application
    app = models.Application(
        student_id=student.id,
        property_id=payload.property_id,
        notes=payload.notes,
        status="pending",
        funding_approved=False
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    
    # Send confirmation email
    try:
        send_application_confirmation_email(
            student_email=student.email,
            student_name=student.full_name,
            property_title=prop.title,
            property_address=prop.address
        )
        print(f"✅ Confirmation email sent to {student.email}")
    except Exception as e:
        print(f"⚠️ Failed to send confirmation email: {str(e)}")
    
    return {
        "message": "Application submitted successfully! Check your email for next steps.",
        "application_id": app.id
    }


# ✅ UPDATE APPLICATION (with documents)
@router.put("/my-applications/{app_id}")
async def update_application(
    app_id: int,
    proof_of_registration: Optional[UploadFile] = File(None),
    id_copy: Optional[UploadFile] = File(None),
    funding_approved: bool = Form(False),
    db: Session = Depends(database.get_db),
    student: models.Student = Depends(get_current_student)
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
    
    if not s3_client:
        raise HTTPException(500, "File upload service is not configured")
    
    documents_uploaded = False
    
    # Upload proof of registration to R2
    if proof_of_registration and proof_of_registration.filename:
        if proof_of_registration.content_type != "application/pdf":
            raise HTTPException(400, "Proof of registration must be a PDF file")
        
        # Delete old file if exists
        if student.proof_of_registration_url:
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
        documents_uploaded = True
    
    # Upload ID copy to R2
    if id_copy and id_copy.filename:
        if id_copy.content_type != "application/pdf":
            raise HTTPException(400, "ID copy must be a PDF file")
        
        # Delete old file if exists
        if student.id_document_url:
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
        documents_uploaded = True
    
    # Update funding status
    app.funding_approved = funding_approved
    
    db.commit()
    
    return {
        "message": "Application updated successfully! Your documents will be reviewed shortly.",
        "proof_of_registration": student.proof_of_registration_url,
        "id_copy": student.id_document_url,
        "funding_approved": app.funding_approved
    }


# ✅ DELETE APPLICATION
@router.delete("/my-applications/{app_id}")
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