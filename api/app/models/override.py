"""
BeBrahma v0.3 - Override Model

Tracks when user chooses alternative over top recommendation (for learning).
"""

from sqlalchemy import Column, String, Boolean, TIMESTAMP, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db.session import Base


class Override(Base):
    """
    Override tracking for machine learning.

    Traceability:
    - FR-009: Override learning
    - FR-015: Taxonomy-based categorization
    """

    __tablename__ = "overrides"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("nba_sessions.id", ondelete="CASCADE"), nullable=False, index=True)

    # Override details
    recommended_id = Column(UUID(as_uuid=True), ForeignKey("nba_recommendations.id", ondelete="CASCADE"), nullable=False)  # rank=1
    chosen_id = Column(UUID(as_uuid=True), ForeignKey("nba_recommendations.id", ondelete="CASCADE"), nullable=False)  # rank>1

    # Classification (for learning) - FR-015
    override_category = Column(String(50), nullable=False, index=True)  # time_preference, energy_level, skill_match, emotional_state, external_constraint, strategic_disagreement, other
    user_reason = Column(String, nullable=True)  # Optional user-provided reason

    # Context at override time
    time_of_day = Column(String(10), nullable=True)  # morning, afternoon, evening
    day_of_week = Column(String(10), nullable=True)
    context_snapshot = Column(JSON, nullable=True)  # {recent_completions: [], blockers: [], energy_level: "low", ...}

    # Learning outcome
    incorporated_in_model = Column(Boolean, default=False, nullable=False, index=True)
    weight_adjustment_applied = Column(JSON, nullable=True)  # {time_sensitivity: +0.05, feasibility: -0.02, ...}

    # Metadata
    metadata = Column(JSON, default={}, nullable=False)

    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<Override(category='{self.override_category}', incorporated={self.incorporated_in_model})>"
