# BeBrahma v0.3 - NBA Engine & Frameworks Design

**Document ID:** DES-005
**Traceability:** Maps to FR-002 (NBA Recommendations), FR-014 (Framework Router), FR-015 (Override Taxonomy)
**Last Updated:** 2026-01-01
**Status:** Draft

---

## Table of Contents

1. [Overview](#overview)
2. [NBA Engine Architecture](#nba-engine-architecture)
3. [Scoring System](#scoring-system)
4. [Framework Router](#framework-router)
5. [Framework Implementations](#framework-implementations)
6. [Confidence Calculation](#confidence-calculation)
7. [Rationale Generation](#rationale-generation)
8. [Override Learning](#override-learning)
9. [Performance Optimization](#performance-optimization)
10. [Traceability Matrix](#traceability-matrix)

---

## Overview

The **Next Best Action (NBA) Engine** is the core intelligence system that recommends what founders should do next based on their current business context.

### Key Responsibilities

1. **Framework Selection**: Choose relevant frameworks based on business stage
2. **Candidate Generation**: Generate potential tasks from active frameworks
3. **Multi-Dimensional Scoring**: Score tasks across 5 dimensions
4. **Confidence Calculation**: Compute confidence in recommendations
5. **Rationale Generation**: Explain WHY this is the best next action
6. **Learning**: Improve recommendations based on user overrides

### Design Goals

- **Accuracy**: Top-1 accuracy >60% vs expert panel (VAL-002)
- **Performance**: <2 seconds for 90th percentile (NFR-001)
- **Explainability**: Clear rationale for every recommendation
- **Adaptability**: Learn from user behavior over time

---

## NBA Engine Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    NBA ENGINE                               │
│                                                             │
│  Input: BusinessContext + RecentSignals                     │
│     ↓                                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. FRAMEWORK ROUTER                                   │  │
│  │    Select relevant frameworks (1-3)                   │  │
│  │    Based on: objectives, unknowns, recent activity    │  │
│  └──────────────────────────────────────────────────────┘  │
│     ↓                                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 2. CANDIDATE GENERATION                               │  │
│  │    Each framework generates candidate tasks           │  │
│  │    Pool: 20-50 candidate tasks                        │  │
│  └──────────────────────────────────────────────────────┘  │
│     ↓                                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 3. MULTI-DIMENSIONAL SCORING                          │  │
│  │    Score each task on 5 dimensions                    │  │
│  │    - Objective Impact (30%)                           │  │
│  │    - Time Sensitivity (25%)                           │  │
│  │    - Evidence Gap (25%)                               │  │
│  │    - Unblocks (10%)                                   │  │
│  │    - Feasibility (10%)                                │  │
│  └──────────────────────────────────────────────────────┘  │
│     ↓                                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 4. CONFIDENCE CALCULATION                             │  │
│  │    Compute confidence for top 10 tasks                │  │
│  │    Factors: context quality, historical accuracy      │  │
│  └──────────────────────────────────────────────────────┘  │
│     ↓                                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 5. RATIONALE GENERATION                               │  │
│  │    Generate explanation for top recommendation        │  │
│  │    Why? Why now? Expected outcome?                    │  │
│  └──────────────────────────────────────────────────────┘  │
│     ↓                                                       │
│  Output: Recommendation + Alternatives + Rationale         │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

```python
# api/app/services/nba_engine.py

from typing import List, Tuple
from dataclasses import dataclass
from .framework_router import FrameworkRouter
from .scoring_service import ScoringService
from .confidence_service import ConfidenceService
from .rationale_service import RationaleService

@dataclass
class BusinessContext:
    user_profile: UserProfile
    objectives: List[Objective]
    tasks: List[Task]
    unknowns: List[Unknown]
    evidence: List[Evidence]
    decisions: List[Decision]
    recent_signals: List[Signal]
    calendar_events: List[CalendarEvent]

@dataclass
class NBAResult:
    session_id: str
    recommendation: Recommendation
    alternatives: List[Recommendation]
    computation_time_ms: int
    frameworks_used: List[str]

class NBAEngine:
    def __init__(self):
        self.framework_router = FrameworkRouter()
        self.scoring_service = ScoringService()
        self.confidence_service = ConfidenceService()
        self.rationale_service = RationaleService()

    async def compute_nba(
        self,
        user_id: str,
        context: BusinessContext,
        user_query: str = None
    ) -> NBAResult:
        """
        Main entry point for NBA computation.

        Steps:
        1. Select frameworks
        2. Generate candidates
        3. Score tasks
        4. Calculate confidence
        5. Generate rationale
        6. Return top + alternatives
        """
        start_time = time.time()

        # Step 1: Framework Selection
        frameworks = await self.framework_router.select_frameworks(
            context=context,
            user_query=user_query
        )

        # Step 2: Candidate Generation
        candidates = []
        for framework in frameworks:
            framework_candidates = await framework.generate_tasks(context)
            candidates.extend(framework_candidates)

        # Step 3: Multi-Dimensional Scoring
        scored_tasks = await self.scoring_service.score_tasks(
            candidates=candidates,
            context=context,
            user_weights=context.user_profile.scoring_weights
        )

        # Step 4: Confidence Calculation (top 10 only for performance)
        top_tasks = scored_tasks[:10]
        for task in top_tasks:
            task.confidence = await self.confidence_service.calculate_confidence(
                task=task,
                context=context
            )

        # Step 5: Rationale Generation (top 1 + alternatives 2-3)
        top_recommendation = top_tasks[0]
        alternatives = top_tasks[1:3]

        top_recommendation.rationale = await self.rationale_service.generate_rationale(
            recommended=top_recommendation,
            alternatives=alternatives,
            context=context
        )

        for alt in alternatives:
            alt.rationale_summary = await self.rationale_service.generate_summary(
                task=alt,
                context=context
            )

        computation_time_ms = int((time.time() - start_time) * 1000)

        return NBAResult(
            session_id=generate_uuid(),
            recommendation=top_recommendation,
            alternatives=alternatives,
            computation_time_ms=computation_time_ms,
            frameworks_used=[f.name for f in frameworks]
        )
```

---

## Scoring System

### Five Dimensions

Each task is scored on **five dimensions** (0.00 to 1.00 scale):

1. **Objective Impact** (default weight: 30%)
   - How much does this task advance the primary objective?
   - Factors: Objective priority, task's contribution to objective completion

2. **Time Sensitivity** (default weight: 25%)
   - How urgent is this task?
   - Factors: Due date proximity, external deadlines, seasonal timing

3. **Evidence Gap** (default weight: 25%)
   - How much does this task reduce critical unknowns?
   - Factors: Number of unknowns addressed, unknown importance, current evidence level

4. **Unblocks** (default weight: 10%)
   - Does this task unblock other tasks?
   - Factors: Number of blocked tasks, priority of blocked tasks

5. **Feasibility** (default weight: 10%)
   - How realistic is it to complete this task now?
   - Factors: Estimated duration, calendar availability, dependencies, skill match

### Scoring Implementation

```python
# api/app/services/scoring_service.py

from typing import List
from dataclasses import dataclass

@dataclass
class TaskScore:
    task: Task
    objective_impact: float
    time_sensitivity: float
    evidence_gap: float
    unblocks: float
    feasibility: float
    total: float
    breakdown: dict

class ScoringService:
    async def score_tasks(
        self,
        candidates: List[Task],
        context: BusinessContext,
        user_weights: dict
    ) -> List[TaskScore]:
        """Score all candidate tasks and return sorted by total score."""
        scored = []

        for task in candidates:
            scores = await self._score_single_task(task, context)

            # Apply user-specific weights (learned from overrides)
            total = (
                scores['objective_impact'] * user_weights['objective_impact'] +
                scores['time_sensitivity'] * user_weights['time_sensitivity'] +
                scores['evidence_gap'] * user_weights['evidence_gap'] +
                scores['unblocks'] * user_weights['unblocks'] +
                scores['feasibility'] * user_weights['feasibility']
            )

            # Apply constraint multipliers
            total = self._apply_constraints(total, task, context)

            scored.append(TaskScore(
                task=task,
                objective_impact=scores['objective_impact'],
                time_sensitivity=scores['time_sensitivity'],
                evidence_gap=scores['evidence_gap'],
                unblocks=scores['unblocks'],
                feasibility=scores['feasibility'],
                total=total,
                breakdown=scores
            ))

        # Sort by total score descending
        scored.sort(key=lambda x: x.total, reverse=True)
        return scored

    async def _score_single_task(
        self,
        task: Task,
        context: BusinessContext
    ) -> dict:
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
        objective = context.get_objective(task.objective_id)

        # Base score from objective priority
        priority_score = objective.priority / 100.0

        # Estimate task contribution (based on task type and framework)
        contribution_score = self._estimate_task_contribution(task, objective)

        # Critical path bonus
        critical_path_bonus = 0.2 if self._is_critical_path(task, objective) else 0.0

        # Combine (weighted average)
        impact = (priority_score * 0.4 + contribution_score * 0.6) + critical_path_bonus

        return min(impact, 1.0)

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

        days_until_due = (task.due_date - datetime.now().date()).days

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
        external_deadline_bonus = self._check_external_deadlines(task, context)

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
        # Get unknowns this task addresses
        addressed_unknowns = context.get_unknowns_for_task(task.id)

        if not addressed_unknowns:
            return 0.0  # Task doesn't address any unknowns

        total_gap_score = 0.0
        for unknown in addressed_unknowns:
            # Importance weight
            importance_weight = {
                'critical': 1.0,
                'high': 0.7,
                'medium': 0.4,
                'low': 0.2
            }.get(unknown.importance, 0.5)

            # Current evidence level (0-100%)
            current_evidence = self._calculate_evidence_level(unknown, context)
            evidence_gap = 1.0 - (current_evidence / 100.0)

            # Task's contribution to resolving this unknown
            task_contribution = self._estimate_unknown_contribution(task, unknown)

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

        blocked_tasks = context.get_tasks(task.blocks_task_ids)

        # Count weighted by priority
        unblock_score = sum(
            blocked_task.priority / 100.0
            for blocked_task in blocked_tasks
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
        if task.blocked_by_task_ids and any(
            context.get_task(tid).status != 'completed'
            for tid in task.blocked_by_task_ids
        ):
            return 0.2  # Task is blocked = low feasibility

        # Calendar availability
        availability_score = self._check_calendar_availability(task, context)

        # Duration reasonableness (prefer tasks that fit in available time)
        duration_score = self._score_duration(task, context)

        # Skill match (does user have skills/resources?)
        skill_score = 0.8  # Default (TODO: implement skill matching)

        # Combine
        feasibility = (
            availability_score * 0.5 +
            duration_score * 0.3 +
            skill_score * 0.2
        )

        return feasibility

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
        if task.due_date and task.due_date < datetime.now().date():
            score *= 1.3

        # Deadline approaching (within 3 days)
        if task.due_date:
            days_until_due = (task.due_date - datetime.now().date()).days
            if 0 < days_until_due <= 3:
                score *= 1.2

        return min(score, 1.0)
```

---

## Framework Router

### Purpose

The **Framework Router** selects which frameworks to use based on:
- User's objectives and their types
- Current unknowns
- Recent activity/signals
- Business stage

### Framework Selection Logic

```python
# api/app/services/framework_router.py

from typing import List
from .frameworks.problem_solution_fit import ProblemSolutionFitFramework
from .frameworks.icp_wedge import ICPWedgeFramework
from .frameworks.critical_unknown import CriticalUnknownFramework

class FrameworkRouter:
    def __init__(self):
        self.frameworks = {
            'problem_solution_fit': ProblemSolutionFitFramework(),
            'icp_wedge': ICPWedgeFramework(),
            'critical_unknown': CriticalUnknownFramework(),
            # Future: 'growth', 'fundraising', 'hiring', etc.
        }

    async def select_frameworks(
        self,
        context: BusinessContext,
        user_query: str = None
    ) -> List[Framework]:
        """
        Select 1-3 relevant frameworks based on context.

        Selection criteria:
        1. Active objectives (objective_type maps to framework)
        2. Open unknowns (unknowns map to frameworks)
        3. User preferences (learned from overrides)
        4. User query keywords (if provided)
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

        # Select top 1-3 frameworks (threshold: score > 0.3)
        selected = [
            self.frameworks[name]
            for name, score in sorted_frameworks
            if score > 0.3
        ][:3]

        # Always include at least one framework
        if not selected:
            selected = [self.frameworks['critical_unknown']]

        return selected

    async def _score_framework_relevance(
        self,
        framework: Framework,
        context: BusinessContext,
        user_query: str = None
    ) -> float:
        """Score how relevant a framework is for current context."""

        # Factor 1: Matching objectives
        objective_score = sum(
            1.0 for obj in context.objectives
            if obj.objective_type == framework.name and obj.status == 'active'
        ) / max(len(context.objectives), 1)

        # Factor 2: Matching unknowns
        unknown_score = framework.count_relevant_unknowns(context.unknowns) / max(len(context.unknowns), 1)

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
```

---

## Framework Implementations

### Base Framework Interface

```python
# api/app/services/frameworks/base.py

from abc import ABC, abstractmethod
from typing import List

class Framework(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Framework identifier."""
        pass

    @abstractmethod
    async def generate_tasks(self, context: BusinessContext) -> List[Task]:
        """Generate candidate tasks based on framework logic."""
        pass

    @abstractmethod
    def count_relevant_unknowns(self, unknowns: List[Unknown]) -> int:
        """Count how many unknowns are relevant to this framework."""
        pass

    def match_query_keywords(self, query: str) -> float:
        """Match user query to framework keywords (0.0 - 1.0)."""
        keywords = self.get_keywords()
        matches = sum(1 for kw in keywords if kw.lower() in query.lower())
        return min(matches / len(keywords), 1.0) if keywords else 0.0

    @abstractmethod
    def get_keywords(self) -> List[str]:
        """Keywords associated with this framework."""
        pass
```

---

### Framework 1: Problem-Solution Fit

**Purpose:** Validate that you're solving a real, painful problem.

**Stages:**
1. Understand the Problem
2. Validate Problem Severity
3. Test Solution Fit

```python
# api/app/services/frameworks/problem_solution_fit.py

class ProblemSolutionFitFramework(Framework):
    name = 'problem_solution_fit'

    def get_keywords(self) -> List[str]:
        return ['problem', 'pain', 'customer', 'interview', 'validate', 'solution']

    async def generate_tasks(self, context: BusinessContext) -> List[Task]:
        """Generate tasks based on Problem-Solution Fit stage."""

        # Determine current stage
        stage = self._determine_stage(context)

        if stage == 'understand_problem':
            return await self._generate_understand_problem_tasks(context)
        elif stage == 'validate_severity':
            return await self._generate_validate_severity_tasks(context)
        elif stage == 'test_solution':
            return await self._generate_test_solution_tasks(context)
        else:
            return []

    def _determine_stage(self, context: BusinessContext) -> str:
        """Determine which stage of Problem-Solution Fit the user is in."""

        # Check evidence and unknowns to infer stage
        has_problem_evidence = any(
            e.evidence_type == 'customer_interview' and 'problem' in e.title.lower()
            for e in context.evidence
        )

        has_solution_evidence = any(
            e.evidence_type == 'prototype' or 'solution' in e.title.lower()
            for e in context.evidence
        )

        if not has_problem_evidence:
            return 'understand_problem'
        elif has_problem_evidence and not has_solution_evidence:
            return 'validate_severity'
        else:
            return 'test_solution'

    async def _generate_understand_problem_tasks(
        self,
        context: BusinessContext
    ) -> List[Task]:
        """Stage 1: Understand the problem."""
        tasks = []

        # Task: Conduct problem interviews
        if self._needs_more_interviews(context, min_count=10):
            tasks.append(Task(
                title="Conduct 10 problem interviews",
                description="Interview target customers to understand their current pain points and workarounds",
                task_type="customer_interview",
                estimated_duration_minutes=300,
                metadata={
                    'framework': 'problem_solution_fit',
                    'stage': 'understand_problem',
                    'suggested_questions': [
                        "What's the biggest challenge you face with [problem area]?",
                        "How do you currently solve this problem?",
                        "How often does this problem occur?"
                    ]
                }
            ))

        # Task: Map customer journey
        if not self._has_customer_journey_mapped(context):
            tasks.append(Task(
                title="Map customer journey for core use case",
                description="Document step-by-step how customers experience the problem",
                task_type="analysis",
                estimated_duration_minutes=120
            ))

        # Task: Identify pain points
        tasks.append(Task(
            title="Synthesize top 3 pain points from interviews",
            description="Analyze interview data to identify the most common and severe pain points",
            task_type="analysis",
            estimated_duration_minutes=90
        ))

        return tasks

    async def _generate_validate_severity_tasks(
        self,
        context: BusinessContext
    ) -> List[Task]:
        """Stage 2: Validate problem severity."""
        tasks = []

        # Task: Quantify pain frequency
        tasks.append(Task(
            title="Survey 50 users on pain frequency and severity",
            description="Validate how often and how severely target customers experience the problem",
            task_type="research",
            estimated_duration_minutes=180
        ))

        # Task: Assess willingness to pay
        if self._needs_willingness_to_pay_validation(context):
            tasks.append(Task(
                title="Test willingness to pay with 20 customers",
                description="Ask customers if they would pay to solve this problem and at what price point",
                task_type="customer_interview",
                estimated_duration_minutes=200
            ))

        return tasks

    async def _generate_test_solution_tasks(
        self,
        context: BusinessContext
    ) -> List[Task]:
        """Stage 3: Test solution fit."""
        tasks = []

        # Task: Create prototype
        if not self._has_prototype(context):
            tasks.append(Task(
                title="Build low-fidelity prototype",
                description="Create a simple prototype to test core solution concept",
                task_type="prototype",
                estimated_duration_minutes=480
            ))

        # Task: Solution validation interviews
        tasks.append(Task(
            title="Test prototype with 10 customers",
            description="Show prototype to target customers and gather feedback on solution fit",
            task_type="customer_interview",
            estimated_duration_minutes=300
        ))

        return tasks

    def count_relevant_unknowns(self, unknowns: List[Unknown]) -> int:
        """Count unknowns related to problem-solution fit."""
        relevant_keywords = ['problem', 'pain', 'customer', 'solution', 'pay', 'willingness']
        return sum(
            1 for unknown in unknowns
            if unknown.status == 'open' and any(
                kw in unknown.question.lower() for kw in relevant_keywords
            )
        )
```

---

### Framework 2: ICP + Wedge

**Purpose:** Define your Ideal Customer Profile and initial wedge market.

**Stages:**
1. Define broad ICP
2. Narrow to wedge segment
3. Validate wedge economics

```python
# api/app/services/frameworks/icp_wedge.py

class ICPWedgeFramework(Framework):
    name = 'icp_wedge'

    def get_keywords(self) -> List[str]:
        return ['customer', 'segment', 'target', 'market', 'icp', 'wedge', 'niche']

    async def generate_tasks(self, context: BusinessContext) -> List[Task]:
        """Generate tasks based on ICP+Wedge stage."""

        stage = self._determine_stage(context)

        if stage == 'define_icp':
            return await self._generate_define_icp_tasks(context)
        elif stage == 'narrow_wedge':
            return await self._generate_narrow_wedge_tasks(context)
        elif stage == 'validate_economics':
            return await self._generate_validate_economics_tasks(context)
        else:
            return []

    async def _generate_define_icp_tasks(
        self,
        context: BusinessContext
    ) -> List[Task]:
        """Stage 1: Define broad ICP."""
        return [
            Task(
                title="Define ICP characteristics",
                description="Document: industry, company size, role, pain points, budget",
                task_type="analysis",
                estimated_duration_minutes=90
            ),
            Task(
                title="Interview 5 different customer segments",
                description="Test problem resonance across different segments",
                task_type="customer_interview",
                estimated_duration_minutes=150
            )
        ]

    async def _generate_narrow_wedge_tasks(
        self,
        context: BusinessContext
    ) -> List[Task]:
        """Stage 2: Narrow to wedge segment."""
        return [
            Task(
                title="Identify 3 potential wedge segments",
                description="Find narrow segments with: strong pain, reachable, willing to pay",
                task_type="analysis",
                estimated_duration_minutes=120
            ),
            Task(
                title="Score wedge segments on: pain, reach, economics",
                description="Evaluate each wedge on strategic dimensions",
                task_type="analysis",
                estimated_duration_minutes=90
            ),
            Task(
                title="Choose initial wedge segment",
                description="Select one wedge to focus on for initial traction",
                task_type="decision",
                estimated_duration_minutes=60
            )
        ]

    async def _generate_validate_economics_tasks(
        self,
        context: BusinessContext
    ) -> List[Task]:
        """Stage 3: Validate wedge economics."""
        return [
            Task(
                title="Calculate wedge market size",
                description="Estimate TAM for wedge segment",
                task_type="analysis",
                estimated_duration_minutes=120
            ),
            Task(
                title="Estimate customer acquisition cost (CAC)",
                description="Research channels and estimate cost to acquire wedge customers",
                task_type="research",
                estimated_duration_minutes=150
            ),
            Task(
                title="Validate unit economics (LTV > 3x CAC)",
                description="Ensure wedge segment has positive economics",
                task_type="analysis",
                estimated_duration_minutes=90
            )
        ]

    def count_relevant_unknowns(self, unknowns: List[Unknown]) -> int:
        relevant_keywords = ['icp', 'customer', 'segment', 'market', 'wedge', 'target']
        return sum(
            1 for unknown in unknowns
            if unknown.status == 'open' and any(
                kw in unknown.question.lower() for kw in relevant_keywords
            )
        )
```

---

### Framework 3: Critical Unknown Mapping

**Purpose:** Systematically resolve critical unknowns.

```python
# api/app/services/frameworks/critical_unknown.py

class CriticalUnknownFramework(Framework):
    name = 'critical_unknown'

    def get_keywords(self) -> List[str]:
        return ['unknown', 'assumption', 'risk', 'validate', 'evidence', 'test']

    async def generate_tasks(self, context: BusinessContext) -> List[Task]:
        """Generate tasks to resolve critical unknowns."""
        tasks = []

        # Get all open critical/high importance unknowns
        critical_unknowns = [
            u for u in context.unknowns
            if u.status == 'open' and u.importance in ['critical', 'high']
        ]

        # Sort by importance and evidence gap
        sorted_unknowns = sorted(
            critical_unknowns,
            key=lambda u: (
                {'critical': 3, 'high': 2}.get(u.importance, 0),
                self._calculate_evidence_gap(u, context)
            ),
            reverse=True
        )

        # Generate tasks for top 3 unknowns
        for unknown in sorted_unknowns[:3]:
            task = self._generate_task_for_unknown(unknown, context)
            if task:
                tasks.append(task)

        return tasks

    def _generate_task_for_unknown(
        self,
        unknown: Unknown,
        context: BusinessContext
    ) -> Task:
        """Generate appropriate task to resolve an unknown."""

        # Determine best method based on unknown category
        if unknown.category == 'customer':
            return Task(
                title=f"Resolve: {unknown.question}",
                description=f"Conduct customer interviews to answer: {unknown.question}",
                task_type="customer_interview",
                estimated_duration_minutes=180,
                metadata={
                    'unknown_id': unknown.id,
                    'suggested_method': 'customer_interviews'
                }
            )
        elif unknown.category == 'market':
            return Task(
                title=f"Research: {unknown.question}",
                description=f"Conduct market research to answer: {unknown.question}",
                task_type="research",
                estimated_duration_minutes=120,
                metadata={
                    'unknown_id': unknown.id,
                    'suggested_method': 'market_research'
                }
            )
        elif unknown.category in ['product', 'technology']:
            return Task(
                title=f"Prototype to test: {unknown.question}",
                description=f"Build small prototype to validate: {unknown.question}",
                task_type="prototype",
                estimated_duration_minutes=240,
                metadata={
                    'unknown_id': unknown.id,
                    'suggested_method': 'prototype'
                }
            )
        else:
            return Task(
                title=f"Investigate: {unknown.question}",
                description=f"Gather evidence to answer: {unknown.question}",
                task_type="research",
                estimated_duration_minutes=120,
                metadata={'unknown_id': unknown.id}
            )

    def count_relevant_unknowns(self, unknowns: List[Unknown]) -> int:
        # This framework is always relevant if there are open unknowns
        return sum(1 for u in unknowns if u.status == 'open')
```

---

## Confidence Calculation

### Confidence Levels

- **Very High** (>0.80): Strong context, high historical accuracy
- **High** (0.60-0.80): Good context, decent track record
- **Moderate** (0.40-0.60): Adequate context, some uncertainty
- **Low** (<0.40): Limited context, low certainty

### Confidence Factors

```python
# api/app/services/confidence_service.py

class ConfidenceService:
    async def calculate_confidence(
        self,
        task: TaskScore,
        context: BusinessContext
    ) -> Confidence:
        """
        Calculate confidence in a recommendation.

        Factors:
        1. Context Completeness (40%)
        2. Historical Accuracy (30%)
        3. Data Quality (20%)
        4. Recency (10%)
        """

        # Factor 1: Context Completeness
        context_completeness = self._assess_context_completeness(context)

        # Factor 2: Historical Accuracy
        historical_accuracy = await self._get_historical_accuracy(context.user_profile)

        # Factor 3: Data Quality
        data_quality = self._assess_data_quality(task, context)

        # Factor 4: Recency
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

        return Confidence(
            level=level,
            score=confidence_score,
            factors={
                'context_completeness': context_completeness,
                'historical_accuracy': historical_accuracy,
                'data_quality': data_quality,
                'recency': recency
            }
        )

    def _assess_context_completeness(self, context: BusinessContext) -> float:
        """How complete is the business context?"""

        # Check presence of key entities
        has_objectives = len(context.objectives) > 0
        has_unknowns = len(context.unknowns) > 0
        has_evidence = len(context.evidence) > 0
        has_recent_signals = len(context.recent_signals) > 0

        completeness = sum([
            0.3 if has_objectives else 0.0,
            0.3 if has_unknowns else 0.0,
            0.2 if has_evidence else 0.0,
            0.2 if has_recent_signals else 0.0
        ])

        return completeness

    async def _get_historical_accuracy(self, user_profile: UserProfile) -> float:
        """How accurate have past recommendations been?"""

        # Query past sessions where user took action
        past_sessions = await self._get_past_sessions(user_profile.user_id, limit=20)

        if not past_sessions:
            return 0.5  # Default: moderate confidence for new users

        # Calculate acceptance rate (user accepted top recommendation)
        acceptance_count = sum(
            1 for session in past_sessions
            if session.user_action == 'accepted'
        )

        acceptance_rate = acceptance_count / len(past_sessions)

        return acceptance_rate

    def _assess_data_quality(self, task: TaskScore, context: BusinessContext) -> float:
        """How reliable is the data used for scoring?"""

        # Check evidence reliability for unknowns this task addresses
        unknowns = context.get_unknowns_for_task(task.task.id)

        if not unknowns:
            return 0.5

        # Get evidence for these unknowns
        evidence_reliability_scores = []
        for unknown in unknowns:
            evidence = context.get_evidence_for_unknown(unknown.id)
            if evidence:
                avg_reliability = sum(
                    {'very_high': 1.0, 'high': 0.8, 'medium': 0.5, 'low': 0.3}.get(e.reliability, 0.5)
                    for e in evidence
                ) / len(evidence)
                evidence_reliability_scores.append(avg_reliability)

        if evidence_reliability_scores:
            return sum(evidence_reliability_scores) / len(evidence_reliability_scores)
        else:
            return 0.4  # Low quality if no evidence

    def _assess_recency(self, context: BusinessContext) -> float:
        """How recent is the context data?"""

        # Check when last signal was logged
        if context.recent_signals:
            last_signal_age_hours = (
                datetime.now() - context.recent_signals[0].created_at
            ).total_seconds() / 3600

            # Recency curve
            if last_signal_age_hours < 24:
                return 1.0
            elif last_signal_age_hours < 72:
                return 0.7
            elif last_signal_age_hours < 168:  # 1 week
                return 0.5
            else:
                return 0.3
        else:
            return 0.3
```

---

## Rationale Generation

### Components

1. **Summary** (1-2 sentences): Quick explanation
2. **Full Rationale**:
   - **Why**: Why this task matters
   - **Why Now**: Why this is the right time
   - **Expected Outcome**: What you'll learn/achieve
   - **Frameworks Applied**: Which frameworks suggest this
   - **Risks if Skipped**: What happens if you don't do this

### Implementation

```python
# api/app/services/rationale_service.py

class RationaleService:
    def __init__(self):
        self.llm_client = ClaudeClient()  # Claude Sonnet for rationale generation

    async def generate_rationale(
        self,
        recommended: TaskScore,
        alternatives: List[TaskScore],
        context: BusinessContext
    ) -> Rationale:
        """Generate full rationale for top recommendation."""

        # Build context for LLM
        prompt = self._build_rationale_prompt(recommended, alternatives, context)

        # Call LLM (Claude Sonnet)
        response = await self.llm_client.generate(
            prompt=prompt,
            max_tokens=800,
            temperature=0.3,
            cache_key=f"rationale_{recommended.task.id}_{hash(context)}"  # Cache for 5 min
        )

        # Parse response
        rationale_data = self._parse_rationale_response(response)

        return Rationale(
            summary=rationale_data['summary'],
            full={
                'why': rationale_data['why'],
                'why_now': rationale_data['why_now'],
                'expected_outcome': rationale_data['expected_outcome'],
                'what_you_learn': rationale_data.get('what_you_learn'),
                'estimated_effort': rationale_data.get('estimated_effort'),
                'frameworks_applied': rationale_data['frameworks_applied'],
                'risks_if_skipped': rationale_data.get('risks_if_skipped', []),
                'dependencies': rationale_data.get('dependencies'),
                'next_steps_after': rationale_data.get('next_steps_after')
            }
        )

    def _build_rationale_prompt(
        self,
        recommended: TaskScore,
        alternatives: List[TaskScore],
        context: BusinessContext
    ) -> str:
        """Build prompt for LLM to generate rationale."""

        return f"""
You are an AI co-founder helping an early-stage founder prioritize their next action.

CONTEXT:
Founder is building: {context.user_profile.initial_question_answer}

Current Objectives:
{self._format_objectives(context.objectives)}

Open Critical Unknowns:
{self._format_unknowns(context.unknowns)}

Recent Activity:
{self._format_recent_signals(context.recent_signals[:5])}

RECOMMENDED TASK:
Title: {recommended.task.title}
Description: {recommended.task.description}

Score Breakdown:
- Objective Impact: {recommended.objective_impact:.2f}
- Time Sensitivity: {recommended.time_sensitivity:.2f}
- Evidence Gap: {recommended.evidence_gap:.2f}
- Unblocks: {recommended.unblocks:.2f}
- Feasibility: {recommended.feasibility:.2f}
Total Score: {recommended.total:.2f}

Framework: {recommended.task.metadata.get('framework', 'general')}

ALTERNATIVE OPTIONS:
{self._format_alternatives(alternatives)}

TASK:
Generate a clear, actionable rationale for why this is the best next action.

OUTPUT FORMAT (JSON):
{{
  "summary": "1-2 sentence explanation",
  "why": "Why this task matters for the business (2-3 sentences)",
  "why_now": "Why this is the right time to do it (1-2 sentences)",
  "expected_outcome": "What the founder will learn or achieve (2-3 specific outcomes)",
  "what_you_learn": "Specific insights to gain",
  "estimated_effort": "Realistic time estimate (e.g., '5 hours over 3 days')",
  "frameworks_applied": [
    {{"name": "Framework Name", "reason": "Why this framework suggests this task"}}
  ],
  "risks_if_skipped": ["Risk 1", "Risk 2"],
  "dependencies": "Any prerequisites or blockers (or 'None')",
  "next_steps_after": "What to do after completing this task"
}}

Be specific, actionable, and founder-friendly. Use "you" language.
"""

    async def generate_summary(
        self,
        task: TaskScore,
        context: BusinessContext
    ) -> str:
        """Generate brief summary for alternative recommendations."""

        # Simpler prompt for alternatives (use GPT-3.5 for cost efficiency)
        prompt = f"""
Task: {task.task.title}
Score: {task.total:.2f}

Generate a 1-sentence rationale for why this is a good alternative action.
"""

        response = await self.llm_client.generate(
            prompt=prompt,
            max_tokens=100,
            model='gpt-3.5-turbo',
            cache_key=f"summary_{task.task.id}"
        )

        return response.strip()
```

---

## Override Learning

### Learning Loop

When a user chooses an alternative over the top recommendation, we learn:

1. **Immediate**: Log override with category
2. **Batch Learning**: Aggregate overrides weekly
3. **Weight Adjustment**: Update user-specific scoring weights
4. **Framework Preference**: Adjust framework selection preferences

### Implementation

```python
# api/app/services/learning_service.py

class LearningService:
    async def process_override(
        self,
        override: Override,
        context: BusinessContext
    ) -> WeightAdjustment:
        """
        Process an override and compute weight adjustments.

        Categories and their implications:
        - time_preference: User prefers shorter/different duration tasks
        - energy_level: User's energy affects feasibility scoring
        - skill_match: User prefers tasks matching their skills
        - external_constraint: Calendar/availability issues
        - strategic_disagreement: User disagrees with objective priority
        - other: Needs manual review
        """

        # Get the recommended and chosen tasks
        recommended = await self._get_recommendation(override.recommended_id)
        chosen = await self._get_recommendation(override.chosen_id)

        # Calculate score differences
        score_diff = self._calculate_score_differences(recommended, chosen)

        # Determine weight adjustment based on category
        if override.override_category == 'time_preference':
            # User chose task with different time_sensitivity score
            adjustment = {
                'time_sensitivity': score_diff['time_sensitivity'] * 0.05,
                'feasibility': score_diff['feasibility'] * 0.03
            }

        elif override.override_category == 'energy_level':
            # User chose more feasible/lower effort task
            adjustment = {
                'feasibility': score_diff['feasibility'] * 0.05,
                'objective_impact': score_diff['objective_impact'] * -0.02
            }

        elif override.override_category == 'strategic_disagreement':
            # User prioritizes different objectives
            adjustment = {
                'objective_impact': score_diff['objective_impact'] * 0.05,
                'evidence_gap': score_diff['evidence_gap'] * 0.03
            }

        else:
            # Generic learning
            adjustment = self._compute_generic_adjustment(score_diff)

        # Store adjustment (will be applied in batch)
        await self._store_adjustment(override.id, adjustment)

        return WeightAdjustment(
            override_id=override.id,
            adjustments=adjustment,
            status='queued'
        )

    async def apply_batch_adjustments(self, user_id: str):
        """
        Apply accumulated weight adjustments (run weekly).

        Process:
        1. Get all unincorporated overrides
        2. Aggregate adjustments
        3. Apply with dampening (max change per batch: ±0.10)
        4. Normalize weights to sum to 1.0
        5. Update user profile
        """

        # Get pending overrides
        overrides = await self._get_pending_overrides(user_id)

        if not overrides:
            return

        # Aggregate adjustments
        total_adjustments = defaultdict(float)
        for override in overrides:
            for dimension, adjustment in override.weight_adjustment_applied.items():
                total_adjustments[dimension] += adjustment

        # Apply dampening
        dampened = {
            dim: max(min(adj, 0.10), -0.10)
            for dim, adj in total_adjustments.items()
        }

        # Get current weights
        user_profile = await self._get_user_profile(user_id)
        current_weights = user_profile.scoring_weights

        # Apply adjustments
        new_weights = {
            dim: current_weights[dim] + dampened.get(dim, 0.0)
            for dim in current_weights.keys()
        }

        # Normalize to sum to 1.0
        total = sum(new_weights.values())
        normalized_weights = {
            dim: weight / total
            for dim, weight in new_weights.items()
        }

        # Update user profile
        await self._update_user_weights(user_id, normalized_weights)

        # Mark overrides as incorporated
        await self._mark_overrides_incorporated(overrides)
```

---

## Performance Optimization

### Target: <2 seconds (90th percentile)

**Optimization Strategies:**

1. **Parallel Framework Execution**
   ```python
   # Generate tasks from multiple frameworks in parallel
   framework_results = await asyncio.gather(*[
       framework.generate_tasks(context)
       for framework in selected_frameworks
   ])
   ```

2. **Limit Candidates**
   - Each framework generates max 20 tasks
   - Total candidate pool: 20-60 tasks

3. **Score Top Tasks Only**
   - Quick scoring for all candidates
   - Detailed confidence calculation only for top 10

4. **LLM Caching**
   - Cache rationale generation (5 min TTL)
   - Cache key: `hash(task_id + context snapshot)`
   - Estimated cache hit rate: 30-40%

5. **Database Query Optimization**
   - Single query to load full context (see DATA_MODEL.md indexes)
   - Use Redis cache for user context (5 min TTL)

6. **Async LLM Calls**
   - Call Claude API asynchronously
   - Timeout: 3 seconds for rationale generation

### Performance Budget

| Step | Target | Strategy |
|------|--------|----------|
| Load Context | <200ms | Redis cache + optimized queries |
| Framework Selection | <50ms | In-memory scoring |
| Candidate Generation | <300ms | Parallel framework execution |
| Scoring | <400ms | Optimized scoring algorithms |
| Confidence Calculation | <200ms | Top 10 only |
| Rationale Generation | <800ms | LLM with caching |
| **Total** | **<2000ms** | |

---

## Traceability Matrix

| Requirement ID | Component | Implementation |
|----------------|-----------|----------------|
| FR-002: NBA Recommendations | NBAEngine | `compute_nba()` method |
| FR-005: Rationale | RationaleService | `generate_rationale()` |
| FR-009: Override Learning | LearningService | `process_override()`, `apply_batch_adjustments()` |
| FR-010: Confidence Display | ConfidenceService | `calculate_confidence()` |
| FR-014: Framework Router | FrameworkRouter | `select_frameworks()` |
| FR-015: Override Taxonomy | LearningService | Category-specific weight adjustments |
| NFR-001: Performance | All components | Parallel execution, caching, optimized queries |

---

## Next Steps

1. **Implementation:**
   - Implement base framework classes
   - Implement 3 initial frameworks (Problem-Solution Fit, ICP+Wedge, Critical Unknown)
   - Implement scoring service with all 5 dimensions
   - Integrate Claude API for rationale generation

2. **Testing:**
   - Create 20 curated test scenarios (from RTM.md VAL-002)
   - Benchmark performance (<2s requirement)
   - Test with expert panel for accuracy validation

3. **Refinement:**
   - Tune scoring weights based on early user feedback
   - Expand framework library (add Growth, Fundraising, Hiring frameworks)
   - Improve rationale quality with prompt engineering

---

**End of NBA_ENGINE.md**
