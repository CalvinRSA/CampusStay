# app/routers/student.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, database
from .auth import get_current_user  # ← Use this (already exists!)

router = APIRouter(prefix="/student", tags=["Student"])

# Add this function if not in auth.py (add it there too!)
def get_current_student(current_user=Depends(get_current_user)):
    if not hasattr(current_user, 'campus'):  # Students have .campus, Admins don't
        raise HTTPException(status_code=403, detail="Student access required")
    return current_user

@router.get("/recommended-properties")
def recommended_properties(
    db: Session = Depends(database.get_db),
    current_student: models.Student = Depends(get_current_student),
):
    student_campus = current_student.campus.strip().lower()

    properties = db.query(models.Property).all()
    matches = []

    for p in properties:
        if not p.campus_intake:
            continue

        # Support both comma-separated and single campus
        campuses = [c.strip().lower() for c in p.campus_intake.split(",")]
        if student_campus in campuses:
            matches.append({
                "id": p.id,
                "title": p.title,
                "address": p.address,
                "is_bachelor": p.is_bachelor,
                "available_flats": p.available_flats,
                "total_flats": p.total_flats,
                "space_per_student": p.space_per_student,
                "campus_intake": p.campus_intake,
                "image_urls": [img.image_url for img in p.images],
            })

    return matches