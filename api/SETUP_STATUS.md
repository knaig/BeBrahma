# BeBrahma FastAPI Backend - Setup Issues & Fixes Needed

## Status: ⚠️ Partially Fixed, Needs More Work

The new FastAPI backend (commit `af37884`) has significant setup issues that prevent it from running. Here's what was attempted and what still needs fixing:

## ✅ Fixes Applied

1. **Dependencies Installed**
   - Installed core packages: FastAPI, SQLAlchemy, Alembic, Anthropic, OpenAI, Redis, etc.
   - Fixed `clerk-backend-api` version conflict (updated to 4.2.0)
   - Installed `aiosqlite` for SQLite database support
   - Installed `python-json-logger` for logging

2. **Environment Configuration**
   - Created `/api/.env` with basic configuration
   - Set DATABASE_URL to use SQLite instead of PostgreSQL
   - Configured CORS_ORIGINS as JSON array
   - Added placeholder API keys

3. **Model Fixes**
   - Renamed `metadata` fields to `meta_data` in all models (SQLAlchemy reserves `metadata`)
   - Added `JSON` import to model files

## ❌ Remaining Issues

### 1. Pydantic Schema Generation Error
**File**: `/api/app/schemas/nba.py` (line 116)
**Error**: `Dict[str, any]` type annotation is invalid
**Fix Needed**: Change `any` to `Any` (capital A) and add `from typing import Any` import

### 2. Missing Type Imports
Multiple schema files likely have similar typing issues:
- Need to import `Any`, `List`, `Dict`, `Optional` from `typing`
- Review all Pydantic models in `/api/app/schemas/`

### 3. Database Migrations
- Alembic migrations haven't been run
- Need to create initial database schema
- Command: `cd api && alembic upgrade head`

### 4. Real API Keys Needed
Current `.env` has placeholders:
- `ANTHROPIC_API_KEY` - needs real key from `/Users/karthiknaig/Projects/BeBrahma/.env.local`
- `OPENAI_API_KEY` - needs real key from `/Users/karthiknaig/Projects/BeBrahma/.env.local`
- `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` - needs real keys

### 5. Redis Dependency (Optional)
- Code expects Redis for caching
- Either install Redis (`brew install redis && redis-server`)
- Or modify code to make Redis optional

## 🔧 Quick Fix Script

```bash
# 1. Fix Pydantic schema typing errors
cd /Users/karthiknaig/Projects/BeBrahma/api
find app/schemas -name "*.py" -exec sed -i '' 's/Dict\[str, any\]/Dict[str, Any]/g' {} \;
find app/schemas -name "*.py" -exec sed -i '' 's/List\[any\]/List[Any]/g' {} \;

# 2. Add missing imports to schema files
for file in app/schemas/*.py; do
  if ! grep -q "from typing import Any" "$file"; then
    sed -i '' '1i\
from typing import Any, Dict, List, Optional\
' "$file"
  fi
done

# 3. Copy real API keys from root .env.local
OPENAI_KEY=$(grep "^OPENAI_API_KEY=" ../.env.local | cut -d'=' -f2)
ANTHROPIC_KEY=$(grep "^ANTHROPIC_API_KEY=" ../.env.local | cut -d'=' -f2)
sed -i '' "s/^OPENAI_API_KEY=.*/OPENAI_API_KEY=$OPENAI_KEY/" .env
sed -i '' "s/^ANTHROPIC_API_KEY=.*/ANTHROPIC_API_KEY=$ANTHROPIC_KEY/" .env

# 4. Run database migrations
source venv/bin/activate
alembic upgrade head

# 5. Start the API
uvicorn app.main:app --reload --host 0.0.0.0 --port 3001
```

## 📋 What This Backend Provides

Once working, this FastAPI backend offers:

### Core Features
- **NBA Engine**: Next Best Action recommendation system
- **Framework Router**: Auto-selects business frameworks (Lean Canvas, ICP+Wedge, Critical Unknown Mapping)
- **Multi-Tier LLM**: Uses GPT-3.5 for classification, Claude Sonnet for reasoning, Claude Opus for complex tasks
- **Override Learning**: Learns from user choices to improve recommendations
- **Business State Graph**: PostgreSQL-based context storage

### API Endpoints
- `POST /api/v1/nba/recommend` - Get next best action
- `POST /api/v1/onboarding` - Initial business context capture
- `GET /api/v1/context/{user_id}` - Retrieve business state
- Integration endpoints for Google Calendar, Linear, Asana

### Database Models
- `Objective` - Business goals
- `Task` - Actionable items with STAR format
- `Decision` - Strategic decisions with rationale
- `Unknown` - Critical unknowns to validate
- `Evidence` - Supporting data/signals
- `NBARecommendation` - Scored recommendations
- `Override` - User choice tracking for learning

## 🎯 Alignment with Your Vision

This backend is **much more aligned** with your dopamine-driven clarity engine vision:

✅ Framework-based approach (auto-selects right framework)
✅ NBA engine (provides clear "what's next")
✅ STAR-formatted tasks (Situation, Task, Action, Result)
✅ Assumption tracking (Critical Unknowns model)
✅ Multi-tier LLM (uses best model for each task)
✅ Learning system (improves from user choices)

## 🚀 Recommended Next Steps

1. **Run the quick fix script above** to resolve typing errors
2. **Test the API** at http://localhost:3001/api/docs (Swagger UI)
3. **Review the design docs** in `/docs/bebrahma-v2/design/` to understand the architecture
4. **Test NBA endpoint** with a sample business idea
5. **Integrate with frontend** (replace old chat routes)

## ⏱️ Time Estimate

- Quick fixes: 10-15 minutes
- Full integration with frontend: 1-2 hours
- Testing and refinement: 2-3 hours

---

**Current State**: Old Node.js/TypeScript stack is still running and working (ports 3000, 4000, 5055)
**Target State**: New FastAPI backend on port 3001 with framework-based NBA engine
