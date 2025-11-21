# app/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# === Get DATABASE_URL from cloud (Render/Railway/Fly.io) ===
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Cloud: Render/Railway gives "postgresql://"
    # Convert to psycopg driver + handle SSL correctly
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
    print("Connected to cloud PostgreSQL")
else:
    # Local development fallback
    user = os.getenv("POSTGRES_USER", "admin")
    password = os.getenv("POSTGRES_PASSWORD", "123456")
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "campusstay")
    
    DATABASE_URL = f"postgresql+psycopg://{user}:{password}@{host}:{port}/{db}?sslmode=disable"
    print(f"Local DB: postgresql+psycopg://{user}:***@{host}:{port}/{db}")

# === Create engine with safe settings ===
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    future=True,
    # These options make SSL work everywhere without errors
    connect_args={"sslmode": "prefer"} if "render.com" in DATABASE_URL or "railway.app" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()