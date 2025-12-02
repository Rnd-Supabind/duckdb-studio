from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.router import api_router
from app.db.database import init_db
import asyncio

# Try to import scheduler, but don't fail if dependencies aren't installed
try:
    from app.services.scheduler import scheduler
    SCHEDULER_AVAILABLE = True
except ImportError as e:
    print(f"⚠ Scheduler not available: {e}")
    SCHEDULER_AVAILABLE = False

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.on_event("startup")
async def startup_event():
    """Initialize scheduler and load active workflows"""
    if SCHEDULER_AVAILABLE:
        try:
            await scheduler.initialize()
            await scheduler.load_active_workflows()
            print("✓ Workflow scheduler initialized and active workflows loaded")
        except Exception as e:
            print(f"⚠ Failed to initialize scheduler: {e}")
    else:
        print("⚠ Scheduler disabled - install croniter and temporalio dependencies")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "dataforge-api"}
