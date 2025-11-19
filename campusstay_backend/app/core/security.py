# app/core/security.py
import os
from datetime import datetime, timedelta

from jose import jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

# -------------------------------------------------
# 1. Load .env (must be at the very top)
# -------------------------------------------------
load_dotenv()

# -------------------------------------------------
# 2. JWT configuration
# -------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be set in .env")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# -------------------------------------------------
# 3. Password hashing (bcrypt)
# -------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# -------------------------------------------------
# 4. Helper: create JWT
# -------------------------------------------------
def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# -------------------------------------------------
# 5. Helper: verify plain password vs hash
# -------------------------------------------------
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Use this when you upgrade admins to hashed passwords."""
    return pwd_context.verify(plain_password, hashed_password)


# -------------------------------------------------
# 6. Helper: hash a password (for registration / admin update)
# -------------------------------------------------
def hash_password(password: str) -> str:
    return pwd_context.hash(password)