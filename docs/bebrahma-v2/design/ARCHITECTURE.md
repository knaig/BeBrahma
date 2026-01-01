# System Architecture Design
## BeBrahma AI Co-Founder v0.3

**Document Version:** 1.0
**Date:** 2025-01-01
**Status:** Draft
**Traceability:** DES-001 through DES-024

---

## 1. Overview

BeBrahma is a mobile-first AI co-founder that recommends next best actions based on continuous business state analysis and framework-driven reasoning.

**Key Architecture Principles:**
1. Mobile-first (React Native) with web companion
2. Voice and text input with <1s response
3. PostgreSQL for Business State Graph (not Neo4j initially)
4. LLM-powered reasoning engine with caching
5. System of record for decisions, not execution
6. Progressive profiling over setup wizards

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENT LAYER                          │
├──────────────────┬──────────────────────────────────────┤
│  Mobile App      │  Web App (Companion)                 │
│  (React Native)  │  (React + TypeScript)                │
│  - iOS           │  - PWA                                │
│  - Android       │  - Desktop view                       │
│                  │                                       │
│  Voice/Text Input│  Extended views (Business Map, etc.) │
│  Quick capture   │  Power user features                 │
│  Offline-first   │                                       │
└──────────────────┴──────────────────────────────────────┘
                         ↕ HTTPS/WSS
┌─────────────────────────────────────────────────────────┐
│                   API GATEWAY                           │
│  - Authentication (Clerk)                               │
│  - Rate limiting                                        │
│  - Request routing                                      │
│  - WebSocket connections                                │
└─────────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────────┐
│                APPLICATION LAYER (FastAPI)              │
├─────────────────┬───────────────────┬───────────────────┤
│  Intent Service │  NBA Engine       │ Integration Layer │
│  - Voice/text   │  - Priority calc  │ - Calendar sync   │
│  - Classification│ - Framework router│ - Linear/Asana   │
│  - Entity extract│ - Confidence score│ - Email (Phase 2) │
│                 │  - Rationale gen  │                   │
└─────────────────┴───────────────────┴───────────────────┘
                         ↕
┌─────────────────────────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER                   │
├─────────────────┬───────────────────┬───────────────────┤
│  Graph Service  │  Learning Engine  │  Framework Library│
│  - Query graph  │  - Override learn │  - Problem-Solution│
│  - Update state │  - Pattern detect │  - ICP+Wedge      │
│  - Compute paths│  - Weight adjust  │  - Critical Unknown│
└─────────────────┴───────────────────┴───────────────────┘
                         ↕
┌─────────────────────────────────────────────────────────┐
│                    DATA LAYER                           │
├──────────────────┬──────────────────┬───────────────────┤
│  PostgreSQL      │  Redis           │  Object Storage   │
│  - Business State│  - Session cache │  - Voice recordings│
│  - Relationships │  - LLM cache     │  - Export files   │
│  - pg vector (opt)│ - Job queue     │                   │
└──────────────────┴──────────────────┴───────────────────┘
                         ↕
