# BeBrahma AI Microservices API Documentation

## 🎯 **Executive Summary**
BeBrahma AI is built as a **microservices architecture** with 4 core services that work together to provide AI-powered workflow orchestration and multi-agent collaboration.

---

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │  Workflow       │    │   CrewAI        │
│   (Port 3000)   │◄──►│   (Port 3002)   │◄──►│  Service        │◄──►│   Service       │
│                 │    │                 │    │  (Port 5056)    │    │   (Port 5055)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 📋 **Service 1: Frontend Web Application**

**Port:** 3000  
**Technology:** Next.js 14, React 18, TypeScript  
**Purpose:** User interface for interacting with AI agents and workflows

### **Key Features:**
- Virtual Meeting Room with AI agent avatars
- Decision Management Hub
- Agent Research Workspace
- Task & Action Tracking

---

## 🌐 **Service 2: API Gateway**

**Port:** 3002  
**Technology:** Node.js, Express  
**Purpose:** Central entry point that routes requests to appropriate microservices

### **Endpoints:**

#### **AI Workflow Management**
- `POST /api/chat/crew/start` - Start new AI workflow session
- `POST /api/chat/crew/next` - Advance workflow to next step
- `POST /api/chat/decision` - Process user decisions at workflow stages

#### **AI Services**
- `GET /api/ai/*` - AI-related service endpoints

#### **Administration**
- `GET /api/admin/*` - Administrative service endpoints

#### **SaaS Services**
- `GET /api/saas/*` - SaaS-related service endpoints

#### **Conversation Management**
- `GET /api/conversation/*` - Conversation service endpoints

#### **Health & Status**
- `GET /` - Service health check
- `GET /health` - Detailed health status with configuration

---

## 🤖 **Service 3: CrewAI Service**

**Port:** 5055  
**Technology:** Python FastAPI  
**Purpose:** Multi-agent AI collaboration and task execution

### **Endpoints:**

#### **Session Management**
- `POST /api/crew/start` - Initialize new AI agent session
- `GET /api/crew/status/{sessionId}` - Get session status

#### **Workflow Execution**
- `POST /api/crew/next` - Execute next step in workflow
- `POST /api/crew/decision` - Process user decisions

#### **Agent Management**
- `POST /api/crew/agents` - Register new AI agents
- `GET /api/crew/agents` - List available agents

---

## 🔄 **Service 4: LangGraph Workflow Service**

**Port:** 5056  
**Technology:** Python FastAPI, LangGraph  
**Purpose:** State-managed workflow orchestration and stage progression

### **Endpoints:**

#### **Workflow Orchestration**
- `POST /api/workflow/start` - Start new LangGraph workflow
- `POST /api/workflow/next` - Advance workflow state
- `POST /api/workflow/decision` - Process stage decisions

#### **Workflow Status**
- `GET /` - Service health check
- `GET /api/workflow/status/{sessionId}` - Get workflow state

---

## 📊 **Data Flow Architecture**

```
User → Frontend (3000) → API Gateway (3002) → [Workflow Service (5056) → CrewAI Service (5055)]
```

### **Request Flow:**
1. **User** interacts with Frontend
2. **Frontend** sends request to API Gateway
3. **API Gateway** routes to appropriate microservice
4. **Workflow Service** manages state and progression
5. **CrewAI Service** executes AI agent tasks
6. **Response** flows back through the chain

---

## 🔗 **Service Dependencies**

| Service | Depends On | Communication Method |
|---------|------------|---------------------|
| Frontend | API Gateway | HTTP REST |
| API Gateway | Workflow Service, CrewAI Service | HTTP REST |
| Workflow Service | CrewAI Service | HTTP REST |
| CrewAI Service | None (External APIs) | HTTP REST |

---

## 📋 **Complete API Endpoints Reference**

