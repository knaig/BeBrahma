"""
BeBrahma v0.3 - Onboarding Schemas

Pydantic schemas for progressive profiling onboarding.
"""

from typing import Optional
from pydantic import BaseModel, Field


# Request Schemas

class InitialQuestionRequest(BaseModel):
    """Request for initial onboarding question."""
    answer: str = Field(..., min_length=1, max_length=1000, description="Answer to 'What are you building?'")

    class Config:
        json_schema_extra = {
            "example": {
                "answer": "A mobile app for dog walkers to find and book walks"
            }
        }


class CompleteOnboardingRequest(BaseModel):
    """Request to mark onboarding as complete."""
    nba_session_id: str = Field(..., description="NBA session ID from first recommendation")
    action_taken: str = Field("accepted", description="Action taken on first recommendation")

    class Config:
        json_schema_extra = {
            "example": {
                "nba_session_id": "123e4567-e89b-12d3-a456-426614174000",
                "action_taken": "accepted"
            }
        }


# Response Schemas

class UserProfileResponse(BaseModel):
    """User profile response."""
    id: str
    user_id: str
    onboarding_completed: bool
    onboarding_step: str
    initial_question_answer: Optional[str]
    created_at: str

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "clerk_user_123",
                "onboarding_completed": False,
                "onboarding_step": "first_recommendation",
                "initial_question_answer": "A mobile app for dog walkers",
                "created_at": "2026-01-01T12:00:00Z"
            }
        }


class OnboardingResponse(BaseModel):
    """Onboarding response."""
    user_profile: UserProfileResponse
    next_step: str  # first_recommendation | completed

    class Config:
        json_schema_extra = {
            "example": {
                "user_profile": {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "user_id": "clerk_user_123",
                    "onboarding_completed": False,
                    "onboarding_step": "first_recommendation",
                    "initial_question_answer": "A mobile app for dog walkers",
                    "created_at": "2026-01-01T12:00:00Z"
                },
                "next_step": "first_recommendation"
            }
        }