┌─────────────────────────────────────────────────────────┐
│                 EXTERNAL SERVICES                       │
├──────────────────┬──────────────────┬───────────────────┤
│  LLM Providers   │  Voice Services  │  Integrations     │
│  - Anthropic/OpenAI│ - Transcription│  - Google Calendar│
│  - Structured out│  - TTS (future)  │  - Linear API     │
│  - Embeddings    │                  │  - Asana API      │
└──────────────────┴──────────────────┴───────────────────┘
```

---

## 3. Component Specifications

### 3.1 Mobile App (React Native)

**Traceability:** DES-021

**Technology Stack:**
- React Native 0.73+
- TypeScript
- React Navigation 6.x
- React Query (data fetching/caching)
- Zustand (state management)
- Expo Voice (voice input)
- AsyncStorage (offline persistence)

**Key Modules:**

```typescript
mobile/
├── src/
│   ├── screens/
│   │   ├── Home.tsx             // FR-002: Recommendation display
│   │   ├── Conversation.tsx     // FR-003, FR-004: Voice/text input
│   │   ├── Rationale.tsx        // FR-005: Expanded reasoning
│   │   ├── Alternatives.tsx     // FR-006: Alternative actions
│   │   ├── Settings.tsx         // FR-016: Multi-venture
│   ├── components/
│   │   ├── RecommendationCard.tsx // Main UI component
│   │   ├── ConfidenceBadge.tsx    // FR-010: Confidence display
│   │   ├── VoiceInput.tsx         // FR-003: Voice capture
│   │   ├── QuickUpdate.tsx        // FR-008: Quick logging
│   ├── services/
│   │   ├── api.ts              // API client
│   │   ├── voice.ts            // Voice transcription
│   │   ├── offline.ts          // Offline queue
│   │   ├── sync.ts             // Background sync
│   ├── store/
│   │   ├── businessContext.ts  // Local business state
│   │   ├── recommendations.ts  // Current NBA cache
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   └── utils/
│       ├── formatters.ts
│       └── validators.ts
├── ios/
├── android/
└── package.json
```

**Offline Strategy:**
- Store last recommendation in AsyncStorage
- Queue updates (voice notes, status changes) for sync
- Show offline indicator clearly
- Sync on reconnect with conflict resolution

---

### 3.2 Backend API (FastAPI)

**Traceability:** DES-020

**Technology Stack:**
- Python 3.11+
- FastAPI 0.104+
- SQLAlchemy 2.0 (ORM)
- Pydantic (validation)
- Celery (background jobs)
- Redis (caching + queue)

**API Structure:**

```python
api/
├── app/
│   ├── main.py                 // FastAPI app
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── intent.py        // FR-001: Progressive profiling
│   │   │   │   ├── nba.py           // FR-002: Recommendation endpoint
│   │   │   │   ├── updates.py       // FR-008: Log updates
│   │   │   │   ├── context.py       // FR-007: Get business context
│   │   │   │   ├── override.py      // FR-009: Override learning
│   │   │   │   ├── integrations.py  // FR-011, FR-012: Calendar/Task sync
│   │   │   │   └── export.py        // FR-015: Data export
│   │   │   └── router.py
│   ├── core/
│   │   ├── config.py           // Settings
│   │   ├── security.py         // Auth (NFR-003)
│   │   ├── db.py              // Database connection
│   │   └── cache.py           // Redis cache
│   ├── services/
│   │   ├── intent_service.py   // Intent understanding
│   │   ├── nba_engine.py      // FR-002: NBA computation
│   │   ├── framework_router.py // FR-014: Framework selection
│   │   ├── graph_service.py   // FR-013: Graph queries
│   │   ├── learning_service.py // FR-009: Override learning
│   │   ├── integration/
│   │   │   ├── calendar.py    // FR-011: Google Calendar
│   │   │   ├── linear.py      // FR-012: Linear API
│   │   │   └── asana.py       // FR-012: Asana API (alternative)
│   │   └── llm/
│   │       ├── anthropic.py   // Claude for reasoning
│   │       ├── openai.py      // GPT-4 alternative
│   │       └── embeddings.py  // Semantic search
│   ├── models/
│   │   ├── business.py        // SQLAlchemy models
│   │   ├── task.py
│   │   ├── decision.py
│   │   └── ...                // (see DATA_MODEL.md)
│   ├── schemas/
│   │   ├── nba.py            // Pydantic schemas
│   │   ├── update.py
│   │   └── ...
│   ├── frameworks/
│   │   ├── base.py           // Base framework interface
│   │   ├── problem_solution_fit.py  // FR-014
│   │   ├── icp_wedge.py      // FR-014
│   │   └── critical_unknown.py      // FR-014
│   └── utils/
│       ├── scoring.py        // Priority calculation
│       ├── confidence.py     // Confidence computation
│       └── rationale.py      // Rationale generation
├── tests/
└── requirements.txt
```

**API Endpoints:**

```python
# Recommendation Flow
POST   /api/v1/ask                    # FR-001, FR-002: Ask what to do
POST   /api/v1/updates                # FR-008: Log update (voice/text)
GET    /api/v1/nba                    # FR-002: Get current recommendation
GET    /api/v1/rationale/{nba_id}     # FR-005: Get full rationale
GET    /api/v1/alternatives/{nba_id}  # FR-006: Get alternatives
POST   /api/v1/override               # FR-009: Override recommendation

