#!/usr/bin/env python3
"""
BeBrahma State Machine Implementation
====================================

This module implements a state-of-the-art state machine for managing
CrewAI workflows using modern Python patterns including:
- Event-driven architecture
- State persistence
- Transition validation
- Error handling and recovery
- Async support
- Event sourcing
"""

import asyncio
import json
import logging
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import (
    Any, Dict, List, Optional, Set, Callable, 
    Awaitable, Union, TypeVar, Generic
)
from contextlib import asynccontextmanager
import redis
from pydantic import BaseModel, Field, ValidationError

logger = logging.getLogger(__name__)

# Type variables for generic state machine
T = TypeVar('T')
EventData = TypeVar('EventData')

class WorkflowStatus(str, Enum):
    """Workflow status enumeration"""
    CREATED = "created"
    STARTED = "started"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    ERROR = "error"

class WorkflowStage(str, Enum):
    """Workflow stage enumeration"""
    PROBLEM_CAPTURE = "problem_capture"
    PROBLEM_CLARIFICATION = "problem_clarification"
    SOLUTION_BRAINSTORM = "solution_brainstorm"
    COMPETITOR_ANALYSIS = "competitor_analysis"
    SCA_ANALYSIS = "sca_analysis"
    MVP_PLANNING = "mvp_planning"
    TASK_GENERATION = "task_generation"
    VALIDATION = "validation"
    COMPLETION = "completion"

class TransitionType(str, Enum):
    """Transition type enumeration"""
    AUTOMATIC = "automatic"
    MANUAL = "manual"
    CONDITIONAL = "conditional"
    TIMEOUT = "timeout"
    ERROR = "error"

@dataclass
class StateTransition:
    """Represents a state transition"""
    from_state: str
    to_state: str
    trigger: str
    transition_type: TransitionType
    conditions: Optional[List[Callable]] = None
    actions: Optional[List[Callable]] = None
    timeout: Optional[timedelta] = None
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class WorkflowEvent:
    """Represents a workflow event"""
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str = ""
    workflow_id: str = ""
    stage: str = ""
    data: Any = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    source: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class WorkflowState:
    """Represents the current state of a workflow"""
    workflow_id: str
    current_stage: str
    status: WorkflowStatus
    stages_completed: Set[str] = field(default_factory=set)
    stages_pending: Set[str] = field(default_factory=set)
    current_data: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    version: int = 1

class StateMachineError(Exception):
    """Base exception for state machine errors"""
    pass

class InvalidTransitionError(StateMachineError):
    """Raised when an invalid transition is attempted"""
    pass

class StateMachineConfig(BaseModel):
    """Configuration for the state machine"""
    redis_url: str = "redis://localhost:6379"
    event_store_enabled: bool = True
    persistence_enabled: bool = True
    async_mode: bool = True
    max_retries: int = 3
    retry_delay: float = 1.0
    timeout: float = 30.0
    log_level: str = "INFO"

class EventStore(ABC):
    """Abstract base class for event storage"""
    
    @abstractmethod
    async def store_event(self, event: WorkflowEvent) -> bool:
        """Store a workflow event"""
        pass
    
    @abstractmethod
    async def get_events(self, workflow_id: str) -> List[WorkflowEvent]:
        """Retrieve events for a workflow"""
        pass
    
    @abstractmethod
    async def get_event_stream(self, workflow_id: str) -> List[WorkflowEvent]:
        """Get event stream for a workflow"""
        pass

