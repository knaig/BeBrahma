"""
BeBrahma v0.3 - Context Schemas

Pydantic schemas for business context management.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import date


# Response Schemas

class ObjectiveResponse(BaseModel):
    """Objective response."""
    id: str
    title: str
    description: Optional[str]
    objective_type: str
    status: str
    priority: int
    confidence_level: Optional[str]
    task_count: int = 0
    unknown_count: int = 0
    evidence_count: int = 0
    created_at: str


class TaskResponse(BaseModel):
    """Task response."""
    id: str
    objective_id: str
    title: str
    description: Optional[str]
    task_type: Optional[str]
    status: str
    priority: int
    due_date: Optional[str]
    estimated_duration_minutes: Optional[int]
    score_total: Optional[float]


class UnknownResponse(BaseModel):
    """Unknown response."""
    id: str
    objective_id: str
    question: str
    category: Optional[str]
    importance: str
    status: str
    evidence_count: int = 0


class SignalResponse(BaseModel):
    """Signal response."""
    id: str
    signal_type: str
    content: Optional[str]
    intent_category: Optional[str]
    sentiment: Optional[str]
    created_at: str


class ContextSummary(BaseModel):
    """Context summary statistics."""
    total_objectives: int
    active_tasks: int
    open_unknowns: int
    signals_last_7_days: int
    last_nba_session: Optional[str]


class BusinessContextResponse(BaseModel):
    """Complete business context response."""
    objectives: List[ObjectiveResponse]
    tasks: List[TaskResponse]
    unknowns: List[UnknownResponse]
    recent_signals: List[SignalResponse]
    summary: ContextSummary


# Request Schemas

class CreateObjectiveRequest(BaseModel):
    """Create objective request."""
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    objective_type: str = Field(..., description="problem_solution_fit, icp_wedge, growth, etc.")
    priority: int = Field(50, ge=0, le=100)
    target_completion_date: Optional[date] = None


class CreateTaskRequest(BaseModel):
    """Create task request."""
    objective_id: str
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    task_type: Optional[str] = None
    priority: int = Field(50, ge=0, le=100)
    due_date: Optional[date] = None
    estimated_duration_minutes: Optional[int] = None


class CreateUnknownRequest(BaseModel):
    """Create unknown request."""
    objective_id: str
    question: str = Field(..., min_length=1)
    category: Optional[str] = None
    importance: str = Field("high", description="critical, high, medium, low")
    target_resolution_date: Optional[date] = None