# Context Management
GET    /api/v1/context                # FR-007: Get business context
POST   /api/v1/context/update         # Update context manually
GET    /api/v1/context/changes        # What changed since last session

# Integrations
POST   /api/v1/integrations/calendar/sync    # FR-011: Sync calendar
POST   /api/v1/integrations/tasks/sync       # FR-012: Sync Linear/Asana
GET    /api/v1/integrations/status           # Integration status

# Data Management
GET    /api/v1/export                 # FR-015: Export all data
POST   /api/v1/ventures               # FR-016: Create venture
GET    /api/v1/ventures               # FR-016: List ventures
PUT    /api/v1/ventures/{id}/switch   # FR-016: Switch venture
DELETE /api/v1/ventures/{id}          # Delete venture + data

# Voice
POST   /api/v1/voice/transcribe       # FR-003: Transcribe voice note
```

---

### 3.3 Database Schema (PostgreSQL)

**Traceability:** DES-011 (FR-013)

**See:** `/docs/bebrahma-v2/design/DATA_MODEL.md` for detailed schema

**Key Tables:**
- `business_contexts` - Venture metadata
- `objectives` - Business goals with timelines
- `tasks` - Actions with NBA scores
- `critical_unknowns` - Key assumptions to test
- `evidence` - Signals and outcomes
- `decision_points` - Decisions made + rationale
- `signals` - Events that trigger re-evaluation
- `framework_applications` - Which frameworks applied when

**Indexes:**
- `tasks.priority` (for NBA sorting)
- `tasks.status` (active filtering)
- `evidence.timestamp` (recency)
- `critical_unknowns.status` (untested filtering)

**Optional:**
- pgvector extension for semantic search on rationale/decisions

---

### 3.4 NBA Engine (Core Intelligence)

**Traceability:** DES-002, DES-003, DES-012 (FR-002, FR-010, FR-014)

**Architecture:**

```python
class NBAEngine:
    def compute_nba(
        self,
        business_context: BusinessContext,
        recent_signals: List[Signal]
    ) -> NBAResult:
        """
        Computes Next Best Action with confidence and alternatives.

        Steps:
        1. Select frameworks based on context
        2. Generate candidate tasks from frameworks
        3. Score each task on multiple dimensions
        4. Compute confidence for top tasks
        5. Generate rationale
        6. Return recommendation + alternatives
        """

        # 1. Framework Selection (FR-014)
        frameworks = self.framework_router.select(business_context, recent_signals)

        # 2. Generate candidate tasks
        candidates = []
        for framework in frameworks:
            candidates.extend(framework.generate_tasks(business_context))

        # 3. Score tasks (FR-002)
        scored_tasks = self.score_tasks(candidates, business_context)

        # 4. Compute confidence (FR-010)
        for task in scored_tasks[:10]:  # top 10 only
            task.confidence = self.compute_confidence(task, business_context)

        # 5. Generate rationale (FR-005)
        top_task = scored_tasks[0]
        rationale = self.generate_rationale(
            recommended=top_task,
            alternatives=scored_tasks[1:3],
            business_context=business_context
        )

        # 6. Return result
        return NBAResult(
            recommended=top_task,
            confidence=top_task.confidence,
            alternatives=scored_tasks[1:3],
            rationale=rationale
        )
