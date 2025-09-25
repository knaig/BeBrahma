import pytest
from datetime import datetime
from typing import Dict, Any

from src.workflow_states import (
    WorkflowState,
    WorkflowStage,
    StageStatus,
    Message,
    DecisionType,
    StageDefinition,
    STAGE_DEFINITIONS,
    get_next_stage,
    validate_stage_completion
)


class TestWorkflowStates:
    """Test suite for workflow state management and validation"""

    @pytest.fixture
    def sample_message(self):
        """Sample message for testing"""
        return Message(
            id="msg_1",
            content="Test message content",
            agent_id="business_analyst",
            agent_name="Business Analyst",
            agent_title="Business Analyst",
            timestamp=datetime.now(),
            stage=WorkflowStage.PROBLEM_CAPTURE
        )

    @pytest.fixture
    def sample_workflow_state(self):
        """Sample workflow state for testing"""
        return WorkflowState(
            session_id="test_session",
            current_stage=WorkflowStage.PROBLEM_CAPTURE,
            stage_status=StageStatus.IN_PROGRESS,
            messages=[],
            stage_progress={},
            pending_decision=False,
            decision_options=[],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

    def test_stage_definitions_contains_all_required_stages(self):
        """Test STAGE_DEFINITIONS contains all required workflow stages"""
        # Arrange & Act
        stage_names = list(STAGE_DEFINITIONS.keys())
        
        # Assert
        expected_stages = [
            WorkflowStage.PROBLEM_CAPTURE,
            WorkflowStage.PROBLEM_CLARIFICATION,
            WorkflowStage.SOLUTION_DESIGN,
            WorkflowStage.IMPLEMENTATION_PLAN,
            WorkflowStage.TESTING_STRATEGY,
            WorkflowStage.DEPLOYMENT_PLAN,
            WorkflowStage.MONITORING_SETUP
        ]
        
        for stage in expected_stages:
            assert stage in stage_names, f"Stage {stage} not found in STAGE_DEFINITIONS"

    def test_stage_definitions_have_proper_structure(self):
        """Test each stage has proper title, description, objectives, and required agents"""
        # Arrange & Act
        for stage, definition in STAGE_DEFINITIONS.items():
            # Assert
            assert isinstance(definition, StageDefinition), f"Stage {stage} is not StageDefinition"
            assert definition.title, f"Stage {stage} missing title"
            assert definition.description, f"Stage {stage} missing description"
            assert definition.objectives, f"Stage {stage} missing objectives"
            assert isinstance(definition.objectives, list), f"Stage {stage} objectives not a list"
            assert definition.required_agents, f"Stage {stage} missing required agents"
            assert isinstance(definition.required_agents, list), f"Stage {stage} required agents not a list"
            assert definition.min_messages > 0, f"Stage {stage} min_messages must be positive"
            assert definition.max_messages > definition.min_messages, f"Stage {stage} max_messages must be greater than min_messages"

    def test_stage_completion_criteria(self):
        """Test stage completion criteria (min/max messages, decision requirements)"""
        # Arrange & Act
        for stage, definition in STAGE_DEFINITIONS.items():
            # Assert
            assert definition.min_messages <= definition.max_messages, f"Stage {stage} min_messages > max_messages"
            assert definition.requires_decision in [True, False], f"Stage {stage} requires_decision must be boolean"
            
            # Check that stages with decisions have proper completion criteria
            if definition.requires_decision:
                assert definition.max_messages >= 3, f"Stage {stage} with decision should have reasonable max_messages"

    def test_get_next_stage_returns_correct_next_stage(self):
        """Test get_next_stage() returns correct next stage for each workflow stage"""
        # Arrange
        expected_next_stages = {
            WorkflowStage.PROBLEM_CAPTURE: WorkflowStage.PROBLEM_CLARIFICATION,
            WorkflowStage.PROBLEM_CLARIFICATION: WorkflowStage.SOLUTION_DESIGN,
            WorkflowStage.SOLUTION_DESIGN: WorkflowStage.IMPLEMENTATION_PLAN,
            WorkflowStage.IMPLEMENTATION_PLAN: WorkflowStage.TESTING_STRATEGY,
            WorkflowStage.TESTING_STRATEGY: WorkflowStage.DEPLOYMENT_PLAN,
            WorkflowStage.DEPLOYMENT_PLAN: WorkflowStage.MONITORING_SETUP,
            WorkflowStage.MONITORING_SETUP: None  # Final stage
        }
        
        # Act & Assert
        for current_stage, expected_next in expected_next_stages.items():
            result = get_next_stage(current_stage)
            assert result == expected_next, f"Expected {expected_next} for {current_stage}, got {result}"

    def test_get_next_stage_final_stage_returns_none(self):
        """Test final stage returns None for next stage"""
        # Arrange
        final_stage = WorkflowStage.MONITORING_SETUP
        
        # Act
        result = get_next_stage(final_stage)
        
        # Assert
        assert result is None, f"Final stage should return None, got {result}"

    def test_get_next_stage_invalid_stage_handling(self):
        """Test invalid stage handling"""
        # Arrange
        invalid_stage = "INVALID_STAGE"
        
        # Act & Assert
        with pytest.raises(ValueError, match="Invalid workflow stage"):
            get_next_stage(invalid_stage)

    def test_validate_stage_completion_with_various_message_counts(self):
        """Test validate_stage_completion() with various message counts"""
        # Arrange
        stage = WorkflowStage.PROBLEM_CAPTURE
        definition = STAGE_DEFINITIONS[stage]
        
        # Test with insufficient messages
        messages = [Message(
            id=f"msg_{i}",
            content=f"Message {i}",
            agent_id="business_analyst",
            agent_name="Business Analyst",
            agent_title="Business Analyst",
            timestamp=datetime.now(),
            stage=stage
        ) for i in range(definition.min_messages - 1)]
        
        # Act
        result = validate_stage_completion(stage, messages)
        
        # Assert
        assert not result["completed"], "Stage should not be completed with insufficient messages"
        assert result["message_count"] == len(messages)
        assert result["status"] == StageStatus.IN_PROGRESS

    def test_validate_stage_completion_with_sufficient_messages(self):
        """Test stage completion with sufficient messages"""
        # Arrange
        stage = WorkflowStage.PROBLEM_CAPTURE
        definition = STAGE_DEFINITIONS[stage]
        
        messages = [Message(
            id=f"msg_{i}",
            content=f"Message {i}",
            agent_id="business_analyst",
            agent_name="Business Analyst",
            agent_title="Business Analyst",
            timestamp=datetime.now(),
            stage=stage
        ) for i in range(definition.min_messages)]
        
        # Act
        result = validate_stage_completion(stage, messages)
        
        # Assert
        assert result["completed"], "Stage should be completed with sufficient messages"
        assert result["message_count"] == len(messages)
        assert result["status"] == StageStatus.COMPLETED

    def test_validate_stage_completion_with_max_messages(self):
        """Test stage completion at maximum message count"""
        # Arrange
        stage = WorkflowStage.PROBLEM_CAPTURE
        definition = STAGE_DEFINITIONS[stage]
        
        messages = [Message(
            id=f"msg_{i}",
            content=f"Message {i}",
            agent_id="business_analyst",
            agent_name="Business Analyst",
            agent_title="Business Analyst",
            timestamp=datetime.now(),
            stage=stage
        ) for i in range(definition.max_messages)]
        
        # Act
        result = validate_stage_completion(stage, messages)
        
        # Assert
        assert result["completed"], "Stage should be completed at maximum messages"
        assert result["message_count"] == len(messages)
        assert result["status"] == StageStatus.COMPLETED

    def test_validate_stage_completion_required_agent_participation(self):
        """Test required agent participation validation"""
        # Arrange
        stage = WorkflowStage.PROBLEM_CAPTURE
        definition = STAGE_DEFINITIONS[stage]
        
        # Create messages with only one required agent
        messages = [Message(
            id=f"msg_{i}",
            content=f"Message {i}",
            agent_id="business_analyst",
            agent_name="Business Analyst",
            agent_title="Business Analyst",
            timestamp=datetime.now(),
            stage=stage
        ) for i in range(definition.min_messages)]
        
        # Act
        result = validate_stage_completion(stage, messages)
        
        # Assert
        assert result["completed"], "Stage should be completed with required agent participation"
        assert "business_analyst" in [msg.agent_id for msg in messages]

    def test_validate_stage_completion_with_decision_requirements(self):
        """Test completion criteria for stages with decision requirements"""
        # Arrange
        stage = WorkflowStage.PROBLEM_CAPTURE
        definition = STAGE_DEFINITIONS[stage]
        
        # Create messages to reach completion threshold
        messages = [Message(
            id=f"msg_{i}",
            content=f"Message {i}",
            agent_id="business_analyst",
            agent_name="Business Analyst",
            agent_title="Business Analyst",
            timestamp=datetime.now(),
            stage=stage
        ) for i in range(definition.min_messages)]
        
        # Act
        result = validate_stage_completion(stage, messages)
        
        # Assert
        if definition.requires_decision:
            assert result["completed"], "Stage requiring decision should be completed with sufficient messages"
            assert result["status"] == StageStatus.COMPLETED

    def test_validate_stage_completion_error_messages(self):
        """Test error messages for incomplete stages"""
        # Arrange
        stage = WorkflowStage.PROBLEM_CAPTURE
        definition = STAGE_DEFINITIONS[stage]
        
        # Test with no messages
        empty_messages = []
        
        # Act
        result = validate_stage_completion(stage, empty_messages)
        
        # Assert
        assert not result["completed"], "Empty stage should not be completed"
        assert result["message_count"] == 0
        assert result["status"] == StageStatus.IN_PROGRESS

    def test_message_model_validation_required_fields(self):
        """Test Message model validation with required and optional fields"""
        # Arrange
        required_fields = {
            "id": "msg_1",
            "content": "Test message",
            "agent_id": "business_analyst",
            "agent_name": "Business Analyst",
            "agent_title": "Business Analyst",
            "timestamp": datetime.now(),
            "stage": WorkflowStage.PROBLEM_CAPTURE
        }
        
        # Act
        message = Message(**required_fields)
        
        # Assert
        assert message.id == required_fields["id"]
        assert message.content == required_fields["content"]
        assert message.agent_id == required_fields["agent_id"]
        assert message.agent_name == required_fields["agent_name"]
        assert message.agent_title == required_fields["agent_title"]
        assert message.timestamp == required_fields["timestamp"]
        assert message.stage == required_fields["stage"]

    def test_message_model_validation_optional_fields(self):
        """Test Message model with optional fields"""
        # Arrange
        required_fields = {
            "id": "msg_1",
            "content": "Test message",
            "agent_id": "business_analyst",
            "agent_name": "Business Analyst",
            "agent_title": "Business Analyst",
            "timestamp": datetime.now(),
            "stage": WorkflowStage.PROBLEM_CAPTURE
        }
        
        # Act
        message = Message(**required_fields)
        
        # Assert - Optional fields should have default values
        assert message.metadata == {}
        assert message.attachments == []

    def test_workflow_state_model_validation(self):
        """Test WorkflowState model with stage progress tracking"""
        # Arrange
        session_id = "test_session"
        current_stage = WorkflowStage.PROBLEM_CAPTURE
        messages = []
        stage_progress = {
            WorkflowStage.PROBLEM_CAPTURE: {
                "status": StageStatus.IN_PROGRESS,
                "message_count": 0,
                "completed": False
            }
        }
        
        # Act
        workflow_state = WorkflowState(
            session_id=session_id,
            current_stage=current_stage,
            stage_status=StageStatus.IN_PROGRESS,
            messages=messages,
            stage_progress=stage_progress,
            pending_decision=False,
            decision_options=[],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Assert
        assert workflow_state.session_id == session_id
        assert workflow_state.current_stage == current_stage
        assert workflow_state.stage_status == StageStatus.IN_PROGRESS
        assert workflow_state.messages == messages
        assert workflow_state.stage_progress == stage_progress
        assert workflow_state.pending_decision is False
        assert workflow_state.decision_options == []

    def test_stage_definition_model_validation(self):
        """Test StageDefinition model validation"""
        # Arrange
        stage_def = StageDefinition(
            title="Test Stage",
            description="Test stage description",
            objectives=["Objective 1", "Objective 2"],
            required_agents=["business_analyst"],
            min_messages=3,
            max_messages=5,
            requires_decision=True
        )
        
        # Act & Assert
        assert stage_def.title == "Test Stage"
        assert stage_def.description == "Test stage description"
        assert len(stage_def.objectives) == 2
        assert len(stage_def.required_agents) == 1
        assert stage_def.min_messages == 3
        assert stage_def.max_messages == 5
        assert stage_def.requires_decision is True

    def test_enum_values_validation(self):
        """Test enum values for WorkflowStage, StageStatus, and DecisionType"""
        # Arrange & Act
        workflow_stages = list(WorkflowStage)
        stage_statuses = list(StageStatus)
        decision_types = list(DecisionType)
        
        # Assert
        assert len(workflow_stages) == 7, "Should have 7 workflow stages"
        assert len(stage_statuses) == 3, "Should have 3 stage statuses"
        assert len(decision_types) == 4, "Should have 4 decision types"
        
        # Verify specific enum values
        assert WorkflowStage.PROBLEM_CAPTURE in workflow_stages
        assert WorkflowStage.MONITORING_SETUP in workflow_stages
        assert StageStatus.IN_PROGRESS in stage_statuses
        assert StageStatus.COMPLETED in stage_statuses
        assert StageStatus.PAUSED in stage_statuses
        assert DecisionType.APPROVE in decision_types
        assert DecisionType.REFINE in decision_types
        assert DecisionType.REJECT in decision_types
        assert DecisionType.PAUSE in decision_types

    def test_stage_validation_with_empty_message_lists(self):
        """Test stage validation with empty message lists"""
        # Arrange
        stage = WorkflowStage.PROBLEM_CAPTURE
        empty_messages = []
        
        # Act
        result = validate_stage_completion(stage, empty_messages)
        
        # Assert
        assert not result["completed"], "Empty stage should not be completed"
        assert result["message_count"] == 0
        assert result["status"] == StageStatus.IN_PROGRESS

    def test_stage_validation_with_messages_from_non_required_agents(self):
        """Test validation with messages from non-required agents"""
        # Arrange
        stage = WorkflowStage.PROBLEM_CAPTURE
        definition = STAGE_DEFINITIONS[stage]
        
        # Create messages with non-required agent
        messages = [Message(
            id=f"msg_{i}",
            content=f"Message {i}",
            agent_id="non_required_agent",
            agent_name="Non Required Agent",
            agent_title="Non Required Agent",
            timestamp=datetime.now(),
            stage=stage
        ) for i in range(definition.min_messages)]
        
        # Act
        result = validate_stage_completion(stage, messages)
        
        # Assert
        # Stage should still be completed if it has sufficient messages
        # Agent validation is more about ensuring required agents participate, not excluding others
        assert result["completed"], "Stage should be completed with sufficient messages regardless of agent type"

    def test_stage_progression_edge_cases(self):
        """Test stage progression edge cases"""
        # Arrange
        edge_case_stages = [
            WorkflowStage.PROBLEM_CAPTURE,  # First stage
            WorkflowStage.MONITORING_SETUP   # Last stage
        ]
        
        # Act & Assert
        first_stage_next = get_next_stage(WorkflowStage.PROBLEM_CAPTURE)
        last_stage_next = get_next_stage(WorkflowStage.MONITORING_SETUP)
        
        assert first_stage_next == WorkflowStage.PROBLEM_CLARIFICATION, "First stage should have next stage"
        assert last_stage_next is None, "Last stage should not have next stage"

    def test_stage_definition_immutability(self):
        """Test that stage definitions are immutable and consistent"""
        # Arrange
        stage = WorkflowStage.PROBLEM_CAPTURE
        original_definition = STAGE_DEFINITIONS[stage]
        
        # Act & Assert
        # Verify that the same stage always returns the same definition
        assert STAGE_DEFINITIONS[stage] is original_definition, "Stage definition should be consistent"
        
        # Verify that stage definitions cannot be modified accidentally
        with pytest.raises(AttributeError):
            original_definition.title = "Modified Title"
