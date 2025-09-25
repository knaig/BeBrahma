"""
LangGraph Workflow Service for BeBrahma
Replaces direct CrewAI service with LangGraph state management + CrewAI execution
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any

from .langgraph_workflow import WorkflowOrchestrator
from .crew_integration import CrewAIService
from .workflow_states import WorkflowStage, DecisionType


# Request/Response Models
class StartWorkflowRequest(BaseModel):
    sessionId: str
    task: str
    context: Optional[Dict[str, Any]] = None


class NextStepRequest(BaseModel):
    sessionId: str


class DecisionRequest(BaseModel):
    sessionId: str
    decision: str
    userMessage: str = ""


class WorkflowResponse(BaseModel):
    success: bool
    messages: List[Dict[str, Any]] = []
    stage: str
    stageStatus: str = ""
    stageProgress: Dict[str, str] = {}
    pendingDecision: bool = False
    decisionOptions: List[str] = []
    error: Optional[str] = None


# Global workflow orchestrator
workflow_orchestrator: Optional[WorkflowOrchestrator] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    global workflow_orchestrator
    
    # Initialize services
    crew_service_url = os.getenv("CREW_SERVICE_URL", "http://localhost:5055")
    crew_service = CrewAIService(crew_service_url)
    workflow_orchestrator = WorkflowOrchestrator(crew_service)
    
    print("🚀 LangGraph Workflow Service started")
    print(f"📡 CrewAI Service URL: {crew_service_url}")
    
    yield
    
    # Cleanup
    await crew_service.close()
    print("🛑 LangGraph Workflow Service stopped")


# FastAPI app
app = FastAPI(
    title="BeBrahma LangGraph Workflow Service",
    description="State-managed workflow orchestration with CrewAI integration",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "BeBrahma LangGraph Workflow Service",
        "status": "running",
        "version": "1.0.0"
    }


@app.post("/api/workflow/start", response_model=WorkflowResponse)
async def start_workflow(request: StartWorkflowRequest):
    """Start a new workflow session"""
    
    if not workflow_orchestrator:
        raise HTTPException(status_code=500, detail="Workflow orchestrator not initialized")
    
    try:
        # Start LangGraph workflow
        state = await workflow_orchestrator.start_workflow(
            session_id=request.sessionId,
            task_description=request.task
        )
        
        # Convert to response format
        return WorkflowResponse(
            success=True,
            messages=[msg.dict() for msg in state.messages],
            stage=state.current_stage.value,
            stageStatus=state.stage_status.value,
            stageProgress={k.value: v.value for k, v in state.stage_progress.items()},
            pendingDecision=state.pending_decision,
            decisionOptions=[opt.value for opt in state.decision_options]
        )
        
    except Exception as e:
        return WorkflowResponse(
            success=False,
            stage="ERROR",
            error=str(e)
        )


@app.post("/api/workflow/next", response_model=WorkflowResponse)
async def get_next_step(request: NextStepRequest):
    """Get next step in the workflow"""
    
    if not workflow_orchestrator:
        raise HTTPException(status_code=500, detail="Workflow orchestrator not initialized")
    
    try:
        # Get next message(s) from LangGraph workflow
        state, new_messages = await workflow_orchestrator.get_next_message(request.sessionId)
        
        # Convert to response format
        return WorkflowResponse(
            success=True,
            messages=[msg.dict() for msg in new_messages],
            stage=state.current_stage.value,
            stageStatus=state.stage_status.value,
            stageProgress={k.value: v.value for k, v in state.stage_progress.items()},
            pendingDecision=state.pending_decision,
            decisionOptions=[opt.value for opt in state.decision_options]
        )
        
    except ValueError as e:
        return WorkflowResponse(
            success=False,
            stage="ERROR",
            error=str(e)
        )
    except Exception as e:
        return WorkflowResponse(
            success=False,
            stage="ERROR", 
            error=f"Unexpected error: {str(e)}"
        )


@app.post("/api/workflow/decision", response_model=WorkflowResponse)
async def process_decision(request: DecisionRequest):
    """Process user decision at stage boundary"""
    
    if not workflow_orchestrator:
        raise HTTPException(status_code=500, detail="Workflow orchestrator not initialized")
    
    try:
        # Validate decision
        decision_type = DecisionType(request.decision.lower())
        
        # Process decision through LangGraph workflow
        state, result_message = await workflow_orchestrator.process_decision(
            session_id=request.sessionId,
            decision=decision_type,
            user_message=request.userMessage
        )
        
        # Convert to response format
        return WorkflowResponse(
            success=True,
            messages=[{"id": "decision_result", "content": result_message, "agentId": "system", "agentName": "System"}],
            stage=state.current_stage.value,
            stageStatus=state.stage_status.value,
            stageProgress={k.value: v.value for k, v in state.stage_progress.items()},
            pendingDecision=state.pending_decision,
            decisionOptions=[opt.value for opt in state.decision_options]
        )
        
    except ValueError as e:
        return WorkflowResponse(
            success=False,
            stage="ERROR",
            error=f"Invalid decision: {str(e)}"
        )
    except Exception as e:
        return WorkflowResponse(
            success=False,
            stage="ERROR",
            error=f"Failed to process decision: {str(e)}"
        )


@app.get("/api/workflow/status/{session_id}", response_model=WorkflowResponse)
async def get_workflow_status(session_id: str):
    """Get current workflow status"""
    
    if not workflow_orchestrator:
        raise HTTPException(status_code=500, detail="Workflow orchestrator not initialized")
    
    try:
        # Get session state
        if session_id not in workflow_orchestrator.sessions:
            raise ValueError(f"Session {session_id} not found")
        
        state = workflow_orchestrator.sessions[session_id]
        
        # Convert to response format
        return WorkflowResponse(
            success=True,
            messages=[msg.dict() for msg in state.messages],
            stage=state.current_stage.value,
            stageStatus=state.stage_status.value,
            stageProgress={k.value: v.value for k, v in state.stage_progress.items()},
            pendingDecision=state.pending_decision,
            decisionOptions=[opt.value for opt in state.decision_options]
        )
        
    except ValueError as e:
        return WorkflowResponse(
            success=False,
            stage="ERROR",
            error=str(e)
        )
    except Exception as e:
        return WorkflowResponse(
            success=False,
            stage="ERROR",
            error=f"Failed to get status: {str(e)}"
        )


# Legacy API compatibility (routes existing API calls to new workflow)
@app.post("/api/crew/start")
async def legacy_crew_start(request: dict):
    """Legacy compatibility for existing CrewAI start endpoint"""
    start_request = StartWorkflowRequest(
        sessionId=request.get("sessionId", ""),
        task=request.get("task", ""),
        context=request.get("context")
    )
    
    response = await start_workflow(start_request)
    
    # Convert to legacy format
    return {
        "success": response.success,
        "messages": response.messages,
        "stage": response.stage,
        "messageCount": len(response.messages)
    }


@app.post("/api/crew/next")
async def legacy_crew_next(request: dict):
    """Legacy compatibility for existing CrewAI next endpoint"""
    next_request = NextStepRequest(sessionId=request.get("sessionId", ""))
    
    response = await get_next_step(next_request)
    
    # Convert to legacy format
    return {
        "success": response.success,
        "messages": response.messages,
        "stage": response.stage,
        "messageCount": len(response.messages)
    }


@app.post("/api/crew/decision")
async def legacy_crew_decision(request: dict):
    """Legacy compatibility for existing CrewAI decision endpoint"""
    decision_request = DecisionRequest(
        sessionId=request.get("sessionId", ""),
        decision=request.get("decision", ""),
        userMessage=request.get("userMessage", "")
    )
    
    response = await process_decision(decision_request)
    
    # Convert to legacy format
    return {
        "success": response.success,
        "messages": response.messages,
        "stage": response.stage,
        "messageCount": len(response.messages)
    }


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "5056"))  # Use different port than CrewAI service
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
