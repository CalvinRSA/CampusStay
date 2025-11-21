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
        "https://campusstay-1.onrender.com",   # ← your frontend URL
        "http://localhost:5173",               # ← local dev
        # Add your custom domain later:
        # "https://www.campusstay.co.za",
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
from .routers import auth, admin, students, property, applications

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(students.router)
app.include_router(property.router)
app.include_router(applications.router)

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