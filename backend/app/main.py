# backend/app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

# ── 1. FastAPI app ─────────────────────────────────────────────
app = FastAPI(title="CampusStay API", version="1.0.0")

# ── 2. HTTPS Enforcement Middleware ───────────────────────────
class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Check if request came through HTTP (Railway sets x-forwarded-proto)
        forwarded_proto = request.headers.get("x-forwarded-proto", "https")
        
        # Log for debugging
        print(f"Request: {request.method} {request.url}")
        print(f"X-Forwarded-Proto: {forwarded_proto}")
        
        # Don't redirect, just process the request
        # Railway handles HTTPS termination at the load balancer
        response = await call_next(request)
        
        # Add security headers
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response

app.add_middleware(HTTPSRedirectMiddleware)

# ── 3. CORS ───────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://campusstay-1.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 4. Startup – create tables ───────────────────────────────
@app.on_event("startup")
async def startup_event():
    from . import models
    from .database import engine
    models.Base.metadata.create_all(bind=engine)
    print("Database tables ensured (startup complete)")

# ── 5. Include routers ───────────────────────────────────────
from .routers import auth, admin, students, property

# Each router should only be included ONCE
app.include_router(auth.router)        # /auth prefix already in router definition
app.include_router(admin.router)       # /admin prefix already in router definition
app.include_router(students.router)    # /applications prefix already in router definition
app.include_router(property.router)    # /properties prefix already in router definition

# ── 6. Serve uploaded images (if you still use local uploads) ─
UPLOAD_DIR = "static/uploads/properties"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── 7. Root & health check ───────────────────────────────────
@app.get("/")
def root():
    return {"message": "CampusStay API is running 🚀", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy"}