# app/routers/property.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, database

# ✅ IMPORTANT: Set redirect_slashes=False to prevent 307 redirects
router = APIRouter(prefix="/properties", tags=["Properties"], redirect_slashes=False)


# ✅ GET ALL PROPERTIES (Public - No auth required)
@router.get("")  # This matches /properties exactly (no trailing slash)
def get_properties(db: Session = Depends(database.get_db)):
    """Get all properties (public endpoint)"""
    try:
        properties = db.query(models.Property).all()
        
        result = []
        for prop in properties:
            # ✅ Build image_urls from the images relationship
            image_urls = [img.image_url for img in prop.images] if prop.images else []
            
            result.append({
                "id": prop.id,
                "title": prop.title,
                "address": prop.address,
                "is_bachelor": prop.is_bachelor,
                "available_flats": prop.available_flats,
                "total_flats": prop.total_flats,
                "space_per_student": prop.space_per_student,
                "campus_intake": prop.campus_intake,
                "image_urls": image_urls,
            })
        
        return result
    except Exception as e:
        print(f"❌ Error in get_properties: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching properties: {str(e)}")


# ✅ GET SINGLE PROPERTY (Public)
@router.get("/{property_id}")
def get_property(property_id: int, db: Session = Depends(database.get_db)):
    """Get a single property by ID"""
    prop = db.query(models.Property).filter(models.Property.id == property_id).first()
    
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # ✅ Build image_urls from the images relationship
    image_urls = [img.image_url for img in prop.images] if prop.images else []
    
    return {
        "id": prop.id,
        "title": prop.title,
        "address": prop.address,
        "is_bachelor": prop.is_bachelor,
        "available_flats": prop.available_flats,
        "total_flats": prop.total_flats,
        "space_per_student": prop.space_per_student,
        "campus_intake": prop.campus_intake,
        "image_urls": image_urls,
    }