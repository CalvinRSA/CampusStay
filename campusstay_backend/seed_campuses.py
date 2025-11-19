# seed_campuses.py
from app import models, database
from sqlalchemy.orm import Session

campuses = [
    "Soshanguve North",
    "Soshanguve South",
    "Garankuwa Campus",
    "Arts Campus",
    "Arcadia Campus",
    "Pretoria Campus",
]

engine = database.engine
models.Base.metadata.create_all(bind=engine)

with Session(engine) as db:
    for name in campuses:
        if not db.query(models.Campus).filter(models.Campus.name == name).first():
            db.add(models.Campus(name=name))
    db.commit()
    print("Campuses seeded!")