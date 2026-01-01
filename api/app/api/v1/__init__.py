"""
BeBrahma v0.3 API - V1 Router

Main API router for v1 endpoints.
"""

from fastapi import APIRouter

# Import endpoint routers
from app.api.v1.endpoints import nba

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(nba.router, prefix="/nba", tags=["NBA Recommendations"])

# TODO: Add more endpoints
# api_router.include_router(onboarding.router, prefix="/onboarding", tags=["Onboarding"])
# api_router.include_router(context.router, prefix="/context", tags=["Context"])
# api_router.include_router(updates.router, prefix="/updates", tags=["Updates"])
# api_router.include_router(overrides.router, prefix="/overrides", tags=["Overrides"])
# api_router.include_router(integrations.router, prefix="/integrations", tags=["Integrations"])

# API v1 health check
@api_router.get("/", tags=["Health"])
async def api_v1_health():
    """API v1 health check."""
    return {
        "version": "v1",
        "status": "operational",
        "features": {
            "nba_recommendations": "available",
            "onboarding": "coming_soon",
            "context_management": "coming_soon",
            "integrations": "coming_soon"
        }
    }
