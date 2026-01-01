"""
BeBrahma v0.3 - Scoring Service

Multi-dimensional task scoring for NBA recommendation engine.

Traceability:
- FR-002: NBA scoring dimensions
"""

from typing import List, Dict
from dataclasses import dataclass
from datetime import datetime, date
from decimal import Decimal

from app.models import Task, Objective, Unknown, UserProfile
from app.core.logging import logger


@dataclass
class TaskScore:
    """Task with computed scores across all dimensions."""
    task: Task
    objective_impact: Decimal
    time_sensitivity: Decimal
    evidence_gap: Decimal
    unblocks: Decimal
    feasibility: Decimal
    total: Decimal
    breakdown: Dict[str, float]


@dataclass
class BusinessContext:
    """Complete business context for scoring."""
    user_profile: UserProfile
    objectives: List[Objective]
    tasks: List[Task]
    unknowns: List[Unknown]
    # Will add more entities as needed (evidence, decisions, signals, calendar_events)


class ScoringService:
    """
    Multi-dimensional task scoring service.

    Scores tasks on 5 dimensions:
    1. Objective Impact (default weight: 30%)
    2. Time Sensitivity (default weight: 25%)
    3. Evidence Gap (default weight: 25%)
    4. Unblocks (default weight: 10%)
    5. Feasibility (default weight: 10%)
    """

    async def score_tasks(
        self,
        candidates: List[Task],
        context: BusinessContext,
        user_weights: Dict[str, float] = None
    ) -> List[TaskScore]:
        """
        Score all candidate tasks and return sorted by total score.

        Args:
            candidates: List of tasks to score
            context: Business context for scoring
            user_weights: User-specific learned weights (optional)

        Returns:
            List of TaskScore objects sorted by total score (descending)
        """
        if user_weights is None:
            user_weights = context.user_profile.scoring_weights

        scored = []

        for task in candidates:
            scores = await self._score_single_task(task, context)

            # Apply user-specific weights (learned from overrides)
            total = (
                scores['objective_impact'] * user_weights.get('objective_impact', 0.30) +
                scores['time_sensitivity'] * user_weights.get('time_sensitivity', 0.25) +
                scores['evidence_gap'] * user_weights.get('evidence_gap', 0.25) +
                scores['unblocks'] * user_weights.get('unblocks', 0.10) +
                scores['feasibility'] * user_weights.get('feasibility', 0.10)
            )

            # Apply constraint multipliers
            total = self._apply_constraints(total, task, context)

            scored.append(TaskScore(
                task=task,
                objective_impact=Decimal(str(round(scores['objective_impact'], 2))),
                time_sensitivity=Decimal(str(round(scores['time_sensitivity'], 2))),
                evidence_gap=Decimal(str(round(scores['evidence_gap'], 2))),
                unblocks=Decimal(str(round(scores['unblocks'], 2))),
                feasibility=Decimal(str(round(scores['feasibility'], 2))),
                total=Decimal(str(round(total, 2))),
                breakdown=scores
            ))

        # Sort by total score descending
        scored.sort(key=lambda x: float(x.total), reverse=True)

        logger.info(f"Scored {len(scored)} tasks. Top score: {scored[0].total if scored else 0}")

        return scored

    async def _score_single_task(
        self,
        task: Task,
        context: BusinessContext
    ) -> Dict[str, float]:
        """Score a single task on all dimensions."""
        return {
            'objective_impact': await self._score_objective_impact(task, context),
            'time_sensitivity': await self._score_time_sensitivity(task, context),
            'evidence_gap': await self._score_evidence_gap(task, context),
            'unblocks': await self._score_unblocks(task, context),
            'feasibility': await self._score_feasibility(task, context)
        }

    async def _score_objective_impact(
        self,
        task: Task,
        context: BusinessContext
    ) -> float:
        """
        Score: How much does this task advance the objective?

        Factors:
        - Objective priority (0-100 scale)
        - Task's estimated contribution to objective completion
        - Whether task is on critical path
        """
        # Get objective for this task
        objective = next((obj for obj in context.objectives if obj.id == task.objective_id), None)

        if not objective:
            return 0.5  # Default if objective not found

        # Base score from objective priority (0-100 → 0.0-1.0)
        priority_score = objective.priority / 100.0

        # Estimate task contribution (based on task type and metadata)
        contribution_score = self._estimate_task_contribution(task, objective)

        # Critical path bonus (tasks that unlock other high-priority tasks)
        critical_path_bonus = 0.2 if self._is_critical_path(task, context) else 0.0

        # Combine (weighted average + bonus)
        impact = (priority_score * 0.4 + contribution_score * 0.6) + critical_path_bonus

        return min(impact, 1.0)

    def _estimate_task_contribution(self, task: Task, objective: Objective) -> float:
        """Estimate how much this task contributes to objective completion."""
        # High-value task types based on framework
        high_value_types = {
            'problem_solution_fit': ['customer_interview', 'prototype', 'experiment'],
            'icp_wedge': ['customer_interview', 'analysis', 'research'],
            'critical_unknown': ['research', 'customer_interview', 'experiment']
        }

        objective_type = objective.objective_type
        task_type = task.task_type

        if objective_type in high_value_types:
            if task_type in high_value_types[objective_type]:
                return 0.8  # High contribution
            else:
                return 0.5  # Moderate contribution

        # Default contribution
        return 0.6

    def _is_critical_path(self, task: Task, context: BusinessContext) -> bool:
        """Check if task is on critical path (blocks high-priority tasks)."""
        if not task.blocks_task_ids:
            return False

        # Check if any blocked tasks have high priority
        blocked_tasks = [t for t in context.tasks if t.id in task.blocks_task_ids]
        high_priority_blocked = any(t.priority >= 75 for t in blocked_tasks)

        return high_priority_blocked

    async def _score_time_sensitivity(
        self,
        task: Task,
        context: BusinessContext
    ) -> float:
        """
        Score: How urgent is this task?

        Factors:
        - Days until due date
        - External deadlines (e.g., upcoming customer meeting)
        - Seasonal timing (e.g., end of quarter)
        """
        if not task.due_date:
            return 0.5  # No due date = moderate urgency

        # Calculate days until due
        today = date.today()
        days_until_due = (task.due_date - today).days

        # Urgency curve: exponential as due date approaches
        if days_until_due <= 0:
            urgency = 1.0  # Overdue
        elif days_until_due <= 2:
            urgency = 0.9
        elif days_until_due <= 7:
            urgency = 0.7
        elif days_until_due <= 14:
            urgency = 0.5
        elif days_until_due <= 30:
            urgency = 0.3
        else:
            urgency = 0.1

        # External deadline bonus (e.g., customer meeting tomorrow)
        # TODO: Implement calendar event checking
        external_deadline_bonus = 0.0

        return min(urgency + external_deadline_bonus, 1.0)

    async def _score_evidence_gap(
        self,
        task: Task,
        context: BusinessContext
    ) -> float:
        """
        Score: How much does this task reduce critical unknowns?

        Factors:
        - Number of unknowns addressed
        - Importance of unknowns
        - Current evidence level for those unknowns
        """
        # Get unknowns from task metadata (stored during framework task generation)
        unknown_ids = task.metadata.get('unknown_ids', []) if task.metadata else []

        if not unknown_ids:
            return 0.0  # Task doesn't address any unknowns

        # Get unknown objects
        addressed_unknowns = [u for u in context.unknowns if str(u.id) in unknown_ids or u.id in unknown_ids]

        if not addressed_unknowns:
            return 0.0

        total_gap_score = 0.0
        for unknown in addressed_unknowns:
            # Importance weight
            importance_weight = {
                'critical': 1.0,
                'high': 0.7,
                'medium': 0.4,
                'low': 0.2
            }.get(unknown.importance, 0.5)

            # Evidence gap (assume high gap if unknown is still open)
            if unknown.status == 'open':
                evidence_gap = 0.9
            elif unknown.status == 'investigating':
                evidence_gap = 0.6
            elif unknown.status == 'resolved':
                evidence_gap = 0.1
            else:
                evidence_gap = 0.5

            # Task's contribution to resolving this unknown
            task_contribution = 0.7  # Assume most tasks contribute significantly

            unknown_score = importance_weight * evidence_gap * task_contribution
            total_gap_score += unknown_score

        # Normalize by number of unknowns (max score = 1.0)
        normalized_score = min(total_gap_score / len(addressed_unknowns), 1.0)

        return normalized_score

    async def _score_unblocks(
        self,
        task: Task,
        context: BusinessContext
    ) -> float:
        """
        Score: Does this task unblock other tasks?

        Factors:
        - Number of tasks blocked by this
        - Priority of blocked tasks
        """
        if not task.blocks_task_ids:
            return 0.0

        # Get blocked tasks
        blocked_tasks = [t for t in context.tasks if t.id in task.blocks_task_ids]

        if not blocked_tasks:
            return 0.0

        # Count weighted by priority
        unblock_score = sum(
            t.priority / 100.0 for t in blocked_tasks
        ) / len(blocked_tasks)

        # Bonus for unblocking many tasks
        volume_bonus = min(len(blocked_tasks) * 0.1, 0.3)

        return min(unblock_score + volume_bonus, 1.0)

    async def _score_feasibility(
        self,
        task: Task,
        context: BusinessContext
    ) -> float:
        """
        Score: How realistic is it to complete this task now?

        Factors:
        - Estimated duration vs available time
        - Calendar availability
        - Dependencies (is task blocked?)
        - Skill match
        """
        # Check if task is blocked
        if task.blocked_by_task_ids:
            blocked_by_incomplete = any(
                t.id in task.blocked_by_task_ids and t.status != 'completed'
                for t in context.tasks
            )
            if blocked_by_incomplete:
                return 0.2  # Task is blocked = low feasibility

        # Duration reasonableness (prefer tasks that fit in reasonable time blocks)
        duration_score = self._score_duration(task)

        # Calendar availability (TODO: implement calendar checking)
        availability_score = 0.8  # Default: assume available

        # Skill match (TODO: implement skill matching)
        skill_score = 0.8  # Default: assume founder can do it

        # Combine
        feasibility = (
            duration_score * 0.4 +
            availability_score * 0.4 +
            skill_score * 0.2
        )

        return feasibility

    def _score_duration(self, task: Task) -> float:
        """Score based on task duration (prefer tasks that fit in workday)."""
        if not task.estimated_duration_minutes:
            return 0.7  # Default if no estimate

        duration_minutes = task.estimated_duration_minutes

        # Preference curve: 30min-4hrs is ideal
        if 30 <= duration_minutes <= 240:  # 30min - 4hrs
            return 1.0
        elif duration_minutes < 30:
            return 0.7  # Too short, might be trivial
        elif duration_minutes <= 480:  # 4-8hrs
            return 0.8  # Still doable in a day
        else:
            return 0.5  # Very long, harder to commit to

    def _apply_constraints(
        self,
        base_score: float,
        task: Task,
        context: BusinessContext
    ) -> float:
        """Apply constraint multipliers to final score."""
        score = base_score

        # Blocked task penalty
        if task.status == 'blocked':
            score *= 0.5

        # Overdue bonus
        if task.due_date and task.due_date < date.today():
            score *= 1.3

        # Deadline approaching (within 3 days)
        if task.due_date:
            days_until_due = (task.due_date - date.today()).days
            if 0 < days_until_due <= 3:
                score *= 1.2

        return min(score, 1.0)
