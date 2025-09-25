import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime
from typing import Dict, Any, List

from fastapi.testclient import TestClient
from httpx import AsyncClient

from src.main import app
from src.langgraph_workflow import WorkflowOrchestrator
from src.workflow_states import (
    WorkflowState,
    WorkflowStage,
    StageStatus,
    Message,
    DecisionType
)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_crew_service():
    """Mock CrewAI service with configurable responses"""
    mock = Mock()
    mock.execute_single_step = AsyncMock()
    
    # Default successful response
    mock.execute_single_step.return_value = {
        "message": "Default CrewAI message",
        "agent_id": "business_analyst",
        "agent_name": "Business Analyst",
        "agent_title": "Business Analyst"
    }
    
    return mock


@pytest.fixture
def mock_workflow_orchestrator(mock_crew_service):
    """Mock WorkflowOrchestrator with configurable responses"""
    mock = Mock()
    mock.start_workflow = AsyncMock()
    mock.get_next_message = AsyncMock()
    mock.process_decision = AsyncMock()
    mock.get_workflow_status = AsyncMock()
    
    return mock


@pytest.fixture
def test_session_id():
    """Generate unique session ID for tests"""
    return f"test_session_{datetime.now().timestamp()}"


@pytest.fixture
def sample_messages():
    """Predefined message objects for testing"""
    return [
        Message(
            id="msg_1",
            content="Test message 1",
            agent_id="business_analyst",
            agent_name="Business Analyst",
            agent_title="Business Analyst",
            timestamp=datetime.now(),
            stage=WorkflowStage.PROBLEM_CAPTURE
        ),
        Message(
            id="msg_2",
            content="Test message 2",
            agent_id="solution_architect",
            agent_name="Solution Architect",
            agent_title="Solution Architect",
            timestamp=datetime.now(),
            stage=WorkflowStage.PROBLEM_CAPTURE
        )
    ]


@pytest.fixture
def sample_workflow_state(test_session_id, sample_messages):
    """Complete workflow state object for testing"""
    return WorkflowState(
        session_id=test_session_id,
        current_stage=WorkflowStage.PROBLEM_CAPTURE,
        stage_status=StageStatus.IN_PROGRESS,
        messages=sample_messages,
        stage_progress={
            WorkflowStage.PROBLEM_CAPTURE: {
                "status": StageStatus.IN_PROGRESS,
                "message_count": 2,
                "completed": False
            }
        },
        pending_decision=False,
        decision_options=[],
        created_at=datetime.now(),
        updated_at=datetime.now()
    )


@pytest.fixture
def test_client():
    """Synchronous test client for FastAPI app"""
    return TestClient(app)


