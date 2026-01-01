"""
BeBrahma v0.3 - NBA Recommendation Model

Individual recommendation (top or alternative).
"""

from sqlalchemy import Column, String, Integer, TIMESTAMP, JSON, ForeignKey, DECIMAL
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.db.session import Base


class NBARecommendation(Base):
    """
    NBA recommendation (top or alternative).

    Traceability:
    - FR-002: Recommendation storage
    - FR-005: Rationale storage
    - FR-006: Alternatives (rank > 1)
    - FR-010: Confidence scoring
    """

    __tablename__ = "nba_recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("nba_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(255), nullable=False, index=True)

    # Recommendation ranking
    rank = Column(Integer, nullable=False)  # 1 = top recommendation, 2-N = alternatives

    # Recommended action
    action_type = Column(String(50), nullable=False)  # complete_task, create_task, gather_evidence, make_decision, reflect
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    suggested_task_title = Column(String(500), nullable=True)
    suggested_task_description = Column(String, nullable=True)

    # Scoring breakdown (FR-002)
    score_objective_impact = Column(DECIMAL(3, 2), nullable=False)
    score_time_sensitivity = Column(DECIMAL(3, 2), nullable=False)
    score_evidence_gap = Column(DECIMAL(3, 2), nullable=False)
    score_unblocks = Column(DECIMAL(3, 2), nullable=False)
    score_feasibility = Column(DECIMAL(3, 2), nullable=False)
    score_total = Column(DECIMAL(3, 2), nullable=False)

    # Confidence (FR-010)
    confidence_level = Column(String(20), nullable=False)  # very_high, high, moderate, low
    confidence_score = Column(DECIMAL(3, 2), nullable=True)  # 0.00 to 1.00
    confidence_factors = Column(JSON, nullable=True)  # {context_completeness: 0.8, historical_accuracy: 0.7, ...}

    # Rationale (FR-005)
    rationale_summary = Column(String, nullable=False)  # 1-2 sentence summary
    rationale_full = Column(JSON, nullable=True)  # {why: "...", why_now: "...", expected_outcome: "...", frameworks_applied: [...]}

    # Metadata
    framework_source = Column(String(50), nullable=True)  # Which framework generated this
    metadata = Column(JSON, default={}, nullable=False)

    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    session = relationship("NBASession", back_populates="recommendations", foreign_keys=[session_id])

    def __repr__(self):
        return f"<NBARecommendation(rank={self.rank}, action='{self.action_type}', score={self.score_total}, confidence='{self.confidence_level}')>"
