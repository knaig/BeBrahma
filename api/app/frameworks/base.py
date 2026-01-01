"""
BeBrahma v0.3 - Base Framework

Abstract base class for all frameworks.

Traceability:
- FR-014: Framework Router
"""

from abc import ABC, abstractmethod
from typing import List
from app.models import Task, Unknown
from app.services.scoring_service import BusinessContext


class Framework(ABC):
    """
    Abstract base class for recommendation frameworks.

    Each framework implements specific logic for:
    - Generating candidate tasks
    - Identifying relevant unknowns
    - Matching user queries
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Framework identifier."""
        pass

    @abstractmethod
    async def generate_tasks(self, context: BusinessContext) -> List[Task]:
        """
        Generate candidate tasks based on framework logic.

        Args:
            context: Business context

        Returns:
            List of candidate tasks (unsaved, will be scored)
        """
        pass

    @abstractmethod
    def count_relevant_unknowns(self, unknowns: List[Unknown]) -> int:
        """
        Count how many unknowns are relevant to this framework.

        Args:
            unknowns: List of unknowns

        Returns:
            Count of relevant unknowns
        """
        pass

    def match_query_keywords(self, query: str) -> float:
        """
        Match user query to framework keywords.

        Args:
            query: User query text

        Returns:
            Match score (0.0 - 1.0)
        """
        keywords = self.get_keywords()
        if not keywords:
            return 0.0

        query_lower = query.lower()
        matches = sum(1 for kw in keywords if kw.lower() in query_lower)

        return min(matches / len(keywords), 1.0)

    @abstractmethod
    def get_keywords(self) -> List[str]:
        """
        Keywords associated with this framework.

        Used for query matching.

        Returns:
            List of keywords
        """
        pass