@pytest.fixture
async def async_client():
    """Async test client for FastAPI app"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def app_with_mocks(mock_crew_service, mock_workflow_orchestrator):
    """FastAPI app instance with mocked dependencies"""
    with patch('src.main.crew_service', mock_crew_service):
        with patch('src.main.workflow_orchestrator', mock_workflow_orchestrator):
            yield app


@pytest.fixture
def mock_crew_responses():
    """Configure mock responses for different CrewAI scenarios"""
    return {
        "success": {
            "message": "Successful CrewAI response",
            "agent_id": "business_analyst",
            "agent_name": "Business Analyst",
            "agent_title": "Business Analyst"
        },
        "error": Exception("CrewAI service error"),
        "timeout": Exception("CrewAI service timeout"),
        "invalid_response": {
            "message": None,
            "agent_id": None
        }
    }


@pytest.fixture
def deterministic_messages():
    """Generate deterministic message objects for testing"""
    base_time = datetime(2024, 1, 1, 12, 0, 0)
    
    return [
        Message(
            id=f"msg_{i}",
            content=f"Deterministic message {i}",
            agent_id="business_analyst",
            agent_name="Business Analyst",
            agent_title="Business Analyst",
            timestamp=base_time.replace(second=i),
            stage=WorkflowStage.PROBLEM_CAPTURE
        )
        for i in range(1, 6)
    ]


@pytest.fixture
def test_workflow_stages():
    """Test workflow stages for progression testing"""
    return [
        WorkflowStage.PROBLEM_CAPTURE,
        WorkflowStage.PROBLEM_CLARIFICATION,
        WorkflowStage.SOLUTION_DESIGN,
        WorkflowStage.IMPLEMENTATION_PLAN,
        WorkflowStage.TESTING_STRATEGY,
        WorkflowStage.DEPLOYMENT_PLAN,
        WorkflowStage.MONITORING_SETUP
    ]


@pytest.fixture
def test_decision_types():
    """Test decision types for decision processing"""
    return [
        DecisionType.APPROVE,
        DecisionType.REFINE,
        DecisionType.REJECT,
        DecisionType.PAUSE
    ]


@pytest.fixture
def mock_timeout_scenarios():
    """Configure timeout scenarios for testing"""
    return {
        "short_timeout": 1,  # 1 second
        "medium_timeout": 5,  # 5 seconds
        "long_timeout": 15,   # 15 seconds
        "no_timeout": None    # No timeout
    }


@pytest.fixture
def test_cleanup():
    """Cleanup function for test isolation"""
    def cleanup():
        # Reset any global state
        pass
    
    yield cleanup
    cleanup()


# Test utilities
def create_test_message(
    message_id: str,
    content: str,
    agent_id: str = "business_analyst",
    stage: WorkflowStage = WorkflowStage.PROBLEM_CAPTURE,
    timestamp: datetime = None
) -> Message:
    """Helper function to create test messages"""
    if timestamp is None:
        timestamp = datetime.now()
    
    return Message(
        id=message_id,
        content=content,
        agent_id=agent_id,
        agent_name=f"{agent_id.replace('_', ' ').title()}",
        agent_title=f"{agent_id.replace('_', ' ').title()}",
        timestamp=timestamp,
        stage=stage
    )


def create_test_workflow_state(
    session_id: str,
    current_stage: WorkflowStage = WorkflowStage.PROBLEM_CAPTURE,
    messages: List[Message] = None,
    pending_decision: bool = False
) -> WorkflowState:
    """Helper function to create test workflow states"""
    if messages is None:
        messages = []
    
    stage_progress = {}
    for stage in WorkflowStage:
        stage_progress[stage] = {
            "status": StageStatus.COMPLETED if stage.value < current_stage.value else StageStatus.IN_PROGRESS,
            "message_count": len([m for m in messages if m.stage == stage]),
            "completed": stage.value < current_stage.value
        }
    
    return WorkflowState(
        session_id=session_id,
        current_stage=current_stage,
        stage_status=StageStatus.IN_PROGRESS,
        messages=messages,
        stage_progress=stage_progress,
        pending_decision=pending_decision,
        decision_options=["approve", "refine", "reject", "pause"] if pending_decision else [],
        created_at=datetime.now(),
        updated_at=datetime.now()
    )


def assert_workflow_state_valid(workflow_state: WorkflowState):
    """Assert that workflow state is valid"""
    assert workflow_state.session_id is not None
    assert workflow_state.current_stage is not None
    assert workflow_state.stage_status is not None
    assert isinstance(workflow_state.messages, list)
    assert isinstance(workflow_state.stage_progress, dict)
    assert isinstance(workflow_state.pending_decision, bool)
    assert isinstance(workflow_state.decision_options, list)
    assert workflow_state.created_at is not None
    assert workflow_state.updated_at is not None


def assert_message_valid(message: Message):
    """Assert that message is valid"""
    assert message.id is not None
    assert message.content is not None
    assert message.agent_id is not None
    assert message.agent_name is not None
    assert message.agent_title is not None
    assert message.timestamp is not None
    assert message.stage is not None


def assert_stage_progression_valid(
    from_stage: WorkflowStage,
    to_stage: WorkflowStage,
    expected_progression: bool = True
):
    """Assert that stage progression is valid"""
    if expected_progression:
        assert to_stage.value > from_stage.value, f"Expected progression from {from_stage} to {to_stage}"
    else:
        assert to_stage.value == from_stage.value, f"Expected no progression, but moved from {from_stage} to {to_stage}"


def simulate_crewai_response(
    mock_crew_service,
    response_type: str = "success",
    custom_response: Dict[str, Any] = None
):
    """Simulate CrewAI service response"""
    if custom_response:
        mock_crew_service.execute_single_step.return_value = custom_response
    elif response_type == "success":
        mock_crew_service.execute_single_step.return_value = {
            "message": "Simulated CrewAI response",
            "agent_id": "business_analyst",
            "agent_name": "Business Analyst",
            "agent_title": "Business Analyst"
        }
    elif response_type == "error":
        mock_crew_service.execute_single_step.side_effect = Exception("Simulated CrewAI error")
    elif response_type == "timeout":
        mock_crew_service.execute_single_step.side_effect = asyncio.TimeoutError("Simulated timeout")


def create_mock_session_data(session_id: str, stage: WorkflowStage, message_count: int = 0):
    """Create mock session data for testing"""
    messages = []
    for i in range(message_count):
        messages.append(create_test_message(
            f"msg_{i}",
            f"Test message {i}",
            "business_analyst",
            stage
        ))
    
    return {
        "session_id": session_id,
        "current_stage": stage,
        "messages": messages,
        "message_count": message_count
    }


# Performance testing utilities
@pytest.fixture
def performance_test_config():
    """Configuration for performance testing"""
    return {
        "max_response_time_ms": 1000,  # 1 second
        "max_memory_mb": 100,          # 100 MB
        "concurrent_requests": 10,
        "test_duration_seconds": 30
    }


def measure_response_time(func, *args, **kwargs):
    """Measure response time of a function"""
    import time
    start_time = time.time()
    result = func(*args, **kwargs)
    end_time = time.time()
    return result, (end_time - start_time) * 1000  # Convert to milliseconds


async def measure_async_response_time(func, *args, **kwargs):
    """Measure response time of an async function"""
    import time
    start_time = time.time()
    result = await func(*args, **kwargs)
    end_time = time.time()
    return result, (end_time - start_time) * 1000  # Convert to milliseconds


# Error simulation utilities
def simulate_network_error(client, endpoint: str, error_type: str = "timeout"):
    """Simulate network errors for testing"""
    if error_type == "timeout":
        # Simulate timeout by setting a very short timeout
        client.timeout = 0.001
    elif error_type == "connection_error":
        # Simulate connection error by using invalid URL
        client.base_url = "http://invalid-url-that-will-fail.com"
    
    return client


def simulate_service_unavailable(mock_service):
    """Simulate service unavailable scenario"""
    mock_service.execute_single_step.side_effect = Exception("Service unavailable")
    return mock_service


# Test data generators
def generate_test_sessions(count: int = 5):
    """Generate multiple test session IDs"""
    return [f"test_session_{i}_{datetime.now().timestamp()}" for i in range(count)]


def generate_test_messages(
    count: int = 10,
    stage: WorkflowStage = WorkflowStage.PROBLEM_CAPTURE,
    agent_ids: List[str] = None
):
    """Generate multiple test messages"""
    if agent_ids is None:
        agent_ids = ["business_analyst", "solution_architect", "smart_planner"]
    
    messages = []
    for i in range(count):
        agent_id = agent_ids[i % len(agent_ids)]
        messages.append(create_test_message(
            f"msg_{i}",
            f"Generated test message {i}",
            agent_id,
            stage
        ))
    
    return messages


# Cleanup utilities
def cleanup_test_sessions(workflow_orchestrator, session_ids: List[str]):
    """Clean up test sessions after tests"""
    for session_id in session_ids:
        if hasattr(workflow_orchestrator, '_sessions'):
            workflow_orchestrator._sessions.pop(session_id, None)


def reset_mock_services(*mock_services):
    """Reset mock services to initial state"""
    for mock_service in mock_services:
        if hasattr(mock_service, 'reset_mock'):
            mock_service.reset_mock()
        else:
            mock_service.reset_mock()
