"""
BeBrahma v0.3 API - V1 Router

Main API router for v1 endpoints.
"""

from fastapi import APIRouter

# Import endpoint routers (will be created)
# from app.api.v1.endpoints import onboarding, nba, context, updates, overrides, integrations

api_router = APIRouter()

# Include endpoint routers
# api_router.include_router(onboarding.router, prefix="/onboarding", tags=["Onboarding"])
# api_router.include_router(nba.router, prefix="/nba", tags=["NBA"])
# api_router.include_router(context.router, prefix="/context", tags=["Context"])
# api_router.include_router(updates.router, prefix="/updates", tags=["Updates"])
# api_router.include_router(overrides.router, prefix="/overrides", tags=["Overrides"])
# api_router.include_router(integrations.router, prefix="/integrations", tags=["Integrations"])

# Temporary health check for v1
@api_router.get("/", tags=["Health"])
async def api_v1_health():
    """API v1 health check."""
    return {
        "version": "v1",
        "status": "operational",
        "endpoints": "Coming soon"
    }
