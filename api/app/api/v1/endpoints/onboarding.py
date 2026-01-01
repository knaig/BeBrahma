"""
BeBrahma v0.3 - Onboarding Endpoints

FastAPI endpoints for progressive profiling onboarding.

Traceability:
- FR-001: Progressive Profiling
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.db.session import get_db
from app.models import UserProfile, NBASession
from app.schemas.onboarding import (
    InitialQuestionRequest,
    CompleteOnboardingRequest,
    OnboardingResponse,
    UserProfileResponse
)
from app.schemas.nba import SuccessResponse
from app.core.logging import logger


router = APIRouter()


# Temporary: Mock authentication (will be replaced with Clerk)
async def get_current_user_id() -> str:
    """
    TODO: Implement Clerk JWT authentication.

    For now, returns a test user ID.
    """
    return "test_user_123"


@router.post("/initial", response_model=SuccessResponse, status_code=201)
async def initial_question(
    request: InitialQuestionRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    First interaction - ask ONE question and create user profile.

    This is the entry point for progressive profiling. We ask one question:
    "What are you building?" and use that to bootstrap the recommendation engine.

    **Traceability:** FR-001 (Progressive Profiling)
    """
    try:
        # Check if user already has a profile
        existing_profile_query = select(UserProfile).where(
            UserProfile.user_id == user_id
        )
        result = await db.execute(existing_profile_query)
        existing_profile = result.scalar_one_or_none()

        if existing_profile:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "ALREADY_ONBOARDED",
                    "message": "User already has a profile"
                }
            )

        # Create user profile
        user_profile = UserProfile(
            user_id=user_id,
            onboarding_completed=False,
            initial_question_answer=request.answer,
            onboarding_step="first_recommendation",
            scoring_weights={
                "objective_impact": 0.30,
                "time_sensitivity": 0.25,
                "evidence_gap": 0.25,
                "unblocks": 0.10,
                "feasibility": 0.10
            },
            framework_preferences={},
            timezone="UTC",
            working_hours={"start": "09:00", "end": "18:00"},
            last_active_at=datetime.utcnow()
        )

        db.add(user_profile)
        await db.commit()
        await db.refresh(user_profile)

        logger.info(
            f"User profile created for {user_id}",
            extra={
                "user_id": user_id,
                "initial_answer": request.answer[:50]
            }
        )

        # Format response
        response = OnboardingResponse(
            user_profile=UserProfileResponse(
                id=str(user_profile.id),
                user_id=user_profile.user_id,
                onboarding_completed=user_profile.onboarding_completed,
                onboarding_step=user_profile.onboarding_step,
                initial_question_answer=user_profile.initial_question_answer,
                created_at=user_profile.created_at.isoformat()
            ),
            next_step="first_recommendation"
        )

        return SuccessResponse(
            success=True,
            data=response,
            meta={
                "message": "Profile created successfully. Ready for first NBA recommendation."
            }
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error creating user profile: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to create user profile"
            }
        )


@router.post("/complete", response_model=SuccessResponse)
async def complete_onboarding(
    request: CompleteOnboardingRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Mark onboarding as complete (after first recommendation is accepted).

    **Traceability:** FR-001 (Progressive Profiling)
    """
    try:
        # Get user profile
        profile_query = select(UserProfile).where(
            UserProfile.user_id == user_id
        )
        result = await db.execute(profile_query)
        user_profile = result.scalar_one_or_none()

        if not user_profile:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "PROFILE_NOT_FOUND",
                    "message": "User profile not found"
                }
            )

        # Verify NBA session exists
        session_query = select(NBASession).where(
            NBASession.id == request.nba_session_id,
            NBASession.user_id == user_id
        )
        result = await db.execute(session_query)
        nba_session = result.scalar_one_or_none()

        if not nba_session:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "SESSION_NOT_FOUND",
                    "message": "NBA session not found"
                }
            )

        # Update user profile
        user_profile.onboarding_completed = True
        user_profile.onboarding_step = "completed"
        user_profile.last_active_at = datetime.utcnow()

        # Update NBA session with user action
        nba_session.user_action = request.action_taken

        await db.commit()
        await db.refresh(user_profile)

        logger.info(
            f"Onboarding completed for {user_id}",
            extra={
                "user_id": user_id,
                "session_id": request.nba_session_id
            }
        )

        # Format response
        response = OnboardingResponse(
            user_profile=UserProfileResponse(
                id=str(user_profile.id),
                user_id=user_profile.user_id,
                onboarding_completed=user_profile.onboarding_completed,
                onboarding_step=user_profile.onboarding_step,
                initial_question_answer=user_profile.initial_question_answer,
                created_at=user_profile.created_at.isoformat()
            ),
            next_step="completed"
        )

        return SuccessResponse(
            success=True,
            data=response,
            meta={
                "message": "Onboarding completed successfully!"
            }
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error completing onboarding: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to complete onboarding"
            }
        )


@router.get("/status", response_model=SuccessResponse)
async def get_onboarding_status(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Get current onboarding status for user.

    Returns user profile and onboarding state.
    """
    try:
        # Get user profile
        profile_query = select(UserProfile).where(
            UserProfile.user_id == user_id
        )
        result = await db.execute(profile_query)
        user_profile = result.scalar_one_or_none()

        if not user_profile:
            return SuccessResponse(
                success=True,
                data={
                    "onboarding_required": True,
                    "next_step": "initial_question"
                }
            )

        # Format response
        response = {
            "onboarding_required": not user_profile.onboarding_completed,
            "user_profile": UserProfileResponse(
                id=str(user_profile.id),
                user_id=user_profile.user_id,
                onboarding_completed=user_profile.onboarding_completed,
                onboarding_step=user_profile.onboarding_step,
                initial_question_answer=user_profile.initial_question_answer,
                created_at=user_profile.created_at.isoformat()
            ),
            "next_step": "completed" if user_profile.onboarding_completed else user_profile.onboarding_step
        }

        return SuccessResponse(
            success=True,
            data=response
        )

    except Exception as e:
        logger.error(f"Error getting onboarding status: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to get onboarding status"
            }
        )
