"""
BeBrahma v0.3 - Task Model

Actionable items in the business state graph.
"""

from sqlalchemy import Column, String, Integer, Date, TIMESTAMP, JSON, ForeignKey, ARRAY, DECIMAL
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.db.session import Base


class Task(Base):
    """
    Actionable task with NBA scoring dimensions.

    Traceability:
    - FR-002: NBA scoring dimensions stored per task
    - FR-011, FR-012: External task integration
    - FR-013: Business State Graph (tasks entity)
    """

    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)
    objective_id = Column(UUID(as_uuid=True), ForeignKey("objectives.id", ondelete="CASCADE"), nullable=False, index=True)

    # Task details
    title = Column(String(500), nullable=False)
    description = Column(String, nullable=True)
    task_type = Column(String(50), nullable=True)  # customer_interview, prototype, analysis, content, meeting, research, custom

    # State
    status = Column(String(50), default="pending", nullable=False, index=True)  # pending, in_progress, blocked, completed, cancelled
    priority = Column(Integer, default=50, nullable=False)  # 0-100 scale

    # Scheduling
    due_date = Column(Date, nullable=True, index=True)
    estimated_duration_minutes = Column(Integer, nullable=True)
    scheduled_at = Column(TIMESTAMP(timezone=True), nullable=True)

    # Dependencies (stored as UUID arrays)
    blocks_task_ids = Column(ARRAY(UUID(as_uuid=True)), default=[], nullable=False)
    blocked_by_task_ids = Column(ARRAY(UUID(as_uuid=True)), default=[], nullable=False)

    # Scoring dimensions (computed during NBA) - FR-002
    score_objective_impact = Column(DECIMAL(3, 2), nullable=True)  # 0.00 to 1.00
    score_time_sensitivity = Column(DECIMAL(3, 2), nullable=True)
    score_evidence_gap = Column(DECIMAL(3, 2), nullable=True)
    score_unblocks = Column(DECIMAL(3, 2), nullable=True)
    score_feasibility = Column(DECIMAL(3, 2), nullable=True)
    score_total = Column(DECIMAL(3, 2), nullable=True, index=True)  # Weighted sum

    # Integration references (FR-011, FR-012)
    external_task_id = Column(String(255), nullable=True, index=True)
    external_source = Column(String(50), nullable=True)  # linear, asana, calendar, NULL

    # Metadata
    metadata = Column(JSON, default={}, nullable=False)

    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    completed_at = Column(TIMESTAMP(timezone=True), nullable=True)
    deleted_at = Column(TIMESTAMP(timezone=True), nullable=True)  # Soft delete

    # Relationships
    objective = relationship("Objective", back_populates="tasks")

    def __repr__(self):
        return f"<Task(title='{self.title}', status='{self.status}', score={self.score_total})>"
