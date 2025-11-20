from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from .. import models, database
from .auth import get_current_user
from pydantic import BaseModel
import os
import uuid

router = APIRouter(prefix="/applications", tags=["Applications"])

class ApplicationCreate(BaseModel):
    property_id: int
    notes: str = ""

@router.get("/my-applications")
def my_applications(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user)
):
    applications = db.query(models.Application).filter(
        models.Application.student_id == current_user.id
    ).all()
    
    result = []
    for app in applications:
        prop = db.query(models.Property).filter(models.Property.id == app.property_id).first()
        result.append({
            "id": app.id,
            "property_id": app.property_id,
            "property_title": prop.title if prop else "Unknown",
            "property_address": prop.address if prop else "Unknown",
            "status": app.status,
            "applied_at": app.applied_at.isoformat(),
            "notes": app.notes,
            "proof_of_registration": app.proof_of_registration,
            "id_copy": app.id_copy,
            "funding_approved": app.funding_approved,
        })
    
    return result

@router.post("/my-applications")
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user)
):
    # Check if student already applied
    existing = db.query(models.Application).filter(
        models.Application.student_id == current_user.id,
        models.Application.property_id == payload.property_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied to this property")

    # Create new application
    new_app = models.Application(
        student_id=current_user.id,
        property_id=payload.property_id,
        status="pending",
        notes=payload.notes,
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    return {"message": "Application submitted successfully!", "application": new_app}

@router.put("/my-applications/{app_id}")
async def update_application(
    app_id: int,
    proof_of_registration: Optional[UploadFile] = File(None),
    id_copy: Optional[UploadFile] = File(None),
    funding_approved: bool = Form(False),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user)
):
    # Find application
    app = db.query(models.Application).filter(
        models.Application.id == app_id,
        models.Application.student_id == current_user.id
    ).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if app.status != "pending":
        raise HTTPException(status_code=400, detail="Cannot edit application that is not pending")
    
    upload_dir = "static/uploads/applications"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Handle proof of registration upload
    if proof_of_registration and proof_of_registration.filename:
        if not proof_of_registration.content_type == "application/pdf":
            raise HTTPException(status_code=400, detail="Proof of registration must be PDF")
        
        filename = f"{uuid.uuid4()}.pdf"
        file_path = os.path.join(upload_dir, filename)
        
        with open(file_path, "wb") as f:
            content = await proof_of_registration.read()
            f.write(content)
        
        # Delete old file if exists
        if app.proof_of_registration:
            old_path = os.path.join("static", app.proof_of_registration.lstrip("/"))
            if os.path.exists(old_path):
                os.remove(old_path)
        
        app.proof_of_registration = f"/uploads/applications/{filename}"
    
    # Handle ID copy upload
    if id_copy and id_copy.filename:
        if not id_copy.content_type == "application/pdf":
            raise HTTPException(status_code=400, detail="ID copy must be PDF")
        
        filename = f"{uuid.uuid4()}.pdf"
        file_path = os.path.join(upload_dir, filename)
        
        with open(file_path, "wb") as f:
            content = await id_copy.read()
            f.write(content)
        
        # Delete old file if exists
        if app.id_copy:
            old_path = os.path.join("static", app.id_copy.lstrip("/"))
            if os.path.exists(old_path):
                os.remove(old_path)
        
        app.id_copy = f"/uploads/applications/{filename}"
    
    # Update funding status
    app.funding_approved = funding_approved
    
    db.commit()
    db.refresh(app)
    
    return {"message": "Application updated successfully", "application_id": app.id}