"""
BeBrahma v0.3 - Unknown Model

Critical unknowns to resolve in the business state graph.
"""

from sqlalchemy import Column, String, Date, TIMESTAMP, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.db.session import Base


class Unknown(Base):
    """
    Critical unknown question to be resolved.

    Traceability:
    - FR-013: Business State Graph (unknowns entity)
    - FR-014: Critical Unknown Mapping framework
    """

    __tablename__ = "unknowns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)
    objective_id = Column(UUID(as_uuid=True), ForeignKey("objectives.id", ondelete="CASCADE"), nullable=False, index=True)

    # Unknown details
    question = Column(String, nullable=False)  # The critical unknown
    category = Column(String(50), nullable=True, index=True)  # customer, market, product, business_model, team, technology
    importance = Column(String(20), default="high", nullable=False, index=True)  # critical, high, medium, low

    # State
    status = Column(String(50), default="open", nullable=False, index=True)  # open, investigating, resolved, deferred
    resolution_confidence = Column(String(20), nullable=True)  # very_high, high, moderate, low (when resolved)
    resolution_summary = Column(String, nullable=True)

    # Timeline
    target_resolution_date = Column(Date, nullable=True)
    resolved_at = Column(TIMESTAMP(timezone=True), nullable=True)

    # Metadata
    metadata = Column(JSON, default={}, nullable=False)

    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(TIMESTAMP(timezone=True), nullable=True)

    # Relationships
    objective = relationship("Objective", back_populates="unknowns")

    def __repr__(self):
        return f"<Unknown(question='{self.question[:50]}...', status='{self.status}', importance='{self.importance}')>"
