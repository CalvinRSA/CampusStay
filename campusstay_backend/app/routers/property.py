from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models, database

router = APIRouter(prefix="/properties", tags=["Properties"])

@router.get("/")
def get_properties(db: Session = Depends(database.get_db)):
    props = db.query(models.Property).all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "address": p.address,
            "is_bachelor": p.is_bachelor,
            "available_flats": p.available_flats,
            "total_flats": p.total_flats,
            "space_per_student": p.space_per_student,
            "campus_intake": p.campus_intake,
            "image_urls": [img.image_url for img in p.images],
        }
        for p in props
    ]
