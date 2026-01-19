# backend/app/main.py - FIXED VERSION
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# ── 1. FastAPI app ─────────────────────────────────────────────
# ✅ Disable automatic trailing slash redirects globally
app = FastAPI(
    title="CampusStay API", 
    version="1.0.0",
    redirect_slashes=False  # Prevents 307 redirects
)

# ── 2. CORS FIRST (IMPORTANT - Must be before other middleware) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://campusstay.co.za",
        "https://www.campusstay.co.za",
        "http://campusstay.co.za",
    ],
    allow_credentials=True,               
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],  # Important for file downloads
)

# ── 3. Debug Logging Middleware ─────────────
class DebugLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Log every request
        print(f"\n{'='*60}")
        print(f"📨 INCOMING REQUEST")
        print(f"{'='*60}")
        print(f"Method: {request.method}")
        print(f"URL: {request.url}")
        print(f"Path: {request.url.path}")
        print(f"Query Params: {dict(request.query_params)}")
        print(f"Headers:")
        for key, value in request.headers.items():
            if key.lower() in ['authorization', 'origin', 'referer', 'x-forwarded-proto']:
                print(f"  {key}: {value}")
        print(f"{'='*60}\n")
        
        # Process request
        response = await call_next(request)
        
        # Log response
        print(f"\n{'='*60}")
        print(f"📤 OUTGOING RESPONSE")
        print(f"{'='*60}")
        print(f"Status: {response.status_code}")
        print(f"{'='*60}\n")
        
        # Add security headers
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response

app.add_middleware(DebugLoggingMiddleware)

# ── 4. Startup – create tables ───────────────────────────────
@app.on_event("startup")
async def startup_event():
    from . import models
    from .database import engine
    models.Base.metadata.create_all(bind=engine)
    print("\n" + "="*60)
    print("✅ DATABASE TABLES CREATED/VERIFIED")
    print("="*60)
    print(f"Backend URL: {os.getenv('BACKEND_URL', 'Not set')}")
    print(f"Frontend URL: {os.getenv('FRONTEND_URL', 'Not set')}")
    print("="*60 + "\n")


# ── 5. Include Routers ───────────────────────────────
from .routers import auth, admin, students, property, applications

app.include_router(auth.router)              # /auth/login, /auth/register, /auth/verify-email, /auth/reset-password
app.include_router(admin.router)             # /admin/stats, /admin/applications
app.include_router(property.router, prefix="/students")  # /students/properties
app.include_router(students.router)          # /students/applications/my-applications
app.include_router(applications.router, prefix="/students")  # /students/applications

# ── 6. Serve uploaded images ─────────────────────────────
UPLOAD_DIR = "static/uploads/properties"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── 7. Root & health check ───────────────────────────────────
@app.get("/")
def root():
    return {
        "message": "CampusStay API is running 🚀",
        "docs": "/docs",
        "version": "1.0.0",
        "status": "healthy"
    }

# ADD THIS - Handle HEAD requests for health checks
@app.head("/")
def root_head():
    return Response(status_code=200)

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "backend_url": os.getenv("BACKEND_URL", "Not configured"),
        "frontend_url": os.getenv("FRONTEND_URL", "Not configured")
    }

# ADD THIS - Handle HEAD requests for health checks
@app.head("/health")
def health_head():
    return Response(status_code=200)

@app.get("/debug/cors")
def debug_cors():
    """Debug endpoint to check CORS configuration"""
    return {
        "message": "If you can see this, CORS is working!",
        "allowed_origins": [
            "https://campusstay.co.za",
            "http://campusstay.co.za",
            "http://localhost:5173",
            "http://localhost:3000",
        ],
        "backend_url": os.getenv("BACKEND_URL", "Not set"),
        "frontend_url": os.getenv("FRONTEND_URL", "Not set"),
    }

@app.get("/debug/env")
def debug_env():
    """Debug endpoint to check environment variables (remove in production)"""
    return {
        "BACKEND_URL": os.getenv("BACKEND_URL", "Not set"),
        "FRONTEND_URL": os.getenv("FRONTEND_URL", "Not set"),
        "RESEND_API_KEY": "SET" if os.getenv("RESEND_API_KEY") else "NOT SET",
        "R2_BUCKET": os.getenv("R2_BUCKET", "Not set"),
        "SECRET_KEY": "SET" if os.getenv("SECRET_KEY") else "NOT SET",
    }
