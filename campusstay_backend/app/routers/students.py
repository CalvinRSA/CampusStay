# app/routers/student.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
from .. import models, database
from .auth import get_current_user
import boto3
import os
from uuid import uuid4

router = APIRouter(prefix="/student", tags=["Student"])

# B2/S3 Client
s3_client = boto3.client(
    "s3",
    endpoint_url=f"https://{os.getenv('B2_ENDPOINT')}",
    aws_access_key_id=os.getenv("B2_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("B2_SECRET_ACCESS_KEY"),
    region_name=os.getenv("B2_REGION"),
)
S3_BUCKET = os.getenv("B2_BUCKET")

def get_current_student(current_user=Depends(get_current_user)):
    if not hasattr(current_user, "campus"):
        raise HTTPException(403, "Student access only")
    return current_user


# Upload ID + POR (saves to S3 + student table)
@router.post("/upload-documents")
async def upload_documents(
    id_copy: UploadFile = File(...),
    proof_of_registration: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    student: models.Student = Depends(get_current_student),
):
    for f in [id_copy, proof_of_registration]:
        if f.content_type not in {"application/pdf", "image/jpeg", "image/jpg", "image/png"}:
            raise HTTPException(400, "Invalid file type")

    # ID Copy
    id_key = f"students/{student.id}/id_{uuid4().hex}.pdf"
    s3_client.put_object(Bucket=S3_BUCKET, Key=id_key, Body=await id_copy.read(), ACL="private")
    student.id_document_url = f"https://{S3_BUCKET}.{os.getenv('B2_ENDPOINT')}/{id_key}"

    # Proof of Registration
    por_key = f"students/{student.id}/por_{uuid4().hex}.pdf"
    s3_client.put_object(Bucket=S3_BUCKET, Key=por_key, Body=await proof_of_registration.read(), ACL="private")
    student.proof_of_registration_url = f"https://{S3_BUCKET}.{os.getenv('B2_ENDPOINT')}/{por_key}"

    db.commit()
    return {"message": "Documents uploaded to cloud"}


# Apply
@router.post("/apply/{property_id}")
def apply(property_id: int, notes: str = Form(""), db: Session = Depends(database.get_db), student: models.Student = Depends(get_current_student)):
    prop = db.query(models.Property).filter(models.Property.id == property_id, models.Property.available_flats > 0).first()
    if not prop:
        raise HTTPException(400, "Property unavailable")
    if db.query(models.Application).filter_by(student_id=student.id, property_id=property_id).first():
        raise HTTPException(400, "Already applied")

    app = models.Application(student_id=student.id, property_id=property_id, notes=notes)
    db.add(app)
    db.commit()
    return {"message": "Applied successfully"}


# My Applications - returns document URLs from student table
@router.get("/my-applications")
def my_applications(db: Session = Depends(database.get_db), student: models.Student = Depends(get_current_student)):
    apps = db.query(models.Application).filter_by(student_id=student.id).all()
    result = []
    for a in apps:
        p = a.property
        result.append({
            "id": a.id,
            "property_id": p.id,
            "property_title": p.title,
            "property_address": p.address,
            "status": a.status,
            "applied_at": a.applied_at.isoformat(),
            "notes": a.notes,
            "funding_approved": a.funding_approved,
            "proof_of_registration": student.proof_of_registration_url,
            "id_copy": student.id_document_url,
        })
    return result


# Update Application (documents + funding)
@router.put("/applications/{app_id}")
async def update_app(
    app_id: int,
    proof_of_registration: UploadFile = File(None),
    id_copy: UploadFile = File(None),
    funding_approved: bool = Form(False),
    db: Session = Depends(database.get_db),
    student: models.Student = Depends(get_current_student),
):
    app = db.query(models.Application).filter_by(id=app_id, student_id=student.id).first()
    if not app or app.status != "pending":
        raise HTTPException(400, "Cannot update")

    if proof_of_registration:
        key = f"students/{student.id}/por_{uuid4().hex}.pdf"
        s3_client.put_object(Bucket=S3_BUCKET, Key=key, Body=await proof_of_registration.read(), ACL="private")
        student.proof_of_registration_url = f"https://{S3_BUCKET}.{os.getenv('B2_ENDPOINT')}/{key}"

    if id_copy:
        key = f"students/{student.id}/id_{uuid4().hex}.pdf"
        s3_client.put_object(Bucket=S3_BUCKET, Key=key, Body=await id_copy.read(), ACL="private")
        student.id_document_url = f"https://{S3_BUCKET}.{os.getenv('B2_ENDPOINT')}/{key}"

    app.funding_approved = funding_approved
    db.commit()
    return {"message": "Updated"}