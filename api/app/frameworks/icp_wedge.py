"""
BeBrahma v0.3 - ICP + Wedge Framework

Define your Ideal Customer Profile and initial wedge market.

Traceability:
- FR-014: Framework implementations
"""

from typing import List
import uuid

from app.frameworks.base import Framework
from app.models import Task, Unknown
from app.services.scoring_service import BusinessContext
from app.core.logging import logger


class ICPWedgeFramework(Framework):
    """
    ICP + Wedge framework.

    Purpose: Define your Ideal Customer Profile and identify the initial wedge market.

    Stages:
    1. Define Broad ICP
    2. Narrow to Wedge Segment
    3. Validate Wedge Economics

    Generates tasks to systematically identify and validate the best initial market.
    """

    @property
    def name(self) -> str:
        return "icp_wedge"

    def get_keywords(self) -> List[str]:
        return ['customer', 'segment', 'target', 'market', 'icp', 'wedge', 'niche', 'profile']

    async def generate_tasks(self, context: BusinessContext) -> List[Task]:
        """
        Generate tasks based on ICP+Wedge stage.

        Strategy:
        1. Determine current stage
        2. Generate stage-appropriate tasks
        3. Focus on segmentation and validation
        """
        stage = self._determine_stage(context)

        logger.debug(f"ICP+Wedge stage: {stage}")

        if stage == 'define_icp':
            tasks = await self._generate_define_icp_tasks(context)
        elif stage == 'narrow_wedge':
            tasks = await self._generate_narrow_wedge_tasks(context)
        elif stage == 'validate_economics':
            tasks = await self._generate_validate_economics_tasks(context)
        else:
            tasks = []

        logger.info(f"ICP+Wedge framework generated {len(tasks)} tasks")

        return tasks

    def _determine_stage(self, context: BusinessContext) -> str:
        """
        Determine which stage of ICP+Wedge the user is in.

        Logic:
        - If ICP-related unknowns exist → define_icp
        - If wedge/segment unknowns exist → narrow_wedge
        - If economic unknowns exist → validate_economics
        """
        # Check for ICP definition unknowns
        has_icp_unknowns = any(
            u.status == 'open' and
            any(keyword in u.question.lower() for keyword in ['icp', 'customer profile', 'who', 'target'])
            for u in context.unknowns
        )

        # Check for wedge/segment unknowns
        has_wedge_unknowns = any(
            u.status == 'open' and
            any(keyword in u.question.lower() for keyword in ['wedge', 'segment', 'niche', 'market'])
            for u in context.unknowns
        )

        # Check for economic unknowns
        has_economic_unknowns = any(
            u.status == 'open' and
            any(keyword in u.question.lower() for keyword in ['cac', 'ltv', 'economics', 'unit economics', 'pricing'])
            for u in context.unknowns
        )

        if has_icp_unknowns:
            return 'define_icp'
        elif has_wedge_unknowns:
            return 'narrow_wedge'
        elif has_economic_unknowns:
            return 'validate_economics'
        else:
            return 'define_icp'  # Default

    async def _generate_define_icp_tasks(
        self,
        context: BusinessContext
    ) -> List[Task]:
        """Stage 1: Define broad ICP."""
        tasks = []

        objective = self._get_relevant_objective(context)
        if not objective:
            return tasks

        # Task 1: Define ICP characteristics
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Define Ideal Customer Profile characteristics",
            description="Document: industry vertical, company size, role/title, pain points, budget authority, and buying behavior",
            task_type="analysis",
            estimated_duration=90,
            metadata={
                'framework': 'icp_wedge',
                'stage': 'define_icp',
                'deliverable': 'ICP document with 6 key dimensions'
            }
        ))

        # Task 2: Interview different segments
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Interview 5 customers from different segments",
            description="Test problem resonance across different customer segments (e.g., SMB vs Enterprise, different industries)",
            task_type="customer_interview",
            estimated_duration=150,
            metadata={
                'framework': 'icp_wedge',
                'stage': 'define_icp',
                'target_segments': 3
            }
        ))

        # Task 3: Compare segment responses
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Compare pain intensity across segments",
            description="Analyze which customer segments have the strongest pain points and highest willingness to pay",
            task_type="analysis",
            estimated_duration=60,
            metadata={
                'framework': 'icp_wedge',
                'stage': 'define_icp'
            }
        ))

        return tasks

    async def _generate_narrow_wedge_tasks(
        self,
        context: BusinessContext
    ) -> List[Task]:
        """Stage 2: Narrow to wedge segment."""
        tasks = []

        objective = self._get_relevant_objective(context)
        if not objective:
            return tasks

        # Task 1: Identify potential wedges
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Identify 3 potential wedge segments",
            description="Find narrow segments with: (1) strong pain, (2) reachable via specific channels, (3) willing to pay",
            task_type="analysis",
            estimated_duration=120,
            metadata={
                'framework': 'icp_wedge',
                'stage': 'narrow_wedge',
                'evaluation_criteria': ['pain_intensity', 'reachability', 'willingness_to_pay', 'urgency']
            }
        ))

        # Task 2: Score wedge segments
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Score wedge segments on strategic dimensions",
            description="Evaluate each wedge on: pain severity (1-10), ease of reaching customers (1-10), unit economics potential (1-10), competition level (1-10)",
            task_type="analysis",
            estimated_duration=90,
            metadata={
                'framework': 'icp_wedge',
                'stage': 'narrow_wedge',
                'scoring_template': 'pain + reach + economics - competition'
            }
        ))

        # Task 3: Choose initial wedge
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Choose initial wedge segment and commit",
            description="Select one wedge to focus on for initial traction. Document decision rationale and success criteria.",
            task_type="decision",
            estimated_duration=60,
            metadata={
                'framework': 'icp_wedge',
                'stage': 'narrow_wedge',
                'decision_type': 'strategic'
            }
        ))

        return tasks

    async def _generate_validate_economics_tasks(
        self,
        context: BusinessContext
    ) -> List[Task]:
        """Stage 3: Validate wedge economics."""
        tasks = []

        objective = self._get_relevant_objective(context)
        if not objective:
            return tasks

        # Task 1: Calculate wedge market size
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Calculate Total Addressable Market for wedge",
            description="Estimate TAM for chosen wedge segment using bottom-up analysis (# of companies × average deal size)",
            task_type="analysis",
            estimated_duration=120,
            metadata={
                'framework': 'icp_wedge',
                'stage': 'validate_economics',
                'deliverable': 'TAM estimate with assumptions documented'
            }
        ))

        # Task 2: Estimate CAC
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Estimate Customer Acquisition Cost (CAC)",
            description="Research acquisition channels for wedge segment and estimate cost to acquire one customer. Include: ads, content, outbound, partnerships.",
            task_type="research",
            estimated_duration=150,
            metadata={
                'framework': 'icp_wedge',
                'stage': 'validate_economics',
                'channels_to_research': ['paid_ads', 'content_marketing', 'outbound', 'partnerships']
            }
        ))

        # Task 3: Validate unit economics
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Validate unit economics (LTV > 3x CAC)",
            description="Calculate Lifetime Value based on pricing and retention estimates. Ensure LTV/CAC ratio > 3 for sustainable business.",
            task_type="analysis",
            estimated_duration=90,
            metadata={
                'framework': 'icp_wedge',
                'stage': 'validate_economics',
                'success_criteria': 'LTV/CAC > 3.0'
            }
        ))

        # Task 4: Identify beachhead customers
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Create list of 50 beachhead customers in wedge",
            description="Identify specific companies/individuals in wedge segment who are likely early adopters. Build contact list.",
            task_type="research",
            estimated_duration=120,
            metadata={
                'framework': 'icp_wedge',
                'stage': 'validate_economics',
                'target_list_size': 50
            }
        ))

        return tasks

    def count_relevant_unknowns(self, unknowns: List[Unknown]) -> int:
        """Count unknowns related to ICP and wedge."""
        relevant_keywords = ['icp', 'customer', 'segment', 'market', 'wedge', 'target', 'profile', 'cac', 'ltv']

        return sum(
            1 for unknown in unknowns
            if unknown.status == 'open' and any(
                kw in unknown.question.lower() for kw in relevant_keywords
            )
        )

    def _get_relevant_objective(self, context: BusinessContext):
        """Get the most relevant objective for this framework."""
        # Look for icp_wedge objective
        for obj in context.objectives:
            if obj.objective_type == 'icp_wedge' and obj.status == 'active':
                return obj

        # Fall back to highest priority objective
        if context.objectives:
            return max(context.objectives, key=lambda o: o.priority)

        return None

    def _create_task(
        self,
        context: BusinessContext,
        objective_id: uuid.UUID,
        title: str,
        description: str,
        task_type: str,
        estimated_duration: int,
        metadata: dict
    ) -> Task:
        """Helper to create a task."""
        return Task(
            id=uuid.uuid4(),
            user_id=context.user_profile.user_id,
            objective_id=objective_id,
            title=title,
            description=description,
            task_type=task_type,
            estimated_duration_minutes=estimated_duration,
            status='pending',
            metadata=metadata
        )
