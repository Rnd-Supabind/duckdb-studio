from fastapi import APIRouter
from app.api import auth, execute, workflows, storage, audit, users, dashboard, duckdb_mgmt, admin, integrations, admin_plans
# from app.api.admin import plans, subscriptions, users as users_admin

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(execute.router, prefix="/execute", tags=["execute"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["workflows"])
api_router.include_router(storage.router, prefix="/storage", tags=["storage"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(duckdb_mgmt.router, prefix="/duckdb", tags=["duckdb"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])

# Admin routes
api_router.include_router(admin.router, prefix="/admin", tags=["admin-monitoring"])
api_router.include_router(admin_plans.router, prefix="/admin", tags=["admin-billing"])
# api_router.include_router(plans.router, prefix="/admin/plans", tags=["admin-plans"])
# api_router.include_router(subscriptions.router, prefix="/admin/subscriptions", tags=["admin-subscriptions"])
# api_router.include_router(users_admin.router, prefix="/admin/users", tags=["admin-users"])