```

**Scoring Formula:**

```python
def score_task(task, business_context) -> float:
    """
    Weighted scoring across 5 dimensions.

    Weights (sum to 1.0):
    - objective_impact: 0.30
    - time_sensitivity: 0.25
    - evidence_gap: 0.25
    - unblocks: 0.10
    - feasibility: 0.10
    """

    weights = business_context.user_profile.weights  # Learned over time

    score = (
        task.objective_impact * weights.objective_impact +
        task.time_sensitivity * weights.time_sensitivity +
        task.evidence_gap * weights.evidence_gap +
        task.unblocks * weights.unblocks +
        task.feasibility * weights.feasibility
    )

    # Apply constraints
    if task.is_blocked:
        score *= 0.5
    if task.deadline_approaching:
        score *= 1.3

    return score
```

**Confidence Calculation:**

```python
def compute_confidence(task, business_context) -> float:
    """
    Confidence (0-10) based on:
    - Objective link clarity
    - Blocker presence
    - Validation status
    - Founder capability

    Mapping:
    - 8-10: Very High (clear objective + no blockers + validated)
    - 6-7:  High (objective link OR minor blockers)
    - 4-5:  Moderate (unclear link OR major blockers)
    - 1-3:  Low (multiple unknowns + unvalidated capability)
    """

    confidence = 5.0  # baseline

    # Objective link (+2 if clear)
    if task.objective_id and task.impact_score > 7:
        confidence += 2.0

    # Blockers (-2 if present)
    if task.has_blockers:
        confidence -= 2.0

    # Validation (+1 if tested approach)
    if task.method_validated:
        confidence += 1.0

    # Capability (-1 if untested skill)
    if not founder_has_capability(task, business_context):
        confidence -= 1.0

    return max(1.0, min(10.0, confidence))
```

---

### 3.5 Learning Engine

**Traceability:** DES-008 (FR-009)

**Override Learning:**

```python
class LearningEngine:
    def learn_from_override(
        self,
        recommended_task: Task,
        actual_choice: Task,
        reason: str,
        user_profile: UserProfile
    ):
        """
        Updates model weights based on override patterns.

        Override Taxonomy:
        - wrong_priority: Adjust time_sensitivity/objective_impact
        - missing_context: Improve entity extraction
        - bad_timing: Add temporal awareness
        - dont_understand_why: Improve rationale
        - founder_preference: Update profile weights
        """

        # Classify override reason
        override_type = self.classify_override(reason)

        # Update weights
        if override_type == "time_sensitive_blocker":
            user_profile.weights.time_sensitivity += 0.15
            user_profile.weights.objective_impact -= 0.05

        elif override_type == "customer_work_preferred":
            user_profile.weights.customer_facing += 0.10

        # Log for batch learning
        self.log_override(
            recommended=recommended_task.id,
            chosen=actual_choice.id,
            reason=reason,
            override_type=override_type,
            timestamp=now()
        )

        # Persist updated weights
        user_profile.save()
```

**Weekly Batch Learning:**

```python
def weekly_batch_learn():
    """
    Analyze override patterns and update global model.

    Steps:
    1. Cluster overrides by reason
    2. Identify systematic patterns
    3. Retrain priority weights
    4. Adjust confidence thresholds
    5. Validate on held-out test set
    6. Deploy if improvement > 5%
    """

    overrides = get_overrides_last_week()
    patterns = cluster_by_reason(overrides)

    for pattern in patterns:
        if pattern.frequency > 10:  # significant
            adjust_model(pattern)

    # Validate
    test_accuracy = evaluate_on_test_set()
    if test_accuracy > current_baseline + 0.05:
        deploy_new_weights()
```

---

### 3.6 Integration Layer

**Calendar Integration (FR-011):**

```python
class CalendarIntegration:
    async def sync_calendar(self, user_id: str):
        """
        Read-only Google Calendar sync.

        Extracts:
        - Upcoming deadlines
        - Scheduled customer calls
        - Busy/available blocks

        Creates Signals for:
        - deadline_approaching (< 3 days)
        - customer_meeting_scheduled
        - availability_constraint
        """

        events = await google_calendar_api.get_events(
            user_id=user_id,
            time_min=now(),
            time_max=now() + timedelta(days=30)
        )

        for event in events:
            # Detect deadlines
            if "deadline" in event.summary.lower():
                create_signal(
                    type="deadline",
                    description=event.summary,
                    severity="high" if event.start < now() + timedelta(days=3) else "medium",
                    timestamp=event.start
                )

            # Detect customer calls
            if any(keyword in event.summary.lower() for keyword in ["customer", "client", "call", "demo"]):
                create_signal(
                    type="customer_meeting",
                    description=event.summary,
                    severity="medium",
                    timestamp=event.start
                )
