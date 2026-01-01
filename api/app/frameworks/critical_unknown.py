"""
BeBrahma v0.3 - Critical Unknown Framework

Systematically resolves critical unknowns.

Traceability:
- FR-014: Framework implementations
"""

from typing import List
import uuid

from app.frameworks.base import Framework
from app.models import Task, Unknown
from app.services.scoring_service import BusinessContext
from app.core.logging import logger


class CriticalUnknownFramework(Framework):
    """
    Critical Unknown Mapping framework.

    Purpose: Systematically resolve critical unknowns by generating
    appropriate tasks for each unknown.

    Generates tasks for:
    - Open critical/high importance unknowns
    - Unknowns with largest evidence gaps
    - Unknowns blocking key decisions
    """

    @property
    def name(self) -> str:
        return "critical_unknown"

    def get_keywords(self) -> List[str]:
        return ['unknown', 'assumption', 'risk', 'validate', 'evidence', 'test', 'resolve']

    async def generate_tasks(self, context: BusinessContext) -> List[Task]:
        """
        Generate tasks to resolve critical unknowns.

        Strategy:
        1. Filter open critical/high unknowns
        2. Sort by importance and evidence gap
        3. Generate tasks for top 3 unknowns
        """
        # Get all open critical/high importance unknowns
        critical_unknowns = [
            u for u in context.unknowns
            if u.status == 'open' and u.importance in ['critical', 'high']
        ]

        if not critical_unknowns:
            logger.debug("No critical unknowns found for task generation")
            return []

        # Sort by importance (critical > high)
        sorted_unknowns = sorted(
            critical_unknowns,
            key=lambda u: {'critical': 3, 'high': 2}.get(u.importance, 0),
            reverse=True
        )

        # Generate tasks for top 3 unknowns
        tasks = []
        for unknown in sorted_unknowns[:3]:
            task = self._generate_task_for_unknown(unknown, context)
            if task:
                tasks.append(task)

        logger.info(f"Critical Unknown framework generated {len(tasks)} tasks")

        return tasks

    def _generate_task_for_unknown(
        self,
        unknown: Unknown,
        context: BusinessContext
    ) -> Task:
        """
        Generate appropriate task to resolve an unknown.

        Task type depends on unknown category:
        - customer: Customer interviews
        - market: Market research
        - product/technology: Prototype/experiment
        - business_model: Analysis/research
        """
        # Determine best method based on unknown category
        if unknown.category == 'customer':
            title = f"Resolve: {unknown.question}"
            description = f"Conduct customer interviews to answer: {unknown.question}"
            task_type = "customer_interview"
            estimated_duration = 180  # 3 hours

        elif unknown.category == 'market':
            title = f"Research: {unknown.question}"
            description = f"Conduct market research to answer: {unknown.question}"
            task_type = "research"
            estimated_duration = 120  # 2 hours

        elif unknown.category in ['product', 'technology']:
            title = f"Prototype to test: {unknown.question}"
            description = f"Build small prototype/experiment to validate: {unknown.question}"
            task_type = "prototype"
            estimated_duration = 240  # 4 hours

        elif unknown.category == 'business_model':
            title = f"Analyze: {unknown.question}"
            description = f"Run analysis to determine: {unknown.question}"
            task_type = "analysis"
            estimated_duration = 90  # 1.5 hours

        else:
            title = f"Investigate: {unknown.question}"
            description = f"Gather evidence to answer: {unknown.question}"
            task_type = "research"
            estimated_duration = 120  # 2 hours

        # Create task (unsaved - will be scored and potentially saved later)
        task = Task(
            id=uuid.uuid4(),
            user_id=unknown.user_id,
            objective_id=unknown.objective_id,
            title=title[:500],  # Truncate to 500 chars
            description=description,
            task_type=task_type,
            estimated_duration_minutes=estimated_duration,
            status='pending',
            metadata={
                'unknown_ids': [str(unknown.id)],
                'framework': 'critical_unknown',
                'unknown_importance': unknown.importance,
                'unknown_category': unknown.category
            }
        )

        return task

    def count_relevant_unknowns(self, unknowns: List[Unknown]) -> int:
        """
        Count relevant unknowns.

        This framework is relevant for any open unknowns.
        """
        return sum(1 for u in unknowns if u.status == 'open')
