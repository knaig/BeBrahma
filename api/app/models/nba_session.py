"""
BeBrahma v0.3 - NBA Session Model

Tracks each "What should I do next?" request.
"""

from sqlalchemy import Column, String, Integer, TIMESTAMP, ARRAY, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.db.session import Base


class NBASession(Base):
    """
    NBA recommendation session.

    Traceability:
    - FR-002: NBA session tracking
    - FR-009: Override learning (user action tracking)
    """

    __tablename__ = "nba_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(String(255), nullable=False, index=True)

    # Session context
    trigger_type = Column(String(50), nullable=False)  # explicit_ask, daily_prompt, post_update, scheduled
    user_query = Column(String, nullable=True)  # Original user question/input

    # Computation metadata
    computation_time_ms = Column(Integer, nullable=True)
    frameworks_used = Column(ARRAY(String(100)), default=[], nullable=False)

    # Result
    top_recommendation_id = Column(UUID(as_uuid=True), ForeignKey("nba_recommendations.id", ondelete="SET NULL"), nullable=True)
    alternatives_count = Column(Integer, default=0, nullable=False)

    # User action (for learning)
    user_action = Column(String(50), nullable=True, index=True)  # accepted, chose_alternative, dismissed, deferred, NULL
    chosen_recommendation_id = Column(UUID(as_uuid=True), ForeignKey("nba_recommendations.id", ondelete="SET NULL"), nullable=True)

    # Metadata
    metadata = Column(JSON, default={}, nullable=False)

    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    recommendations = relationship("NBARecommendation", back_populates="session", foreign_keys="NBARecommendation.session_id")

    def __repr__(self):
        return f"<NBASession(id='{self.id}', user_action='{self.user_action}', created='{self.created_at}')>"
