# app/routers/auth.py
import os
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import timedelta, datetime, timezone

from .. import models, schemas, database
from ..core.security import create_access_token, verify_password, hash_password
from ..core.email_utils import send_verification_email

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


# ==================== REGISTER STUDENT ====================
@router.post("/register", response_model=dict)
def register_student(
    student_in: schemas.StudentCreate,
    db: Session = Depends(database.get_db),
):
    # Check if email already exists
    if db.query(models.Student).filter(models.Student.email == student_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if student number already exists
    if db.query(models.Student).filter(models.Student.student_number == student_in.student_number).first():
        raise HTTPException(status_code=400, detail="Student number already registered")

    # Hash password
    hashed = hash_password(student_in.password)

    # CREATE JWT VERIFICATION TOKEN
    verification_token = jwt.encode(
        {
            "sub": student_in.email,
            "type": "email_verification",
            "exp": datetime.now(timezone.utc) + timedelta(hours=24)
        },
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    # Create new student
    db_student = models.Student(
        full_name=student_in.full_name,
        email=student_in.email,
        phone_number=student_in.phone_number,
        student_number=student_in.student_number,
        campus=student_in.campus,
        hashed_password=hashed,
        email_verified=False,
        verification_token=verification_token,
        verification_token_expires=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)

    # SEND VERIFICATION EMAIL VIA GMAIL SMTP
    try:
        email_sent = send_verification_email(
            student_email=db_student.email,
            student_name=db_student.full_name,
            verification_token=verification_token
        )
        if email_sent:
            print(f"✅ Verification email sent to {db_student.email}")
        else:
            print(f"⚠️ Email not sent (check SMTP_USERNAME and SMTP_PASSWORD in .env)")
    except Exception as e:
        print(f"❌ Email failed: {e}")

    return {"message": "Registered! Check your email to verify your account."}


# ==================== VERIFY EMAIL ENDPOINT ====================
@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(database.get_db)):
    if not token:
        raise HTTPException(status_code=400, detail="No token provided")

    try:
        # Decode token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type = payload.get("type")

        # Must be email verification token
        if token_type != "email_verification":
            raise HTTPException(status_code=400, detail="Invalid token type")

        # Find student
        student = db.query(models.Student).filter(models.Student.email == email).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        # Already verified?
        if student.email_verified:
            return {"message": "Email already verified. You can log in."}

        # Token expired?
        expires = payload.get("exp")
        if datetime.now(timezone.utc) > datetime.fromtimestamp(expires, tz=timezone.utc):
            raise HTTPException(status_code=400, detail="Verification link has expired")

        # SUCCESS – Verify email
        student.email_verified = True
        student.verification_token = None
        student.verification_token_expires = None
        db.commit()

        return {"message": "Email verified successfully! You can now log in and apply for accommodation."}

    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or corrupted token")


# ==================== UNIFIED LOGIN (FIXED) ====================
@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db),
):
    email = form_data.username
    password = form_data.password

    # === TRY ADMIN LOGIN FIRST ===
    admin = db.query(models.Admin).filter(models.Admin.email == email).first()
    if admin:
        if not admin.hashed_password:
            raise HTTPException(
                status_code=500,
                detail="Admin account not properly configured. Run /auth/fix-admin"
            )
        
        if not verify_password(password, admin.hashed_password):
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        
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
    if student:
        if not student.email_verified:
            raise HTTPException(
                status_code=403,
                detail="Please verify your email before logging in. Check your inbox for the verification link."
            )
        
        if not student.hashed_password:
            raise HTTPException(
                status_code=500,
                detail="Account not properly configured. Please contact support."
            )
        
        if not verify_password(password, student.hashed_password):
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        
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
            "student_id": student.id,
            "email_verified": student.email_verified
        }

    raise HTTPException(status_code=401, detail="Incorrect email or password")


# ── GET CURRENT USER ─────
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
    else:
        user = db.query(models.Student).filter(models.Student.email == email).first()

    if not user:
        raise credentials_exception

    return user


# ── GET CURRENT PROFILE ─────
@router.get("/me")
def get_me(current_user = Depends(get_current_user)):
    if hasattr(current_user, 'campus'):
        return {
            "full_name": current_user.full_name,
            "email": current_user.email,
            "phone_number": current_user.phone_number,
            "student_number": current_user.student_number,
            "campus": current_user.campus,
            "email_verified": current_user.email_verified,
        }
    else:
        return {
            "full_name": current_user.full_name or "Admin",
            "email": current_user.email,
            "role": "admin"
        }


# ── UPDATE PROFILE ─────
@router.put("/update-profile")
def update_profile(
    data: dict,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user)
):
    if not hasattr(current_user, 'campus'):
        raise HTTPException(status_code=403, detail="This endpoint is for students only")
    
    student = current_user
    
    if "phone_number" in data and data["phone_number"]:
        student.phone_number = data["phone_number"]
    
    if "student_number" in data and data["student_number"]:
        existing = db.query(models.Student).filter(
            models.Student.student_number == data["student_number"],
            models.Student.id != student.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Student number already in use by another account")
        student.student_number = data["student_number"]
    
    if data.get("new_password"):
        if not data.get("current_password"):
            raise HTTPException(status_code=400, detail="Current password is required to set a new password")
        
        if not verify_password(data["current_password"], student.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        student.hashed_password = hash_password(data["new_password"])
    
    db.commit()
    db.refresh(student)
    
    return {
        "message": "Profile updated successfully",
        "full_name": student.full_name,
        "email": student.email,
        "phone_number": student.phone_number,
        "student_number": student.student_number,
        "campus": student.campus,
    }


# ==================== ADMIN SETUP ENDPOINTS ====================
@router.post("/create-admin")
def create_admin(
    email: str = "admin@tut.ac.za",
    full_name: str = "Super Admin",
    password: str = "admin123",
    db: Session = Depends(database.get_db)
):
    existing = db.query(models.Admin).filter(models.Admin.email == email).first()
    if existing:
        return {"message": "Admin already exists. Use /fix-admin if you need to reset password."}

    hashed = hash_password(password)
    admin = models.Admin(email=email, full_name=full_name, hashed_password=hashed)
    db.add(admin)
    db.commit()
    return {"message": f"✅ Admin created! Login with {email} / {password}"}


@router.post("/fix-admin")
def fix_admin(db: Session = Depends(database.get_db)):
    admin = db.query(models.Admin).filter(models.Admin.email == "admin@tut.ac.za").first()
    if not admin:
        admin = models.Admin(email="admin@tut.ac.za", full_name="Super Admin")
        db.add(admin)
    
    admin.hashed_password = hash_password("admin123")
    admin.password = None
    db.commit()
    
    return {"message": "✅ Admin fixed! Login with admin@tut.ac.za / admin123"}


# ── Compatibility helpers ─────
def get_current_admin(current_user=Depends(get_current_user)):
    if not hasattr(current_user, 'full_name') or hasattr(current_user, 'campus'):
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user


def get_current_student(current_user=Depends(get_current_user)):
    if not hasattr(current_user, 'campus'):
        raise HTTPException(status_code=403, detail="Student access required")
    return current_user