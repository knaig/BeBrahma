"""
BeBrahma v0.3 - NBA Schemas

Pydantic schemas for NBA recommendation requests and responses.
"""

from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal


# Request Schemas

class NBARequest(BaseModel):
    """Request to compute NBA recommendation."""
    query: Optional[str] = Field(None, description="Optional user question")
    trigger_type: str = Field("explicit_ask", description="Trigger type")
    include_alternatives_count: int = Field(2, ge=0, le=5, description="Number of alternatives")

    class Config:
        json_schema_extra = {
            "example": {
                "query": "What should I do next?",
                "trigger_type": "explicit_ask",
                "include_alternatives_count": 2
            }
        }


# Response Schemas

class TaskScoreBreakdown(BaseModel):
    """Score breakdown for a task."""
    total: Decimal
    objective_impact: Decimal
    time_sensitivity: Decimal
    evidence_gap: Decimal
    unblocks: Decimal
    feasibility: Decimal


class ConfidenceDetails(BaseModel):
    """Confidence details."""
    level: str  # very_high, high, moderate, low
    score: Optional[Decimal]
    factors: Optional[Dict[str, float]]


class SuggestedTask(BaseModel):
    """Suggested task details."""
    title: str
    description: Optional[str]
    estimated_duration_minutes: Optional[int]


class RecommendationResponse(BaseModel):
    """Single recommendation (top or alternative)."""
    id: str
    rank: int
    action_type: str
    task: Optional[SuggestedTask]
    score: TaskScoreBreakdown
    confidence: ConfidenceDetails
    rationale_summary: str
    framework_source: Optional[str]


class NBAResponse(BaseModel):
    """NBA computation response."""
    session_id: str
    recommendation: RecommendationResponse
    alternatives: List[RecommendationResponse]
    computation_time_ms: int
    frameworks_used: List[str]

    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "123e4567-e89b-12d3-a456-426614174000",
                "recommendation": {
                    "id": "rec-1",
                    "rank": 1,
                    "action_type": "create_task",
                    "task": {
                        "title": "Interview 10 target customers",
                        "description": "Conduct problem interviews to validate pain points",
                        "estimated_duration_minutes": 300
                    },
                    "score": {
                        "total": 0.87,
                        "objective_impact": 0.90,
                        "time_sensitivity": 0.85,
                        "evidence_gap": 0.92,
                        "unblocks": 0.70,
                        "feasibility": 0.80
                    },
                    "confidence": {
                        "level": "high",
                        "score": 0.78,
                        "factors": {
                            "context_completeness": 0.85,
                            "historical_accuracy": 0.72
                        }
                    },
                    "rationale_summary": "Your next critical step is to interview target customers...",
                    "framework_source": "critical_unknown"
                },
                "alternatives": [],
                "computation_time_ms": 1247,
                "frameworks_used": ["critical_unknown"]
            }
        }


class RationaleResponse(BaseModel):
    """Full rationale for a recommendation."""
    recommendation_id: str
    summary: str
    full: Dict[str, any]

    class Config:
        json_schema_extra = {
            "example": {
                "recommendation_id": "rec-1",
                "summary": "Your next critical step is to interview target customers...",
                "full": {
                    "why": "Interviewing customers is the fastest way to validate...",
                    "why_now": "You have 3 critical unknowns that can only be resolved...",
                    "expected_outcome": "After 10 interviews, you'll have clear evidence..."
                }
            }
        }


class ErrorResponse(BaseModel):
    """Error response."""
    success: bool = False
    error: Dict[str, any]


class SuccessResponse(BaseModel):
    """Generic success response wrapper."""
    success: bool = True
    data: any
    meta: Optional[Dict[str, any]] = None
