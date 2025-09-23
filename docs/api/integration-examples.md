# BeBrahma AI Integration Examples

This document provides practical examples for integrating with the BeBrahma AI microservices architecture. It covers common use cases, code samples, and best practices for developers.

---

## 🚀 **Quick Start Examples**

### **1. Basic Workflow Lifecycle**

#### **cURL Examples**

**Start a new workflow:**
```bash
curl -X POST http://localhost:3002/api/chat/crew/start \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "workflow-12345",
    "task": "Design a customer feedback system for SaaS platform",
    "context": {
      "industry": "SaaS",
      "targetUsers": "Enterprise",
      "constraints": ["budget_limited", "integration_required"]
    }
  }'
```

**Advance workflow to next step:**
```bash
curl -X POST http://localhost:3002/api/chat/crew/next \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "workflow-12345"
  }'
```

**Process user decision:**
```bash
curl -X POST http://localhost:3002/api/chat/decision \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "workflow-12345",
    "decision": "approve",
    "userMessage": "This analysis looks comprehensive, proceed to solution design"
  }'
```

#### **JavaScript/Node.js Examples**

**Complete workflow client class:**
```javascript
class BeBrahmaWorkflowClient {
  constructor(baseUrl = 'http://localhost:3002') {
    this.baseUrl = baseUrl;
    this.sessionId = null;
  }

  async startWorkflow(task, context = {}) {
    this.sessionId = `workflow-${Date.now()}`;
    
    const result = await fetch(`${this.baseUrl}/api/chat/crew/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        task,
        context
      })
    });

    if (!result.ok) throw new Error('Failed to start workflow');
    return await result.json();
  }

  async advanceStep() {
    if (!this.sessionId) throw new Error('No active session');
    
    const result = await fetch(`${this.baseUrl}/api/chat/crew/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.sessionId })
    });

    if (!result.ok) throw new Error('Failed to advance workflow');
    return await result.json();
  }

  async makeDecision(decision, userMessage = '') {
    if (!this.sessionId) throw new Error('No active session');
    
    const result = await fetch(`${this.baseUrl}/api/chat/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        decision,
        userMessage
      })
    });

    if (!result.ok) throw new Error('Failed to process decision');
    return await result.json();
  }

  async getHealthStatus() {
    const result = await fetch(`${this.baseUrl}/health`);
    if (!result.ok) throw new Error('Failed to get health status');
    return await result.json();
  }

  async getServiceInfo() {
    const result = await fetch(`${this.baseUrl}/`);
    if (!result.ok) throw new Error('Failed to get service info');
    return await result.json();
  }

  async runCompleteWorkflow(task, context = {}) {
    console.log('🚀 Starting new workflow...');
    
    // Start workflow
    const startResult = await this.startWorkflow(task, context);
    console.log('✅ Workflow started:', startResult.stage);
    
    let currentStage = startResult.stage;
    let stepCount = 0;
    
    while (currentStage !== 'MONITORING_SETUP' && stepCount < 50) {
      stepCount++;
      console.log(`\n📋 Step ${stepCount}: Advancing in ${currentStage}...`);
      
      // Advance workflow
      const advanceResult = await this.advanceStep();
      console.log(`📝 Generated ${advanceResult.messages.length} messages`);
      
      // Check if decision is needed
      if (advanceResult.pendingDecision) {
        console.log('🤔 Decision required. Options:', advanceResult.decisionOptions);
        
        // Auto-approve for demo (in real usage, wait for user input)
        const decisionResult = await this.makeDecision('approve', 'Auto-approved for demo');
        console.log('✅ Decision processed:', decisionResult.stage);
        currentStage = decisionResult.stage;
      } else {
        currentStage = advanceResult.stage;
      }
      
      // Add delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 Workflow completed!');
    return { sessionId: this.sessionId, finalStage: currentStage, totalSteps: stepCount };
  }
}

// Usage example
const client = new BeBrahmaWorkflowClient();
client.runCompleteWorkflow('Design a customer feedback system', {
  industry: 'SaaS',
  targetUsers: 'Enterprise'
}).then(result => {
  console.log('Workflow result:', result);
}).catch(error => {
  console.error('Workflow failed:', error);
});
```

#### **Python Examples**

**Python client for workflow integration:**
```python
import requests
import json
import time
from typing import Dict, Any, Optional

