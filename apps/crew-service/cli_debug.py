#!/usr/bin/env python3
"""
CLI Debug Interface for CrewAI Workflow
======================================

This CLI provides a simple, debuggable interface to the CrewAI workflow.
It shows messages one by one, logs everything to a file, and makes
stage progression clear and controllable.
"""

import os
import sys
import json
import time
import logging
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime
from typing import Dict, List, Any, Optional

# Add config directory to path for port manager
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'config'))

try:
    from port_manager import get_port
    PORT_MANAGER_AVAILABLE = True
except ImportError:
    PORT_MANAGER_AVAILABLE = False
    print("⚠️  Port manager not available, using default port 3002")

# Configure logging to both console and file
log_dir = "logs"
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, f"crewai_cli_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class CrewAICLIDebug:
    def __init__(self, api_base_url: str = None):
        # Use port manager if available, otherwise fallback to default
        if api_base_url is None:
            if PORT_MANAGER_AVAILABLE:
                api_port = get_port('api_gateway', 'services')
                if api_port:
                    api_base_url = f"http://localhost:{api_port}"
                    logger.info(f"Using port manager: API Gateway on port {api_port}")
                else:
                    api_base_url = "http://localhost:3002"
                    logger.warning("Port manager returned None, using default port 3002")
            else:
                api_base_url = "http://localhost:3002"
                logger.warning("Port manager not available, using default port 3002")
        
        self.api_base_url = api_base_url
        self.session_id = f"cli_session_{int(time.time())}"
        self.current_stage = "PROBLEM_CAPTURE"
        self.stage_index = 0
        self.turn = 0
        
        # Stage progression
        self.stages = [
            "PROBLEM_CAPTURE",
            "PROBLEM_CLARIFICATION", 
            "SOLUTION_BRAINSTORM",
            "COMPETITOR_ANALYSIS",
            "SCA_ANALYSIS",
            "MVP_PLANNING",
            "TASK_GENERATION"
        ]
        
        logger.info(f"CLI Debug Interface initialized")
        logger.info(f"Session ID: {self.session_id}")
        logger.info(f"API Base URL: {self.api_base_url}")
        logger.info(f"Log file: {log_file}")
        
        # Log port configuration
        if PORT_MANAGER_AVAILABLE:
            try:
                from port_manager import list_all_ports
                all_ports = list_all_ports()
                logger.info(f"Port configuration loaded: {json.dumps(all_ports, indent=2)}")
            except Exception as e:
                logger.warning(f"Could not log port configuration: {e}")
        
    def log_action(self, action: str, data: Any = None):
        """Log an action with timestamp"""
        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "action": action,
            "session_id": self.session_id,
            "current_stage": self.current_stage,
            "stage_index": self.stage_index,
            "turn": self.turn,
            "data": data
        }
        logger.info(f"ACTION: {action} | {json.dumps(log_entry, indent=2)}")
        
    def make_request(self, method: str, endpoint: str, data: Dict = None) -> Optional[Dict]:
        """Make HTTP request using urllib"""
        try:
            url = f"{self.api_base_url}{endpoint}"
            
            if data:
                json_data = json.dumps(data).encode('utf-8')
            else:
                json_data = None
            
            # Create request
            req = urllib.request.Request(
                url,
                data=json_data,
                method=method,
                headers={
                    'Content-Type': 'application/json',
                    'User-Agent': 'CrewAI-CLI-Debug/1.0'
                }
            )
            
            # Make request
            with urllib.request.urlopen(req, timeout=30) as response:
                response_data = response.read().decode('utf-8')
                if response_data:
                    return json.loads(response_data)
                return None
                
        except urllib.error.URLError as e:
            logger.error(f"URL Error: {e}")
            if "Connection refused" in str(e):
                print(f"❌ Connection refused to {self.api_base_url}")
                print(f"💡 Make sure the API service is running on {self.api_base_url}")
                if PORT_MANAGER_AVAILABLE:
                    print(f"💡 Check port configuration in config/ports.yml")
                print(f"💡 Run './start-dev.sh' in the bebrahma directory to start services.")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"JSON Decode Error: {e}")
            return None
        except Exception as e:
            logger.error(f"Request Error: {e}")
            return None
        
    def check_api_health(self) -> bool:
        """Check if the API is running"""
        try:
            response = urllib.request.urlopen(f"{self.api_base_url}/health", timeout=5)
            if response.getcode() == 200:
                logger.info("✅ API is healthy")
                return True
            else:
                logger.error(f"❌ API returned status {response.getcode()}")
                return False
        except Exception as e:
            logger.error(f"❌ Cannot connect to API: {e}")
            return False
    
    def start_crew_session(self, task: str) -> bool:
        """Start a new crew session"""
        self.log_action("start_crew_session", {"task": task})
        
        data = {
            "sessionId": self.session_id,
            "task": task,
            "context": {"stepId": ""}
        }
        
        response_data = self.make_request("POST", "/api/chat/crew/start", data)
        
        if response_data and response_data.get("success"):
            logger.info(f"✅ Crew session started successfully")
            
            # Update stage from API response
            if response_data.get("stage"):
                self.current_stage = response_data["stage"]
                self.stage_index = self.stages.index(self.current_stage)
                logger.info(f"📊 Current stage: {self.current_stage} (index: {self.stage_index})")
            
            # Log all messages
            messages = response_data.get("messages", [])
            logger.info(f"📝 Received {len(messages)} messages")
            
            for i, msg in enumerate(messages):
                self.log_action("message_received", {
                    "message_index": i,
                    "message_id": msg.get("id"),
                    "sender": msg.get("sender"),
                    "content": msg.get("content")[:100] + "..." if len(msg.get("content", "")) > 100 else msg.get("content", ""),
                    "type": msg.get("type"),
                    "stage": msg.get("metadata", {}).get("stage")
                })
            
            return True
        else:
            logger.error(f"❌ Failed to start crew session")
            return False
    
    def advance_crew_turn(self) -> bool:
        """Advance to the next crew turn"""
        self.log_action("advance_crew_turn")
        
        data = {"sessionId": self.session_id}
        response_data = self.make_request("POST", "/api/chat/crew/next", data)
        
        if response_data and response_data.get("success"):
            logger.info(f"✅ Crew turn advanced successfully")
            
            # Update stage from API response
            if response_data.get("stage"):
                self.current_stage = response_data["stage"]
                self.stage_index = self.stages.index(self.current_stage)
                logger.info(f"📊 Current stage: {self.current_stage} (index: {self.stage_index})")
            
            # Log new messages
            messages = response_data.get("messages", [])
            logger.info(f"📝 Received {len(messages)} messages in this turn")
            
            for i, msg in enumerate(messages):
                self.log_action("turn_message_received", {
                    "message_index": i,
                    "message_id": msg.get("id"),
                    "sender": msg.get("sender"),
                    "content": msg.get("content")[:100] + "..." if len(msg.get("content", "")) > 100 else msg.get("content", ""),
                    "type": msg.get("type"),
                    "stage": msg.get("metadata", {}).get("stage")
                })
            
            return True
        else:
            logger.error(f"❌ Failed to advance crew turn")
            return False
    
    def make_decision(self, decision: str, user_message: str = "") -> bool:
        """Make a decision (approve/refine/reject/pause)"""
        self.log_action("make_decision", {"decision": decision, "user_message": user_message})
        
        data = {
            "sessionId": self.session_id,
            "decision": decision,
            "userMessage": user_message
        }
        
        response_data = self.make_request("POST", "/api/chat/decision", data)
        
        if response_data and response_data.get("success"):
            logger.info(f"✅ Decision '{decision}' processed successfully")
            
            # Update stage from API response
            if response_data.get("stage"):
                self.current_stage = response_data["stage"]
                self.stage_index = self.stages.index(self.current_stage)
                logger.info(f"📊 Stage advanced to: {self.current_stage} (index: {self.stage_index})")
            
            # Log decision result
            messages = response_data.get("messages", [])
            logger.info(f"📝 Decision resulted in {len(messages)} messages")
            
            return True
        else:
            logger.error(f"❌ Failed to process decision")
            return False
    
    def continue_after_decision(self, phase: str = "next") -> bool:
        """Continue after a decision"""
        self.log_action("continue_after_decision", {"phase": phase})
        
        data = {
            "sessionId": self.session_id,
            "phase": phase,
            "userMessage": "Continue analysis"
        }
        
        response_data = self.make_request("POST", "/api/chat/continue", data)
        
        if response_data and response_data.get("success"):
            logger.info(f"✅ Continue request processed successfully")
            
            # Update stage from API response
            if response_data.get("stage"):
                self.current_stage = response_data["stage"]
                self.stage_index = self.stages.index(self.current_stage)
                logger.info(f"📊 Current stage: {self.current_stage} (index: {self.stage_index})")
            
            # Log continue result
            messages = response_data.get("messages", [])
            logger.info(f"📝 Continue resulted in {len(messages)} messages")
            
            return True
        else:
            logger.error(f"❌ Failed to continue")
            return False
    
    def display_current_status(self):
        """Display current workflow status"""
        print("\n" + "="*60)
        print(f"📊 WORKFLOW STATUS")
        print("="*60)
        print(f"Session ID: {self.session_id}")
        print(f"Current Stage: {self.current_stage}")
        print(f"Stage Index: {self.stage_index}/{len(self.stages)-1}")
        print(f"All Stages: {' → '.join(self.stages)}")
        print(f"Turn: {self.turn}")
        print(f"Log File: {log_file}")
        print("="*60)
    
    def display_stage_options(self):
        """Display available stage progression options"""
        print("\n" + "="*60)
        print(f"🎯 STAGE PROGRESSION OPTIONS")
        print("="*60)
        print("1. Advance Turn (Enter) - Move to next agent contribution")
        print("2. Approve & Continue (A) - Approve current stage and move to next")
        print("3. Refine & Continue (R) - Refine current stage analysis")
        print("4. Reject & Restart (X) - Reject current stage and restart")
        print("5. Pause & Save (P) - Pause current stage for later")
        print("6. Show Status (S) - Display current workflow status")
        print("7. Help (H) - Show detailed help and workflow explanation")
        print("8. Quit (Q) - Exit CLI")
        print("="*60)
    
    def display_help(self):
        """Display detailed help information"""
        print("\n" + "="*60)
        print(f"📚 CREWAI WORKFLOW HELP")
        print("="*60)
        print("This CLI simulates the complete CrewAI workflow for SaaS business analysis.")
        print("")
        print("🎯 WORKFLOW STAGES:")
        print("1. PROBLEM_CAPTURE - Define and understand the business problem")
        print("2. PROBLEM_CLARIFICATION - Deep dive into problem details")
        print("3. SOLUTION_BRAINSTORM - Generate potential solutions")
        print("4. COMPETITOR_ANALYSIS - Analyze competitive landscape")
        print("5. SCA_ANALYSIS - Sustainable Competitive Advantage analysis")
        print("6. MVP_PLANNING - Plan Minimum Viable Product")
        print("7. TASK_GENERATION - Create actionable tasks")
        print("")
        print("🔄 HOW TO USE:")
        print("• Press Enter to advance through agent contributions")
        print("• Each stage has multiple turns with different agents")
        print("• Approve (A) when ready to move to next stage")
        print("• Refine (R) if you want more analysis")
        print("• Reject (X) to restart current stage")
        print("• Pause (P) to save progress")
        print("")
        print("📊 MONITORING:")
        print("• Use Status (S) to see current progress")
        print("• Watch stage index change: 0/6 → 1/6 → 2/6...")
        print("• All actions are logged to file for analysis")
        print("="*60)
    
    def run_interactive_session(self, task: str):
        """Run the interactive CLI session"""
        print("\n🚀 CREWAI CLI DEBUG INTERFACE")
        print("="*60)
        print(f"Task: {task}")
        print(f"Session ID: {self.session_id}")
        print(f"Log File: {log_file}")
        print("="*60)
        
        # Check API health
        if not self.check_api_health():
            print("❌ API is not available. Please start the backend services.")
            print("💡 Run './start-dev.sh' in the bebrahma directory to start services.")
            return
        
        # Start crew session
        print(f"\n🔄 Starting crew session...")
        if not self.start_crew_session(task):
            print("❌ Failed to start crew session")
            print("💡 Check that the CrewAI service is running on the expected port.")
            return
        
        print("✅ Crew session started successfully!")
        print("🎉 You're now ready to experience the complete CrewAI workflow!")
        print("💡 Use 'H' for help, 'S' for status, or just press Enter to advance.")
        self.display_current_status()
        
        # Main interaction loop
        while True:
            try:
                self.display_stage_options()
                
                # Get user input
                user_input = input("\n🎯 Enter your choice (or press Enter to advance turn): ").strip().upper()
                
                if user_input == "" or user_input == "1":
                    # Advance turn
                    print(f"\n🔄 Advancing crew turn...")
                    if self.advance_crew_turn():
                        print("✅ Turn advanced successfully!")
                        self.turn += 1
                        self.display_current_status()
                    else:
                        print("❌ Failed to advance turn")
                
                elif user_input == "A" or user_input == "2":
                    # Approve and continue
                    print(f"\n✅ Approving current stage and continuing...")
                    if self.make_decision("approve"):
                        print("✅ Decision approved!")
                        if self.continue_after_decision("next"):
                            print("✅ Continued to next phase!")
                            self.turn = 0  # Reset turn for new stage
                            self.display_current_status()
                        else:
                            print("❌ Failed to continue")
                    else:
                        print("❌ Failed to approve")
                
                elif user_input == "R" or user_input == "3":
                    # Refine and continue
                    print(f"\n🔄 Refining current stage...")
                    if self.make_decision("refine"):
                        print("✅ Decision refined!")
                        if self.continue_after_decision("refine"):
                            print("✅ Continued with refinement!")
                            self.turn = 1  # Reset turn for refinement
                            self.display_current_status()
                        else:
                            print("❌ Failed to continue")
                    else:
                        print("❌ Failed to refine")
                
                elif user_input == "X" or user_input == "4":
                    # Reject and restart
                    print(f"\n❌ Rejecting current stage...")
                    if self.make_decision("reject"):
                        print("✅ Decision rejected!")
                        self.turn = 0  # Reset turn
                        self.display_current_status()
                    else:
                        print("❌ Failed to reject")
                
                elif user_input == "P" or user_input == "5":
                    # Pause and save
                    print(f"\n⏸️ Pausing current stage...")
                    if self.make_decision("pause"):
                        print("✅ Decision paused!")
                        self.display_current_status()
                    else:
                        print("❌ Failed to pause")
                
                elif user_input == "S" or user_input == "6":
                    # Show status
                    self.display_current_status()
                
                elif user_input == "H" or user_input == "7":
                    # Show help
                    self.display_help()
                
                elif user_input == "Q" or user_input == "8":
                    # Quit
                    print(f"\n👋 Exiting CLI. Check the log file for details: {log_file}")
                    break
                
                else:
                    print(f"❌ Invalid choice: {user_input}")
                
                # Add a small delay for readability
                time.sleep(1)
                
            except KeyboardInterrupt:
                print(f"\n\n⚠️ Interrupted by user. Check the log file for details: {log_file}")
                break
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                print(f"❌ Unexpected error: {e}")
                print(f"Check the log file for details: {log_file}")

def main():
    """Main entry point"""
    print("\n🚀 CREWAI CLI DEBUG INTERFACE")
    print("="*60)
    print("Welcome! This CLI will help you debug the CrewAI workflow.")
    print("="*60)
    
    # Get task interactively
    print("\n📝 Please enter your SaaS business problem/idea:")
    print("(Example: AI-powered Legal Aid Assistants for rural communities)")
    print("(Press Enter twice to use default example)")
    
    lines = []
    while True:
        line = input()
        if line.strip() == "":
            if lines:  # Empty line after content
                break
            else:  # First empty line - use default
                task = "AI-powered Legal Aid Assistants Small LMs that help translate legal documents, explain legal rights, and facilitate court process understanding in local languages for underrepresented or rural communities"
                print(f"Using default example: {task[:50]}...")
                break
        lines.append(line)
    
    if not lines:
        # Use default task
        pass
    else:
        task = " ".join(lines)
    
    print(f"\n🎯 Task: {task}")
    print("="*60)
    
    # Create CLI interface
    cli = CrewAICLIDebug()
    
    try:
        # Run interactive session
        cli.run_interactive_session(task)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        print(f"❌ Fatal error: {e}")
        print(f"Check the log file for details: {log_file}")

if __name__ == "__main__":
    main()
