"""
BeBrahma v0.3 - Rationale Service

Generates explanations for NBA recommendations using LLM.

Traceability:
- FR-005: Rationale Display
"""

import json
from typing import List, Dict, Optional
from dataclasses import dataclass

from app.services.scoring_service import TaskScore, BusinessContext
from app.core.llm_client import llm_client
from app.core.logging import logger


@dataclass
class Rationale:
    """Full rationale for a recommendation."""
    summary: str  # 1-2 sentence explanation
    full: Dict[str, any]  # Complete rationale with all sections


class RationaleService:
    """
    Generates rationales for NBA recommendations using LLM.

    Uses Claude Sonnet for high-quality, founder-friendly explanations.
    """

    async def generate_rationale(
        self,
        recommended: TaskScore,
        alternatives: List[TaskScore],
        context: BusinessContext
    ) -> Rationale:
        """
        Generate full rationale for top recommendation.

        Args:
            recommended: Top-scored task
            alternatives: Alternative tasks (2-3)
            context: Business context

        Returns:
            Rationale object with summary and full explanation
        """
        # Build prompt for LLM
        prompt = self._build_rationale_prompt(recommended, alternatives, context)

        # Call LLM (Claude Sonnet for reasoning)
        try:
            response = await llm_client.generate(
                prompt=prompt,
                max_tokens=800,
                temperature=0.3,
                model='reasoning',
                cache_ttl_seconds=300  # 5 min cache
            )

            # Parse JSON response
            rationale_data = json.loads(response)

            return Rationale(
                summary=rationale_data['summary'],
                full={
                    'why': rationale_data['why'],
                    'why_now': rationale_data['why_now'],
                    'expected_outcome': rationale_data['expected_outcome'],
                    'what_you_learn': rationale_data.get('what_you_learn'),
                    'estimated_effort': rationale_data.get('estimated_effort'),
                    'frameworks_applied': rationale_data.get('frameworks_applied', []),
                    'risks_if_skipped': rationale_data.get('risks_if_skipped', []),
                    'dependencies': rationale_data.get('dependencies', 'None'),
                    'next_steps_after': rationale_data.get('next_steps_after')
                }
            )

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM rationale response: {str(e)}", exc_info=True)
            # Fallback to simple rationale
            return self._generate_fallback_rationale(recommended, context)

        except Exception as e:
            logger.error(f"Error generating rationale: {str(e)}", exc_info=True)
            return self._generate_fallback_rationale(recommended, context)

    async def generate_summary(
        self,
        task_score: TaskScore,
        context: BusinessContext
    ) -> str:
        """
        Generate brief summary for alternative recommendations.

        Uses simpler, faster prompt for alternatives.
        """
        prompt = f"""
Task: {task_score.task.title}
Description: {task_score.task.description or 'No description'}
Score: {task_score.total:.2f}

Generate a 1-sentence rationale for why this is a good alternative action for a founder.
Be specific and actionable.
"""

        try:
            response = await llm_client.generate(
                prompt=prompt,
                max_tokens=100,
                model='classification',  # Use GPT-3.5 for cost efficiency
                cache_ttl_seconds=300
            )

            return response.strip()

        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}", exc_info=True)
            # Fallback summary
            return f"This task scores {task_score.total:.2f} and addresses important objectives."

    def _build_rationale_prompt(
        self,
        recommended: TaskScore,
        alternatives: List[TaskScore],
        context: BusinessContext
    ) -> str:
        """Build prompt for LLM to generate rationale."""

        # Format context
        objectives_text = "\n".join([
            f"- {obj.title} (type: {obj.objective_type}, priority: {obj.priority}, status: {obj.status})"
            for obj in context.objectives[:3]  # Top 3 objectives
        ])

        unknowns_text = "\n".join([
            f"- {u.question} (importance: {u.importance}, status: {u.status})"
            for u in context.unknowns[:5]  # Top 5 unknowns
        ])

        alternatives_text = "\n".join([
            f"{i+2}. {alt.task.title} (score: {alt.total:.2f})"
            for i, alt in enumerate(alternatives[:2])
        ])

        prompt = f"""You are an AI co-founder helping an early-stage founder prioritize their next action.

CONTEXT:
Founder is building: {context.user_profile.initial_question_answer or 'a new product'}

Current Objectives:
{objectives_text or 'No objectives defined yet'}

Open Critical Unknowns:
{unknowns_text or 'No unknowns identified yet'}

RECOMMENDED TASK:
Title: {recommended.task.title}
Description: {recommended.task.description or 'No description provided'}

Score Breakdown:
- Objective Impact: {recommended.objective_impact} / 1.00
- Time Sensitivity: {recommended.time_sensitivity} / 1.00
- Evidence Gap: {recommended.evidence_gap} / 1.00
- Unblocks: {recommended.unblocks} / 1.00
- Feasibility: {recommended.feasibility} / 1.00
Total Score: {recommended.total} / 1.00

Framework: {recommended.task.metadata.get('framework', 'general') if recommended.task.metadata else 'general'}

ALTERNATIVE OPTIONS:
{alternatives_text or 'No alternatives'}

TASK:
Generate a clear, actionable rationale for why this is the best next action.

OUTPUT FORMAT (JSON):
{{
  "summary": "1-2 sentence explanation of why this task is the top priority",
  "why": "Why this task matters for the business (2-3 sentences, specific to their context)",
  "why_now": "Why this is the right time to do it (1-2 sentences)",
  "expected_outcome": "What the founder will learn or achieve (2-3 specific outcomes)",
  "what_you_learn": "Specific insights to gain from this task",
  "estimated_effort": "Realistic time estimate (e.g., '5 hours over 3 days')",
  "frameworks_applied": [
    {{"name": "Framework Name", "reason": "Why this framework suggests this task"}}
  ],
  "risks_if_skipped": ["Risk 1", "Risk 2", "Risk 3"],
  "dependencies": "Any prerequisites or blockers (or 'None')",
  "next_steps_after": "What to do after completing this task"
}}

IMPORTANT:
- Be specific and actionable
- Use "you" language (talk directly to the founder)
- Reference their actual objectives and unknowns
- Be encouraging but realistic
- Keep total response under 800 tokens
- Return ONLY valid JSON, no markdown or other formatting
"""

        return prompt

    def _generate_fallback_rationale(
        self,
        recommended: TaskScore,
        context: BusinessContext
    ) -> Rationale:
        """Generate simple fallback rationale if LLM fails."""
        task = recommended.task

        summary = f"Your next critical step is to {task.title.lower()}. "
        summary += f"This task scores {recommended.total:.2f} and has high impact on your objectives."

        full = {
            'why': f"This task addresses your top priorities and has a total score of {recommended.total:.2f}.",
            'why_now': "This is the highest-priority task based on current context.",
            'expected_outcome': "Completing this will move you closer to your objectives.",
            'frameworks_applied': [],
            'risks_if_skipped': ["Delayed progress on objectives"],
            'dependencies': 'None',
            'next_steps_after': 'Review outcomes and identify next action'
        }

        return Rationale(summary=summary, full=full)
