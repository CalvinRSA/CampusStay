from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, database
import os
import shutil
from typing import List

router = APIRouter(prefix="/uploads", tags=["Uploads"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/residence/{residence_id}", response_model=dict)
def upload_residence_images(
    residence_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(database.get_db)
):
    residence = db.query(models.Residence).filter(models.Residence.id == residence_id).first()
    if not residence:
        raise HTTPException(status_code=404, detail="Residence not found")

    saved_files = []
    for file in files:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        new_image = models.Image(file_path=file_path, residence_id=residence_id)
        db.add(new_image)
        saved_files.append(file.filename)

    db.commit()
    return {"uploaded_files": saved_files}


@router.get("/residence/{residence_id}", response_model=List[str])
def get_residence_images(residence_id: int, db: Session = Depends(database.get_db)):
    images = db.query(models.Image).filter(models.Image.residence_id == residence_id).all()
    return [img.file_path for img in images]
