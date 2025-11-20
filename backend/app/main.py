# backend/app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv  # ← ADD THIS

# ── 1. Load .env (MUST BE FIRST)
load_dotenv()  # ← ADD THIS

# ── 2. Imports (DB models & engine) ─────────────────────────────
from . import models
from .database import engine

# ── 3. FastAPI app ─────────────────────────────────────────────
app = FastAPI(title="CampusStay API")

# ── 4. CORS ───────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://campusstay-1.onrender.com"],  # Vite dev server and FastAPI docs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 5. Startup event – create tables **once** ─────────────────
@app.on_event("startup")
async def create_tables():
    models.Base.metadata.create_all(bind=engine)
    print("Database tables ensured (startup complete)")

# ── 6. Include routers (MUST be after app creation) ───────────
from .routers import auth, admin, students, property, applications

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(students.router)
app.include_router(applications.router)
app.include_router(property.router)

# ── 7. Serve uploaded images ───────────────────────────────────
UPLOAD_DIR = "static/uploads/properties"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="static/uploads"), name="uploads")

# ── 8. Health-check endpoints ───────────────────────────────────
@app.get("/")
def root():
    return {"message": "CampusStay API is running", "docs": "/docs"}

@app.get("/auth/test")
def auth_test():
    return {"message": "Auth router is loaded!"}