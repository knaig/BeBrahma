"""
LangGraph Workflow Orchestrator for BeBrahma SaaS Analysis
State machine with explicit transitions and CrewAI integration
"""

import json
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from uuid import uuid4

from langchain.schema import BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END

from .workflow_states import (
    WorkflowState, WorkflowStage, StageStatus, DecisionType, Message,
    STAGE_DEFINITIONS, get_next_stage, validate_stage_completion
)
from .crew_integration import CrewAIService


class BeBrahmaWorkflowState(WorkflowState):
    """Extended workflow state for LangGraph"""
    pending_decision: bool = False
    decision_options: List[DecisionType] = []
    error_message: Optional[str] = None
    crew_task_id: Optional[str] = None


class WorkflowOrchestrator:
    """LangGraph-based workflow orchestrator"""
    
    def __init__(self, crew_service: CrewAIService):
        self.crew_service = crew_service
        self.sessions: Dict[str, BeBrahmaWorkflowState] = {}
        self.workflow_graph = self._create_workflow_graph()
    
    def _create_workflow_graph(self) -> StateGraph:
        """Create the LangGraph state machine"""
        
        # Define the state graph
        workflow = StateGraph(BeBrahmaWorkflowState)
        
        # Add nodes for each stage
        workflow.add_node("problem_capture", self._execute_problem_capture)
        workflow.add_node("problem_clarification", self._execute_problem_clarification)
        workflow.add_node("solution_design", self._execute_solution_design)
        workflow.add_node("implementation_plan", self._execute_implementation_plan)
        workflow.add_node("testing_strategy", self._execute_testing_strategy)
        workflow.add_node("deployment_plan", self._execute_deployment_plan)
        workflow.add_node("monitoring_setup", self._execute_monitoring_setup)
        workflow.add_node("awaiting_decision", self._handle_decision_point)
        workflow.add_node("process_decision", self._process_decision)
        workflow.add_node("workflow_complete", self._complete_workflow)
        
        # Set entry point
        workflow.set_entry_point("problem_capture")
        
        # Define transitions with conditional logic
        workflow.add_conditional_edges(
            "problem_capture",
            self._should_await_decision,
            {
                "decision": "awaiting_decision",
                "continue": "problem_clarification"
            }
        )
        
        workflow.add_conditional_edges(
            "problem_clarification", 
            self._should_await_decision,
            {
                "decision": "awaiting_decision",
                "continue": "solution_design"
            }
        )
        
        workflow.add_conditional_edges(
            "solution_design",
            self._should_await_decision,
            {
                "decision": "awaiting_decision", 
                "continue": "implementation_plan"
            }
        )
        
        workflow.add_conditional_edges(
            "implementation_plan",
            self._should_await_decision,
            {
                "decision": "awaiting_decision",
                "continue": "testing_strategy"
            }
        )
        
        workflow.add_conditional_edges(
            "testing_strategy",
            self._should_await_decision,
            {
                "decision": "awaiting_decision",
                "continue": "deployment_plan"
            }
        )
        
        workflow.add_conditional_edges(
            "deployment_plan",
            self._should_await_decision,
            {
                "decision": "awaiting_decision",
                "continue": "monitoring_setup"
            }
        )
        
        workflow.add_edge("monitoring_setup", "workflow_complete")
        workflow.add_edge("workflow_complete", END)
        
        # Decision handling edges
        workflow.add_conditional_edges(
            "awaiting_decision",
            self._check_decision_made,
            {
                "decision_made": "process_decision",
                "waiting": "awaiting_decision"
            }
        )
        
        workflow.add_conditional_edges(
            "process_decision",
            self._route_after_decision,
            {
                "problem_capture": "problem_capture",
                "problem_clarification": "problem_clarification", 
                "solution_design": "solution_design",
                "implementation_plan": "implementation_plan",
                "testing_strategy": "testing_strategy",
                "deployment_plan": "deployment_plan",
                "monitoring_setup": "monitoring_setup",
                "workflow_complete": "workflow_complete"
            }
        )
        
        return workflow.compile()
    
    async def start_workflow(self, session_id: str, task_description: str) -> BeBrahmaWorkflowState:
        """Start a new workflow session"""
        
        # Initialize state
        initial_state = BeBrahmaWorkflowState(
            session_id=session_id,
            current_stage=WorkflowStage.PROBLEM_CAPTURE,
            stage_status=StageStatus.IN_PROGRESS,
            messages=[],
            stage_progress={stage: StageStatus.NOT_STARTED for stage in WorkflowStage},
            task_description=task_description,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            metadata={}
        )
        
        # Mark first stage as in progress
        initial_state.stage_progress[WorkflowStage.PROBLEM_CAPTURE] = StageStatus.IN_PROGRESS
        
        # Store session
        self.sessions[session_id] = initial_state
        
        # Start with welcome message
        welcome_msg = Message(
            id=f"welcome_{uuid4().hex[:8]}",
            content=f"🚀 **Starting BeBrahma SaaS Analysis**\n\n**Task**: {task_description}\n\n**Current Stage**: {STAGE_DEFINITIONS[WorkflowStage.PROBLEM_CAPTURE].title}\n\n{STAGE_DEFINITIONS[WorkflowStage.PROBLEM_CAPTURE].description}",
            sender="system",
            timestamp=datetime.now().isoformat(),
            type="stage_start"
        )
        
        initial_state.messages.append(welcome_msg)
        
        return initial_state
    
    async def get_next_message(self, session_id: str) -> Tuple[BeBrahmaWorkflowState, List[Message]]:
        """Get next message(s) in the workflow - STRICT ONE STEP AT A TIME"""
        
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")
        
        state = self.sessions[session_id]
        
        # If awaiting decision, return current state
        if state.pending_decision:
            return state, []
        
        # CRITICAL: Only execute ONE step at a time
        # Get the next single message/step from CrewAI
        single_message = await self._execute_single_step(state)
        
        if single_message:
            # Add only this one message
            state.messages.append(single_message)
            state.updated_at = datetime.now()
            
            # Check if this single step completes the stage
            await self._check_single_step_completion(state, single_message)
        
        return state, [single_message] if single_message else []
    
    async def process_decision(
        self, 
        session_id: str, 
        decision: DecisionType, 
        user_message: str = ""
    ) -> Tuple[BeBrahmaWorkflowState, str]:
        """Process user decision and advance workflow"""
        
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")
        
        state = self.sessions[session_id]
        
        if not state.pending_decision:
            raise ValueError("No decision pending for this session")
        
        # Add decision message
        decision_msg = Message(
            id=f"decision_{uuid4().hex[:8]}",
            content=f"**User Decision**: {decision.value.title()}\n{user_message}",
            sender="user",
            timestamp=datetime.now().isoformat(),
            type="user_decision"
        )
        
        state.messages.append(decision_msg)
        
        # Process decision
        result_message = await self._handle_decision(state, decision)
        
        # Clear pending decision
        state.pending_decision = False
        state.decision_options = []
        state.updated_at = datetime.now()
        
        return state, result_message
    
    async def _execute_single_step(self, state: BeBrahmaWorkflowState) -> Optional[Message]:
        """Execute exactly ONE step in current stage via CrewAI - NO AUTO-ADVANCEMENT"""
        
        stage_def = STAGE_DEFINITIONS[state.current_stage]
        
        # Prepare context for CrewAI - request only ONE step
        context = {
            "session_id": state.session_id,
            "stage": state.current_stage.value,
            "stage_title": stage_def.title,
            "stage_description": stage_def.description,
            "objectives": stage_def.objectives,
            "task_description": state.task_description,
            "previous_messages": [msg.dict() for msg in state.messages[-3:]],  # Last 3 messages for context
            "required_agents": stage_def.required_agents,
            "request_type": "single_step",  # Explicitly request only one step
            "step_limit": 1  # Force single step execution
        }
        
        # Call CrewAI service for ONE step only
        crew_response = await self.crew_service.execute_single_step(context)
        
        # Extract only the first/next message
        messages = crew_response.get("messages", [])
        if not messages:
            return None
        
        # Return ONLY the first message - no batch processing
        msg_data = messages[0]
        single_message = Message(
            id=msg_data.get("id", f"msg_{uuid4().hex[:8]}"),
            content=msg_data.get("content", ""),
            sender=msg_data.get("sender", "agent"),
            timestamp=msg_data.get("timestamp", datetime.now().isoformat()),
            agent_id=msg_data.get("agentId"),
            agent_name=msg_data.get("agentName"),
            agent_title=msg_data.get("agentTitle"),
            type=msg_data.get("type"),
            metadata=msg_data.get("metadata", {})
        )
        
        return single_message
    
    async def _check_single_step_completion(self, state: BeBrahmaWorkflowState, last_message: Message):
        """Check if a single step completes the stage - NO AUTO-ADVANCEMENT"""
        
        stage_def = STAGE_DEFINITIONS[state.current_stage]
        
        # Get messages for current stage (exclude user decisions)
        stage_messages = [
            msg for msg in state.messages 
            if msg.type != "user_decision" and msg.sender != "system"
        ]
        
        # Check completion criteria
        is_complete, error_msg = validate_stage_completion(state.current_stage, stage_messages)
        
        if is_complete and stage_def.decision_required:
            # Set up decision point - STOP here, wait for user
            state.pending_decision = True
            state.decision_options = [DecisionType.APPROVE, DecisionType.REFINE, DecisionType.REJECT]
            state.stage_status = StageStatus.AWAITING_DECISION
            
            # Add decision prompt message
            decision_msg = Message(
                id=f"decision_prompt_{uuid4().hex[:8]}",
                content=f"**Decision Required**: Close {stage_def.title} with the option to approve, refine, reject, or pause.\n\n**Options:**\n1. **Approve** - The current {stage_def.title.lower()} and proceed to the next phase.\n2. **Refine** - The {stage_def.title.lower()} based on feedback and resubmit for review.\n3. **Reject** - The {stage_def.title.lower()} and revisit the problem statement for further analysis.",
                sender="system",
                timestamp=datetime.now().isoformat(),
                type="decision_point"
            )
            
            state.messages.append(decision_msg)
            
            # CRITICAL: Do NOT auto-advance - wait for user decision
            print(f"🛑 Stage {state.current_stage.value} complete. Waiting for user decision.")
            
        elif is_complete and not stage_def.decision_required:
            # Only auto-advance for final stage (MONITORING_SETUP)
            if state.current_stage == WorkflowStage.MONITORING_SETUP:
                await self._advance_to_next_stage(state)
            else:
                # For other stages, still require user decision
                state.pending_decision = True
                state.decision_options = [DecisionType.APPROVE, DecisionType.REFINE, DecisionType.REJECT]
                state.stage_status = StageStatus.AWAITING_DECISION
                print(f"🛑 Stage {state.current_stage.value} complete. Waiting for user decision.")
    
    async def _check_stage_completion(self, state: BeBrahmaWorkflowState):
        """Check if current stage is complete and set up decision point"""
        
        stage_def = STAGE_DEFINITIONS[state.current_stage]
        
        # Get messages for current stage (exclude user decisions)
        stage_messages = [
            msg for msg in state.messages 
            if msg.type != "user_decision" and msg.sender != "system"
        ]
        
        # Check completion criteria
        is_complete, error_msg = validate_stage_completion(state.current_stage, stage_messages)
        
        if is_complete and stage_def.decision_required:
            # Set up decision point
            state.pending_decision = True
            state.decision_options = [DecisionType.APPROVE, DecisionType.REFINE, DecisionType.REJECT]
            state.stage_status = StageStatus.AWAITING_DECISION
            
            # Add decision prompt message
            decision_msg = Message(
                id=f"decision_prompt_{uuid4().hex[:8]}",
                content=f"**Decision Required**: Close {stage_def.title} with the option to approve, refine, reject, or pause.\n\n**Options:**\n1. **Approve** - The current {stage_def.title.lower()} and proceed to the next phase.\n2. **Refine** - The {stage_def.title.lower()} based on feedback and resubmit for review.\n3. **Reject** - The {stage_def.title.lower()} and revisit the problem statement for further analysis.",
                sender="system",
                timestamp=datetime.now().isoformat(),
                type="decision_point"
            )
            
            state.messages.append(decision_msg)
        
        elif is_complete and not stage_def.decision_required:
            # Auto-advance to next stage
            await self._advance_to_next_stage(state)
    
    async def _handle_decision(self, state: BeBrahmaWorkflowState, decision: DecisionType) -> str:
        """Handle user decision and determine next action"""
        
        if decision == DecisionType.APPROVE:
            # Advance to next stage
            await self._advance_to_next_stage(state)
            return f"Approved. Moving to next stage: {state.current_stage.value}"
        
        elif decision == DecisionType.REFINE:
            # Stay in current stage, continue working
            state.stage_status = StageStatus.IN_PROGRESS
            return f"Refining {state.current_stage.value}. Continuing analysis..."
        
        elif decision == DecisionType.REJECT:
            # Go back to previous stage or restart current stage
            state.stage_status = StageStatus.IN_PROGRESS
            return f"Rejected. Revisiting {state.current_stage.value} for further analysis..."
        
        elif decision == DecisionType.PAUSE:
            # Pause workflow
            state.stage_status = StageStatus.NOT_STARTED  # Can resume later
            return f"Workflow paused at {state.current_stage.value}."
        
        return "Decision processed."
    
    async def _advance_to_next_stage(self, state: BeBrahmaWorkflowState):
        """Advance workflow to next stage"""
        
        # Mark current stage complete
        state.stage_progress[state.current_stage] = StageStatus.COMPLETED
        
        # Get next stage
        next_stage = get_next_stage(state.current_stage)
        
        if next_stage and next_stage != WorkflowStage.COMPLETED:
            # Advance to next stage
            state.current_stage = next_stage
            state.stage_status = StageStatus.IN_PROGRESS
            state.stage_progress[next_stage] = StageStatus.IN_PROGRESS
            
            # Add stage transition message
            stage_def = STAGE_DEFINITIONS[next_stage]
            transition_msg = Message(
                id=f"stage_start_{uuid4().hex[:8]}",
                content=f"🎯 **{stage_def.title}**\n\n{stage_def.description}\n\n**Objectives:**\n" + "\n".join(f"• {obj}" for obj in stage_def.objectives),
                sender="system",
                timestamp=datetime.now().isoformat(),
                type="stage_start"
            )
            
            state.messages.append(transition_msg)
        
        else:
            # Workflow complete
            state.current_stage = WorkflowStage.COMPLETED
            state.stage_status = StageStatus.COMPLETED
            
            completion_msg = Message(
                id=f"complete_{uuid4().hex[:8]}",
                content="🎉 **Workflow Complete!**\n\nYour SaaS analysis has been completed successfully. All stages have been analyzed and documented.",
                sender="system",
                timestamp=datetime.now().isoformat(),
                type="workflow_complete"
            )
            
            state.messages.append(completion_msg)
    
    # Helper methods for LangGraph conditional routing
    def _should_await_decision(self, state: BeBrahmaWorkflowState) -> str:
        return "decision" if state.pending_decision else "continue"
    
    def _check_decision_made(self, state: BeBrahmaWorkflowState) -> str:
        return "waiting" if state.pending_decision else "decision_made"
    
    def _route_after_decision(self, state: BeBrahmaWorkflowState) -> str:
        if state.current_stage == WorkflowStage.COMPLETED:
            return "workflow_complete"
        elif state.stage_status == StageStatus.IN_PROGRESS:
            return self._get_current_stage_node(state)
        else:
            return self._get_next_stage_node(state)
    
    def _get_current_stage_node_name(self, state: BeBrahmaWorkflowState) -> str:
        """Get the current stage node name as a string"""
        return state.current_stage.value.lower()
    
    def _get_next_stage_node_name(self, state: BeBrahmaWorkflowState) -> str:
        """Get the next stage node name as a string"""
        next_stage = get_next_stage(state.current_stage)
        return next_stage.value.lower() if next_stage else "workflow_complete"
    
    def _get_current_stage_node(self, state: BeBrahmaWorkflowState) -> str:
        return state.current_stage.value.lower()
    
    def _get_next_stage_node(self, state: BeBrahmaWorkflowState) -> str:
        next_stage = get_next_stage(state.current_stage)
        return next_stage.value.lower() if next_stage else "workflow_complete"
    
    # Stage execution methods (delegated to CrewAI)
    async def _execute_problem_capture(self, state: BeBrahmaWorkflowState) -> BeBrahmaWorkflowState:
        return state
    
    async def _execute_problem_clarification(self, state: BeBrahmaWorkflowState) -> BeBrahmaWorkflowState:
        return state
    
    async def _execute_solution_design(self, state: BeBrahmaWorkflowState) -> BeBrahmaWorkflowState:
        return state
    
    async def _execute_implementation_plan(self, state: BeBrahmaWorkflowState) -> BeBrahmaWorkflowState:
        return state
    
    async def _execute_testing_strategy(self, state: BeBrahmaWorkflowState) -> BeBrahmaWorkflowState:
        return state
    
    async def _execute_deployment_plan(self, state: BeBrahmaWorkflowState) -> BeBrahmaWorkflowState:
        return state
    
    async def _execute_monitoring_setup(self, state: BeBrahmaWorkflowState) -> BeBrahmaWorkflowState:
        return state
    
    async def _handle_decision_point(self, state: BeBrahmaWorkflowState) -> BeBrahmaWorkflowState:
        return state
    
    async def _process_decision(self, state: BeBrahmaWorkflowState) -> BeBrahmaWorkflowState:
        return state
    
    async def _complete_workflow(self, state: BeBrahmaWorkflowState) -> BeBrahmaWorkflowState:
        return state
