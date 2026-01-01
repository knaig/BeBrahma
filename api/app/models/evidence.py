"""
BeBrahma v0.3 - Evidence Model

Facts, data points, and learnings in the business state graph.
"""

from sqlalchemy import Column, String, Integer, TIMESTAMP, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.db.session import Base


class Evidence(Base):
    """
    Evidence (data, facts, learnings) collected.

    Traceability:
    - FR-013: Business State Graph (evidence entity)
    - FR-008: Evidence from user updates
    """

    __tablename__ = "evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)
    objective_id = Column(UUID(as_uuid=True), ForeignKey("objectives.id", ondelete="CASCADE"), nullable=False, index=True)

    # Evidence details
    title = Column(String(500), nullable=False)
    description = Column(String, nullable=False)
    evidence_type = Column(String(50), nullable=True, index=True)  # customer_interview, user_data, market_research, experiment, observation, document
    source = Column(String(255), nullable=True)

    # Quality indicators
    reliability = Column(String(20), default="medium", nullable=False)  # very_high, high, medium, low
    sample_size = Column(Integer, nullable=True)

    # Content
    key_findings = Column(String, nullable=True)
    raw_data = Column(JSON, nullable=True)  # Structured data
    attachments = Column(JSON, default=[], nullable=False)  # Array of {type, url, filename}

    # Timeline
    collected_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Metadata
    metadata = Column(JSON, default={}, nullable=False)

    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(TIMESTAMP(timezone=True), nullable=True)

    # Relationships
    objective = relationship("Objective", back_populates="evidence")

    def __repr__(self):
        return f"<Evidence(title='{self.title}', type='{self.evidence_type}', reliability='{self.reliability}')>"
