# create_admin.py
from app.utils import hash_password
from app.database import SessionLocal
from app.models import Admin

# Create DB session
db = SessionLocal()

# Admin details
email = "admin@tut.ac.za"
password = "admin123"

# Check if already exists
existing = db.query(Admin).filter(Admin.email == email).first()
if existing:
    print(f"Admin already exists: {email}")
else:
    # Hash password
    hashed = hash_password(password)
    # Create admin
    admin = Admin(email=email, hashed_password=hashed)
    db.add(admin)
    db.commit()
    print(f"Admin created successfully!")
    print(f"   Email: {email}")
    print(f"   Password: {password}")
    print(f"   Hashed: {hashed}")