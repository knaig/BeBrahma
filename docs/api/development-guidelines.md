# BeBrahma AI Development Guidelines

## 🎯 **Overview**
This document provides guidelines for developers contributing to the BeBrahma AI microservices architecture. It covers coding standards, architecture principles, testing requirements, and deployment practices.

---

## 🏗️ **Architecture Principles**

### **1. Microservices Design**
- **Single Responsibility**: Each service should have one clear purpose
- **Loose Coupling**: Services communicate via well-defined APIs
- **High Cohesion**: Related functionality should be grouped together
- **Independent Deployment**: Services can be deployed and scaled independently

### **2. API Design Standards**
- **RESTful Design**: Follow REST principles for HTTP APIs
- **Consistent Naming**: Use kebab-case for URLs, camelCase for JSON fields
- **Versioning**: Include version in API paths when breaking changes occur
- **Error Handling**: Use consistent error response formats
- **Documentation**: Maintain OpenAPI specifications for all endpoints

### **3. Data Flow Patterns**
- **Request-Response**: Use synchronous HTTP calls for immediate responses
- **Event-Driven**: Consider async patterns for long-running operations
- **State Management**: Use appropriate state management for workflow orchestration
- **Caching**: Implement caching strategies for frequently accessed data

---

## 📝 **Coding Standards**

### **1. General Principles**
- **Readability**: Write code that is easy to understand and maintain
- **Consistency**: Follow established patterns within each service
- **Error Handling**: Always handle errors gracefully with meaningful messages
- **Logging**: Use structured logging for debugging and monitoring
- **Security**: Follow security best practices for API endpoints

### **2. Language-Specific Standards**

#### **Python (CrewAI & Workflow Services)**
```python
# Use type hints
def process_workflow(session_id: str, task: str) -> Dict[str, Any]:
    """Process workflow with proper documentation."""
    pass

# Use dataclasses or Pydantic models
@dataclass
class WorkflowRequest:
    session_id: str
    task: str
    context: Optional[Dict[str, Any]] = None

# Use async/await for I/O operations
async def call_external_service(url: str) -> Dict[str, Any]:
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

# Use proper exception handling
try:
    result = await process_request(request)
except ValidationError as e:
    logger.error(f"Validation error: {e}")
    raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

#### **TypeScript/JavaScript (API Gateway & Frontend)**
```typescript
// Use TypeScript interfaces
interface WorkflowRequest {
  sessionId: string;
  task: string;
  context?: Record<string, any>;
}

// Use async/await consistently
async function startWorkflow(request: WorkflowRequest): Promise<WorkflowResponse> {
  try {
    const response = await fetch('/api/chat/crew/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    logger.error('Failed to start workflow:', error);
    throw error;
  }
}

// Use proper error handling
class BeBrahmaError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'BeBrahmaError';
  }
}
```

### **3. File Organization**
```
service-name/
├── src/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── models/              # Data models and schemas
│   ├── services/            # Business logic
│   ├── api/                 # API endpoints
│   └── utils/               # Utility functions
├── tests/                   # Test files
├── requirements.txt          # Python dependencies
└── README.md                # Service documentation
```

---

## 🧪 **Testing Requirements**

### **1. Test Coverage**
- **Unit Tests**: Minimum 80% coverage for all services
- **Integration Tests**: Test service interactions
- **API Tests**: Test all endpoints with various inputs
- **Error Tests**: Test error handling and edge cases

### **2. Testing Patterns**

#### **Python Testing (pytest)**
```python
import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient

@pytest.fixture
def client():
    """Test client fixture."""
    from src.main import app
    return TestClient(app)

@pytest.fixture
def mock_crew_service():
    """Mock CrewAI service."""
    with patch('src.services.crew_service.CrewAIService') as mock:
        yield mock

def test_start_workflow_success(client, mock_crew_service):
    """Test successful workflow start."""
    # Arrange
    mock_crew_service.return_value.start_session.return_value = {
        'success': True,
        'sessionId': 'test-123'
    }
    
    # Act
    response = client.post('/api/workflow/start', json={
        'sessionId': 'test-123',
        'task': 'Test task'
    })
    
    # Assert
    assert response.status_code == 200
    assert response.json()['success'] is True

