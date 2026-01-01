"""
BeBrahma v0.3 - Framework Router

Selects which frameworks to use based on business context.

Traceability:
- FR-014: Framework Router
"""

from typing import List
from app.services.scoring_service import BusinessContext
from app.frameworks.base import Framework
from app.frameworks.critical_unknown import CriticalUnknownFramework
from app.frameworks.problem_solution_fit import ProblemSolutionFitFramework
from app.frameworks.icp_wedge import ICPWedgeFramework
from app.core.logging import logger


class FrameworkRouter:
    """
    Selects 1-3 relevant frameworks based on context.

    Selection criteria:
    1. Active objectives (objective_type maps to framework)
    2. Open unknowns (unknowns map to frameworks)
    3. User preferences (learned from overrides)
    4. User query keywords (if provided)
    """

    def __init__(self):
        # Initialize available frameworks
        self.frameworks = {
            'critical_unknown': CriticalUnknownFramework(),
            'problem_solution_fit': ProblemSolutionFitFramework(),
            'icp_wedge': ICPWedgeFramework(),
        }

    async def select_frameworks(
        self,
        context: BusinessContext,
        user_query: str = None
    ) -> List[Framework]:
        """
        Select 1-3 relevant frameworks based on context.

        Args:
            context: Business context
            user_query: Optional user query for keyword matching

        Returns:
            List of selected frameworks (1-3)
        """
        framework_scores = {}

        # Score each framework
        for name, framework in self.frameworks.items():
            score = await self._score_framework_relevance(
                framework=framework,
                context=context,
                user_query=user_query
            )
            framework_scores[name] = score

        # Sort by score
        sorted_frameworks = sorted(
            framework_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )

        # Select top frameworks (threshold: score > 0.3)
        selected = [
            self.frameworks[name]
            for name, score in sorted_frameworks
            if score > 0.3
        ][:3]  # Max 3 frameworks

        # Always include at least one framework
        if not selected:
            selected = [self.frameworks['critical_unknown']]

        logger.info(
            f"Selected {len(selected)} frameworks: {[f.name for f in selected]}",
            extra={'framework_scores': framework_scores}
        )

        return selected

    async def _score_framework_relevance(
        self,
        framework: Framework,
        context: BusinessContext,
        user_query: str = None
    ) -> float:
        """Score how relevant a framework is for current context."""

        # Factor 1: Matching objectives
        matching_objectives = sum(
            1.0 for obj in context.objectives
            if obj.objective_type == framework.name and obj.status == 'active'
        )
        objective_score = matching_objectives / max(len(context.objectives), 1) if context.objectives else 0.0

        # Factor 2: Matching unknowns
        relevant_unknowns_count = framework.count_relevant_unknowns(context.unknowns)
        unknown_score = relevant_unknowns_count / max(len(context.unknowns), 1) if context.unknowns else 0.0

        # Factor 3: User preference (learned from override patterns)
        user_preference = context.user_profile.framework_preferences.get(framework.name, 0.5)

        # Factor 4: Query keywords (if provided)
        query_score = 0.0
        if user_query:
            query_score = framework.match_query_keywords(user_query)

        # Weighted combination
        relevance = (
            objective_score * 0.4 +
            unknown_score * 0.3 +
            user_preference * 0.2 +
            query_score * 0.1
        )

        return relevance
