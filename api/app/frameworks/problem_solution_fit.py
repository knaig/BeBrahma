"""
BeBrahma v0.3 - Problem-Solution Fit Framework

Validates that you're solving a real, painful problem.

Traceability:
- FR-014: Framework implementations
"""

from typing import List
import uuid

from app.frameworks.base import Framework
from app.models import Task, Unknown
from app.services.scoring_service import BusinessContext
from app.core.logging import logger


class ProblemSolutionFitFramework(Framework):
    """
    Problem-Solution Fit framework.

    Purpose: Validate that you're solving a real, painful problem.

    Stages:
    1. Understand the Problem
    2. Validate Problem Severity
    3. Test Solution Fit

    Generates tasks based on current evidence and unknowns.
    """

    @property
    def name(self) -> str:
        return "problem_solution_fit"

    def get_keywords(self) -> List[str]:
        return ['problem', 'pain', 'customer', 'interview', 'validate', 'solution', 'fit']

    async def generate_tasks(self, context: BusinessContext) -> List[Task]:
        """
        Generate tasks based on Problem-Solution Fit stage.

        Strategy:
        1. Determine current stage based on evidence and unknowns
        2. Generate stage-appropriate tasks
        3. Prioritize customer-facing activities
        """
        # Determine current stage
        stage = self._determine_stage(context)

        logger.debug(f"Problem-Solution Fit stage: {stage}")

        if stage == 'understand_problem':
            tasks = await self._generate_understand_problem_tasks(context)
        elif stage == 'validate_severity':
            tasks = await self._generate_validate_severity_tasks(context)
        elif stage == 'test_solution':
            tasks = await self._generate_test_solution_tasks(context)
        else:
            tasks = []

        logger.info(f"Problem-Solution Fit framework generated {len(tasks)} tasks")

        return tasks

    def _determine_stage(self, context: BusinessContext) -> str:
        """
        Determine which stage of Problem-Solution Fit the user is in.

        Logic:
        - If no customer interviews → understand_problem
        - If interviews but no validation data → validate_severity
        - If validation data → test_solution
        """
        # Check for customer interview unknowns
        has_customer_unknowns = any(
            u.status == 'open' and
            any(keyword in u.question.lower() for keyword in ['customer', 'user', 'problem', 'pain'])
            for u in context.unknowns
        )

        # Check for solution/product unknowns
        has_solution_unknowns = any(
            u.status == 'open' and
            any(keyword in u.question.lower() for keyword in ['solution', 'product', 'feature', 'build'])
            for u in context.unknowns
        )

        # Simple heuristic based on unknowns
        if has_customer_unknowns and not has_solution_unknowns:
            return 'understand_problem'
        elif has_customer_unknowns and has_solution_unknowns:
            return 'validate_severity'
        elif has_solution_unknowns:
            return 'test_solution'
        else:
            return 'understand_problem'  # Default

    async def _generate_understand_problem_tasks(
        self,
        context: BusinessContext
    ) -> List[Task]:
        """Stage 1: Understand the problem."""
        tasks = []

        # Get relevant objective
        objective = self._get_relevant_objective(context)
        if not objective:
            return tasks

        # Task 1: Conduct problem interviews
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Conduct 10 problem interviews with target customers",
            description="Interview target customers to understand their current pain points, workarounds, and how often they experience the problem",
            task_type="customer_interview",
            estimated_duration=300,  # 5 hours
            metadata={
                'framework': 'problem_solution_fit',
                'stage': 'understand_problem',
                'suggested_questions': [
                    "What's the biggest challenge you face with [problem area]?",
                    "How do you currently solve this problem?",
                    "How often does this problem occur?",
                    "How much time/money does this problem cost you?"
                ]
            }
        ))

        # Task 2: Map customer journey
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Map customer journey for core use case",
            description="Document step-by-step how customers experience the problem, including pain points at each stage",
            task_type="analysis",
            estimated_duration=120,  # 2 hours
            metadata={
                'framework': 'problem_solution_fit',
                'stage': 'understand_problem'
            }
        ))

        # Task 3: Synthesize pain points
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Synthesize top 3 pain points from interviews",
            description="Analyze interview data to identify the most common and severe pain points. Quantify frequency and severity.",
            task_type="analysis",
            estimated_duration=90,  # 1.5 hours
            metadata={
                'framework': 'problem_solution_fit',
                'stage': 'understand_problem'
            }
        ))

        return tasks

    async def _generate_validate_severity_tasks(
        self,
        context: BusinessContext
    ) -> List[Task]:
        """Stage 2: Validate problem severity."""
        tasks = []

        objective = self._get_relevant_objective(context)
        if not objective:
            return tasks

        # Task 1: Quantify pain frequency
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Survey 50 users on pain frequency and severity",
            description="Validate how often and how severely target customers experience the problem. Use quantitative survey to validate interview findings.",
            task_type="research",
            estimated_duration=180,  # 3 hours
            metadata={
                'framework': 'problem_solution_fit',
                'stage': 'validate_severity',
                'target_sample_size': 50
            }
        ))

        # Task 2: Assess willingness to pay
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Test willingness to pay with 20 customers",
            description="Ask customers if they would pay to solve this problem and at what price point. Test different pricing tiers.",
            task_type="customer_interview",
            estimated_duration=200,  # 3+ hours
            metadata={
                'framework': 'problem_solution_fit',
                'stage': 'validate_severity',
                'suggested_questions': [
                    "Would you pay to solve this problem?",
                    "How much would you pay monthly?",
                    "What would make it worth 2x that price?"
                ]
            }
        ))

        # Task 3: Analyze current solutions
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Research current solutions and workarounds",
            description="Understand what customers currently use to solve this problem. Identify gaps and opportunities.",
            task_type="research",
            estimated_duration=120,  # 2 hours
            metadata={
                'framework': 'problem_solution_fit',
                'stage': 'validate_severity'
            }
        ))

        return tasks

    async def _generate_test_solution_tasks(
        self,
        context: BusinessContext
    ) -> List[Task]:
        """Stage 3: Test solution fit."""
        tasks = []

        objective = self._get_relevant_objective(context)
        if not objective:
            return tasks

        # Task 1: Create prototype
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Build low-fidelity prototype of core solution",
            description="Create a simple prototype (wireframes, mockup, or MVP) to test core solution concept with customers",
            task_type="prototype",
            estimated_duration=480,  # 8 hours
            metadata={
                'framework': 'problem_solution_fit',
                'stage': 'test_solution'
            }
        ))

        # Task 2: Solution validation interviews
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Test prototype with 10 customers",
            description="Show prototype to target customers and gather feedback on solution fit, usability, and value proposition",
            task_type="customer_interview",
            estimated_duration=300,  # 5 hours
            metadata={
                'framework': 'problem_solution_fit',
                'stage': 'test_solution',
                'suggested_questions': [
                    "Does this solve your problem?",
                    "What's missing?",
                    "Would you use this if it existed?",
                    "What would you pay for this?"
                ]
            }
        ))

        # Task 3: Iterate based on feedback
        tasks.append(self._create_task(
            context=context,
            objective_id=objective.id,
            title="Synthesize feedback and identify improvements",
            description="Analyze customer feedback from prototype testing. Identify top 3 improvements needed for solution-market fit.",
            task_type="analysis",
            estimated_duration=90,  # 1.5 hours
            metadata={
                'framework': 'problem_solution_fit',
                'stage': 'test_solution'
            }
        ))

        return tasks

    def count_relevant_unknowns(self, unknowns: List[Unknown]) -> int:
        """Count unknowns related to problem-solution fit."""
        relevant_keywords = ['problem', 'pain', 'customer', 'solution', 'pay', 'willingness', 'validate', 'fit']

        return sum(
            1 for unknown in unknowns
            if unknown.status == 'open' and any(
                kw in unknown.question.lower() for kw in relevant_keywords
            )
        )

    def _get_relevant_objective(self, context: BusinessContext):
        """Get the most relevant objective for this framework."""
        # Look for problem_solution_fit objective
        for obj in context.objectives:
            if obj.objective_type == 'problem_solution_fit' and obj.status == 'active':
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
