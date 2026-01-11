"""
BeBrahma v0.3 - Signal Model

Time-series events and updates from the user.
"""

from sqlalchemy import Column, String, TIMESTAMP, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db.session import Base


class Signal(Base):
    """
    Time-series signal (update, voice note, event).

    Traceability:
    - FR-003, FR-004: Voice/text input signals
    - FR-008: Update logging
    - FR-013: Time-series signal tracking
    """

    __tablename__ = "signals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)

    # Signal details
    signal_type = Column(String(50), nullable=False, index=True)  # update, voice_note, quick_log, calendar_event, task_completed, integration_sync
    content = Column(String, nullable=True)  # Original content

    # Parsed intent
    intent_category = Column(String(50), nullable=True)  # progress_update, blocker, insight, question, decision, milestone
    entities_extracted = Column(JSON, default={}, nullable=False)  # {tasks: [], unknowns: [], evidence: [], ...}
    sentiment = Column(String(20), nullable=True)  # positive, neutral, negative, frustrated

    # Context
    session_id = Column(UUID(as_uuid=True), nullable=True, index=True)  # Link to nba_session
    source = Column(String(50), nullable=True)  # mobile_app, web_app, calendar_sync, task_sync

    # Metadata
    meta_data = Column(JSON, default={}, nullable=False)

    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False, index=True)

    def __repr__(self):
        return f"<Signal(type='{self.signal_type}', intent='{self.intent_category}', created='{self.created_at}')>"
