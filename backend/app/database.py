# app/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Create Base (must be before any models)
Base = declarative_base()

# Use DATABASE_URL from environment (Render/Railway/Netlify set this automatically)
# Fallback to individual vars for local development
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Local development fallback
    POSTGRES_USER = os.getenv("POSTGRES_USER", "admin")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "123456")
    POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB = os.getenv("POSTGRES_DB", "campusstay")
    
    DATABASE_URL = f"postgresql+psycopg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
    
    print(f"Local DB: {DATABASE_URL.replace(POSTGRES_PASSWORD, '***')}")
else:
    print("Connected to cloud database (DATABASE_URL found)")

# Create engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()