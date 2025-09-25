import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime
from typing import Dict, Any

from src.langgraph_workflow import WorkflowOrchestrator
from src.workflow_states import (
    WorkflowState, 
    WorkflowStage, 
    StageStatus, 
    Message, 
    DecisionType,
    STAGE_DEFINITIONS
)


class TestWorkflowOrchestrator:
    """Test suite for WorkflowOrchestrator class"""

    @pytest.fixture
    def mock_crew_service(self):
        """Mock CrewAI service with configurable responses"""
        mock = Mock()
        mock.execute_single_step = AsyncMock()
        return mock

    @pytest.fixture
    def workflow_orchestrator(self, mock_crew_service):
        """WorkflowOrchestrator instance with mocked dependencies"""
        return WorkflowOrchestrator(crew_service=mock_crew_service)

    @pytest.fixture
    def test_session_id(self):
        """Generate unique session ID for tests"""
        return f"test_session_{datetime.now().timestamp()}"

    @pytest.fixture
    def sample_messages(self):
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
    def sample_workflow_state(self, test_session_id, sample_messages):
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

    @pytest.mark.asyncio
    async def test_start_workflow_creates_initial_state(self, workflow_orchestrator, test_session_id):
        """Test start_workflow() creates proper initial state with welcome message"""
        # Arrange
        workflow_name = "test_workflow"
        initial_context = {"domain": "test", "complexity": "medium"}

        # Act
        result = await workflow_orchestrator.start_workflow(
            session_id=test_session_id,
            workflow_name=workflow_name,
            initial_context=initial_context
        )

        # Assert
        assert result.session_id == test_session_id
        assert result.current_stage == WorkflowStage.PROBLEM_CAPTURE
        assert result.stage_status == StageStatus.IN_PROGRESS
        assert len(result.messages) == 1  # Welcome message
        assert result.messages[0].content.startswith("Welcome to the")
        assert result.stage_progress[WorkflowStage.PROBLEM_CAPTURE]["status"] == StageStatus.IN_PROGRESS
        assert result.pending_decision is False

    @pytest.mark.asyncio
    async def test_start_workflow_session_storage(self, workflow_orchestrator, test_session_id):
        """Test session storage and state initialization"""
        # Arrange
        workflow_name = "test_workflow"
        initial_context = {"domain": "test"}

        # Act
        result = await workflow_orchestrator.start_workflow(
            session_id=test_session_id,
            workflow_name=workflow_name,
            initial_context=initial_context
        )

        # Assert
        stored_state = await workflow_orchestrator.get_workflow_status(test_session_id)
        assert stored_state is not None
        assert stored_state.session_id == test_session_id
        assert stored_state.workflow_name == workflow_name
        assert stored_state.initial_context == initial_context

    @pytest.mark.asyncio
    async def test_start_workflow_invalid_parameters(self, workflow_orchestrator):
        """Test invalid session parameters handling"""
        # Arrange
        invalid_session_id = ""
        workflow_name = "test_workflow"
        initial_context = {}

        # Act & Assert
        with pytest.raises(ValueError, match="Session ID cannot be empty"):
            await workflow_orchestrator.start_workflow(
                session_id=invalid_session_id,
                workflow_name=workflow_name,
                initial_context=initial_context
            )

    @pytest.mark.asyncio
    async def test_get_next_message_advances_workflow(self, workflow_orchestrator, test_session_id, mock_crew_service):
        """Test get_next_message() advances workflow step-by-step"""
        # Arrange
        mock_crew_service.execute_single_step.return_value = {
            "message": "Test agent message",
            "agent_id": "business_analyst",
            "agent_name": "Business Analyst",
            "agent_title": "Business Analyst"
        }

        # Start workflow first
        await workflow_orchestrator.start_workflow(
            session_id=test_session_id,
            workflow_name="test_workflow",
            initial_context={}
        )

        # Act
        result = await workflow_orchestrator.get_next_message(test_session_id)

        # Assert
        assert result is not None
        assert len(result.messages) == 2  # Welcome + agent message
        assert result.messages[-1].content == "Test agent message"
        assert result.messages[-1].agent_id == "business_analyst"
        assert mock_crew_service.execute_single_step.called

    @pytest.mark.asyncio
    async def test_get_next_message_stage_completion_detection(self, workflow_orchestrator, test_session_id, mock_crew_service):
        """Test stage completion detection and decision point setup"""
        # Arrange
        # Mock CrewAI to return enough messages to complete PROBLEM_CAPTURE stage
        mock_crew_service.execute_single_step.return_value = {
            "message": "Stage completion message",
            "agent_id": "business_analyst",
            "agent_name": "Business Analyst",
            "agent_title": "Business Analyst"
        }

        # Start workflow and add enough messages to complete stage
        await workflow_orchestrator.start_workflow(
            session_id=test_session_id,
            workflow_name="test_workflow",
            initial_context={}
        )

        # Add messages to reach stage completion threshold
        session = await workflow_orchestrator.get_workflow_status(test_session_id)
        for i in range(3):  # PROBLEM_CAPTURE requires 3-5 messages
            session.messages.append(Message(
                id=f"msg_{i}",
                content=f"Message {i}",
                agent_id="business_analyst",
                agent_name="Business Analyst",
                agent_title="Business Analyst",
                timestamp=datetime.now(),
                stage=WorkflowStage.PROBLEM_CAPTURE
            ))

        # Act
        result = await workflow_orchestrator.get_next_message(test_session_id)

        # Assert
        assert result.pending_decision is True
        assert len(result.decision_options) > 0
        assert "approve" in [opt.lower() for opt in result.decision_options]

    @pytest.mark.asyncio
    async def test_stage_advancement_through_decision(self, workflow_orchestrator, test_session_id):
        """Test stage advancement through public decision processing"""
        # Arrange
        await workflow_orchestrator.start_workflow(
            session_id=test_session_id,
            workflow_name="test_workflow",
            initial_context={}
        )

        # Act - Use public decision processing to advance stage
        await workflow_orchestrator.process_decision(
            session_id=test_session_id,
            decision=DecisionType.APPROVE,
            feedback="Stage completed successfully"
        )

        # Assert
        session = await workflow_orchestrator.get_workflow_status(test_session_id)
        assert session.current_stage == WorkflowStage.PROBLEM_CLARIFICATION
        assert session.stage_progress[WorkflowStage.PROBLEM_CAPTURE]["status"] == StageStatus.COMPLETED
        assert session.stage_progress[WorkflowStage.PROBLEM_CLARIFICATION]["status"] == StageStatus.IN_PROGRESS

    @pytest.mark.asyncio
    async def test_workflow_completion_final_stage(self, workflow_orchestrator, test_session_id):
        """Test workflow completion at final stage"""
        # Arrange
        await workflow_orchestrator.start_workflow(
            session_id=test_session_id,
            workflow_name="test_workflow",
            initial_context={}
        )

        # Progress through all stages to reach the final stage
        stages = [
            WorkflowStage.PROBLEM_CAPTURE,
            WorkflowStage.PROBLEM_CLARIFICATION,
            WorkflowStage.SOLUTION_DESIGN,
            WorkflowStage.IMPLEMENTATION_PLAN,
            WorkflowStage.TESTING_STRATEGY,
            WorkflowStage.DEPLOYMENT_PLAN,
            WorkflowStage.MONITORING_SETUP
        ]
        
        # Advance through all stages using public decision processing
        for i in range(len(stages) - 1):
            await workflow_orchestrator.process_decision(
                session_id=test_session_id,
                decision=DecisionType.APPROVE,
                feedback=f"Stage {stages[i].value} completed"
            )

        # Act - Try to advance beyond final stage using decision processing
        session = await workflow_orchestrator.get_workflow_status(test_session_id)
        final_stage = session.current_stage
        
        # Assert - Should remain at final stage
        assert final_stage == WorkflowStage.MONITORING_SETUP
        assert session.stage_progress[WorkflowStage.MONITORING_SETUP]["status"] == StageStatus.IN_PROGRESS

    @pytest.mark.asyncio
    async def test_process_decision_approve(self, workflow_orchestrator, test_session_id):
        """Test process_decision() with approve decision"""
        # Arrange
        await workflow_orchestrator.start_workflow(
            session_id=test_session_id,
            workflow_name="test_workflow",
            initial_context={}
        )

        # Set up decision point
        session = await workflow_orchestrator.get_workflow_status(test_session_id)
        session.pending_decision = True
        session.decision_options = ["approve", "refine", "reject", "pause"]

        # Act
        result = await workflow_orchestrator.process_decision(
            session_id=test_session_id,
            decision=DecisionType.APPROVE,
            feedback="Approved for next stage"
        )

        # Assert
        assert result.pending_decision is False
        assert result.current_stage == WorkflowStage.PROBLEM_CLARIFICATION
        assert len(result.messages) == 2  # Welcome + decision message
        assert result.messages[-1].content.startswith("Decision: APPROVE")

    @pytest.mark.asyncio
    async def test_process_decision_refine(self, workflow_orchestrator, test_session_id):
        """Test process_decision() with refine decision"""
        # Arrange
        await workflow_orchestrator.start_workflow(
            session_id=test_session_id,
            workflow_name="test_workflow",
            initial_context={}
        )

        # Set up decision point
        session = await workflow_orchestrator.get_workflow_status(test_session_id)
        session.pending_decision = True
        session.decision_options = ["approve", "refine", "reject", "pause"]

        # Act
        result = await workflow_orchestrator.process_decision(
            session_id=test_session_id,
            decision=DecisionType.REFINE,
            feedback="Need more details"
        )

        # Assert
        assert result.pending_decision is False
        assert result.current_stage == WorkflowStage.PROBLEM_CAPTURE  # Stay in same stage
        assert len(result.messages) == 2  # Welcome + decision message
        assert result.messages[-1].content.startswith("Decision: REFINE")

    @pytest.mark.asyncio
    async def test_process_decision_reject(self, workflow_orchestrator, test_session_id):
        """Test process_decision() with reject decision"""
        # Arrange
        await workflow_orchestrator.start_workflow(
            session_id=test_session_id,
            workflow_name="test_workflow",
            initial_context={}
        )

        # Set up decision point
        session = await workflow_orchestrator.get_workflow_status(test_session_id)
        session.pending_decision = True
        session.decision_options = ["approve", "refine", "reject", "pause"]

        # Act
        result = await workflow_orchestrator.process_decision(
            session_id=test_session_id,
            decision=DecisionType.REJECT,
            feedback="Rejected due to insufficient information"
        )

        # Assert
        assert result.pending_decision is False
        assert result.current_stage == WorkflowStage.PROBLEM_CAPTURE  # Stay in same stage
        assert len(result.messages) == 2  # Welcome + decision message
        assert result.messages[-1].content.startswith("Decision: REJECT")

    @pytest.mark.asyncio
    async def test_process_decision_pause(self, workflow_orchestrator, test_session_id):
        """Test process_decision() with pause decision"""
        # Arrange
        await workflow_orchestrator.start_workflow(
            session_id=test_session_id,
            workflow_name="test_workflow",
            initial_context={}
        )

        # Set up decision point
        session = await workflow_orchestrator.get_workflow_status(test_session_id)
        session.pending_decision = True
        session.decision_options = ["approve", "refine", "reject", "pause"]

        # Act
        result = await workflow_orchestrator.process_decision(
            session_id=test_session_id,
            decision=DecisionType.PAUSE,
            feedback="Paused for review"
        )

        # Assert
        assert result.pending_decision is False
        assert result.current_stage == WorkflowStage.PROBLEM_CAPTURE  # Stay in same stage
        assert len(result.messages) == 2  # Welcome + decision message
        assert result.messages[-1].content.startswith("Decision: PAUSE")

    @pytest.mark.asyncio
    async def test_process_decision_invalid_state(self, workflow_orchestrator, test_session_id):
        """Test decision processing when no decision is pending"""
        # Arrange
        await workflow_orchestrator.start_workflow(
            session_id=test_session_id,
            workflow_name="test_workflow",
            initial_context={}
        )

        # Act & Assert
        with pytest.raises(ValueError, match="No decision pending"):
            await workflow_orchestrator.process_decision(
                session_id=test_session_id,
                decision=DecisionType.APPROVE,
                feedback="Test feedback"
            )

    @pytest.mark.asyncio
    async def test_crewai_integration_single_step(self, workflow_orchestrator, test_session_id, mock_crew_service):
        """Test CrewAI integration with single-step execution"""
        # Arrange
        mock_crew_service.execute_single_step.return_value = {
            "message": "Test CrewAI message",
            "agent_id": "business_analyst",
            "agent_name": "Business Analyst",
            "agent_title": "Business Analyst"
        }

        await workflow_orchestrator.start_workflow(
            session_id=test_session_id,
            workflow_name="test_workflow",
            initial_context={}
        )

        # Act
        result = await workflow_orchestrator.get_next_message(test_session_id)

        # Assert
        assert mock_crew_service.execute_single_step.called
        mock_crew_service.execute_single_step.assert_called_once()
        assert result.messages[-1].content == "Test CrewAI message"
        assert result.messages[-1].agent_id == "business_analyst"

    @pytest.mark.asyncio
    async def test_crewai_service_failure_handling(self, workflow_orchestrator, test_session_id, mock_crew_service):
        """Test CrewAI service failures and error propagation"""
        # Arrange
        mock_crew_service.execute_single_step.side_effect = Exception("CrewAI service error")

        await workflow_orchestrator.start_workflow(
            session_id=test_session_id,
            workflow_name="test_workflow",
            initial_context={}
        )

        # Act & Assert
        with pytest.raises(Exception, match="CrewAI service error"):
            await workflow_orchestrator.get_next_message(test_session_id)

    @pytest.mark.asyncio
    async def test_multiple_concurrent_sessions(self, workflow_orchestrator, mock_crew_service):
        """Test multiple concurrent sessions with different IDs"""
        # Arrange
        session_ids = [f"session_{i}" for i in range(3)]
        mock_crew_service.execute_single_step.return_value = {
            "message": "Test message",
            "agent_id": "business_analyst",
            "agent_name": "Business Analyst",
            "agent_title": "Business Analyst"
        }

        # Act - Start multiple sessions
        for session_id in session_ids:
            await workflow_orchestrator.start_workflow(
                session_id=session_id,
                workflow_name="test_workflow",
                initial_context={}
            )

        # Assert - Check sessions using public methods
        for session_id in session_ids:
            session = await workflow_orchestrator.get_workflow_status(session_id)
            assert session.session_id == session_id
            assert session.current_stage == WorkflowStage.PROBLEM_CAPTURE

    @pytest.mark.asyncio
    async def test_session_isolation(self, workflow_orchestrator, mock_crew_service):
        """Test session isolation and state independence"""
        # Arrange
        session1_id = "session_1"
        session2_id = "session_2"
        mock_crew_service.execute_single_step.return_value = {
            "message": "Test message",
            "agent_id": "business_analyst",
            "agent_name": "Business Analyst",
            "agent_title": "Business Analyst"
        }

        # Start both sessions
        await workflow_orchestrator.start_workflow(
            session_id=session1_id,
            workflow_name="workflow_1",
            initial_context={"domain": "domain1"}
        )
        await workflow_orchestrator.start_workflow(
            session_id=session2_id,
            workflow_name="workflow_2",
            initial_context={"domain": "domain2"}
        )

        # Act - Progress session 1
        await workflow_orchestrator.get_next_message(session1_id)

        # Assert
        session1 = await workflow_orchestrator.get_workflow_status(session1_id)
        session2 = await workflow_orchestrator.get_workflow_status(session2_id)
        
        assert len(session1.messages) == 2  # Welcome + agent message
        assert len(session2.messages) == 1  # Only welcome message
        assert session1.initial_context["domain"] == "domain1"
        assert session2.initial_context["domain"] == "domain2"

    @pytest.mark.asyncio
    async def test_session_not_found_error(self, workflow_orchestrator):
        """Test session not found error handling"""
        # Arrange
        non_existent_session = "non_existent_session"

        # Act & Assert
        with pytest.raises(ValueError, match="Session not found"):
            await workflow_orchestrator.get_next_message(non_existent_session)

        with pytest.raises(ValueError, match="Session not found"):
            await workflow_orchestrator.process_decision(
                non_existent_session,
                DecisionType.APPROVE,
                "Test feedback"
            )

    @pytest.mark.asyncio
    async def test_session_state_persistence(self, workflow_orchestrator, test_session_id, mock_crew_service):
        """Test session state persistence across operations"""
        # Arrange
        mock_crew_service.execute_single_step.return_value = {
            "message": "Test message",
            "agent_id": "business_analyst",
            "agent_name": "Business Analyst",
            "agent_title": "Business Analyst"
        }

        # Start workflow
        await workflow_orchestrator.start_workflow(
            session_id=test_session_id,
            workflow_name="test_workflow",
            initial_context={}
        )

        # Act - Perform multiple operations
        await workflow_orchestrator.get_next_message(test_session_id)
        await workflow_orchestrator.get_next_message(test_session_id)

        # Assert
        session = await workflow_orchestrator.get_workflow_status(test_session_id)
        assert len(session.messages) == 3  # Welcome + 2 agent messages
        assert session.current_stage == WorkflowStage.PROBLEM_CAPTURE
        assert session.stage_progress[WorkflowStage.PROBLEM_CAPTURE]["message_count"] == 3

    @pytest.mark.asyncio
    async def test_workflow_status_retrieval(self, workflow_orchestrator, test_session_id):
        """Test workflow status retrieval functionality"""
        # Arrange
        await workflow_orchestrator.start_workflow(
            session_id=test_session_id,
            workflow_name="test_workflow",
            initial_context={}
        )

        # Act
        status = await workflow_orchestrator.get_workflow_status(test_session_id)

        # Assert
        assert status.session_id == test_session_id
        assert status.current_stage == WorkflowStage.PROBLEM_CAPTURE
        assert status.stage_status == StageStatus.IN_PROGRESS
        assert status.pending_decision is False
        assert len(status.messages) == 1  # Welcome message

    @pytest.mark.asyncio
    async def test_workflow_status_not_found(self, workflow_orchestrator):
        """Test workflow status retrieval for non-existent session"""
        # Arrange
        non_existent_session = "non_existent_session"

        # Act & Assert
        with pytest.raises(ValueError, match="Session not found"):
            await workflow_orchestrator.get_workflow_status(non_existent_session)
