"""
BeBrahma v0.3 - Decision Model

Key strategic decisions in the business state graph.
"""

from sqlalchemy import Column, String, Boolean, TIMESTAMP, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.db.session import Base


class Decision(Base):
    """
    Strategic decision made by the founder.

    Traceability:
    - FR-013: Business State Graph (decisions entity)
    - FR-008: Decisions logged from updates
    """

    __tablename__ = "decisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)
    objective_id = Column(UUID(as_uuid=True), ForeignKey("objectives.id", ondelete="CASCADE"), nullable=False, index=True)

    # Decision details
    title = Column(String(500), nullable=False)
    description = Column(String, nullable=False)
    decision_type = Column(String(50), nullable=True, index=True)  # strategic, tactical, pivot, hire, partnership, feature, market

    # Decision content
    options_considered = Column(JSON, nullable=True)  # Array of {option, pros, cons}
    chosen_option = Column(String(500), nullable=True)
    rationale = Column(String, nullable=False)

    # State
    status = Column(String(50), default="pending", nullable=False, index=True)  # pending, approved, implemented, reversed
    reversible = Column(Boolean, default=True, nullable=False)

    # Timeline
    decided_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False, index=True)
    implemented_at = Column(TIMESTAMP(timezone=True), nullable=True)

    # Metadata
    metadata = Column(JSON, default={}, nullable=False)

    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(TIMESTAMP(timezone=True), nullable=True)

    # Relationships
    objective = relationship("Objective", back_populates="decisions")

    def __repr__(self):
        return f"<Decision(title='{self.title}', status='{self.status}', type='{self.decision_type}')>"
