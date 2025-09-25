"""
LangGraph Workflow States for BeBrahma SaaS Analysis
Clean state management with explicit transitions and validation
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from datetime import datetime


class WorkflowStage(str, Enum):
    """Explicit workflow stages with clear definitions"""
    PROBLEM_CAPTURE = "PROBLEM_CAPTURE"
    PROBLEM_CLARIFICATION = "PROBLEM_CLARIFICATION" 
    SOLUTION_DESIGN = "SOLUTION_DESIGN"
    IMPLEMENTATION_PLAN = "IMPLEMENTATION_PLAN"
    TESTING_STRATEGY = "TESTING_STRATEGY"
    DEPLOYMENT_PLAN = "DEPLOYMENT_PLAN"
    MONITORING_SETUP = "MONITORING_SETUP"
    COMPLETED = "COMPLETED"


class StageStatus(str, Enum):
    """Stage execution status"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    AWAITING_DECISION = "awaiting_decision"
    COMPLETED = "completed"
    FAILED = "failed"


class DecisionType(str, Enum):
    """Available decision types at stage boundaries"""
    APPROVE = "approve"
    REFINE = "refine"
    REJECT = "reject"
    PAUSE = "pause"


class Message(BaseModel):
    """Structured message format"""
    id: str
    content: str
    sender: str  # 'user', 'agent', 'system'
    timestamp: str
    agent_id: Optional[str] = None
    agent_name: Optional[str] = None
    agent_title: Optional[str] = None
    type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class StageDefinition(BaseModel):
    """Definition of what each stage should accomplish"""
    stage: WorkflowStage
    title: str
    description: str
    objectives: List[str]
    required_agents: List[str]
    min_messages: int = 3
    max_messages: int = 8
    decision_required: bool = True


class WorkflowState(BaseModel):
    """Complete workflow state"""
    session_id: str
    current_stage: WorkflowStage
    stage_status: StageStatus
    messages: List[Message] = []
    stage_progress: Dict[WorkflowStage, StageStatus] = {}
    task_description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    metadata: Dict[str, Any] = {}


# Stage Definitions
STAGE_DEFINITIONS: Dict[WorkflowStage, StageDefinition] = {
    WorkflowStage.PROBLEM_CAPTURE: StageDefinition(
        stage=WorkflowStage.PROBLEM_CAPTURE,
        title="Problem Capture",
        description="Understand and document the SaaS business problem",
        objectives=[
            "Analyze the user's SaaS idea or problem statement",
            "Identify key business objectives and constraints",
            "Document initial problem scope and requirements"
        ],
        required_agents=["smart_planner", "business_analyst"],
        min_messages=3,
        max_messages=6,
        decision_required=True
    ),
    
    WorkflowStage.PROBLEM_CLARIFICATION: StageDefinition(
        stage=WorkflowStage.PROBLEM_CLARIFICATION,
        title="Problem Clarification", 
        description="Deep dive into problem details and validate understanding",
        objectives=[
            "Clarify ambiguous requirements and assumptions",
            "Validate problem understanding with stakeholder perspective",
            "Define success criteria and acceptance criteria"
        ],
        required_agents=["business_analyst", "solution_architect"],
        min_messages=4,
        max_messages=7,
        decision_required=True
    ),
    
    WorkflowStage.SOLUTION_DESIGN: StageDefinition(
        stage=WorkflowStage.SOLUTION_DESIGN,
        title="Solution Design",
        description="Design technical solution architecture and approach",
        objectives=[
            "Create high-level solution architecture",
            "Define technology stack and dependencies",
            "Identify potential risks and mitigation strategies"
        ],
        required_agents=["solution_architect", "developer"],
        min_messages=5,
        max_messages=8,
        decision_required=True
    ),
    
    WorkflowStage.IMPLEMENTATION_PLAN: StageDefinition(
        stage=WorkflowStage.IMPLEMENTATION_PLAN,
        title="Implementation Planning",
        description="Create detailed implementation roadmap and timeline",
        objectives=[
            "Break down solution into implementable tasks",
            "Define development phases and milestones",
            "Estimate effort and resource requirements"
        ],
        required_agents=["developer", "smart_planner"],
        min_messages=4,
        max_messages=6,
        decision_required=True
    ),
    
    WorkflowStage.TESTING_STRATEGY: StageDefinition(
        stage=WorkflowStage.TESTING_STRATEGY,
        title="Testing Strategy",
        description="Define comprehensive testing approach and quality assurance",
        objectives=[
            "Design testing strategy for all solution components",
            "Define quality metrics and acceptance criteria",
            "Plan automated testing and CI/CD integration"
        ],
        required_agents=["qa_tester", "developer"],
        min_messages=3,
        max_messages=5,
        decision_required=True
    ),
    
    WorkflowStage.DEPLOYMENT_PLAN: StageDefinition(
        stage=WorkflowStage.DEPLOYMENT_PLAN,
        title="Deployment Planning",
        description="Plan production deployment and go-live strategy",
        objectives=[
            "Define deployment architecture and environment setup",
            "Plan rollout strategy and rollback procedures",
            "Prepare production monitoring and alerting"
        ],
        required_agents=["solution_architect", "developer"],
        min_messages=3,
        max_messages=5,
        decision_required=True
    ),
    
    WorkflowStage.MONITORING_SETUP: StageDefinition(
        stage=WorkflowStage.MONITORING_SETUP,
        title="Monitoring & Maintenance",
        description="Setup ongoing monitoring, maintenance, and optimization",
        objectives=[
            "Configure monitoring, logging, and alerting systems",
            "Define maintenance procedures and optimization strategies",
            "Plan continuous improvement and iteration cycles"
        ],
        required_agents=["solution_architect", "qa_tester"],
        min_messages=3,
        max_messages=5,
        decision_required=False  # Final stage
    )
}


def get_next_stage(current_stage: WorkflowStage) -> Optional[WorkflowStage]:
    """Get the next stage in the workflow"""
    stage_order = [
        WorkflowStage.PROBLEM_CAPTURE,
        WorkflowStage.PROBLEM_CLARIFICATION,
        WorkflowStage.SOLUTION_DESIGN,
        WorkflowStage.IMPLEMENTATION_PLAN,
        WorkflowStage.TESTING_STRATEGY,
        WorkflowStage.DEPLOYMENT_PLAN,
        WorkflowStage.MONITORING_SETUP,
        WorkflowStage.COMPLETED
    ]
    
    try:
        current_index = stage_order.index(current_stage)
        if current_index < len(stage_order) - 1:
            return stage_order[current_index + 1]
        return None
    except ValueError:
        return None


def validate_stage_completion(
    stage: WorkflowStage, 
    messages: List[Message]
) -> tuple[bool, Optional[str]]:
    """Validate if a stage has met its completion criteria"""
    definition = STAGE_DEFINITIONS.get(stage)
    if not definition:
        return False, f"Unknown stage: {stage}"
    
    # Check minimum message count
    stage_messages = [m for m in messages if m.type != "user_decision"]
    if len(stage_messages) < definition.min_messages:
        return False, f"Stage requires at least {definition.min_messages} messages, got {len(stage_messages)}"
    
    # Check if required agents have participated
    participating_agents = set(m.agent_id for m in stage_messages if m.agent_id)
    required_agents = set(definition.required_agents)
    missing_agents = required_agents - participating_agents
    
    if missing_agents:
        return False, f"Missing participation from required agents: {', '.join(missing_agents)}"
    
    return True, None
