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

router = APIRouter(prefix="/applications", tags=["Applications"])

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


class ApplicationCreate(BaseModel):
    property_id: int
    notes: str = ""


@router.get("/my-applications")
def my_applications(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user)
):
    """Get all applications for current student - documents come from Student table"""
    applications = db.query(models.Application).filter(
        models.Application.student_id == current_user.id
    ).all()
    
    result = []
    for app in applications:
        prop = db.query(models.Property).filter(models.Property.id == app.property_id).first()
        
        # ✅ Documents are stored on the Student model, NOT Application model
        result.append({
            "id": app.id,
            "property_id": app.property_id,
            "property_title": prop.title if prop else "Unknown",
            "property_address": prop.address if prop else "Unknown",
            "status": app.status,
            "applied_at": app.applied_at.isoformat(),
            "notes": app.notes,
            "funding_approved": app.funding_approved,
            # ✅ Get documents from STUDENT table (current_user)
            "proof_of_registration": getattr(current_user, 'proof_of_registration_url', None),
            "id_copy": getattr(current_user, 'id_document_url', None),
        })
    
    return result


@router.post("/my-applications")
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user)
):
    """Submit a new application"""
    # Check if email is verified
    if not getattr(current_user, 'email_verified', False):
        raise HTTPException(
            status_code=403,
            detail="You must verify your email before applying. Please check your inbox."
        )
    
    # Check if student already applied
    existing = db.query(models.Application).filter(
        models.Application.student_id == current_user.id,
        models.Application.property_id == payload.property_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied to this property")

    # Validate property exists and has availability
    prop = db.query(models.Property).filter(
        models.Property.id == payload.property_id
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if prop.available_flats <= 0:
        raise HTTPException(status_code=400, detail="This property is fully booked")

    # Create new application
    new_app = models.Application(
        student_id=current_user.id,
        property_id=payload.property_id,
        status="pending",
        notes=payload.notes,
        funding_approved=False
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    
    # Send confirmation email
    try:
        send_application_confirmation_email(
            student_email=current_user.email,
            student_name=current_user.full_name,
            property_title=prop.title,
            property_address=prop.address
        )
        print(f"✅ Confirmation email sent to {current_user.email}")
    except Exception as e:
        print(f"⚠️ Failed to send confirmation email: {str(e)}")
    
    return {
        "message": "Application submitted successfully! Check your email for next steps.",
        "application_id": new_app.id
    }


@router.put("/my-applications/{app_id}")
async def update_application(
    app_id: int,
    proof_of_registration: Optional[UploadFile] = File(None),
    id_copy: Optional[UploadFile] = File(None),
    funding_approved: bool = Form(False),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user)
):
    """Update application - stores documents on STUDENT table"""
    # Find application
    app = db.query(models.Application).filter(
        models.Application.id == app_id,
        models.Application.student_id == current_user.id
    ).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if app.status != "pending":
        raise HTTPException(status_code=400, detail="Cannot edit application that is not pending")
    
    documents_uploaded = False
    
    # ✅ Upload proof of registration to R2 - store on STUDENT table
    if proof_of_registration and proof_of_registration.filename:
        if proof_of_registration.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Proof of registration must be PDF")
        
        # Delete old file if exists
        if hasattr(current_user, 'proof_of_registration_url') and current_user.proof_of_registration_url:
            try:
                old_key = current_user.proof_of_registration_url.replace(f"{R2_PUBLIC_URL}/", "")
                s3_client.delete_object(Bucket=R2_BUCKET, Key=old_key)
            except Exception as e:
                print(f"Failed to delete old proof of registration: {e}")
        
        key = f"documents/{current_user.id}/por_{uuid4().hex}.pdf"
        s3_client.put_object(
            Bucket=R2_BUCKET,
            Key=key,
            Body=await proof_of_registration.read(),
            ContentType="application/pdf",
            ACL="public-read"
        )
        current_user.proof_of_registration_url = get_public_url(key)
        documents_uploaded = True
    
    # ✅ Upload ID copy to R2 - store on STUDENT table
    if id_copy and id_copy.filename:
        if id_copy.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="ID copy must be PDF")
        
        # Delete old file if exists
        if hasattr(current_user, 'id_document_url') and current_user.id_document_url:
            try:
                old_key = current_user.id_document_url.replace(f"{R2_PUBLIC_URL}/", "")
                s3_client.delete_object(Bucket=R2_BUCKET, Key=old_key)
            except Exception as e:
                print(f"Failed to delete old ID copy: {e}")
        
        key = f"documents/{current_user.id}/id_{uuid4().hex}.pdf"
        s3_client.put_object(
            Bucket=R2_BUCKET,
            Key=key,
            Body=await id_copy.read(),
            ContentType="application/pdf",
            ACL="public-read"
        )
        current_user.id_document_url = get_public_url(key)
        documents_uploaded = True
    
    # Update funding status on Application table
    app.funding_approved = funding_approved
    
    db.commit()
    
    return {
        "message": "Application updated successfully! Your documents will be reviewed shortly.",
        "proof_of_registration": getattr(current_user, 'proof_of_registration_url', None),
        "id_copy": getattr(current_user, 'id_document_url', None),
        "funding_approved": app.funding_approved
    }


@router.delete("/my-applications/{app_id}")
def delete_my_application(
    app_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user)
):
    """Delete a student's own application (only if pending)"""
    app = db.query(models.Application).filter(
        models.Application.id == app_id,
        models.Application.student_id == current_user.id
    ).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if app.status != "pending":
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete applications that have been processed. Please contact administration."
        )
    
    db.delete(app)
    db.commit()
    
    return {"message": "Application deleted successfully"}