# BeBrahma AI Troubleshooting Guide

## 🚨 **Common Issues and Solutions**

### **1. Service Connection Issues**

#### **Problem: API Gateway can't connect to Workflow Service**
```
Error: Failed to start workflow session
Details: Workflow start failed: 500 Internal Server Error
```

**Solutions:**
1. **Check if Workflow Service is running:**
   ```bash
   curl http://localhost:5056/
   # Should return: {"service": "BeBrahma LangGraph Workflow Service", "status": "running"}
   ```

2. **Verify environment variables:**
   ```bash
   # In .env.local
   WORKFLOW_SERVICE_URL=http://localhost:5056
   ```

3. **Check Workflow Service logs:**
   ```bash
   cd apps/workflow-service
   source .venv/bin/activate
   python3 -m uvicorn src.main:app --host 0.0.0.0 --port 5056 --reload
   ```

#### **Problem: API Gateway can't connect to CrewAI Service**
```
Error: Failed to start workflow session
Details: Crew start failed: 500 Internal Server Error
```

**Solutions:**
1. **Check if CrewAI Service is running:**
   ```bash
   curl http://localhost:5055/
   # Should return: {"service": "BeBrahma CrewAI Service", "status": "running"}
   ```

2. **Verify environment variables:**
   ```bash
   # In .env.local
   CREW_SERVICE_URL=http://localhost:5055
   ```

3. **Check CrewAI Service logs:**
   ```bash
   cd apps/crew-service
   source .venv/bin/activate
   python3 -m uvicorn main:app --host 0.0.0.0 --port 5055 --reload
   ```

### **2. Python Dependency Issues**

#### **Problem: Rust compiler missing for Python dependencies**
```
ERROR: Failed building wheel for pydantic-core, tiktoken
error: failed-wheel-build-for-install
```

**Solutions:**
1. **Install Rust compiler:**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   ```

2. **Verify Rust installation:**
   ```bash
   rustc --version
   cargo --version
   ```

3. **Reinstall Python dependencies:**
   ```bash
   cd apps/crew-service
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

#### **Problem: Python 3.13 compatibility issues**
```
TypeError: ForwardRef._evaluate() missing 1 required keyword-only argument: 'recursive_guard'
```

**Solutions:**
1. **Use Python 3.11 or 3.12:**
   ```bash
   python3.11 --version
   # or
   python3.12 --version
   ```

2. **Create virtual environment with compatible Python version:**
   ```bash
   python3.11 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

### **3. Port Conflicts**

#### **Problem: Port already in use**
```
ERROR: [Errno 48] Address already in use
```

**Solutions:**
1. **Find process using the port:**
   ```bash
   lsof -ti:5055  # For CrewAI Service
   lsof -ti:5056  # For Workflow Service
   lsof -ti:3002  # For API Gateway
   ```

2. **Kill the process:**
   ```bash
   lsof -ti:5055 | xargs kill -9
   ```

3. **Check if service is running in another terminal:**
   ```bash
   ps aux | grep -E "(uvicorn|node|npm)" | grep -v grep
   ```

### **4. Environment Variable Issues**

#### **Problem: Environment variables not loaded**
```
Error: WORKFLOW_SERVICE_URL is undefined
```

**Solutions:**
1. **Check .env.local file:**
   ```bash
   cat .env.local
   # Should contain:
   # WORKFLOW_SERVICE_URL=http://localhost:5056
   # CREW_SERVICE_URL=http://localhost:5055
   ```

2. **Restart services after environment changes:**
   ```bash
   # Stop all services
   npm run stop-dev
   
   # Start services again
   npm run dev
   ```

3. **Verify environment loading in API Gateway:**
   ```bash
   # Check API Gateway logs for environment loading
   # Should show: 🔧 Environment loading complete
   ```

### **5. Workflow Execution Issues**

#### **Problem: Workflow not advancing stages**
```
Workflow stays in "PROBLEM_CAPTURE" stage
pendingDecision is always false
```

**Solutions:**
1. **Check CrewAI Service integration:**
   ```bash
   # Test direct CrewAI service
   curl -X POST http://localhost:5055/api/crew/start \
     -H "Content-Type: application/json" \
     -d '{"sessionId": "test-123", "stage": "PROBLEM_CAPTURE", "objectives": ["test"], "requiredAgents": ["facilitator"]}'
   ```

2. **Check Workflow Service logs:**
   ```bash
   cd apps/workflow-service
   source .venv/bin/activate
   python3 -m uvicorn src.main:app --host 0.0.0.0 --port 5056 --reload
   ```

3. **Verify LangGraph workflow configuration:**
   ```bash
   # Check workflow service logs for LangGraph errors
   # Look for: "unknown target" or routing errors
   ```

#### **Problem: No messages generated**
```
API calls return 0 messages
Workflow appears stuck
```

**Solutions:**
1. **Check CrewAI Service status:**
   ```bash
   curl http://localhost:5055/
   ```

2. **Verify OpenAI API key:**
   ```bash
   # In .env.local
   OPENAI_API_KEY=sk-...
   ```

3. **Test CrewAI service directly:**
   ```bash
   curl -X POST http://localhost:5055/api/crew/next \
     -H "Content-Type: application/json" \
     -d '{"sessionId": "test-123"}'
   ```

### **6. Frontend Issues**

#### **Problem: Infinite loop on Approve button**
```
Web UI stuck in infinite loop
Console shows repeated API calls
```

**Solutions:**
1. **Check browser console for errors:**
   ```bash
   # Open browser developer tools
   # Look for JavaScript errors or failed API calls
   ```

2. **Verify API Gateway endpoints:**
   ```bash
   # Check if /api/chat/decision is working
   curl -X POST http://localhost:3002/api/chat/decision \
     -H "Content-Type: application/json" \
     -d '{"sessionId": "test", "decision": "approve"}'
   ```

3. **Clear browser cache and reload:**
   ```bash
   # Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
   ```

#### **Problem: Framer Motion animations not working**
```
Agent avatars not visible
Messages not animating in
```

**Solutions:**
1. **Check Framer Motion installation:**
   ```bash
   cd apps/web
   npm list framer-motion
   ```

2. **Reinstall Framer Motion:**
   ```bash
   npm install framer-motion@latest
   ```

3. **Check for CSS conflicts:**
   ```bash
   # Look for CSS that might override Framer Motion styles
   # Check for opacity: 0 or transform: scale(0)
   ```

### **7. Database and State Issues**

#### **Problem: SQLite database locked**
```
Error: database is locked
```

**Solutions:**
1. **Check for multiple processes:**
   ```bash
   ps aux | grep -E "(crew|workflow)" | grep -v grep
   ```

2. **Kill all related processes:**
   ```bash
   pkill -f "crew-service"
   pkill -f "workflow-service"
   ```

3. **Remove lock files:**
   ```bash
   cd apps/crew-service
   rm -f memory.db-shm memory.db-wal
   ```

#### **Problem: Session state lost**
```
Session not found errors
Workflow state reset unexpectedly
```

**Solutions:**
1. **Check session persistence:**
   ```bash
   # Verify database files exist
   ls -la apps/crew-service/memory.db*
   ```

2. **Check service restarts:**
   ```bash
   # Services should maintain state across restarts
   # If not, check database configuration
   ```

3. **Verify session ID consistency:**
   ```bash
   # Ensure session IDs are being passed correctly
   # Check for session ID generation issues
   ```

---

## 🔧 **Debugging Commands**

### **1. Service Health Checks**
```bash
# Check all services
echo "=== API Gateway ===" && curl -s http://localhost:3002/health | jq '.status'
echo "=== CrewAI Service ===" && curl -s http://localhost:5055/ | jq '.service, .status'
echo "=== Workflow Service ===" && curl -s http://localhost:5056/ | jq '.service, .status'
```

### **2. Process Monitoring**
```bash
# Check running processes
ps aux | grep -E "(uvicorn|node|npm)" | grep -v grep

