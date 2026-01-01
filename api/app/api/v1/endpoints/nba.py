"""
BeBrahma v0.3 - NBA Endpoints

FastAPI endpoints for NBA recommendations.

Traceability:
- FR-002: NBA Recommendations
- FR-005: Rationale Display
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models import NBARecommendation
from app.services.nba_engine import NBAEngine
from app.schemas.nba import (
    NBARequest,
    NBAResponse,
    RecommendationResponse,
    RationaleResponse,
    SuggestedTask,
    TaskScoreBreakdown,
    ConfidenceDetails,
    SuccessResponse
)
from app.core.logging import logger


router = APIRouter()


# Temporary: Mock authentication (will be replaced with Clerk)
async def get_current_user_id() -> str:
    """
    TODO: Implement Clerk JWT authentication.

    For now, returns a test user ID.
    """
    return "test_user_123"


@router.post("/ask", response_model=SuccessResponse, status_code=200)
async def compute_nba(
    request: NBARequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Compute NBA recommendation.

    Returns top recommendation + alternatives based on current business context.

    **Traceability:** FR-002, FR-010
    """
    try:
        # Initialize NBA engine
        nba_engine = NBAEngine(db)

        # Compute recommendation
        result = await nba_engine.compute_nba(
            user_id=user_id,
            user_query=request.query,
            trigger_type=request.trigger_type,
            include_alternatives_count=request.include_alternatives_count
        )

        # Format response
        response = NBAResponse(
            session_id=str(result.session_id),
            recommendation=_format_recommendation(result.recommendation),
            alternatives=[
                _format_recommendation(alt)
                for alt in result.alternatives
            ],
            computation_time_ms=result.computation_time_ms,
            frameworks_used=result.frameworks_used
        )

        return SuccessResponse(
            success=True,
            data=response,
            meta={
                "request_id": "todo",  # TODO: Get from request context
                "timestamp": str(logger.handlers[0].formatter.formatTime(logger.makeRecord("", 0, "", 0, "", (), None)))
            }
        )

    except ValueError as e:
        logger.warning(f"NBA computation failed: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_REQUEST",
                "message": str(e)
            }
        )

    except Exception as e:
        logger.error(f"Unexpected error in NBA computation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to compute recommendation"
            }
        )


@router.get("/rationale/{recommendation_id}", response_model=SuccessResponse)
async def get_rationale(
    recommendation_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Get full rationale for a recommendation.

    **Traceability:** FR-005
    """
    try:
        # Query recommendation
        query = select(NBARecommendation).where(
            NBARecommendation.id == recommendation_id,
            NBARecommendation.user_id == user_id
        )

        result = await db.execute(query)
        recommendation = result.scalar_one_or_none()

        if not recommendation:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "NOT_FOUND",
                    "message": f"Recommendation {recommendation_id} not found"
                }
            )

        # Format response
        response = RationaleResponse(
            recommendation_id=str(recommendation.id),
            summary=recommendation.rationale_summary,
            full=recommendation.rationale_full or {}
        )

        return SuccessResponse(
            success=True,
            data=response
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error retrieving rationale: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to retrieve rationale"
            }
        )


def _format_recommendation(rec: NBARecommendation) -> RecommendationResponse:
    """Format NBA recommendation for API response."""
    return RecommendationResponse(
        id=str(rec.id),
        rank=rec.rank,
        action_type=rec.action_type,
        task=SuggestedTask(
            title=rec.suggested_task_title,
            description=rec.suggested_task_description,
            estimated_duration_minutes=rec.metadata.get('estimated_duration_minutes') if rec.metadata else None
        ) if rec.suggested_task_title else None,
        score=TaskScoreBreakdown(
            total=rec.score_total,
            objective_impact=rec.score_objective_impact,
            time_sensitivity=rec.score_time_sensitivity,
            evidence_gap=rec.score_evidence_gap,
            unblocks=rec.score_unblocks,
            feasibility=rec.score_feasibility
        ),
        confidence=ConfidenceDetails(
            level=rec.confidence_level,
            score=rec.confidence_score,
            factors=rec.confidence_factors
        ),
        rationale_summary=rec.rationale_summary,
        framework_source=rec.framework_source
    )
