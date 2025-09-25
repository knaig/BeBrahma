"""
CrewAI Service Integration for LangGraph Workflow
Maintains existing CrewAI multi-agent capabilities while adding state management
"""

import httpx
import json
from typing import Dict, List, Any, Optional
from datetime import datetime


class CrewAIService:
    """Integration service for CrewAI multi-agent system"""
    
    def __init__(self, crew_service_url: str = "http://localhost:5055"):
        self.crew_service_url = crew_service_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def execute_stage_step(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single step in the current stage using CrewAI agents"""
        
        # Map stage to CrewAI request format
        crew_request = {
            "sessionId": context["session_id"],
            "stage": context["stage"],
            "stageTitle": context["stage_title"],
            "stageDescription": context["stage_description"],
            "objectives": context["objectives"],
            "taskDescription": context["task_description"],
            "previousMessages": context["previous_messages"],
            "requiredAgents": context["required_agents"],
            "requestType": "next_step"
        }
        
        try:
            # Call existing CrewAI /next endpoint
            response = await self.client.post(
                f"{self.crew_service_url}/api/crew/next",
                json=crew_request
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "messages": data.get("messages", []),
                    "stage": data.get("stage"),
                    "metadata": data.get("metadata", {})
                }
            else:
                return {
                    "success": False,
                    "error": f"CrewAI service error: {response.status_code}",
                    "messages": []
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to communicate with CrewAI service: {str(e)}",
                "messages": []
            }
    
    async def execute_single_step(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute exactly ONE step using CrewAI agents - NO AUTO-ADVANCEMENT"""
        
        # Map stage to CrewAI request format with single-step constraint
        crew_request = {
            "sessionId": context["session_id"],
            "stage": context["stage"],
            "stageTitle": context["stage_title"],
            "stageDescription": context["stage_description"],
            "objectives": context["objectives"],
            "taskDescription": context["task_description"],
            "previousMessages": context["previous_messages"],
            "requiredAgents": context["required_agents"],
            "requestType": "single_step",  # Explicitly request single step
            "stepLimit": 1,  # Force only one step
            "noAutoAdvance": True  # Prevent auto-advancement
        }
        
        try:
            # Call CrewAI with single-step constraint
            response = await self.client.post(
                f"{self.crew_service_url}/api/crew/next",
                json=crew_request
            )
            
            if response.status_code == 200:
                data = response.json()
                messages = data.get("messages", [])
                
                # CRITICAL: Return only the first message if multiple are returned
                if len(messages) > 1:
                    print(f"⚠️  CrewAI returned {len(messages)} messages, using only first for single-step mode")
                    messages = [messages[0]]  # Take only the first message
                
                return {
                    "success": True,
                    "messages": messages,
                    "stage": data.get("stage"),
                    "metadata": data.get("metadata", {})
                }
            else:
                return {
                    "success": False,
                    "error": f"CrewAI service error: {response.status_code}",
                    "messages": []
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to communicate with CrewAI service: {str(e)}",
                "messages": []
            }
    
    async def start_workflow(self, session_id: str, task_description: str) -> Dict[str, Any]:
        """Initialize CrewAI workflow session"""
        
        crew_request = {
            "sessionId": session_id,
            "task": task_description,
            "requestType": "start"
        }
        
        try:
            response = await self.client.post(
                f"{self.crew_service_url}/api/crew/start",
                json=crew_request
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {
                    "success": False,
                    "error": f"Failed to start CrewAI workflow: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to start CrewAI workflow: {str(e)}"
            }
    
    async def process_stage_decision(
        self, 
        session_id: str, 
        decision: str, 
        stage: str,
        user_message: str = ""
    ) -> Dict[str, Any]:
        """Process user decision through CrewAI"""
        
        crew_request = {
            "sessionId": session_id,
            "decision": decision,
            "stage": stage,
            "userMessage": user_message,
            "requestType": "decision"
        }
        
        try:
            response = await self.client.post(
                f"{self.crew_service_url}/api/crew/decision",
                json=crew_request
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {
                    "success": False,
                    "error": f"Failed to process decision: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to process decision: {str(e)}"
            }
    
    async def get_workflow_status(self, session_id: str) -> Dict[str, Any]:
        """Get current workflow status from CrewAI"""
        
        try:
            response = await self.client.get(
                f"{self.crew_service_url}/api/crew/status/{session_id}"
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {
                    "success": False,
                    "error": f"Failed to get status: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get status: {str(e)}"
            }
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