# Check port usage
lsof -i :3002 -i :5055 -i :5056
```

### **3. Log Analysis**
```bash
# Check API Gateway logs
cd apps/api && npm run dev

# Check CrewAI Service logs
cd apps/crew-service && source .venv/bin/activate && python3 -m uvicorn main:app --host 0.0.0.0 --port 5055

# Check Workflow Service logs
cd apps/workflow-service && source .venv/bin/activate && python3 -m uvicorn src.main:app --host 0.0.0.0 --port 5056
```

### **4. Environment Verification**
```bash
# Check environment variables
cat .env.local

# Check if services can read environment
cd apps/api && node -e "require('dotenv').config(); console.log('WORKFLOW_SERVICE_URL:', process.env.WORKFLOW_SERVICE_URL)"
```

---

## 📋 **Troubleshooting Checklist**

### **Before Starting Services:**
- [ ] Environment variables configured in `.env.local`
- [ ] Python virtual environments activated
- [ ] Node.js dependencies installed
- [ ] Ports 3002, 5055, 5056 available

### **Service Startup:**
- [ ] API Gateway starts without errors
- [ ] CrewAI Service starts without errors
- [ ] Workflow Service starts without errors
- [ ] All services respond to health checks

### **Integration Testing:**
- [ ] API Gateway can reach CrewAI Service
- [ ] API Gateway can reach Workflow Service
- [ ] Workflow Service can reach CrewAI Service
- [ ] Basic workflow operations work

### **Common Issues:**
- [ ] Python dependencies installed correctly
- [ ] Rust compiler available (if needed)
- [ ] OpenAI API key valid
- [ ] No port conflicts
- [ ] Database files accessible

---

## 🆘 **Getting Help**

### **1. Check Logs First**
Always check service logs before asking for help:
```bash
# API Gateway logs
cd apps/api && npm run dev

# CrewAI Service logs
cd apps/crew-service && source .venv/bin/activate && python3 -m uvicorn main:app --host 0.0.0.0 --port 5055

# Workflow Service logs
cd apps/workflow-service && source .venv/bin/activate && python3 -m uvicorn src.main:app --host 0.0.0.0 --port 5056
```

### **2. Verify Basic Setup**
Run these commands to verify basic setup:
```bash
# Check all services
curl -s http://localhost:3002/health | jq '.status'
curl -s http://localhost:5055/ | jq '.service, .status'
curl -s http://localhost:5056/ | jq '.service, .status'
```

### **3. Test Basic Workflow**
Try a simple workflow to isolate issues:
```bash
# Start workflow
curl -X POST http://localhost:3002/api/chat/crew/start \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-123", "task": "Test task"}'
```

### **4. Common Solutions**
- **Service not responding**: Check if service is running and port is available
- **Connection refused**: Verify service URL and port in environment variables
- **500 errors**: Check service logs for detailed error messages
- **No messages**: Verify OpenAI API key and CrewAI service integration

---

*For additional help, check the [Development Guidelines](./development-guidelines.md) or contact the development team.*
