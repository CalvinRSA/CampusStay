# app/routers/auth.py
import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import timedelta

from .. import models, schemas, database
from ..core.security import create_access_token, verify_password, hash_password

# ── Config ─────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY not set in .env")

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


@router.get("/test")
def test_auth():
    return {"message": "Auth router is working! Secure login active."}


# ── STUDENT REGISTRATION (already secure) ─────
@router.post("/register", response_model=dict)
def register_student(
    student_in: schemas.StudentCreate,
    db: Session = Depends(database.get_db),
):
    if db.query(models.Student).filter(models.Student.email == student_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    if db.query(models.Student).filter(models.Student.student_number == student_in.student_number).first():
        raise HTTPException(status_code=400, detail="Student number already registered")

    hashed = hash_password(student_in.password)

    db_student = models.Student(
        full_name=student_in.full_name,
        email=student_in.email,
        phone_number=student_in.phone_number,
        student_number=student_in.student_number,
        campus=student_in.campus,
        hashed_password=hashed,
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)

    return {"message": "Student registered successfully!"}


# ── UNIFIED LOGIN (Admin + Student) ─────────────
# app/routers/auth.py — FINAL SECURE LOGIN (ADMIN + STUDENT)

@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db),
):
    email = form_data.username
    password = form_data.password

    # === TRY ADMIN LOGIN ===
    admin = db.query(models.Admin).filter(models.Admin.email == email).first()
    if admin:
        # If hashed_password exists → use secure verification
        if admin.hashed_password and verify_password(password, admin.hashed_password):
            access_token = create_access_token(
                data={"sub": admin.email, "role": "admin"},
                expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            )
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "role": "admin",
                "email": admin.email,
                "full_name": admin.full_name or "Admin"
            }
        
        # Fallback: if only plain password exists (old data)
        elif admin.password and admin.password == password:
            # Auto-upgrade to hashed on first login
            admin.hashed_password = hash_password(password)
            db.commit()
            access_token = create_access_token(
                data={"sub": admin.email, "role": "admin"},
                expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            )
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "role": "admin",
                "email": admin.email,
                "full_name": admin.full_name or "Admin"
            }

    # === TRY STUDENT LOGIN ===
    student = db.query(models.Student).filter(models.Student.email == email).first()
    if student and student.hashed_password and verify_password(password, student.hashed_password):
        access_token = create_access_token(
            data={"sub": student.email, "role": "student", "student_id": student.id},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": "student",
            "email": student.email,
            "full_name": student.full_name,
            "student_id": student.id
        }

    raise HTTPException(status_code=401, detail="Incorrect email or password")

# ── GET CURRENT USER (works for both admin & student) ─────
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(database.get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if not email or not role:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    if role == "admin":
        user = db.query(models.Admin).filter(models.Admin.email == email).first()
    else:  # student or unknown
        user = db.query(models.Student).filter(models.Student.email == email).first()

    if not user:
        raise credentials_exception

    return user

# TEMPORARY – DELETE AFTER FIRST ADMIN LOGIN
@router.post("/create-admin")
def create_admin(
    email: str = "admin@tut.ac.za",
    full_name: str = "Super Admin",
    password: str = "admin123",
    db: Session = Depends(database.get_db)
):
    if db.query(models.Admin).filter(models.Admin.email == email).first():
        return {"message": "Admin already exists"}

    hashed = hash_password(password)
    admin = models.Admin(
        email=email,
        full_name=full_name,
        hashed_password=hashed  # ← THIS IS NOW REQUIRED
    )
    db.add(admin)
    db.commit()
    return {"message": "Admin created! Login with admin@tut.ac.za / admin123"}

# ── Optional: Keep old get_current_admin for backward compatibility ─────
def get_current_admin(current_user=Depends(get_current_user)):
    if current_user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if current_user.__class__.__name__ != "Admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user

# Add this to auth.py
def get_current_student(current_user=Depends(get_current_user)):
    if not hasattr(current_user, 'campus'):
        raise HTTPException(status_code=403, detail="Student access required")
    return 

@router.get("/me")
def get_me(current_user = Depends(get_current_user)):
    if hasattr(current_user, 'campus'):  # Student
        return {
            "full_name": current_user.full_name,
            "email": current_user.email,
            "phone_number": current_user.phone_number,
            "student_number": current_user.student_number,
            "campus": current_user.campus,
        }
    else:  # Admin
        return {
            "full_name": current_user.full_name or "Admin",
            "email": current_user.email,
            "role": "admin"
        }