def test_start_workflow_validation_error(client):
    """Test workflow start with invalid data."""
    # Act
    response = client.post('/api/workflow/start', json={
        'sessionId': '',  # Invalid empty session ID
        'task': 'Test task'
    })
    
    # Assert
    assert response.status_code == 400
    assert 'sessionId' in response.json()['detail']
```

#### **TypeScript Testing (Jest)**
```typescript
import { startWorkflow } from '../src/services/workflowService';

// Mock fetch
global.fetch = jest.fn();

describe('Workflow Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start workflow successfully', async () => {
    // Arrange
    const mockResponse = { success: true, sessionId: 'test-123' };
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    // Act
    const result = await startWorkflow('Test task', {});

    // Assert
    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith('/api/chat/crew/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'Test task', context: {} })
    });
  });

  it('should handle API errors', async () => {
    // Arrange
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    // Act & Assert
    await expect(startWorkflow('Test task', {}))
      .rejects.toThrow('HTTP 500: Internal Server Error');
  });
});
```

### **3. Test Data Management**
```python
# Use factories for test data
@pytest.fixture
def sample_workflow_request():
    """Sample workflow request data."""
    return {
        'sessionId': f'test-session-{uuid.uuid4()}',
        'task': 'Design a customer feedback system',
        'context': {
            'industry': 'SaaS',
            'targetUsers': 'Enterprise'
        }
    }

@pytest.fixture
def sample_workflow_response():
    """Sample workflow response data."""
    return {
        'success': True,
        'sessionId': 'test-session-123',
        'stage': 'PROBLEM_CAPTURE',
        'messages': [
            {
                'id': 'msg-1',
                'content': 'Workflow started successfully',
                'role': 'Facilitator',
                'timestamp': '2025-08-25T07:30:00Z'
            }
        ]
    }
```

---

## 🔒 **Security Guidelines**

### **1. API Security**
- **Authentication**: Implement API key authentication for all endpoints
- **Authorization**: Use role-based access control where appropriate
- **Input Validation**: Validate all input data to prevent injection attacks
- **Rate Limiting**: Implement rate limiting to prevent abuse
- **HTTPS**: Use HTTPS in production environments

### **2. Data Security**
```python
# Use environment variables for sensitive data
import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    raise ValueError('OPENAI_API_KEY environment variable is required')

# Sanitize user input
import re
from typing import Optional

def sanitize_input(input_string: str) -> Optional[str]:
    """Sanitize user input to prevent injection attacks."""
    if not input_string:
        return None
    
    # Remove potentially dangerous characters
    sanitized = re.sub(r'[<>"\']', '', input_string)
    return sanitized.strip()

# Use parameterized queries for database operations
async def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Get session by ID using parameterized query."""
    query = "SELECT * FROM sessions WHERE session_id = ?"
    result = await database.fetch_one(query, (session_id,))
    return result
```

### **3. Error Information**
```python
# Don't expose sensitive information in error messages
try:
    result = await process_request(request)
except Exception as e:
    # Log full error for debugging
    logger.error(f"Internal error: {e}", exc_info=True)
    
    # Return generic error to user
    raise HTTPException(
        status_code=500,
        detail="An internal error occurred. Please try again later."
    )
```

---

## 📊 **Performance Guidelines**

### **1. API Performance**
- **Response Time**: Target < 200ms for simple operations, < 2s for complex workflows
- **Caching**: Implement caching for frequently accessed data
- **Async Operations**: Use async/await for I/O operations
- **Connection Pooling**: Use connection pools for database connections

### **2. Resource Management**
```python
# Use connection pooling
import asyncio
from contextlib import asynccontextmanager

class DatabaseManager:
    def __init__(self):
        self.pool = None
    
    async def get_pool(self):
        """Get database connection pool."""
        if not self.pool:
            self.pool = await asyncpg.create_pool(
                host='localhost',
                port=5432,
                user='user',
                password='password',
                database='bebrahma',
                min_size=5,
                max_size=20
            )
        return self.pool
    
    @asynccontextmanager
    async def get_connection(self):
        """Get database connection from pool."""
        pool = await self.get_pool()
        async with pool.acquire() as connection:
            yield connection

# Use async context managers
async def process_workflow(session_id: str):
    async with db_manager.get_connection() as conn:
        result = await conn.fetchrow(
            "SELECT * FROM workflows WHERE session_id = $1",
            session_id
        )
        return result
```

### **3. Monitoring and Metrics**
```python
import time
from functools import wraps

def measure_performance(func):
    """Decorator to measure function performance."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            return result
        finally:
            execution_time = time.time() - start_time
            logger.info(f"{func.__name__} executed in {execution_time:.3f}s")
    
    return wrapper

