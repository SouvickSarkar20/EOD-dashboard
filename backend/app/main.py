from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(
    title="EOD Management & Analytics Dashboard API",
    description="Backend API providing supervision, analytics, and Supabase 2FA authentication for EOD operation.",
    version="1.0.0",
)

# CORS configuration
origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "EOD Dashboard API"}

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to EOD Dashboard API",
        "docs_url": "/docs",
        "health_check": "/api/health"
    }