class RedisEventStore(EventStore):
    """Redis-based event store implementation"""
    
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.redis = None
        self._connect()
    
    def _connect(self):
        """Connect to Redis"""
        try:
            self.redis = redis.from_url(self.redis_url)
            self.redis.ping()
            logger.info("Connected to Redis event store")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    async def store_event(self, event: WorkflowEvent) -> bool:
        """Store a workflow event in Redis"""
        try:
            key = f"workflow:events:{event.workflow_id}"
            event_data = {
                "event_id": event.event_id,
                "event_type": event.event_type,
                "workflow_id": event.workflow_id,
                "stage": event.stage,
                "data": json.dumps(event.data) if event.data else None,
                "timestamp": event.timestamp.isoformat(),
                "source": event.source,
                "metadata": json.dumps(event.metadata) if event.metadata else None
            }
            
            # Store event in sorted set by timestamp
            self.redis.zadd(key, {json.dumps(event_data): event.timestamp.timestamp()})
            
            # Set expiration for cleanup
            self.redis.expire(key, 86400 * 30)  # 30 days
            
            logger.debug(f"Stored event {event.event_id} for workflow {event.workflow_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store event: {e}")
            return False
    
    async def get_events(self, workflow_id: str) -> List[WorkflowEvent]:
        """Retrieve events for a workflow from Redis"""
        try:
            key = f"workflow:events:{workflow_id}"
            events_data = self.redis.zrange(key, 0, -1, withscores=True)
            
            events = []
            for event_data, timestamp in events_data:
                event_dict = json.loads(event_data)
                event = WorkflowEvent(
                    event_id=event_dict["event_id"],
                    event_type=event_dict["event_type"],
                    workflow_id=event_dict["workflow_id"],
                    stage=event_dict["stage"],
                    data=json.loads(event_dict["data"]) if event_dict["data"] else None,
                    timestamp=datetime.fromisoformat(event_dict["timestamp"]),
                    source=event_dict["source"],
                    metadata=json.loads(event_dict["metadata"]) if event_dict["metadata"] else {}
                )
                events.append(event)
            
            return sorted(events, key=lambda x: x.timestamp)
            
        except Exception as e:
            logger.error(f"Failed to retrieve events: {e}")
            return []
    
    async def get_event_stream(self, workflow_id: str) -> List[WorkflowEvent]:
        """Get event stream for a workflow (alias for get_events)"""
        return await self.get_events(workflow_id)

class StatePersistence(ABC):
    """Abstract base class for state persistence"""
    
    @abstractmethod
    async def save_state(self, state: WorkflowState) -> bool:
        """Save workflow state"""
        pass
    
    @abstractmethod
    async def load_state(self, workflow_id: str) -> Optional[WorkflowState]:
        """Load workflow state"""
        pass
    
    @abstractmethod
    async def delete_state(self, workflow_id: str) -> bool:
        """Delete workflow state"""
        pass

class RedisStatePersistence(StatePersistence):
    """Redis-based state persistence implementation"""
    
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.redis = None
        self._connect()
    
    def _connect(self):
        """Connect to Redis"""
        try:
            self.redis = redis.from_url(self.redis_url)
            self.redis.ping()
            logger.info("Connected to Redis state persistence")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    async def save_state(self, state: WorkflowState) -> bool:
        """Save workflow state to Redis"""
        try:
            key = f"workflow:state:{state.workflow_id}"
            state_data = {
                "workflow_id": state.workflow_id,
                "current_stage": state.current_stage,
                "status": state.status.value,
                "stages_completed": list(state.stages_completed),
                "stages_pending": list(state.stages_pending),
                "current_data": json.dumps(state.current_data) if state.current_data else "{}",
                "metadata": json.dumps(state.metadata) if state.metadata else "{}",
                "created_at": state.created_at.isoformat(),
                "updated_at": state.updated_at.isoformat(),
                "version": state.version
            }
            
            self.redis.hset(key, mapping=state_data)
            self.redis.expire(key, 86400 * 30)  # 30 days
            
            logger.debug(f"Saved state for workflow {state.workflow_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save state: {e}")
            return False
    
    async def load_state(self, workflow_id: str) -> Optional[WorkflowState]:
        """Load workflow state from Redis"""
        try:
            key = f"workflow:state:{workflow_id}"
            state_data = self.redis.hgetall(key)
            
            if not state_data:
                return None
            
            state = WorkflowState(
                workflow_id=state_data[b"workflow_id"].decode(),
                current_stage=state_data[b"current_stage"].decode(),
                status=WorkflowStatus(state_data[b"status"].decode()),
                stages_completed=set(json.loads(state_data[b"stages_completed"].decode())),
                stages_pending=set(json.loads(state_data[b"stages_pending"].decode())),
                current_data=json.loads(state_data[b"current_data"].decode()),
                metadata=json.loads(state_data[b"metadata"].decode()),
                created_at=datetime.fromisoformat(state_data[b"created_at"].decode()),
                updated_at=datetime.fromisoformat(state_data[b"updated_at"].decode()),
                version=int(state_data[b"version"].decode())
            )
            
            return state
            
        except Exception as e:
            logger.error(f"Failed to load state: {e}")
            return None
    
    async def delete_state(self, workflow_id: str) -> bool:
        """Delete workflow state from Redis"""
        try:
            key = f"workflow:state:{workflow_id}"
            self.redis.delete(key)
            logger.debug(f"Deleted state for workflow {workflow_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete state: {e}")
            return False