# Use the decorator
@measure_performance
async def start_workflow(session_id: str, task: str):
    """Start workflow with performance monitoring."""
    # Implementation here
    pass
```

---

## 🚀 **Deployment Guidelines**

### **1. Environment Management**
```bash
# Development environment
.env.development
NODE_ENV=development
LOG_LEVEL=debug
WORKFLOW_SERVICE_URL=http://localhost:5056
CREW_SERVICE_URL=http://localhost:5055

# Production environment
.env.production
NODE_ENV=production
LOG_LEVEL=info
WORKFLOW_SERVICE_URL=https://workflow.bebrahma.ai
CREW_SERVICE_URL=https://crew.bebrahma.ai
```

### **2. Docker Configuration**
```dockerfile
# Python service Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/

# Run the application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "5056"]
```

### **3. Health Checks**
```python
# Implement health check endpoints
@app.get("/health")
async def health_check():
    """Comprehensive health check."""
    try:
        # Check database connection
        await database.execute("SELECT 1")
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
    
    # Check external service dependencies
    crew_service_status = await check_crew_service()
    workflow_service_status = await check_workflow_service()
    
    overall_status = "healthy" if all([
        db_status == "healthy",
        crew_service_status == "healthy",
        workflow_service_status == "healthy"
    ]) else "unhealthy"
    
    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": db_status,
            "crew_service": crew_service_status,
            "workflow_service": workflow_service_status
        }
    }
```

---

## 📚 **Documentation Requirements**

### **1. Code Documentation**
```python
class WorkflowOrchestrator:
    """
    Orchestrates AI workflow execution using LangGraph.
    
    This class manages the state machine for workflow progression,
    integrating with CrewAI for agent execution and providing
    decision points for human oversight.
    
    Attributes:
        workflow_graph: LangGraph workflow state machine
        crew_service: Integration with CrewAI service
        session_store: Persistent session storage
    
    Example:
        >>> orchestrator = WorkflowOrchestrator()
        >>> result = await orchestrator.start_workflow("Design system", {})
        >>> print(result.stage)
        PROBLEM_CAPTURE
    """
    
    def __init__(self, crew_service_url: str):
        """
        Initialize the workflow orchestrator.
        
        Args:
            crew_service_url: URL of the CrewAI service
            
        Raises:
            ValueError: If crew_service_url is invalid
        """
        if not crew_service_url:
            raise ValueError("crew_service_url is required")
        
        self.crew_service = CrewAIService(crew_service_url)
        self.workflow_graph = self._create_workflow_graph()
    
    async def start_workflow(self, task: str, context: Dict[str, Any]) -> WorkflowResponse:
        """
        Start a new workflow session.
        
        Args:
            task: Description of the task to be accomplished
            context: Additional context information
            
        Returns:
            WorkflowResponse with session details and initial state
            
        Raises:
            WorkflowError: If workflow cannot be started
        """
        # Implementation here
        pass
