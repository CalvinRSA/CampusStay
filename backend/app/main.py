# backend/app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# ── 1. FastAPI app ─────────────────────────────────────────────
app = FastAPI(title="CampusStay API", version="1.0.0")

# ── 2. CORS ───────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://campusstay-1.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 3. Startup – create tables ───────────────────────────────
@app.on_event("startup")
async def startup_event():
    from . import models
    from .database import engine
    models.Base.metadata.create_all(bind=engine)
    print("Database tables ensured (startup complete)")

# ── 4. Include routers ───────────────────────────────────────
from .routers import auth, admin, students, property

# Each router should only be included ONCE
app.include_router(auth.router)        # /auth prefix already in router definition
app.include_router(admin.router)       # /admin prefix already in router definition
app.include_router(students.router)    # /applications prefix already in router definition
app.include_router(property.router)    # /properties prefix already in router definition

# ── 5. Serve uploaded images (if you still use local uploads) ─
UPLOAD_DIR = "static/uploads/properties"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── 6. Root & health check ───────────────────────────────────
@app.get("/")
def root():
    return {"message": "CampusStay API is running 🚀", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy"}