class BeBrahmaWorkflowClient:
    def __init__(self, base_url: str = "http://localhost:3002"):
        self.base_url = base_url
        self.session_id = None
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
    
    def start_workflow(self, task: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Start a new workflow session"""
        if context is None:
            context = {}
        
        self.session_id = f"workflow-{int(time.time())}"
        
        payload = {
            "sessionId": self.session_id,
            "task": task,
            "context": context
        }
        
        response = self.session.post(
            f"{self.base_url}/api/chat/crew/start",
            json=payload
        )
        response.raise_for_status()
        
        return response.json()
    
    def advance_step(self) -> Dict[str, Any]:
        """Advance workflow to next step"""
        if not self.session_id:
            raise ValueError("No active session")
        
        payload = {"sessionId": self.session_id}
        
        response = self.session.post(
            f"{self.base_url}/api/chat/crew/next",
            json=payload
        )
        response.raise_for_status()
        
        return response.json()
    
    def make_decision(self, decision: str, user_message: str = "") -> Dict[str, Any]:
        """Process user decision at workflow stage"""
        if not self.session_id:
            raise ValueError("No active session")
        
        payload = {
            "sessionId": self.session_id,
            "decision": decision,
            "userMessage": user_message
        }
        
        response = self.session.post(
            f"{self.base_url}/api/chat/decision",
            json=payload
        )
        response.raise_for_status()
        
        return response.json()
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get API Gateway health status"""
        response = self.session.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()
    
    def run_complete_workflow(self, task: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run a complete workflow from start to finish"""
        print("🚀 Starting new workflow...")
        
        # Start workflow
        start_result = self.start_workflow(task, context or {})
        print(f"✅ Workflow started: {start_result['stage']}")
        
        current_stage = start_result['stage']
        step_count = 0
        
        while current_stage != 'MONITORING_SETUP' and step_count < 50:
            step_count += 1
            print(f"\n📋 Step {step_count}: Advancing in {current_stage}...")
            
            # Advance workflow
            advance_result = self.advance_step()
            print(f"📝 Generated {len(advance_result.get('messages', []))} messages")
            
            # Check if decision is needed
            if advance_result.get('pendingDecision'):
                print(f"🤔 Decision required. Options: {advance_result.get('decisionOptions', [])}")
                
                # Auto-approve for demo (in real usage, wait for user input)
                decision_result = self.make_decision('approve', 'Auto-approved for demo')
                print(f"✅ Decision processed: {decision_result['stage']}")
                current_stage = decision_result['stage']
            else:
                current_stage = advance_result['stage']
            
            # Add delay to avoid overwhelming the system
            time.sleep(1)
        
        print("\n🎉 Workflow completed!")
        return {
            "sessionId": self.session_id,
            "finalStage": current_stage,
            "totalSteps": step_count
        }

# Usage example
if __name__ == "__main__":
    client = BeBrahmaWorkflowClient()
    
    try:
        result = client.run_complete_workflow(
            "Design a customer feedback system",
            {"industry": "SaaS", "targetUsers": "Enterprise"}
        )
        print("Workflow result:", result)
    except Exception as error:
        print(f"Workflow failed: {error}")
```

---

## 🔗 **Direct Service Integration**

### **1. CrewAI Service Direct Integration**

**Start session directly with CrewAI:**
```bash
curl -X POST http://localhost:5055/api/crew/start \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "direct-session-123",
    "stage": "PROBLEM_CAPTURE",
    "objectives": ["Analyze problem", "Identify stakeholders"],
    "requiredAgents": ["facilitator", "market_analyst"],
    "requestType": "single_step",
    "stepLimit": 1
  }'
```

**Execute next step:**
```bash
curl -X POST http://localhost:5055/api/crew/next \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "direct-session-123"
  }'
```

### **2. Workflow Service Direct Integration**

**Start LangGraph workflow:**
```bash
curl -X POST http://localhost:5056/api/workflow/start \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "langgraph-session-123",
    "task": "Design a customer feedback system"
  }'
```

**Get workflow status:**
```bash
curl http://localhost:5056/api/workflow/status/langgraph-session-123
```

---

## 🛡️ **Error Handling and Resilience**

### **1. Robust Error Handling**

```javascript
class ResilientBeBrahmaClient {
  constructor(baseUrl, maxRetries = 3, retryDelay = 1000) {
    this.baseUrl = baseUrl;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  async makeRequest(endpoint, options, retryCount = 0) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        console.log(`Retry ${retryCount + 1}/${this.maxRetries} after ${this.retryDelay}ms`);
        await this.sleep(this.retryDelay);
        return this.makeRequest(endpoint, options, retryCount + 1);
      }
      throw error;
    }
  }

  isRetryableError(error) {
    // Retry on network errors, 5xx server errors, and rate limits
    return error.name === 'TypeError' || 
           error.message.includes('500') ||
           error.message.includes('502') ||
           error.message.includes('503') ||
           error.message.includes('429');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async startWorkflow(task, context = {}) {
    return this.makeRequest('/api/chat/crew/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, context })
    });
  }
}
```

### **2. Circuit Breaker Pattern**

```javascript
class CircuitBreaker {
  constructor(failureThreshold = 5, resetTimeout = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

// Usage with circuit breaker
const circuitBreaker = new CircuitBreaker();
const client = new ResilientBeBrahmaClient('http://localhost:3002');

try {
  const result = await circuitBreaker.execute(() => 
    client.startWorkflow('Design a customer feedback system')
  );
  console.log('Workflow started:', result);
} catch (error) {
  console.error('Failed to start workflow:', error.message);
}
```

---

## 🔐 **Authentication and Security**

### **1. API Key Authentication**

```javascript
class AuthenticatedBeBrahmaClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async makeAuthenticatedRequest(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...options.headers
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      throw new Error('Invalid API key');
    }

    if (response.status === 403) {
      throw new Error('Insufficient permissions');
    }

    return response;
  }

  async startWorkflow(task, context = {}) {
    const response = await this.makeAuthenticatedRequest('/api/chat/crew/start', {
      method: 'POST',
      body: JSON.stringify({ task, context })
    });

    if (!response.ok) {
      throw new Error(`Failed to start workflow: ${response.statusText}`);
    }

    return response.json();
  }
}

// Usage
const client = new AuthenticatedBeBrahmaClient(
  'http://localhost:3002',
  'your-api-key-here'
);
```

### **2. Rate Limiting**

```javascript
class RateLimitedBeBrahmaClient {
  constructor(baseUrl, maxRequestsPerMinute = 60) {
    this.baseUrl = baseUrl;
    this.maxRequestsPerMinute = maxRequestsPerMinute;
    this.requestTimes = [];
  }

  async makeRateLimitedRequest(endpoint, options = {}) {
    this.cleanupOldRequests();
    
    if (this.requestTimes.length >= this.maxRequestsPerMinute) {
      const oldestRequest = this.requestTimes[0];
      const timeToWait = 60000 - (Date.now() - oldestRequest);
      
      if (timeToWait > 0) {
        console.log(`Rate limit reached, waiting ${timeToWait}ms`);
        await this.sleep(timeToWait);
      }
    }

    this.requestTimes.push(Date.now());
    return fetch(`${this.baseUrl}${endpoint}`, options);
  }

  cleanupOldRequests() {
    const oneMinuteAgo = Date.now() - 60000;
    this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 📊 **Monitoring and Observability**

### **1. Request Logging and Metrics**

```javascript
class MonitoredBeBrahmaClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestHistory: []
    };
  }

  async makeMonitoredRequest(endpoint, options = {}) {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      this.recordSuccess(responseTime);
      
      if (!response.ok) {
        this.recordFailure();
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  recordSuccess(responseTime) {
    this.metrics.successfulRequests++;
    this.updateAverageResponseTime(responseTime);
    this.recordRequest('success', responseTime);
  }

  recordFailure() {
    this.metrics.failedRequests++;
    this.recordRequest('failure', 0);
  }

  updateAverageResponseTime(responseTime) {
    const { successfulRequests, averageResponseTime } = this.metrics;
    this.metrics.averageResponseTime = 
      (averageResponseTime * (successfulRequests - 1) + responseTime) / successfulRequests;
  }

  recordRequest(status, responseTime) {
    this.metrics.requestHistory.push({
      timestamp: new Date().toISOString(),
      status,
      responseTime
    });

    // Keep only last 100 requests
    if (this.metrics.requestHistory.length > 100) {
      this.metrics.requestHistory.shift();
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
        : 0
    };
  }

  async startWorkflow(task, context = {}) {
    return this.makeMonitoredRequest('/api/chat/crew/start', {
      method: 'POST',
      body: JSON.stringify({ task, context })
    });
  }
}
```

### **2. Health Check Monitoring**

```javascript
class BeBrahmaHealthMonitor {
  constructor(services) {
    this.services = services;
    this.healthStatus = {};
    this.monitoringInterval = null;
  }

  startMonitoring(intervalMs = 30000) {
    this.monitoringInterval = setInterval(() => {
      this.checkAllServices();
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  async checkAllServices() {
    const promises = Object.entries(this.services).map(async ([name, url]) => {
      try {
        const response = await fetch(`${url}/health`);
        const status = response.ok ? 'healthy' : 'unhealthy';
        this.healthStatus[name] = { status, lastCheck: new Date().toISOString() };
      } catch (error) {
        this.healthStatus[name] = { 
          status: 'error', 
          error: error.message, 
          lastCheck: new Date().toISOString() 
        };
      }
    });

    await Promise.all(promises);
    this.logHealthStatus();
  }

  logHealthStatus() {
    console.log('🔍 Service Health Status:');
    Object.entries(this.healthStatus).forEach(([name, status]) => {
      const emoji = status.status === 'healthy' ? '✅' : '❌';
      console.log(`${emoji} ${name}: ${status.status}`);
    });
  }

  getHealthStatus() {
    return this.healthStatus;
  }
}

// Usage
const healthMonitor = new BeBrahmaHealthMonitor({
  'API Gateway': 'http://localhost:3002',
  'CrewAI Service': 'http://localhost:5055',
  'Workflow Service': 'http://localhost:5056'
});

healthMonitor.startMonitoring();
```

---

## 🧪 **Testing and Mock Services**

### **1. Mock BeBrahma Service for Testing**

```javascript
class MockBeBrahmaService {
  constructor() {
    this.sessions = new Map();
    this.sessionCounter = 0;
  }

  async startWorkflow(task, context = {}) {
    const sessionId = `mock-session-${++this.sessionCounter}`;
    
    const session = {
      sessionId,
      task,
      context,
      stage: 'PROBLEM_CAPTURE',
      stageStatus: 'IN_PROGRESS',
      stageProgress: { completion: 0.1, stepsCompleted: 1 },
      pendingDecision: false,
      decisionOptions: [],
      messages: [
        {
          id: 'msg-1',
          content: 'I\'ve started analyzing the problem: ' + task,
          role: 'Facilitator',
          timestamp: new Date().toISOString()
        }
      ]
    };

    this.sessions.set(sessionId, session);
    
    return {
      success: true,
      ...session
    };
  }

  async advanceWorkflow(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Simulate workflow progression
    session.stageProgress.stepsCompleted++;
    session.stageProgress.completion = Math.min(0.9, session.stageProgress.completion + 0.1);

    // Add a new message
    const newMessage = {
      id: `msg-${session.messages.length + 1}`,
      content: `Step ${session.stageProgress.stepsCompleted} completed in ${session.stage}`,
      role: 'Facilitator',
      timestamp: new Date().toISOString()
    };

    session.messages.push(newMessage);

    // Check if decision is needed
    if (session.stageProgress.completion >= 0.9) {
      session.pendingDecision = true;
      session.decisionOptions = ['approve', 'reject', 'modify'];
    }

    return {
      success: true,
      ...session
    };
  }

  async processDecision(sessionId, decision, userMessage = '') {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.pendingDecision) {
      throw new Error('No decision pending for this session');
    }

    // Process decision
    session.pendingDecision = false;
    session.decisionOptions = [];
    
    if (decision === 'approve') {
      // Move to next stage
      const stages = ['PROBLEM_CAPTURE', 'PROBLEM_CLARIFICATION', 'SOLUTION_DESIGN', 'IMPLEMENTATION_PLAN'];
      const currentIndex = stages.indexOf(session.stage);
      if (currentIndex < stages.length - 1) {
        session.stage = stages[currentIndex + 1];
        session.stageStatus = 'IN_PROGRESS';
        session.stageProgress = { completion: 0.1, stepsCompleted: 1 };
      }
    }

    // Add decision message
    const decisionMessage = {
      id: `msg-${session.messages.length + 1}`,
      content: `Decision processed: ${decision}. ${userMessage}`,
      role: 'User',
      timestamp: new Date().toISOString()
    };

    session.messages.push(decisionMessage);

    return {
      success: true,
      ...session
    };
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }
}

// Usage in tests
const mockService = new MockBeBrahmaService();

// Test workflow lifecycle
async function testWorkflowLifecycle() {
  console.log('🧪 Testing workflow lifecycle...');
  
  // Start workflow
  const startResult = await mockService.startWorkflow('Test task');
  console.log('✅ Started:', startResult.stage);
  
  // Advance workflow
  const advanceResult = await mockService.advanceWorkflow(startResult.sessionId);
  console.log('✅ Advanced:', advanceResult.stageProgress);
  
  // Process decision
  if (advanceResult.pendingDecision) {
    const decisionResult = await mockService.processDecision(
      startResult.sessionId, 
      'approve', 
      'Test decision'
    );
    console.log('✅ Decision processed:', decisionResult.stage);
  }
  
  console.log('🎉 Test completed successfully!');
}

testWorkflowLifecycle();
```

---

## 📚 **Additional Resources**

- [API Documentation](./README.md)
- [OpenAPI Specifications](./)
- [Troubleshooting Guide](./troubleshooting.md)
- [Development Guidelines](./development-guidelines.md)

---

*This documentation is maintained by the BeBrahma AI team. For the latest updates, please check the repository.*