```

### **2. API Documentation**
- **OpenAPI Specifications**: Maintain up-to-date OpenAPI specs
- **Endpoint Descriptions**: Clear descriptions of what each endpoint does
- **Request/Response Examples**: Provide realistic examples
- **Error Codes**: Document all possible error responses

### **3. Architecture Documentation**
- **Service Diagrams**: Visual representation of service interactions
- **Data Flow**: Document how data flows between services
- **Deployment**: Document deployment procedures and requirements

---

## 🔄 **Version Control Guidelines**

### **1. Commit Standards**
```bash
# Use conventional commit format
feat: add workflow stage progression logic
fix: resolve infinite loop in decision processing
docs: update API documentation for new endpoints
test: add integration tests for workflow service
refactor: simplify CrewAI service integration
style: format code according to style guide
```

### **2. Branch Strategy**
```bash
# Main branch for production releases
main

# Development branch for active development
develop

# Feature branches for new features
feature/workflow-advancement
feature/decision-management

# Hotfix branches for urgent fixes
hotfix/critical-bug-fix
```

### **3. Pull Request Requirements**
- **Code Review**: All changes must be reviewed by at least one team member
- **Tests**: All tests must pass before merging
- **Documentation**: Update relevant documentation
- **Description**: Clear description of changes and rationale

---

## 🧹 **Code Quality**

### **1. Linting and Formatting**
```bash
# Python: Use black, flake8, and mypy
pip install black flake8 mypy

# Format code
black src/

# Check code quality
flake8 src/

# Type checking
mypy src/

# TypeScript: Use ESLint and Prettier
npm install --save-dev eslint prettier

# Format code
npm run format

# Lint code
npm run lint
```

### **2. Pre-commit Hooks**
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black
        language_version: python3.11
  
  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8
        args: [--max-line-length=88]
  
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.3.0
    hooks:
      - id: mypy
        additional_dependencies: [types-all]
```

---

## 📈 **Monitoring and Observability**

### **1. Logging Standards**
```python
import logging
import json
from datetime import datetime

# Structured logging
def log_workflow_event(event_type: str, session_id: str, details: Dict[str, Any]):
    """Log workflow events in structured format."""
    log_entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'level': 'INFO',
        'event_type': event_type,
        'session_id': session_id,
        'service': 'workflow-service',
        'details': details
    }
    
    logger.info(json.dumps(log_entry))

# Usage
log_workflow_event(
    'workflow_started',
    'session-123',
    {'task': 'Design system', 'stage': 'PROBLEM_CAPTURE'}
)
```

### **2. Metrics Collection**
```python
from prometheus_client import Counter, Histogram, Gauge

# Define metrics
WORKFLOW_STARTED = Counter('workflow_started_total', 'Total workflows started')
WORKFLOW_DURATION = Histogram('workflow_duration_seconds', 'Workflow execution time')
ACTIVE_WORKFLOWS = Gauge('active_workflows', 'Number of active workflows')

# Use metrics in code
async def start_workflow(session_id: str, task: str):
    """Start workflow with metrics collection."""
    WORKFLOW_STARTED.inc()
    ACTIVE_WORKFLOWS.inc()
    
    start_time = time.time()
    try:
        result = await _execute_workflow(session_id, task)
        return result
    finally:
        duration = time.time() - start_time
        WORKFLOW_DURATION.observe(duration)
        ACTIVE_WORKFLOWS.dec()
```

---

## 🤝 **Contributing Guidelines**

### **1. Development Workflow**
1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Write tests for new functionality**
5. **Update documentation**
6. **Submit a pull request**

### **2. Code Review Process**
- **Self-review**: Review your own code before submitting
- **Peer review**: Get feedback from team members
- **Address feedback**: Make requested changes
- **Final approval**: Get approval before merging

### **3. Communication**
- **Issues**: Use GitHub issues for bug reports and feature requests
- **Discussions**: Use GitHub discussions for questions and ideas
- **Pull Requests**: Use PR descriptions to explain changes
- **Code Comments**: Use comments to explain complex logic

---

## 📚 **Additional Resources**

- [API Documentation](./README.md)
- [OpenAPI Specifications](./)
- [Integration Examples](./integration-examples.md)
- [Troubleshooting Guide](./troubleshooting.md)

---

*These guidelines are maintained by the BeBrahma AI development team. For questions or suggestions, please create an issue in the repository.*
