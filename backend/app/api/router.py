from fastapi import APIRouter
from app.api import auth, execute, workflows, storage, audit

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(execute.router, prefix="/execute", tags=["execute"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["workflows"])
api_router.include_router(storage.router, prefix="/storage", tags=["storage"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
