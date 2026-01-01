"""
BeBrahma v0.3 - Confidence Service

Calculates confidence in NBA recommendations.

Traceability:
- FR-010: Confidence Display
"""

from typing import Optional
from dataclasses import dataclass
from decimal import Decimal
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models import UserProfile, NBASession
from app.services.scoring_service import TaskScore, BusinessContext
from app.core.logging import logger


@dataclass
class Confidence:
    """Confidence in a recommendation."""
    level: str  # very_high, high, moderate, low
    score: Decimal  # 0.00 to 1.00
    factors: dict  # Breakdown of confidence factors


class ConfidenceService:
    """
    Calculates confidence in NBA recommendations.

    Confidence Levels:
    - Very High (>0.80): Strong context, high historical accuracy
    - High (0.60-0.80): Good context, decent track record
    - Moderate (0.40-0.60): Adequate context, some uncertainty
    - Low (<0.40): Limited context, low certainty

    Factors:
    1. Context Completeness (40%)
    2. Historical Accuracy (30%)
    3. Data Quality (20%)
    4. Recency (10%)
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def calculate_confidence(
        self,
        task_score: TaskScore,
        context: BusinessContext
    ) -> Confidence:
        """
        Calculate confidence in a recommendation.

        Args:
            task_score: Scored task recommendation
            context: Business context

        Returns:
            Confidence object with level, score, and factor breakdown
        """
        # Factor 1: Context Completeness (40%)
        context_completeness = self._assess_context_completeness(context)

        # Factor 2: Historical Accuracy (30%)
        historical_accuracy = await self._get_historical_accuracy(context.user_profile)

        # Factor 3: Data Quality (20%)
        data_quality = self._assess_data_quality(task_score, context)

        # Factor 4: Recency (10%)
        recency = self._assess_recency(context)

        # Weighted combination
        confidence_score = (
            context_completeness * 0.40 +
            historical_accuracy * 0.30 +
            data_quality * 0.20 +
            recency * 0.10
        )

        # Determine level
        if confidence_score >= 0.80:
            level = 'very_high'
        elif confidence_score >= 0.60:
            level = 'high'
        elif confidence_score >= 0.40:
            level = 'moderate'
        else:
            level = 'low'

        logger.debug(
            f"Confidence calculated: {level} ({confidence_score:.2f})",
            extra={
                'context_completeness': context_completeness,
                'historical_accuracy': historical_accuracy,
                'data_quality': data_quality,
                'recency': recency
            }
        )

        return Confidence(
            level=level,
            score=Decimal(str(round(confidence_score, 2))),
            factors={
                'context_completeness': round(context_completeness, 2),
                'historical_accuracy': round(historical_accuracy, 2),
                'data_quality': round(data_quality, 2),
                'recency': round(recency, 2)
            }
        )

    def _assess_context_completeness(self, context: BusinessContext) -> float:
        """
        How complete is the business context?

        Checks:
        - Has objectives defined
        - Has unknowns identified
        - Has evidence collected
        - Has recent activity (signals)
        """
        has_objectives = len(context.objectives) > 0
        has_unknowns = len(context.unknowns) > 0
        has_tasks = len(context.tasks) > 0

        # TODO: Add evidence and signals when available in context
        has_evidence = False  # Placeholder
        has_recent_signals = False  # Placeholder

        completeness = sum([
            0.3 if has_objectives else 0.0,
            0.3 if has_unknowns else 0.0,
            0.2 if has_tasks else 0.0,
            0.1 if has_evidence else 0.0,
            0.1 if has_recent_signals else 0.0
        ])

        return completeness

    async def _get_historical_accuracy(self, user_profile: UserProfile) -> float:
        """
        How accurate have past recommendations been?

        Calculates acceptance rate (user accepted top recommendation).
        """
        # Query past sessions for this user
        query = select(NBASession).where(
            NBASession.user_id == user_profile.user_id,
            NBASession.user_action.isnot(None)  # Only sessions with user action
        ).order_by(
            NBASession.created_at.desc()
        ).limit(20)  # Last 20 sessions

        result = await self.db.execute(query)
        past_sessions = result.scalars().all()

        if not past_sessions:
            return 0.5  # Default: moderate confidence for new users

        # Calculate acceptance rate
        acceptance_count = sum(
            1 for session in past_sessions
            if session.user_action == 'accepted'
        )

        acceptance_rate = acceptance_count / len(past_sessions)

        return acceptance_rate

    def _assess_data_quality(self, task_score: TaskScore, context: BusinessContext) -> float:
        """
        How reliable is the data used for scoring?

        For now, we'll use a simplified version based on:
        - Whether task has clear scoring dimensions
        - Whether unknowns are well-defined
        """
        # Check if task has clear scores across dimensions
        has_clear_scores = all([
            float(task_score.objective_impact) > 0,
            float(task_score.feasibility) > 0
        ])

        # Check if unknowns are well-defined (if task addresses unknowns)
        unknown_ids = task_score.task.metadata.get('unknown_ids', []) if task_score.task.metadata else []
        has_unknowns = len(unknown_ids) > 0

        if has_clear_scores and has_unknowns:
            return 0.8
        elif has_clear_scores:
            return 0.6
        else:
            return 0.4

    def _assess_recency(self, context: BusinessContext) -> float:
        """
        How recent is the context data?

        Checks when user was last active.
        """
        if not context.user_profile.last_active_at:
            return 0.5

        # Calculate hours since last activity
        last_active = context.user_profile.last_active_at
        if last_active.tzinfo is None:
            # Make timezone-aware if naive
            from datetime import timezone
            last_active = last_active.replace(tzinfo=timezone.utc)

        now = datetime.now(last_active.tzinfo)
        hours_since_active = (now - last_active).total_seconds() / 3600

        # Recency curve
        if hours_since_active < 24:
            return 1.0
        elif hours_since_active < 72:
            return 0.7
        elif hours_since_active < 168:  # 1 week
            return 0.5
        else:
            return 0.3
