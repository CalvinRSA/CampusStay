# app/routers/uploads.py
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import boto3
import os
from uuid import uuid4

from .. import models, database

router = APIRouter(prefix="/uploads", tags=["Uploads"])

# ============ B2 / S3 CONFIG (from .env) ============
S3_ENDPOINT = os.getenv("B2_ENDPOINT")  # e.g., s3.ap-southeast-1.idrivee2.com
S3_REGION = os.getenv("B2_REGION")
S3_ACCESS_KEY = os.getenv("B2_ACCESS_KEY_ID")
S3_SECRET_KEY = os.getenv("B2_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv("B2_BUCKET")

if not all([S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET]):
    raise RuntimeError("Missing B2/S3 environment variables!")

s3_client = boto3.client(
    "s3",
    endpoint_url=f"https://{S3_ENDPOINT}",
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY,
    region_name=S3_REGION,
)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}


@router.post("/residence/{residence_id}", response_model=dict)
async def upload_residence_images(
    residence_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(database.get_db),
):
    residence = db.query(models.Residence).filter(models.Residence.id == residence_id).first()
    if not residence:
        raise HTTPException(status_code=404, detail="Residence not found")

    uploaded_urls = []

    for file in files:
        # Security: validate extension
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")

        # Unique key
        key = f"residences/{residence_id}/{uuid4().hex}{ext}"

        # Upload directly to B2
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=await file.read(),
            ContentType=file.content_type or "application/octet-stream",
            ACL="public-read",  # Makes images viewable in browser
        )

        # Public URL
        url = f"https://{S3_BUCKET}.{S3_ENDPOINT}/{key}"
        uploaded_urls.append(url)

        # Save URL in DB
        db_image = models.Image(file_path=url, residence_id=residence_id)
        db.add(db_image)

    db.commit()
    return {"uploaded_files": uploaded_urls}


@router.get("/residence/{residence_id}", response_model=List[str])
def get_residence_images(residence_id: int, db: Session = Depends(database.get_db)):
    images = db.query(models.Image).filter(models.Image.residence_id == residence_id).all()
    return [img.file_path for img in images]