class StateMachine:
    """Main state machine implementation"""
    
    def __init__(self, config: StateMachineConfig):
        self.config = config
        self.transitions: Dict[str, List[StateTransition]] = {}
        self.states: Set[str] = set()
        self.event_store: Optional[EventStore] = None
        self.state_persistence: Optional[StatePersistence] = None
        self.hooks: Dict[str, List[Callable]] = {
            "before_transition": [],
            "after_transition": [],
            "on_error": [],
            "on_timeout": []
        }
        
        self._initialize_storage()
        self._setup_default_transitions()
    
    def _initialize_storage(self):
        """Initialize storage components"""
        if self.config.event_store_enabled:
            try:
                self.event_store = RedisEventStore(self.config.redis_url)
                logger.info("Event store initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize event store: {e}")
                self.event_store = None
        
        if self.config.persistence_enabled:
            try:
                self.state_persistence = RedisStatePersistence(self.config.redis_url)
                logger.info("State persistence initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize state persistence: {e}")
                self.state_persistence = None
    
    def _setup_default_transitions(self):
        """Setup default workflow transitions"""
        default_transitions = [
            # Problem Capture → Problem Clarification
            StateTransition(
                from_state=WorkflowStage.PROBLEM_CAPTURE,
                to_state=WorkflowStage.PROBLEM_CLARIFICATION,
                trigger="clarify",
                transition_type=TransitionType.MANUAL
            ),
            
            # Problem Clarification → Solution Brainstorm
            StateTransition(
                from_state=WorkflowStage.PROBLEM_CLARIFICATION,
                to_state=WorkflowStage.SOLUTION_BRAINSTORM,
                trigger="brainstorm",
                transition_type=TransitionType.MANUAL
            ),
            
            # Solution Brainstorm → Competitor Analysis
            StateTransition(
                from_state=WorkflowStage.SOLUTION_BRAINSTORM,
                to_state=WorkflowStage.COMPETITOR_ANALYSIS,
                trigger="analyze_competitors",
                transition_type=TransitionType.MANUAL
            ),
            
            # Competitor Analysis → SCA Analysis
            StateTransition(
                from_state=WorkflowStage.COMPETITOR_ANALYSIS,
                to_state=WorkflowStage.SCA_ANALYSIS,
                trigger="analyze_sca",
                transition_type=TransitionType.MANUAL
            ),
            
            # SCA Analysis → MVP Planning
            StateTransition(
                from_state=WorkflowStage.SCA_ANALYSIS,
                to_state=WorkflowStage.MVP_PLANNING,
                trigger="plan_mvp",
                transition_type=TransitionType.MANUAL
            ),
            
            # MVP Planning → Task Generation
            StateTransition(
                from_state=WorkflowStage.MVP_PLANNING,
                to_state=WorkflowStage.TASK_GENERATION,
                trigger="generate_tasks",
                transition_type=TransitionType.MANUAL
            ),
            
            # Task Generation → Validation
            StateTransition(
                from_state=WorkflowStage.TASK_GENERATION,
                to_state=WorkflowStage.VALIDATION,
                trigger="validate",
                transition_type=TransitionType.MANUAL
            ),
            
            # Validation → Completion
            StateTransition(
                from_state=WorkflowStage.VALIDATION,
                to_state=WorkflowStage.COMPLETION,
                trigger="complete",
                transition_type=TransitionType.MANUAL
            ),
            
            # Error transitions (from any state)
            StateTransition(
                from_state="*",
                to_state="error",
                trigger="error",
                transition_type=TransitionType.ERROR
            ),
            
            # Pause transitions (from any state)
            StateTransition(
                from_state="*",
                to_state="paused",
                trigger="pause",
                transition_type=TransitionType.MANUAL
            ),
            
            # Resume transitions (from paused)
            StateTransition(
                from_state="paused",
                to_state="*",
                trigger="resume",
                transition_type=TransitionType.MANUAL
            )
        ]
        
        for transition in default_transitions:
            self.add_transition(transition)
    
    def add_transition(self, transition: StateTransition):
        """Add a transition to the state machine"""
        if transition.from_state not in self.transitions:
            self.transitions[transition.from_state] = []
        
        self.transitions[transition.from_state].append(transition)
        self.states.add(transition.from_state)
        self.states.add(transition.to_state)
        
        logger.debug(f"Added transition: {transition.from_state} -> {transition.to_state}")
    
    def add_hook(self, hook_type: str, hook: Callable):
        """Add a hook to the state machine"""
        if hook_type in self.hooks:
            self.hooks[hook_type].append(hook)
            logger.debug(f"Added {hook_type} hook")
    
    async def create_workflow(self, workflow_type: str, initial_data: Dict[str, Any] = None) -> str:
        """Create a new workflow"""
        workflow_id = str(uuid.uuid4())
        
        initial_state = WorkflowState(
            workflow_id=workflow_id,
            current_stage=WorkflowStage.PROBLEM_CAPTURE,
            status=WorkflowStatus.CREATED,
            stages_completed=set(),
            stages_pending=set(WorkflowStage),
            current_data=initial_data or {},
            metadata={"workflow_type": workflow_type}
        )
        
        # Save initial state
        if self.state_persistence:
            await self.state_persistence.save_state(initial_state)
        
        # Store creation event
        if self.event_store:
            event = WorkflowEvent(
                event_type="workflow_created",
                workflow_id=workflow_id,
                stage=WorkflowStage.PROBLEM_CAPTURE,
                data=initial_data,
                source="state_machine"
            )
            await self.event_store.store_event(event)
        
        logger.info(f"Created workflow {workflow_id}")
        return workflow_id
    
    async def transition(self, workflow_id: str, trigger: str, data: Any = None) -> bool:
        """Execute a state transition"""
        try:
            # Load current state
            if not self.state_persistence:
                raise StateMachineError("State persistence not available")
            
            current_state = await self.state_persistence.load_state(workflow_id)
            if not current_state:
                raise StateMachineError(f"Workflow {workflow_id} not found")
            
            # Find valid transitions
            valid_transitions = self._get_valid_transitions(current_state.current_stage, trigger)
            if not valid_transitions:
                raise InvalidTransitionError(
                    f"No valid transition from {current_state.current_stage} with trigger {trigger}"
                )
            
            # Execute before hooks
            await self._execute_hooks("before_transition", current_state, trigger, data)
            
            # Execute transition
            transition = valid_transitions[0]  # Use first valid transition
            success = await self._execute_transition(current_state, transition, data)
            
            if success:
                # Execute after hooks
                await self._execute_hooks("after_transition", current_state, trigger, data)
                
                # Save updated state
                await self.state_persistence.save_state(current_state)
                
                # Store transition event
                if self.event_store:
                    event = WorkflowEvent(
                        event_type="state_transition",
                        workflow_id=workflow_id,
                        stage=current_state.current_stage,
                        data={
                            "from_stage": transition.from_state,
                            "to_stage": transition.to_state,
                            "trigger": trigger,
                            "transition_data": data
                        },
                        source="state_machine"
                    )
                    await self.event_store.store_event(event)
                
                logger.info(f"Transitioned workflow {workflow_id} to {current_state.current_stage}")
                return True
            else:
                raise StateMachineError("Transition execution failed")
                
        except Exception as e:
            logger.error(f"Transition failed for workflow {workflow_id}: {e}")
            await self._execute_hooks("on_error", None, trigger, data, error=e)
            raise
    
    def _get_valid_transitions(self, current_state: str, trigger: str) -> List[StateTransition]:
        """Get valid transitions for current state and trigger"""
        valid_transitions = []
        
        # Check specific state transitions
        if current_state in self.transitions:
            for transition in self.transitions[current_state]:
                if transition.trigger == trigger:
                    valid_transitions.append(transition)
        
        # Check wildcard transitions
        if "*" in self.transitions:
            for transition in self.transitions["*"]:
                if transition.trigger == trigger:
                    valid_transitions.append(transition)
        
        return valid_transitions
    
    async def _execute_transition(self, state: WorkflowState, transition: StateTransition, data: Any) -> bool:
        """Execute a specific transition"""
        try:
            # Check conditions
            if transition.conditions:
                for condition in transition.conditions:
                    if not await self._evaluate_condition(condition, state, data):
                        logger.warning(f"Condition failed for transition {transition.from_state} -> {transition.to_state}")
                        return False
            
            # Execute actions
            if transition.actions:
                for action in transition.actions:
                    await self._execute_action(action, state, data)
            
            # Update state
            old_stage = state.current_stage
            state.current_stage = transition.to_state
            state.stages_completed.add(old_stage)
            state.stages_pending.discard(transition.to_state)
            state.updated_at = datetime.utcnow()
            state.version += 1
            
            # Update status based on stage
            if transition.to_state == WorkflowStage.COMPLETION:
                state.status = WorkflowStatus.COMPLETED
            elif transition.to_state == "error":
                state.status = WorkflowStatus.ERROR
            elif transition.to_state == "paused":
                state.status = WorkflowStatus.PAUSED
            else:
                state.status = WorkflowStatus.RUNNING
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to execute transition: {e}")
            return False
    
    async def _evaluate_condition(self, condition: Callable, state: WorkflowState, data: Any) -> bool:
        """Evaluate a transition condition"""
        try:
            if asyncio.iscoroutinefunction(condition):
                result = await condition(state, data)
            else:
                result = condition(state, data)
            return bool(result)
        except Exception as e:
            logger.error(f"Condition evaluation failed: {e}")
            return False
    
    async def _execute_action(self, action: Callable, state: WorkflowState, data: Any):
        """Execute a transition action"""
        try:
            if asyncio.iscoroutinefunction(action):
                await action(state, data)
            else:
                action(state, data)
        except Exception as e:
            logger.error(f"Action execution failed: {e}")
            raise
    
    async def _execute_hooks(self, hook_type: str, state: WorkflowState, trigger: str, data: Any, **kwargs):
        """Execute hooks of a specific type"""
        for hook in self.hooks[hook_type]:
            try:
                if asyncio.iscoroutinefunction(hook):
                    await hook(state, trigger, data, **kwargs)
                else:
                    hook(state, trigger, data, **kwargs)
            except Exception as e:
                logger.error(f"Hook execution failed: {e}")
    
    async def get_workflow_state(self, workflow_id: str) -> Optional[WorkflowState]:
        """Get current state of a workflow"""
        if self.state_persistence:
            return await self.state_persistence.load_state(workflow_id)
        return None
    
    async def get_workflow_events(self, workflow_id: str) -> List[WorkflowEvent]:
        """Get events for a workflow"""
        if self.event_store:
            return await self.event_store.get_events(workflow_id)
        return []
    
    async def pause_workflow(self, workflow_id: str) -> bool:
        """Pause a workflow"""
        return await self.transition(workflow_id, "pause")
    
    async def resume_workflow(self, workflow_id: str) -> bool:
        """Resume a paused workflow"""
        return await self.transition(workflow_id, "resume")
    
    async def cancel_workflow(self, workflow_id: str) -> bool:
        """Cancel a workflow"""
        return await self.transition(workflow_id, "cancel")
    
    async def get_workflow_summary(self, workflow_id: str) -> Dict[str, Any]:
        """Get a summary of workflow state and progress"""
        state = await self.get_workflow_state(workflow_id)
        if not state:
            return {"error": "Workflow not found"}
        
        events = await self.get_workflow_events(workflow_id)
        
        return {
            "workflow_id": workflow_id,
            "current_stage": state.current_stage,
            "status": state.status.value,
            "progress": len(state.stages_completed) / len(WorkflowStage) * 100,
            "stages_completed": list(state.stages_completed),
            "stages_pending": list(state.stages_pending),
            "total_events": len(events),
            "created_at": state.created_at.isoformat(),
            "updated_at": state.updated_at.isoformat(),
            "version": state.version
        }

# Factory function for creating state machine instances
def create_state_machine(config: StateMachineConfig) -> StateMachine:
    """Create a new state machine instance"""
    return StateMachine(config)

# Example usage and testing
if __name__ == "__main__":
    async def main():
        # Create configuration
        config = StateMachineConfig(
            redis_url="redis://localhost:6379",
            event_store_enabled=True,
            persistence_enabled=True,
            async_mode=True
        )
        
        # Create state machine
        sm = create_state_machine(config)
        
        # Create a workflow
        workflow_id = await sm.create_workflow(
            "saas_analysis",
            {"problem": "AI-powered legal aid for rural communities"}
        )
        
        print(f"Created workflow: {workflow_id}")
        
        # Execute transitions
        await sm.transition(workflow_id, "clarify")
        await sm.transition(workflow_id, "brainstorm")
        await sm.transition(workflow_id, "analyze_competitors")
        
        # Get workflow summary
        summary = await sm.get_workflow_summary(workflow_id)
        print(f"Workflow summary: {json.dumps(summary, indent=2, default=str)}")
        
        # Get events
        events = await sm.get_workflow_events(workflow_id)
        print(f"Total events: {len(events)}")
    
    # Run the example
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"Example failed: {e}")
        print("Make sure Redis is running for this example")