```

**Linear Integration (FR-012):**

```python
class LinearIntegration:
    async def export_task(self, bebrahma_task: Task) -> str:
        """
        Export BeBrahma task to Linear.

        Returns: Linear issue ID
        """

        issue = await linear_api.create_issue(
            teamId=user.linear_team_id,
            title=bebrahma_task.action,
            description=bebrahma_task.star_context.situation,
            priority=map_priority(bebrahma_task.priority),
            dueDate=bebrahma_task.due_by
        )

        # Link back
        bebrahma_task.external_task_id = issue.id
        bebrahma_task.save()

        return issue.id

    async def sync_status(self, bebrahma_task: Task):
        """
        Import status from Linear (one-way).

        BeBrahma is NOT source of truth for execution.
        Linear status wins on conflict.
        """

        if not bebrahma_task.external_task_id:
            return

        issue = await linear_api.get_issue(bebrahma_task.external_task_id)

        # Map Linear state to BeBrahma status
        status_map = {
            "backlog": "suggested",
            "todo": "committed",
            "in_progress": "in_progress",
            "done": "done",
            "canceled": "blocked"
        }

        external_status = status_map.get(issue.state.name, "committed")

        # Update if changed
        if bebrahma_task.status != external_status:
            bebrahma_task.external_status = external_status
            bebrahma_task.status = external_status
            bebrahma_task.save()

            # Create signal if marked done
            if external_status == "done":
                create_signal(
                    type="task_completed",
                    description=f"Completed: {bebrahma_task.action}",
                    linked_task=bebrahma_task
                )
```

---

## 4. Data Flow

### 4.1 Ask Flow (FR-002)

```
User: "What should I do?"
  ↓
[Mobile App] → POST /api/v1/ask {query: "what should I do?"}
  ↓
[Intent Service] → Classify intent: "request_action"
  ↓
[Graph Service] → Load business context
  ↓
[NBA Engine] → Compute recommendation
  ├─ [Framework Router] → Select frameworks
  ├─ [Scoring] → Score candidates
  ├─ [Confidence] → Compute confidence
  └─ [Rationale Generator] → Generate explanation
  ↓
[Response] ← {
  recommended: Task,
  confidence: "High",
  alternatives: [Task, Task],
  rationale: {...}
}
  ↓
[Mobile App] → Display recommendation card
```

### 4.2 Update Flow (FR-008)

```
User: [Voice note] "Had the call, VP wants pilot with Jira"
  ↓
[Mobile App] → POST /api/v1/updates {voice: <audio>, type: "voice"}
  ↓
[Voice Service] → Transcribe → "Had the call, VP wants pilot with Jira"
  ↓
[Intent Service] → Extract entities:
  - Entity: "VP"
  - Signal: "pilot_interest" (positive)
  - Constraint: "Jira integration"
  - CriticalUnknown: "Is Jira must-have?"
  ↓
[Graph Service] → Update:
  - Add entity (VP)
  - Create signal (pilot_interest)
  - Create critical_unknown (Jira)
  - Link to existing objective
  ↓
[NBA Engine] → Recompute (priority changed!)
  ↓
[Response] ← {
  acknowledged: "Great news! Pilot confirmed. Jira integration now critical unknown.",
  updated_nba: {...},
  what_changed: [...]
}
  ↓
