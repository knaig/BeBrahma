"""
BeBrahma v0.3 - User Profile Model

Extended user data including onboarding state and learned preferences.
"""

from sqlalchemy import Column, String, Boolean, TIMESTAMP, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db.session import Base


class UserProfile(Base):
    """
    User profile with onboarding state and learned preferences.

    Traceability:
    - FR-001: Progressive profiling state
    - FR-009: Learned scoring weights
    """

    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), unique=True, nullable=False, index=True)  # Clerk user_id

    # Onboarding state (FR-001)
    onboarding_completed = Column(Boolean, default=False, nullable=False)
    initial_question_answer = Column(String, nullable=True)  # "What are you building?"
    onboarding_step = Column(String(50), default="initial", nullable=False)

    # Learned preferences (FR-009)
    scoring_weights = Column(
        JSON,
        default={
            "objective_impact": 0.30,
            "time_sensitivity": 0.25,
            "evidence_gap": 0.25,
            "unblocks": 0.10,
            "feasibility": 0.10
        },
        nullable=False
    )
    framework_preferences = Column(JSON, default={}, nullable=False)

    # User context
    timezone = Column(String(50), default="UTC", nullable=False)
    working_hours = Column(
        JSON,
        default={"start": "09:00", "end": "18:00"},
        nullable=False
    )

    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_active_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<UserProfile(user_id='{self.user_id}', onboarding={self.onboarding_completed})>"