| Service | Endpoint | Method | Purpose | Description |
|---------|----------|--------|---------|-------------|
| **API Gateway** | `/` | GET | Health Check | Basic service health status |
| **API Gateway** | `/health` | GET | Detailed Health | Comprehensive health with configuration |
| **API Gateway** | `/api/chat/crew/start` | POST | Start Workflow | Initialize new AI workflow session |
| **API Gateway** | `/api/chat/crew/next` | POST | Advance Workflow | Execute next workflow step |
| **API Gateway** | `/api/chat/decision` | POST | Process Decision | Handle user decisions at stage boundaries |
| **API Gateway** | `/api/ai/*` | GET | AI Services | AI-related service endpoints |
| **API Gateway** | `/api/admin/*` | GET | Administration | Administrative service endpoints |
| **API Gateway** | `/api/saas/*` | GET | SaaS Services | SaaS-related service endpoints |
| **API Gateway** | `/api/conversation/*` | GET | Conversation | Conversation service endpoints |
| **CrewAI Service** | `/` | GET | Health Check | CrewAI service health status |
| **CrewAI Service** | `/api/crew/start` | POST | Start Session | Initialize AI agent session |
| **CrewAI Service** | `/api/crew/next` | POST | Execute Step | Execute next workflow step |
| **CrewAI Service** | `/api/crew/decision` | POST | Process Decision | Handle user decisions |
| **CrewAI Service** | `/api/crew/status/{id}` | GET | Get Status | Retrieve session status |
| **CrewAI Service** | `/api/crew/agents` | GET/POST | Agent Management | List/register AI agents |
| **Workflow Service** | `/` | GET | Health Check | Workflow service health status |
| **Workflow Service** | `/api/workflow/start` | POST | Start Workflow | Initialize LangGraph workflow |
| **Workflow Service** | `/api/workflow/next` | POST | Advance Workflow | Advance workflow state |
| **Workflow Service** | `/api/workflow/decision` | POST | Process Decision | Handle workflow decisions |
| **Workflow Service** | `/api/workflow/status/{id}` | GET | Get Status | Retrieve workflow status |

---

## 📝 **Non-Technical Summary**

### **What This Means for Your Business:**

1. **Scalability**: Each service can be scaled independently based on demand
2. **Reliability**: If one service fails, others continue working
3. **Maintenance**: Teams can work on different services without affecting others
4. **Technology Choice**: Each service can use the best technology for its purpose

### **Key Benefits:**

- **AI Agent Collaboration**: Multiple AI agents work together on complex tasks
- **Workflow Management**: Structured progression through business processes
- **User Control**: Human oversight and decision points throughout the workflow
- **Real-time Updates**: Live progress tracking and status updates

### **How It Works:**

1. **User** describes a task (e.g., "Design a customer feedback system")
2. **AI Agents** collaborate to analyze and solve the problem
3. **Workflow Engine** manages the process and stages
4. **User** makes decisions at key points to guide the process
5. **System** delivers a complete solution with documentation

---

## 🚀 **Getting Started**

### **Prerequisites:**
- Node.js 18+
- Python 3.11+
- Docker (optional)

### **Quick Start:**
```bash
# Start all services
npm run dev                    # Frontend + API Gateway
cd apps/crew-service && ./start.sh      # CrewAI Service
cd apps/workflow-service && ./start.sh  # Workflow Service
```

### **Health Checks:**
- Frontend: http://localhost:3000
- API Gateway: http://localhost:3002
- CrewAI Service: http://localhost:5055
- Workflow Service: http://localhost:5056

---

## 📚 **Additional Documentation**

- [API Gateway OpenAPI Spec](./api-gateway-openapi.yaml)
- [CrewAI Service OpenAPI Spec](./crewai-service-openapi.yaml)
- [Workflow Service OpenAPI Spec](./workflow-service-openapi.yaml)
- [Integration Examples](./integration-examples.md)
- [Troubleshooting Guide](./troubleshooting.md)
- [Development Guidelines](./development-guidelines.md)

---

## 🤝 **Support & Contributing**

For technical questions or contributions, please refer to the development team.
For business questions about the AI workflow capabilities, contact the product team.
