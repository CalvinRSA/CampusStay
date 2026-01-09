# backend/app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

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
        "https://campusstay-1.onrender.com",
        "http://campusstay-1.onrender.com",
        "*"
    ],
    allow_origins=origins,
    allow_credentials=True,               
    allow_methods=["*"],
    allow_headers=["*"],
)
)

# ── 3. HTTPS Enforcement Middleware (After CORS) ─────────────
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

# ── 4. Startup – create tables ───────────────────────────────
@app.on_event("startup")
async def startup_event():
    from . import models
    from .database import engine
    models.Base.metadata.create_all(bind=engine)
    print("Database tables ensured (startup complete)")


# ✅ Each router should only be included ONCE
# backend/app/main.py — final router section
from .routers import auth, admin, students, property, applications

app.include_router(auth.router)    
app.include_router(auth.router, prefix="/students/auth/me")                             # /auth/login, /auth/me, etc.
app.include_router(admin.router)              # /admin/stats, /admin/applications
app.include_router(property.router, prefix="/students")                            # /properties (public)
app.include_router(students.router)
app.include_router(applications.router, prefix="/students")                     # /applications
 

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

@app.get("/debug/cors")
def debug_cors():
    """Debug endpoint to check CORS configuration"""
    return {
        "message": "If you can see this, CORS is working!",
        "allowed_origins": [
            "https://campusstay-1.onrender.com",
            "http://localhost:5173",
            "http://localhost:3000",
        ]
    }