[Mobile App] → Show update + new recommendation
```

---

## 5. Security Architecture

**Traceability:** DES-022, DES-023 (NFR-003, NFR-004)

### 5.1 Authentication
- **Provider:** Clerk (same as existing BeBrahma)
- **Flow:** OAuth 2.0 with JWT tokens
- **Mobile:** Clerk React Native SDK
- **Web:** Clerk React SDK

### 5.2 Authorization
- **Model:** User → Ventures (1:many)
- **Isolation:** All queries scoped by `user_id`
- **API:** Bearer token in `Authorization` header
- **Validation:** JWT signature verification on every request

### 5.3 Data Encryption
- **At Rest:** AES-256 (PostgreSQL TDE)
- **In Transit:** TLS 1.3 (all connections)
- **API Keys:** Vault (HashiCorp Vault or AWS Secrets Manager)

### 5.4 Privacy
- **User Ownership:** Complete data export via API
- **Deletion:** Cascade delete all user data on account deletion
- **No Training:** Never train models on user data without explicit opt-in
- **GDPR:** Right to access, rectify, erase, port

---

## 6. Performance Architecture

**Traceability:** DES-020, DES-024 (NFR-001, NFR-005)

### 6.1 Caching Strategy

```python
# L1: In-memory (Python dictionaries)
# - Current business context (TTL: 5 min)
# - Framework outputs (TTL: 10 min)

# L2: Redis
# - NBA results (TTL: 30 min)
# - LLM responses (TTL: 24 hours)
# - Entity extraction (TTL: 1 hour)

# Cache invalidation:
# - On any update/override → clear NBA cache
# - On context change → clear all caches for user
```

### 6.2 LLM Cost Optimization

```python
# Tier 1: Classification (cheap, fast)
# - Intent classification: GPT-3.5-turbo (<200 tokens)
# - Entity extraction: GPT-3.5-turbo (<500 tokens)
# - Cost: ~$0.002 per request

# Tier 2: Reasoning (moderate)
# - NBA computation: Claude Sonnet (2K-5K tokens)
# - Rationale generation: Claude Sonnet (1K tokens)
# - Cost: ~$0.02 per request

# Tier 3: Heavy lifting (cached aggressively)
# - Multi-framework blending: Claude Opus (10K tokens)
# - Complex decision trees: Claude Opus (15K tokens)
# - Cost: ~$0.15 per request
# - Cache hit rate target: >80%

# Target: <$0.10 per session average
# Calculation:
#   - 70% sessions use Tier 1+2 only: $0.022
#   - 20% sessions use Tier 3 (cached): $0.03 (80% cache hit)
#   - 10% sessions use Tier 3 (uncached): $0.15
#   - Weighted avg: 0.7*$0.022 + 0.2*$0.03 + 0.1*$0.15 = $0.037 ✅
```

### 6.3 Database Optimization

```sql
-- Indexes for common queries
CREATE INDEX idx_tasks_priority ON tasks(priority DESC, created_at DESC);
CREATE INDEX idx_tasks_status_user ON tasks(status, user_id) WHERE status IN ('suggested', 'committed', 'in_progress');
CREATE INDEX idx_unknowns_status ON critical_unknowns(status, importance) WHERE status = 'untested';
CREATE INDEX idx_evidence_timestamp ON evidence(timestamp DESC);

-- Partial indexes for active data only
CREATE INDEX idx_active_objectives ON objectives(user_id, target_date) WHERE status = 'active';

-- Query optimization
-- Bad: SELECT * FROM tasks WHERE user_id = ? ORDER BY priority
-- Good: SELECT id, action, priority FROM tasks WHERE user_id = ? AND status IN ('suggested', 'committed') ORDER BY priority LIMIT 50
```

---

## 7. Deployment Architecture

### 7.1 Infrastructure (MVP)

```
┌─────────────────────────────────────────┐
│             Cloudflare CDN              │
│  - DNS, SSL, DDoS protection            │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│          Load Balancer (AWS ALB)        │
└─────────────────────────────────────────┘
                  ↓
┌──────────────────┬──────────────────────┐
│  API Servers     │   Background Workers │
│  (ECS Fargate)   │   (ECS Fargate)      │
│  - Auto-scaling  │   - Celery workers   │
│  - 2-10 tasks    │   - Integration sync │
└──────────────────┴──────────────────────┘
                  ↓
