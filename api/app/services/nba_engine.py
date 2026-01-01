"""
BeBrahma v0.3 - NBA Engine

Main NBA (Next Best Action) recommendation engine.

Traceability:
- FR-002: NBA Recommendations
- FR-005: Rationale Generation
- FR-010: Confidence Display
"""

import time
import uuid
from typing import List, Optional
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import (
    UserProfile, Objective, Task, Unknown,
    NBASession, NBARecommendation
)
from app.services.scoring_service import ScoringService, BusinessContext, TaskScore
from app.services.framework_router import FrameworkRouter
from app.services.confidence_service import ConfidenceService
from app.services.rationale_service import RationaleService
from app.core.config import settings
from app.core.logging import logger


@dataclass
class NBAResult:
    """Result of NBA computation."""
    session_id: uuid.UUID
    recommendation: NBARecommendation
    alternatives: List[NBARecommendation]
    computation_time_ms: int
    frameworks_used: List[str]


class NBAEngine:
    """
    Main NBA recommendation engine.

    Orchestrates:
    1. Framework selection
    2. Candidate task generation
    3. Multi-dimensional scoring
    4. Confidence calculation
    5. Rationale generation
    6. Recommendation storage
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.framework_router = FrameworkRouter()
        self.scoring_service = ScoringService()
        self.confidence_service = ConfidenceService(db)
        self.rationale_service = RationaleService()

    async def compute_nba(
        self,
        user_id: str,
        user_query: Optional[str] = None,
        trigger_type: str = 'explicit_ask',
        include_alternatives_count: int = 2
    ) -> NBAResult:
        """
        Compute NBA recommendation.

        Args:
            user_id: Clerk user ID
            user_query: Optional user query
            trigger_type: Trigger type (explicit_ask, daily_prompt, post_update, scheduled)
            include_alternatives_count: Number of alternatives to include (default: 2)

        Returns:
            NBAResult with top recommendation and alternatives

        Raises:
            ValueError: If user not found or no tasks available
        """
        start_time = time.time()

        logger.info(f"NBA computation started for user {user_id}")

        # Step 1: Load business context
        context = await self._load_business_context(user_id)

        # Step 2: Select frameworks
        frameworks = await self.framework_router.select_frameworks(
            context=context,
            user_query=user_query
        )

        # Step 3: Generate candidate tasks from frameworks
        candidates = []
        for framework in frameworks:
            framework_candidates = await framework.generate_tasks(context)
            # Limit candidates per framework
            candidates.extend(framework_candidates[:settings.NBA_MAX_CANDIDATES_PER_FRAMEWORK])

        if not candidates:
            raise ValueError("No candidate tasks generated. Need objectives and unknowns.")

        logger.info(f"Generated {len(candidates)} candidate tasks from {len(frameworks)} frameworks")

        # Step 4: Score all candidates
        scored_tasks = await self.scoring_service.score_tasks(
            candidates=candidates,
            context=context,
            user_weights=context.user_profile.scoring_weights
        )

        # Step 5: Calculate confidence for top N tasks
        top_n = min(settings.NBA_CONFIDENCE_CALCULATION_TOP_N, len(scored_tasks))
        for task_score in scored_tasks[:top_n]:
            task_score.confidence = await self.confidence_service.calculate_confidence(
                task_score=task_score,
                context=context
            )

        # Step 6: Generate rationale for top recommendation
        top_task = scored_tasks[0]
        alternatives_tasks = scored_tasks[1:include_alternatives_count + 1]

        top_task.rationale = await self.rationale_service.generate_rationale(
            recommended=top_task,
            alternatives=alternatives_tasks,
            context=context
        )

        # Step 7: Generate summaries for alternatives
        for alt_task in alternatives_tasks:
            alt_task.rationale_summary = await self.rationale_service.generate_summary(
                task_score=alt_task,
                context=context
            )

        computation_time_ms = int((time.time() - start_time) * 1000)

        logger.info(
            f"NBA computation completed in {computation_time_ms}ms",
            extra={
                'user_id': user_id,
                'candidates_count': len(candidates),
                'top_score': float(top_task.total),
                'frameworks': [f.name for f in frameworks]
            }
        )

        # Step 8: Create NBA session and recommendations
        session_id = uuid.uuid4()

        # Create session
        session = NBASession(
            id=session_id,
            user_id=user_id,
            trigger_type=trigger_type,
            user_query=user_query,
            computation_time_ms=computation_time_ms,
            frameworks_used=[f.name for f in frameworks],
            alternatives_count=len(alternatives_tasks)
        )

        self.db.add(session)

        # Create top recommendation
        top_recommendation = self._create_recommendation(
            session_id=session_id,
            user_id=user_id,
            rank=1,
            task_score=top_task,
            framework_name=frameworks[0].name if frameworks else 'general'
        )

        self.db.add(top_recommendation)

        # Create alternative recommendations
        alternative_recommendations = []
        for i, alt_task in enumerate(alternatives_tasks):
            alt_recommendation = self._create_recommendation(
                session_id=session_id,
                user_id=user_id,
                rank=i + 2,
                task_score=alt_task,
                framework_name=frameworks[0].name if frameworks else 'general'
            )
            self.db.add(alt_recommendation)
            alternative_recommendations.append(alt_recommendation)

        # Update session with top recommendation reference
        session.top_recommendation_id = top_recommendation.id

        # Commit to database
        await self.db.commit()

        logger.info(f"NBA session {session_id} saved to database")

        return NBAResult(
            session_id=session_id,
            recommendation=top_recommendation,
            alternatives=alternative_recommendations,
            computation_time_ms=computation_time_ms,
            frameworks_used=[f.name for f in frameworks]
        )

    async def _load_business_context(self, user_id: str) -> BusinessContext:
        """Load complete business context for user."""

        # Load user profile
        user_profile_query = select(UserProfile).where(UserProfile.user_id == user_id)
        user_profile_result = await self.db.execute(user_profile_query)
        user_profile = user_profile_result.scalar_one_or_none()

        if not user_profile:
            raise ValueError(f"User profile not found for user_id: {user_id}")

        # Load objectives
        objectives_query = select(Objective).where(
            Objective.user_id == user_id,
            Objective.status == 'active',
            Objective.deleted_at.is_(None)
        ).order_by(Objective.priority.desc())

        objectives_result = await self.db.execute(objectives_query)
        objectives = list(objectives_result.scalars().all())

        # Load tasks
        tasks_query = select(Task).where(
            Task.user_id == user_id,
            Task.status.in_(['pending', 'in_progress']),
            Task.deleted_at.is_(None)
        ).order_by(Task.priority.desc())

        tasks_result = await self.db.execute(tasks_query)
        tasks = list(tasks_result.scalars().all())

        # Load unknowns
        unknowns_query = select(Unknown).where(
            Unknown.user_id == user_id,
            Unknown.status == 'open',
            Unknown.deleted_at.is_(None)
        ).order_by(
            Unknown.importance.desc()
        )

        unknowns_result = await self.db.execute(unknowns_query)
        unknowns = list(unknowns_result.scalars().all())

        logger.debug(
            f"Loaded context for user {user_id}",
            extra={
                'objectives_count': len(objectives),
                'tasks_count': len(tasks),
                'unknowns_count': len(unknowns)
            }
        )

        return BusinessContext(
            user_profile=user_profile,
            objectives=objectives,
            tasks=tasks,
            unknowns=unknowns
        )

    def _create_recommendation(
        self,
        session_id: uuid.UUID,
        user_id: str,
        rank: int,
        task_score: TaskScore,
        framework_name: str
    ) -> NBARecommendation:
        """Create NBA recommendation from scored task."""

        # Extract rationale
        rationale_summary = ""
        rationale_full = None

        if hasattr(task_score, 'rationale') and task_score.rationale:
            rationale_summary = task_score.rationale.summary
            rationale_full = task_score.rationale.full
        elif hasattr(task_score, 'rationale_summary'):
            rationale_summary = task_score.rationale_summary
        else:
            rationale_summary = f"This task scores {task_score.total:.2f} across all dimensions."

        # Extract confidence
        confidence_level = 'moderate'
        confidence_score = None
        confidence_factors = None

        if hasattr(task_score, 'confidence') and task_score.confidence:
            confidence_level = task_score.confidence.level
            confidence_score = task_score.confidence.score
            confidence_factors = task_score.confidence.factors

        return NBARecommendation(
            id=uuid.uuid4(),
            session_id=session_id,
            user_id=user_id,
            rank=rank,
            action_type='create_task',  # For now, all are create_task
            task_id=None,  # Task not yet created
            suggested_task_title=task_score.task.title,
            suggested_task_description=task_score.task.description,
            score_objective_impact=task_score.objective_impact,
            score_time_sensitivity=task_score.time_sensitivity,
            score_evidence_gap=task_score.evidence_gap,
            score_unblocks=task_score.unblocks,
            score_feasibility=task_score.feasibility,
            score_total=task_score.total,
            confidence_level=confidence_level,
            confidence_score=confidence_score,
            confidence_factors=confidence_factors,
            rationale_summary=rationale_summary,
            rationale_full=rationale_full,
            framework_source=framework_name,
            metadata=task_score.task.metadata or {}
        )
