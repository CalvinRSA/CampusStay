# app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base  # ← REQUIRED
from dotenv import load_dotenv
import os

# Create Base
Base = declarative_base()

# Load .env from project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(PROJECT_ROOT, ".env")

print(f"Loading .env from: {ENV_PATH}")

if not os.path.exists(ENV_PATH):
    raise FileNotFoundError(f".env file not found at: {ENV_PATH}")

load_dotenv(ENV_PATH)

# Read values
POSTGRES_USER = os.getenv('POSTGRES_USER')
POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD')
POSTGRES_HOST = os.getenv('POSTGRES_HOST')
POSTGRES_PORT = os.getenv('POSTGRES_PORT')
POSTGRES_DB = os.getenv('POSTGRES_DB')

# Validate
missing = []
for var, name in [
    (POSTGRES_USER, 'POSTGRES_USER'),
    (POSTGRES_PASSWORD, 'POSTGRES_PASSWORD'),
    (POSTGRES_HOST, 'POSTGRES_HOST'),
    (POSTGRES_PORT, 'POSTGRES_PORT'),
    (POSTGRES_DB, 'POSTGRES_DB'),
]:
    if not var:
        missing.append(name)

if missing:
    raise ValueError(f"Missing in .env: {', '.join(missing)}")

# Build URL
DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

print(f"Connecting to: postgresql://{POSTGRES_USER}:***@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}")

# Create engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()