┌──────────────────┬──────────────────────┐
│  PostgreSQL RDS  │   Redis ElastiCache  │
│  - Multi-AZ      │   - Replication      │
│  - Automated bkp │   - Cluster mode     │
└──────────────────┴──────────────────────┘
```

### 7.2 Monitoring

```
┌─────────────────────────────────────────┐
│  Observability Stack                    │
├─────────────────┬───────────────────────┤
│  Logs           │  Metrics              │
│  - CloudWatch   │  - Prometheus         │
│  - Structured   │  - Grafana            │
│  - 30 day ret   │  - Alerts             │
├─────────────────┼───────────────────────┤
│  Errors         │  APM                  │
│  - Sentry       │  - Datadog            │
│  - Alerting     │  - Traces             │
└─────────────────┴───────────────────────┘
```

---

## 8. Testing Strategy

**Traceability:** See `/docs/bebrahma-v2/verification/TEST_PLAN.md`

**Levels:**

1. **Unit Tests** (>80% coverage)
   - Scoring functions
   - Confidence calculations
   - Framework outputs
   - Entity extraction

2. **Integration Tests**
   - API endpoints
   - Database operations
   - LLM interactions (mocked)
   - External integrations

3. **End-to-End Tests**
   - Full user flows (ask → recommend → update → recompute)
   - Mobile app critical paths
   - Offline/online transitions

4. **NBA Validation** (see PRD Section 8.5)
   - Offline: 20 curated scenarios, expert panel scoring
   - Online: Override tracking, learning validation
   - Acceptance: Top-1 accuracy >60%, confidence correlation >0.5

---

## 9. Migration from Existing BeBrahma

**Approach:** Fresh start (no migration needed - no users)

**Reuse from existing code:**
- ✅ Clerk authentication setup
- ✅ PostgreSQL + Prisma patterns (adapt schema)
- ✅ Deployment infrastructure (Vercel/Railway)
- ✅ Error tracking (Sentry)

**Build fresh:**
- ❌ Data models (completely new schema)
- ❌ Frontend (React Native vs Next.js)
- ❌ API layer (FastAPI vs Express)
- ❌ Business logic (NBA engine, frameworks)

**Coexistence:**
- Keep existing Founder OS code in separate branch
- New BeBrahma in `main` branch
- Clear separation, no shared code initially

---

## 10. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| LLM costs exceed budget | High | Medium | Aggressive caching, tier models, cost monitoring |
| Voice transcription accuracy | High | Medium | Confirmation step, easy editing, fallback to text |
| NBA recommendations wrong | High | High | Show confidence, alternatives, allow override, learn |
| Calendar API rate limits | Medium | Low | Batch sync, cache aggressively, manual fallback |
| PostgreSQL not scalable enough | Medium | Low | Start with good schema, migrate to Neo4j if needed |

---

## 11. Open Architecture Questions

**Question 1:** PostgreSQL vs Neo4j for Business State Graph?
- **Current decision:** PostgreSQL with good schema + indexes
- **Trigger for Neo4j:** Multi-hop graph queries become >50% of load
- **Timeline:** Re-evaluate at 1,000 active users

**Question 2:** Monolith vs Microservices?
- **Current decision:** Monolith (FastAPI) for MVP
- **Trigger for split:** NBA engine becomes bottleneck (>5s p95 latency)
- **Timeline:** Re-evaluate at 10,000 daily active users

**Question 3:** Real-time sync vs polling?
- **Current decision:** Polling (every 5 min) for integrations
- **Trigger for WebSocket:** User complaints about staleness
- **Timeline:** Phase 2 feature

---

## 12. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-01 | Claude | Initial architecture design |

---

## 13. References

- **PRD:** `/docs/bebrahma-v2/requirements/PRD-v0.3.md`
- **RTM:** `/docs/bebrahma-v2/requirements/RTM.md`
- **Data Model:** `/docs/bebrahma-v2/design/DATA_MODEL.md` (to be created)
- **API Spec:** `/docs/bebrahma-v2/design/API_SPEC.md` (to be created)
