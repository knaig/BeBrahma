"""
BeBrahma v0.3 - Objective Model

Top-level goals in the business state graph.
"""

from sqlalchemy import Column, String, Integer, Date, TIMESTAMP, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.db.session import Base


class Objective(Base):
    """
    Top-level business objective.

    Traceability:
    - FR-013: Business State Graph (objectives entity)
    - FR-014: Framework-specific metadata storage
    """

    __tablename__ = "objectives"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)

    # Objective details
    title = Column(String(500), nullable=False)
    description = Column(String, nullable=True)
    objective_type = Column(
        String(50),
        nullable=False,
        index=True
    )  # problem_solution_fit, icp_wedge, growth, fundraising, hiring, custom

    # State
    status = Column(String(50), default="active", nullable=False, index=True)  # active, paused, completed, abandoned
    priority = Column(Integer, default=50, nullable=False)  # 0-100 scale
    confidence_level = Column(String(20), nullable=True)  # very_high, high, moderate, low

    # Timeline
    target_completion_date = Column(Date, nullable=True)
    started_at = Column(TIMESTAMP(timezone=True), nullable=True)
    completed_at = Column(TIMESTAMP(timezone=True), nullable=True)

    # Relationships
    parent_objective_id = Column(UUID(as_uuid=True), ForeignKey("objectives.id", ondelete="SET NULL"), nullable=True, index=True)

    # Metadata
    metadata = Column(JSON, default={}, nullable=False)

    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(TIMESTAMP(timezone=True), nullable=True)  # Soft delete

    # Relationships
    tasks = relationship("Task", back_populates="objective", cascade="all, delete-orphan")
    unknowns = relationship("Unknown", back_populates="objective", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="objective", cascade="all, delete-orphan")
    decisions = relationship("Decision", back_populates="objective", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Objective(title='{self.title}', type='{self.objective_type}', status='{self.status}')>"
