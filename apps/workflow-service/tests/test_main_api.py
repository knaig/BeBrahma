import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime
from typing import Dict, Any

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


class TestMainAPI:
    """Test suite for FastAPI endpoints in workflow service"""

    @pytest.fixture
    def mock_crew_service(self):
        """Mock CrewAI service with configurable responses"""
        mock = Mock()
        mock.execute_single_step = AsyncMock()
        return mock

    @pytest.fixture
    def mock_workflow_orchestrator(self, mock_crew_service):
        """Mock WorkflowOrchestrator with configurable responses"""
        mock = Mock()
        mock.start_workflow = AsyncMock()
        mock.get_next_message = AsyncMock()
        mock.process_decision = AsyncMock()
        mock.get_workflow_status = AsyncMock()
        return mock

    @pytest.fixture
    def test_client(self):
        """Synchronous test client for FastAPI app"""
        return TestClient(app)


    @pytest.fixture
    def test_session_id(self):
        """Generate unique session ID for tests"""
        return f"test_session_{datetime.now().timestamp()}"

    @pytest.fixture
    def sample_workflow_response(self, test_session_id):
        """Sample workflow response for testing"""
        return WorkflowState(
            session_id=test_session_id,
            current_stage=WorkflowStage.PROBLEM_CAPTURE,
            stage_status=StageStatus.IN_PROGRESS,
            messages=[
                Message(
                    id="welcome_msg",
                    content="Welcome to the workflow!",
                    agent_id="system",
                    agent_name="System",
                    agent_title="System",
                    timestamp=datetime.now(),
                    stage=WorkflowStage.PROBLEM_CAPTURE
                )
            ],
            stage_progress={
                WorkflowStage.PROBLEM_CAPTURE: {
                    "status": StageStatus.IN_PROGRESS,
                    "message_count": 1,
                    "completed": False
                }
            },
            pending_decision=False,
            decision_options=[],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

    @pytest.mark.asyncio
    async def test_start_workflow_endpoint_valid_payload(self, async_client, mock_workflow_orchestrator, test_session_id, sample_workflow_response):
        """Test POST /api/workflow/start with valid payload"""
        # Arrange
        mock_workflow_orchestrator.start_workflow.return_value = sample_workflow_response
        
        with patch('src.main.workflow_orchestrator', mock_workflow_orchestrator):
            payload = {
                "session_id": test_session_id,
                "workflow_name": "test_workflow",
                "initial_context": {"domain": "test", "complexity": "medium"}
            }
            
            # Act
            response = await async_client.post("/api/workflow/start", json=payload)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == test_session_id
            assert data["current_stage"] == "PROBLEM_CAPTURE"
            assert data["stage_status"] == "IN_PROGRESS"
            assert len(data["messages"]) == 1
            assert data["messages"][0]["content"].startswith("Welcome to the")
            
            mock_workflow_orchestrator.start_workflow.assert_called_once_with(
                session_id=test_session_id,
                workflow_name="test_workflow",
                initial_context={"domain": "test", "complexity": "medium"}
            )

    @pytest.mark.asyncio
    async def test_start_workflow_endpoint_invalid_payload(self, async_client, mock_workflow_orchestrator):
        """Test POST /api/workflow/start with invalid payload"""
        # Arrange
        with patch('src.main.workflow_orchestrator', mock_workflow_orchestrator):
            invalid_payload = {
                "session_id": "",  # Invalid empty session ID
                "workflow_name": "test_workflow",
                "initial_context": {}
            }
            
            # Act
            response = await async_client.post("/api/workflow/start", json=invalid_payload)
            
            # Assert
            assert response.status_code == 422  # Validation error
            data = response.json()
            assert "detail" in data

    @pytest.mark.asyncio
    async def test_start_workflow_endpoint_missing_fields(self, async_client, mock_workflow_orchestrator):
        """Test POST /api/workflow/start with missing required fields"""
        # Arrange
        with patch('src.main.workflow_orchestrator', mock_workflow_orchestrator):
            incomplete_payload = {
                "workflow_name": "test_workflow"
                # Missing session_id and initial_context
            }
            
            # Act
            response = await async_client.post("/api/workflow/start", json=incomplete_payload)
            
            # Assert
            assert response.status_code == 422  # Validation error
            data = response.json()
            assert "detail" in data

    @pytest.mark.asyncio
    async def test_next_step_endpoint_valid_request(self, async_client, mock_workflow_orchestrator, test_session_id, sample_workflow_response):
        """Test POST /api/workflow/next for step progression"""
        # Arrange
        mock_workflow_orchestrator.get_next_message.return_value = sample_workflow_response
        
        with patch('src.main.workflow_orchestrator', mock_workflow_orchestrator):
            payload = {"session_id": test_session_id}
            
            # Act
            response = await async_client.post("/api/workflow/next", json=payload)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == test_session_id
            
            mock_workflow_orchestrator.get_next_message.assert_called_once_with(test_session_id)

    @pytest.mark.asyncio
    async def test_next_step_endpoint_session_not_found(self, async_client, mock_workflow_orchestrator):
        """Test POST /api/workflow/next with non-existent session"""
        # Arrange
        mock_workflow_orchestrator.get_next_message.side_effect = ValueError("Session not found")
        
        with patch('src.main.workflow_orchestrator', mock_workflow_orchestrator):
            payload = {"session_id": "non_existent_session"}
            
            # Act
            response = await async_client.post("/api/workflow/next", json=payload)
            
            # Assert
            assert response.status_code == 404
            data = response.json()
            assert "detail" in data
            assert "Session" in data["detail"] or "not found" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_decision_endpoint_valid_request(self, async_client, mock_workflow_orchestrator, test_session_id, sample_workflow_response):
        """Test POST /api/workflow/decision for decision processing"""
        # Arrange
        mock_workflow_orchestrator.process_decision.return_value = sample_workflow_response
        
        with patch('src.main.workflow_orchestrator', mock_workflow_orchestrator):
            payload = {
                "session_id": test_session_id,
                "decision": "APPROVE",
                "feedback": "Approved for next stage"
            }
            
            # Act
            response = await async_client.post("/api/workflow/decision", json=payload)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == test_session_id
            
            mock_workflow_orchestrator.process_decision.assert_called_once_with(
                session_id=test_session_id,
                decision=DecisionType.APPROVE,
                feedback="Approved for next stage"
            )

    @pytest.mark.asyncio
    async def test_decision_endpoint_invalid_decision(self, async_client, mock_workflow_orchestrator, test_session_id):
        """Test POST /api/workflow/decision with invalid decision type"""
        # Arrange
        with patch('src.main.workflow_orchestrator', mock_workflow_orchestrator):
            invalid_payload = {
                "session_id": test_session_id,
                "decision": "INVALID_DECISION",
                "feedback": "Test feedback"
            }
            
            # Act
            response = await async_client.post("/api/workflow/decision", json=invalid_payload)
            
            # Assert
            assert response.status_code == 422  # Validation error
            data = response.json()
            assert "detail" in data

    @pytest.mark.asyncio
    async def test_decision_endpoint_no_decision_pending(self, async_client, mock_workflow_orchestrator, test_session_id):
        """Test POST /api/workflow/decision when no decision is pending"""
        # Arrange
        mock_workflow_orchestrator.process_decision.side_effect = ValueError("No decision pending")
        
        with patch('src.main.workflow_orchestrator', mock_workflow_orchestrator):
            payload = {
                "session_id": test_session_id,
                "decision": "APPROVE",
                "feedback": "Test feedback"
            }
            
            # Act
            response = await async_client.post("/api/workflow/decision", json=payload)
            
            # Assert
            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            assert "decision" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_workflow_status_endpoint_valid_session(self, async_client, mock_workflow_orchestrator, test_session_id, sample_workflow_response):
        """Test GET /api/workflow/status/{session_id} for status retrieval"""
        # Arrange
        mock_workflow_orchestrator.get_workflow_status.return_value = sample_workflow_response
        
        with patch('src.main.workflow_orchestrator', mock_workflow_orchestrator):
            # Act
            response = await async_client.get(f"/api/workflow/status/{test_session_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == test_session_id
            assert data["current_stage"] == "PROBLEM_CAPTURE"
            assert data["stage_status"] == "IN_PROGRESS"
            
            mock_workflow_orchestrator.get_workflow_status.assert_called_once_with(test_session_id)

    @pytest.mark.asyncio
    async def test_workflow_status_endpoint_session_not_found(self, async_client, mock_workflow_orchestrator):
        """Test GET /api/workflow/status/{session_id} with non-existent session"""
        # Arrange
        mock_workflow_orchestrator.get_workflow_status.side_effect = ValueError("Session not found")
        
        with patch('src.main.workflow_orchestrator', mock_workflow_orchestrator):
            # Act
            response = await async_client.get("/api/workflow/status/non_existent_session")
            
            # Assert
            assert response.status_code == 404
            data = response.json()
            assert "detail" in data
            assert "Session" in data["detail"] or "not found" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_legacy_crew_endpoints_compatibility(self, async_client, mock_workflow_orchestrator, test_session_id, sample_workflow_response):
        """Test legacy /api/crew/* endpoints still work"""
        # Arrange
        mock_workflow_orchestrator.start_workflow.return_value = sample_workflow_response
        
        with patch('src.main.workflow_orchestrator', mock_workflow_orchestrator):
            payload = {
                "session_id": test_session_id,
                "workflow_name": "test_workflow",
                "initial_context": {"domain": "test"}
            }
            
            # Act - Test legacy endpoint
            response = await async_client.post("/api/crew/start", json=payload)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == test_session_id
            
            # Verify it calls the same orchestrator method
            mock_workflow_orchestrator.start_workflow.assert_called_once_with(
                session_id=test_session_id,
                workflow_name="test_workflow",
                initial_context={"domain": "test"}
            )

    @pytest.mark.asyncio
    async def test_crewai_service_integration_success(self, async_client, mock_crew_service, test_session_id):
        """Test CrewAI service integration success scenario"""
        # Arrange
        mock_crew_service.execute_single_step.return_value = {
            "message": "Test CrewAI message",
            "agent_id": "business_analyst",
            "agent_name": "Business Analyst",
            "agent_title": "Business Analyst"
        }
        
        with patch('src.main.crew_service', mock_crew_service):
            # Start workflow first
            start_payload = {
                "session_id": test_session_id,
                "workflow_name": "test_workflow",
                "initial_context": {}
            }
            start_response = await async_client.post("/api/workflow/start", json=start_payload)
            assert start_response.status_code == 200
            
            # Then get next message
            next_payload = {"session_id": test_session_id}
            next_response = await async_client.post("/api/workflow/next", json=next_payload)
            
            # Assert
            assert next_response.status_code == 200
            data = next_response.json()
            assert len(data["messages"]) == 2  # Welcome + CrewAI message
            assert data["messages"][-1]["content"] == "Test CrewAI message"
            assert data["messages"][-1]["agent_id"] == "business_analyst"

    @pytest.mark.asyncio
    async def test_crewai_service_unavailable(self, async_client, mock_crew_service, test_session_id):
        """Test CrewAI service unavailable scenario"""
        # Arrange
        mock_crew_service.execute_single_step.side_effect = Exception("CrewAI service error")
        
        with patch('src.main.crew_service', mock_crew_service):
            # Start workflow first
            start_payload = {
                "session_id": test_session_id,
                "workflow_name": "test_workflow",
                "initial_context": {}
            }
            start_response = await async_client.post("/api/workflow/start", json=start_payload)
            assert start_response.status_code == 200
            
            # Then try to get next message
            next_payload = {"session_id": test_session_id}
            next_response = await async_client.post("/api/workflow/next", json=next_payload)
            
            # Assert
            assert next_response.status_code == 500
            data = next_response.json()
            assert "detail" in data
            assert "CrewAI service error" in data["detail"]

    @pytest.mark.asyncio
    async def test_concurrent_api_calls_same_session(self, async_client, mock_workflow_orchestrator, test_session_id, sample_workflow_response):
        """Test concurrent API calls to same session"""
        # Arrange
        mock_workflow_orchestrator.get_workflow_status.return_value = sample_workflow_response
        
        with patch('src.main.workflow_orchestrator', mock_workflow_orchestrator):
            # Act - Make concurrent calls
            tasks = [
                async_client.get(f"/api/workflow/status/{test_session_id}"),
                async_client.get(f"/api/workflow/status/{test_session_id}"),
                async_client.get(f"/api/workflow/status/{test_session_id}")
            ]
            
            responses = await asyncio.gather(*tasks)
            
            # Assert
            for response in responses:
                assert response.status_code == 200
                data = response.json()
                assert data["session_id"] == test_session_id
            
            # Verify orchestrator was called multiple times
            assert mock_workflow_orchestrator.get_workflow_status.call_count == 3

    @pytest.mark.asyncio
    async def test_malformed_json_payloads(self, async_client):
        """Test malformed JSON payloads"""
        # Arrange
        malformed_payloads = [
            '{"invalid": json}',  # Invalid JSON
            '{"session_id": "test"',  # Incomplete JSON
            'not json at all',  # Plain text
            b'invalid bytes'  # Bytes instead of JSON
        ]
        
        # Act & Assert
        for payload in malformed_payloads:
            response = await async_client.post("/api/workflow/start", content=payload)
            assert response.status_code == 422, f"Expected 422 for payload: {payload}"

    @pytest.mark.asyncio
    async def test_service_initialization_failures(self, async_client):
        """Test service initialization failures"""
        # Arrange
        with patch('src.main.workflow_orchestrator', None):  # Simulate failed initialization
            payload = {
                "session_id": "test_session",
                "workflow_name": "test_workflow",
                "initial_context": {}
            }
            
            # Act
            response = await async_client.post("/api/workflow/start", json=payload)
            
            # Assert
            assert response.status_code == 500
            data = response.json()
            assert "detail" in data

    @pytest.mark.asyncio
    async def test_request_models_validation(self, async_client):
        """Test request models validation"""
        # Arrange
        invalid_payloads = [
            {"session_id": None, "workflow_name": "test"},  # None session_id
            {"session_id": "test", "workflow_name": None},  # None workflow_name
            {"session_id": "test", "workflow_name": "", "initial_context": None},  # Empty workflow_name, None context
            {"session_id": "test", "workflow_name": "test", "initial_context": "not_dict"}  # Context not dict
        ]
        
        # Act & Assert
        for payload in invalid_payloads:
            response = await async_client.post("/api/workflow/start", json=payload)
            assert response.status_code == 422, f"Expected 422 for payload: {payload}"

    @pytest.mark.asyncio
    async def test_response_format_consistency(self, async_client, mock_workflow_orchestrator, test_session_id, sample_workflow_response):
        """Test response format consistency across endpoints"""
        # Arrange
        mock_workflow_orchestrator.start_workflow.return_value = sample_workflow_response
        mock_workflow_orchestrator.get_next_message.return_value = sample_workflow_response
        mock_workflow_orchestrator.get_workflow_status.return_value = sample_workflow_response
        
        with patch('src.main.workflow_orchestrator', mock_workflow_orchestrator):
            # Test all endpoints return consistent format
            endpoints = [
                ("/api/workflow/start", {"session_id": test_session_id, "workflow_name": "test", "initial_context": {}}),
                ("/api/workflow/next", {"session_id": test_session_id}),
                ("/api/workflow/status/" + test_session_id, None)
            ]
            
            for endpoint, payload in endpoints:
                if payload:
                    response = await async_client.post(endpoint, json=payload)
                else:
                    response = await async_client.get(endpoint)
                
                assert response.status_code == 200
                data = response.json()
                
                # Verify consistent response structure
                required_fields = ["session_id", "current_stage", "stage_status", "messages", "stage_progress"]
                for field in required_fields:
                    assert field in data, f"Missing field {field} in {endpoint} response"

    @pytest.mark.asyncio
    async def test_error_response_formatting(self, async_client, mock_workflow_orchestrator):
        """Test error response formatting and status code mapping"""
        # Arrange
        error_scenarios = [
            (ValueError("Session not found"), 404),
            (ValueError("No decision pending"), 400),
            (Exception("Internal service error"), 500),
            (ConnectionError("Service unavailable"), 503)
        ]
        
        for error, expected_status in error_scenarios:
            mock_workflow_orchestrator.get_workflow_status.side_effect = error
            
            with patch('src.main.workflow_orchestrator', mock_workflow_orchestrator):
                # Act
                response = await async_client.get("/api/workflow/status/test_session")
                
                # Assert
                assert response.status_code == expected_status
                data = response.json()
                assert "detail" in data
                # Just verify error details are present, not exact message
                assert len(data["detail"]) > 0
