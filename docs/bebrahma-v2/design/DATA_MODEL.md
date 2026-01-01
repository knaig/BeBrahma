# BeBrahma v0.3 - Data Model Specification

**Document ID:** DES-003
**Traceability:** Maps to FR-013 (Business State Graph), FR-007 (Context Maintenance), FR-009 (Override Learning)
**Last Updated:** 2026-01-01
**Status:** Draft

---

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Entity-Relationship Diagram](#entity-relationship-diagram)
4. [Core Entities](#core-entities)
5. [Schema Definitions](#schema-definitions)
6. [Indexes and Performance](#indexes-and-performance)
7. [Query Patterns](#query-patterns)
8. [Data Lifecycle](#data-lifecycle)
9. [Migration Strategy](#migration-strategy)
10. [Traceability Matrix](#traceability-matrix)

---

## Overview

The BeBrahma Business State Graph represents the complete context of a founder's business journey. This graph is implemented in **PostgreSQL** (not Neo4j) with a well-designed relational schema that supports:

- Fast entity lookups and updates
- Efficient graph traversal via foreign keys and JOINs
- Time-series signal tracking
- Override learning and recommendation improvement
- Integration with external systems (Calendar, Linear/Asana)

### Why PostgreSQL?

**Decision Rationale (from ARCHITECTURE.md):**
- "Graph" can be logical (foreign keys + JOINs work fine for moderate graph depth)
- Simpler operations, lower operational complexity
- Excellent for time-series queries (signals, overrides)
- Can add `pgvector` extension for semantic search if needed
- **Migration trigger:** If multi-hop graph queries become >50% of workload, migrate to Neo4j

### Database Name

```
bebrahma_v3
```

---

## Design Principles

1. **Normalized Design**: 3NF normalization to reduce redundancy
2. **Temporal Tracking**: All entities track creation and modification timestamps
3. **Soft Deletes**: Use `deleted_at` for audit trail (where applicable)
4. **Polymorphic Relations**: Use discriminator columns where needed
5. **Indexing First**: Critical paths have indexes defined upfront
6. **JSON for Flexibility**: Use JSONB for schema-flexible data (metadata, config)
7. **Foreign Key Integrity**: Enforce referential integrity at DB level
8. **Partitioning Ready**: Time-series tables designed for future partitioning

---

## Entity-Relationship Diagram

```
┌─────────────────┐
│     users       │ (Clerk managed, reference only)
└────────┬────────┘
         │ 1:N
         ├──────────────┬──────────────┬──────────────┬──────────────┐
         │              │              │              │              │
         ▼              ▼              ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐ ┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│ objectives  │  │ user_profile│ │   signals    │ │integrations │ │nba_sessions  │
└──────┬──────┘  └─────────────┘ └──────────────┘ └─────────────┘ └──────┬───────┘
       │ 1:N                                                              │ 1:N
       ├──────────────┬──────────────┬──────────────┐                    │
       │              │              │              │                    ▼
       ▼              ▼              ▼              ▼            ┌──────────────┐
┌─────────────┐ ┌──────────────┐ ┌─────────────┐ ┌─────────┐  │nba_recommendations│
│    tasks    │ │   unknowns   │ │  evidence   │ │decisions│  └──────┬───────┘
└──────┬──────┘ └──────┬───────┘ └──────┬──────┘ └────┬────┘         │ 1:N
       │               │                │             │              │
       │ M:N           │ M:N            │ M:N         │ M:N          ▼
       └───────────────┴────────────────┴─────────────┴────► ┌──────────────┐
                                                              │  overrides   │
                    (task_unknowns, evidence_unknowns,        └──────────────┘
                     decision_unknowns, decision_evidence)
```

### Key Relationships

- **User → Objectives** (1:N): A user has multiple objectives
- **Objective → Tasks** (1:N): An objective has multiple tasks
- **Objective → Unknowns** (1:N): An objective has multiple critical unknowns
- **Objective → Evidence** (1:N): An objective accumulates evidence
- **Objective → Decisions** (1:N): An objective tracks key decisions
- **Task ↔ Unknowns** (M:N): Tasks can address multiple unknowns
- **Evidence ↔ Unknowns** (M:N): Evidence can resolve multiple unknowns
- **Decision ↔ Evidence** (M:N): Decisions are informed by evidence
- **Decision ↔ Unknowns** (M:N): Decisions may resolve unknowns
- **User → Signals** (1:N): User generates update signals
- **User → NBA Sessions** (1:N): User has multiple recommendation sessions
- **NBA Session → NBA Recommendations** (1:N): Each session computes multiple alternatives
- **NBA Recommendation → Overrides** (1:N): Recommendations can be overridden

---

## Core Entities

### Business State Graph Entities

1. **objectives**: Top-level goals (e.g., "Validate Product-Solution Fit")
2. **tasks**: Actionable items (e.g., "Interview 10 target customers")
3. **unknowns**: Critical unknowns to resolve (e.g., "Will customers pay $X?")
4. **evidence**: Facts, data points, learnings (e.g., "8/10 said they'd pay")
5. **decisions**: Key strategic decisions (e.g., "Pivot to SMB market")
6. **signals**: Time-series events/updates (e.g., "Had coffee with investor")

### User & Profile

1. **users**: Reference to Clerk user (external auth system)
2. **user_profiles**: Extended user data (onboarding state, preferences, learned weights)

### Recommendation & Learning

1. **nba_sessions**: Each "What should I do next?" request
2. **nba_recommendations**: Computed recommendations (top + alternatives)
3. **overrides**: When user chooses alternative over top recommendation (learning data)

### Integrations

1. **integrations**: Connected external services (Google Calendar, Linear, Asana)
2. **calendar_events**: Synced calendar data (read-only)
3. **external_tasks**: Synced tasks from Linear/Asana (two-way sync)

---

## Schema Definitions

### 1. Users & Profiles

#### `users` (Reference Only - Managed by Clerk)

```sql
-- Not stored in our DB; reference via Clerk user_id
-- Clerk provides: user_id, email, name, created_at
```

#### `user_profiles`

```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL UNIQUE,  -- Clerk user_id

    -- Onboarding state (FR-001: Progressive Profiling)
    onboarding_completed BOOLEAN DEFAULT FALSE,
    initial_question_answer TEXT,  -- "What are you building?"
    onboarding_step VARCHAR(50) DEFAULT 'initial',  -- 'initial', 'first_recommendation', 'completed'

    -- Learned preferences (FR-009: Override Learning)
    scoring_weights JSONB DEFAULT '{"objective_impact": 0.30, "time_sensitivity": 0.25, "evidence_gap": 0.25, "unblocks": 0.10, "feasibility": 0.10}',
    framework_preferences JSONB DEFAULT '{}',  -- {'problem_solution_fit': 0.8, 'icp_wedge': 0.6, ...}

    -- User context
    timezone VARCHAR(50) DEFAULT 'UTC',
    working_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00"}',

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(clerk_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_last_active ON user_profiles(last_active_at DESC);
```

**Traceability:**
- FR-001: Progressive profiling state
- FR-009: Learned scoring weights
- NFR-003: User privacy (timezone, working hours for scheduling)

---

### 2. Business State Graph - Core Entities

#### `objectives`

```sql
CREATE TABLE objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,

    -- Objective details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    objective_type VARCHAR(50) NOT NULL,  -- 'problem_solution_fit', 'icp_wedge', 'growth', 'fundraising', 'hiring', 'custom'

    -- State
    status VARCHAR(50) DEFAULT 'active',  -- 'active', 'paused', 'completed', 'abandoned'
    priority INTEGER DEFAULT 50,  -- 0-100 scale
    confidence_level VARCHAR(20),  -- 'very_high', 'high', 'moderate', 'low'

    -- Timeline
    target_completion_date DATE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Relationships
    parent_objective_id UUID,  -- For nested objectives

    -- Metadata
    metadata JSONB DEFAULT '{}',  -- Flexible schema for framework-specific data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,  -- Soft delete

    -- Constraints
    CONSTRAINT fk_objectives_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_objectives_parent FOREIGN KEY (parent_objective_id) REFERENCES objectives(id) ON DELETE SET NULL
);

CREATE INDEX idx_objectives_user_id ON objectives(user_id);
CREATE INDEX idx_objectives_status ON objectives(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_objectives_type ON objectives(objective_type);
CREATE INDEX idx_objectives_parent ON objectives(parent_objective_id) WHERE parent_objective_id IS NOT NULL;
```

**Traceability:**
- FR-013: Business State Graph (objectives entity)
- FR-014: Framework-specific metadata storage

---

#### `tasks`

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    objective_id UUID NOT NULL,

    -- Task details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    task_type VARCHAR(50),  -- 'customer_interview', 'prototype', 'analysis', 'content', 'meeting', 'research', 'custom'

    -- State
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'in_progress', 'blocked', 'completed', 'cancelled'
    priority INTEGER DEFAULT 50,  -- 0-100 scale

    -- Scheduling
    due_date DATE,
    estimated_duration_minutes INTEGER,  -- For calendar blocking
    scheduled_at TIMESTAMP WITH TIME ZONE,  -- When it's scheduled (from calendar integration)

    -- Dependencies
    blocks_task_ids UUID[],  -- Array of task IDs that this task unblocks
    blocked_by_task_ids UUID[],  -- Array of task IDs blocking this task

    -- Scoring dimensions (computed during NBA)
    score_objective_impact DECIMAL(3, 2),  -- 0.00 to 1.00
    score_time_sensitivity DECIMAL(3, 2),
    score_evidence_gap DECIMAL(3, 2),
    score_unblocks DECIMAL(3, 2),
    score_feasibility DECIMAL(3, 2),
    score_total DECIMAL(3, 2),  -- Weighted sum

    -- Integration references
    external_task_id VARCHAR(255),  -- ID in Linear/Asana
    external_source VARCHAR(50),  -- 'linear', 'asana', 'calendar', NULL

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_objective FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_objective_id ON tasks(objective_id);
CREATE INDEX idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_score_total ON tasks(score_total DESC) WHERE status = 'pending';
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL AND status != 'completed';
CREATE INDEX idx_tasks_external ON tasks(external_task_id, external_source) WHERE external_task_id IS NOT NULL;
```

**Traceability:**
- FR-002: NBA scoring dimensions stored per task
- FR-011, FR-012: External task integration
- FR-013: Business State Graph (tasks entity)

---

#### `unknowns`

```sql
CREATE TABLE unknowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    objective_id UUID NOT NULL,

    -- Unknown details
    question TEXT NOT NULL,  -- The critical unknown (e.g., "Will customers pay $50/mo?")
    category VARCHAR(50),  -- 'customer', 'market', 'product', 'business_model', 'team', 'technology'
    importance VARCHAR(20) DEFAULT 'high',  -- 'critical', 'high', 'medium', 'low'

    -- State
    status VARCHAR(50) DEFAULT 'open',  -- 'open', 'investigating', 'resolved', 'deferred'
    resolution_confidence VARCHAR(20),  -- 'very_high', 'high', 'moderate', 'low' (when resolved)
    resolution_summary TEXT,  -- Summary of findings (when resolved)

    -- Timeline
    target_resolution_date DATE,
    resolved_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT fk_unknowns_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_unknowns_objective FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE
);

CREATE INDEX idx_unknowns_user_id ON unknowns(user_id);
CREATE INDEX idx_unknowns_objective_id ON unknowns(objective_id);
CREATE INDEX idx_unknowns_status ON unknowns(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_unknowns_importance ON unknowns(importance);
```

**Traceability:**
- FR-013: Business State Graph (unknowns entity)
- FR-014: Critical Unknown Mapping framework

---

#### `evidence`

```sql
CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    objective_id UUID NOT NULL,

    -- Evidence details
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    evidence_type VARCHAR(50),  -- 'customer_interview', 'user_data', 'market_research', 'experiment', 'observation', 'document'
    source VARCHAR(255),  -- Source of evidence (e.g., "Customer interview with John Doe")

    -- Quality indicators
    reliability VARCHAR(20) DEFAULT 'medium',  -- 'very_high', 'high', 'medium', 'low'
    sample_size INTEGER,  -- For quantitative evidence

    -- Content
    key_findings TEXT,
    raw_data JSONB,  -- Structured data (e.g., survey results)
    attachments JSONB DEFAULT '[]',  -- Array of {type, url, filename}

    -- Timeline
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT fk_evidence_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_evidence_objective FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE
);

CREATE INDEX idx_evidence_user_id ON evidence(user_id);
CREATE INDEX idx_evidence_objective_id ON evidence(objective_id);
CREATE INDEX idx_evidence_type ON evidence(evidence_type);
CREATE INDEX idx_evidence_collected_at ON evidence(collected_at DESC);
```

**Traceability:**
- FR-013: Business State Graph (evidence entity)
- FR-008: Evidence from user updates

---

#### `decisions`

```sql
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    objective_id UUID NOT NULL,

    -- Decision details
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    decision_type VARCHAR(50),  -- 'strategic', 'tactical', 'pivot', 'hire', 'partnership', 'feature', 'market'

    -- Decision content
    options_considered JSONB,  -- Array of {option, pros, cons}
    chosen_option VARCHAR(500),
    rationale TEXT NOT NULL,

    -- State
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'approved', 'implemented', 'reversed'
    reversible BOOLEAN DEFAULT TRUE,

    -- Timeline
    decided_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    implemented_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT fk_decisions_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_decisions_objective FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE
);

CREATE INDEX idx_decisions_user_id ON decisions(user_id);
CREATE INDEX idx_decisions_objective_id ON decisions(objective_id);
CREATE INDEX idx_decisions_decided_at ON decisions(decided_at DESC);
CREATE INDEX idx_decisions_status ON decisions(status);
```

**Traceability:**
- FR-013: Business State Graph (decisions entity)
- FR-008: Decisions logged from updates

---

#### `signals`

```sql
CREATE TABLE signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,

    -- Signal details
    signal_type VARCHAR(50) NOT NULL,  -- 'update', 'voice_note', 'quick_log', 'calendar_event', 'task_completed', 'integration_sync'
    content TEXT,  -- Original content (voice transcription, text update)

    -- Parsed intent
    intent_category VARCHAR(50),  -- 'progress_update', 'blocker', 'insight', 'question', 'decision', 'milestone'
    entities_extracted JSONB DEFAULT '{}',  -- {tasks: [], unknowns: [], evidence: [], ...}
    sentiment VARCHAR(20),  -- 'positive', 'neutral', 'negative', 'frustrated'

    -- Context
    session_id UUID,  -- Link to nba_session if created during recommendation flow
    source VARCHAR(50),  -- 'mobile_app', 'web_app', 'calendar_sync', 'task_sync'

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_signals_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Partitioning-ready: Consider partitioning by created_at (monthly) if volume grows
CREATE INDEX idx_signals_user_id ON signals(user_id);
CREATE INDEX idx_signals_created_at ON signals(created_at DESC);
CREATE INDEX idx_signals_type ON signals(signal_type);
CREATE INDEX idx_signals_session ON signals(session_id) WHERE session_id IS NOT NULL;
```

**Traceability:**
- FR-003, FR-004: Voice/text input signals
- FR-008: Update logging
- FR-013: Time-series signal tracking

---

### 3. Many-to-Many Relationship Tables

#### `task_unknowns`

```sql
CREATE TABLE task_unknowns (
    task_id UUID NOT NULL,
    unknown_id UUID NOT NULL,
    contribution VARCHAR(20) DEFAULT 'primary',  -- 'primary', 'secondary', 'minor'

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (task_id, unknown_id),
    CONSTRAINT fk_task_unknowns_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_unknowns_unknown FOREIGN KEY (unknown_id) REFERENCES unknowns(id) ON DELETE CASCADE
);

CREATE INDEX idx_task_unknowns_unknown ON task_unknowns(unknown_id);
```

**Traceability:** FR-013 (graph relationships)

---

#### `evidence_unknowns`

```sql
CREATE TABLE evidence_unknowns (
    evidence_id UUID NOT NULL,
    unknown_id UUID NOT NULL,
    resolves_percentage INTEGER DEFAULT 0,  -- 0-100: How much this evidence resolves the unknown

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (evidence_id, unknown_id),
    CONSTRAINT fk_evidence_unknowns_evidence FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
    CONSTRAINT fk_evidence_unknowns_unknown FOREIGN KEY (unknown_id) REFERENCES unknowns(id) ON DELETE CASCADE
);

CREATE INDEX idx_evidence_unknowns_unknown ON evidence_unknowns(unknown_id);
```

**Traceability:** FR-013 (graph relationships)

---

#### `decision_evidence`

```sql
CREATE TABLE decision_evidence (
    decision_id UUID NOT NULL,
    evidence_id UUID NOT NULL,
    influence_level VARCHAR(20) DEFAULT 'moderate',  -- 'critical', 'high', 'moderate', 'low'

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (decision_id, evidence_id),
    CONSTRAINT fk_decision_evidence_decision FOREIGN KEY (decision_id) REFERENCES decisions(id) ON DELETE CASCADE,
    CONSTRAINT fk_decision_evidence_evidence FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE
);

CREATE INDEX idx_decision_evidence_evidence ON decision_evidence(evidence_id);
```

**Traceability:** FR-013 (graph relationships)

---

#### `decision_unknowns`

```sql
CREATE TABLE decision_unknowns (
    decision_id UUID NOT NULL,
    unknown_id UUID NOT NULL,
    resolves BOOLEAN DEFAULT FALSE,  -- Does this decision resolve the unknown?

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (decision_id, unknown_id),
    CONSTRAINT fk_decision_unknowns_decision FOREIGN KEY (decision_id) REFERENCES decisions(id) ON DELETE CASCADE,
    CONSTRAINT fk_decision_unknowns_unknown FOREIGN KEY (unknown_id) REFERENCES unknowns(id) ON DELETE CASCADE
);

CREATE INDEX idx_decision_unknowns_unknown ON decision_unknowns(unknown_id);
```

**Traceability:** FR-013 (graph relationships)

---

### 4. NBA (Next Best Action) Recommendation System

#### `nba_sessions`

```sql
CREATE TABLE nba_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,

    -- Session context
    trigger_type VARCHAR(50) NOT NULL,  -- 'explicit_ask', 'daily_prompt', 'post_update', 'scheduled'
    user_query TEXT,  -- Original user question/input

    -- Computation metadata
    computation_time_ms INTEGER,
    frameworks_used VARCHAR(100)[],  -- Array of framework names used

    -- Result
    top_recommendation_id UUID,  -- FK to nba_recommendations (set after computation)
    alternatives_count INTEGER DEFAULT 0,

    -- User action
    user_action VARCHAR(50),  -- 'accepted', 'chose_alternative', 'dismissed', 'deferred', NULL (no action yet)
    chosen_recommendation_id UUID,  -- FK to nba_recommendations (if user chose alternative)

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_nba_sessions_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_nba_sessions_user_id ON nba_sessions(user_id);
CREATE INDEX idx_nba_sessions_created_at ON nba_sessions(created_at DESC);
CREATE INDEX idx_nba_sessions_user_action ON nba_sessions(user_action);
```

**Traceability:**
- FR-002: NBA session tracking
- FR-009: Override learning (user action tracking)

---

#### `nba_recommendations`

```sql
CREATE TABLE nba_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,

    -- Recommendation ranking
    rank INTEGER NOT NULL,  -- 1 = top recommendation, 2-N = alternatives

    -- Recommended action
    action_type VARCHAR(50) NOT NULL,  -- 'complete_task', 'create_task', 'gather_evidence', 'make_decision', 'reflect'
    task_id UUID,  -- FK to tasks (if recommending existing task)
    suggested_task_title VARCHAR(500),  -- If creating new task
    suggested_task_description TEXT,

    -- Scoring breakdown
    score_objective_impact DECIMAL(3, 2) NOT NULL,
    score_time_sensitivity DECIMAL(3, 2) NOT NULL,
    score_evidence_gap DECIMAL(3, 2) NOT NULL,
    score_unblocks DECIMAL(3, 2) NOT NULL,
    score_feasibility DECIMAL(3, 2) NOT NULL,
    score_total DECIMAL(3, 2) NOT NULL,

    -- Confidence (FR-010)
    confidence_level VARCHAR(20) NOT NULL,  -- 'very_high', 'high', 'moderate', 'low'
    confidence_score DECIMAL(3, 2),  -- 0.00 to 1.00
    confidence_factors JSONB,  -- {context_completeness: 0.8, historical_accuracy: 0.7, ...}

    -- Rationale (FR-005)
    rationale_summary TEXT NOT NULL,  -- 1-2 sentence summary
    rationale_full JSONB,  -- {why: "...", why_now: "...", expected_outcome: "...", frameworks_applied: [...]}

    -- Metadata
    framework_source VARCHAR(50),  -- Which framework generated this
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_nba_recs_session FOREIGN KEY (session_id) REFERENCES nba_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_nba_recs_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_nba_recs_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE INDEX idx_nba_recs_session_id ON nba_recommendations(session_id);
CREATE INDEX idx_nba_recs_rank ON nba_recommendations(session_id, rank);
CREATE INDEX idx_nba_recs_task ON nba_recommendations(task_id) WHERE task_id IS NOT NULL;
```

**Traceability:**
- FR-002: Recommendation storage
- FR-005: Rationale storage
- FR-006: Alternatives (rank > 1)
- FR-010: Confidence scoring

---

#### `overrides`

```sql
CREATE TABLE overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    session_id UUID NOT NULL,

    -- Override details
    recommended_id UUID NOT NULL,  -- The top recommendation (rank=1)
    chosen_id UUID NOT NULL,  -- The alternative chosen (rank>1)

    -- Classification (for learning)
    override_category VARCHAR(50) NOT NULL,  -- 'time_preference', 'energy_level', 'skill_match', 'emotional_state', 'external_constraint', 'strategic_disagreement', 'other'
    user_reason TEXT,  -- Optional user-provided reason

    -- Context at override time
    time_of_day VARCHAR(10),  -- 'morning', 'afternoon', 'evening'
    day_of_week VARCHAR(10),
    context_snapshot JSONB,  -- {recent_completions: [], blockers: [], energy_level: "low", ...}

    -- Learning outcome
    incorporated_in_model BOOLEAN DEFAULT FALSE,  -- Has this been used to update weights?
    weight_adjustment_applied JSONB,  -- {time_sensitivity: +0.05, feasibility: -0.02, ...}

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_overrides_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_overrides_session FOREIGN KEY (session_id) REFERENCES nba_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_overrides_recommended FOREIGN KEY (recommended_id) REFERENCES nba_recommendations(id) ON DELETE CASCADE,
    CONSTRAINT fk_overrides_chosen FOREIGN KEY (chosen_id) REFERENCES nba_recommendations(id) ON DELETE CASCADE
);

CREATE INDEX idx_overrides_user_id ON overrides(user_id);
CREATE INDEX idx_overrides_session_id ON overrides(session_id);
CREATE INDEX idx_overrides_category ON overrides(override_category);
CREATE INDEX idx_overrides_learning ON overrides(incorporated_in_model) WHERE incorporated_in_model = FALSE;
```

**Traceability:**
- FR-009: Override learning
- FR-015: Taxonomy-based categorization

---

### 5. Integrations

#### `integrations`

```sql
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,

    -- Integration details
    provider VARCHAR(50) NOT NULL,  -- 'google_calendar', 'linear', 'asana'
    integration_type VARCHAR(50) NOT NULL,  -- 'calendar', 'task_manager'

    -- State
    status VARCHAR(50) DEFAULT 'active',  -- 'active', 'paused', 'error', 'disconnected'

    -- OAuth tokens (encrypted at application layer)
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,

    -- Sync state
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_sync_status VARCHAR(50),  -- 'success', 'partial', 'failed'
    last_sync_error TEXT,
    sync_frequency_minutes INTEGER DEFAULT 15,  -- How often to sync

    -- Metadata
    metadata JSONB DEFAULT '{}',  -- Provider-specific config
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_integrations_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT unique_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX idx_integrations_user_id ON integrations(user_id);
CREATE INDEX idx_integrations_status ON integrations(status);
CREATE INDEX idx_integrations_last_sync ON integrations(last_sync_at);
```

**Traceability:**
- FR-011, FR-012: Integration setup
- NFR-003: Token encryption for privacy

---

#### `calendar_events`

```sql
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,

    -- Event details (read-only from Google Calendar)
    external_event_id VARCHAR(255) NOT NULL,
    title VARCHAR(500),
    description TEXT,

    -- Time
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    timezone VARCHAR(50),

    -- Classification (inferred by our system)
    event_category VARCHAR(50),  -- 'customer_meeting', 'internal_meeting', 'focus_time', 'personal', 'unknown'
    is_customer_facing BOOLEAN DEFAULT FALSE,
    confidence_score DECIMAL(3, 2),  -- Confidence in category classification

    -- State
    status VARCHAR(50),  -- 'confirmed', 'tentative', 'cancelled'

    -- Metadata
    metadata JSONB DEFAULT '{}',  -- Raw event data from Google
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_calendar_events_integration FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE,
    CONSTRAINT fk_calendar_events_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT unique_external_event UNIQUE (integration_id, external_event_id)
);

CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX idx_calendar_events_category ON calendar_events(event_category);
CREATE INDEX idx_calendar_events_customer_facing ON calendar_events(is_customer_facing) WHERE is_customer_facing = TRUE;
```

**Traceability:**
- FR-011: Read-only calendar sync
- FR-014: Context for NBA (customer meeting signals)

---

#### `external_tasks`

```sql
CREATE TABLE external_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,

    -- External task details (two-way sync with Linear/Asana)
    external_task_id VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,  -- 'linear', 'asana'

    -- Task content
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50),  -- Provider's status (mapped to our status)
    priority VARCHAR(50),

    -- Mapping to our system
    internal_task_id UUID,  -- FK to tasks (if mapped)
    sync_direction VARCHAR(20) DEFAULT 'bidirectional',  -- 'import_only', 'export_only', 'bidirectional'

    -- Sync state
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_status VARCHAR(50) DEFAULT 'synced',  -- 'synced', 'conflict', 'pending'
    conflict_data JSONB,  -- If there's a sync conflict

    -- Metadata
    metadata JSONB DEFAULT '{}',  -- Provider-specific fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_external_tasks_integration FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE,
    CONSTRAINT fk_external_tasks_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_external_tasks_internal FOREIGN KEY (internal_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    CONSTRAINT unique_external_task UNIQUE (integration_id, external_task_id)
);

CREATE INDEX idx_external_tasks_user_id ON external_tasks(user_id);
CREATE INDEX idx_external_tasks_internal ON external_tasks(internal_task_id) WHERE internal_task_id IS NOT NULL;
CREATE INDEX idx_external_tasks_sync_status ON external_tasks(sync_status) WHERE sync_status != 'synced';
```

**Traceability:**
- FR-012: Two-way task sync with Linear/Asana
- Conflict resolution for sync errors

---

## Indexes and Performance

### Critical Query Paths

Based on NBA Engine requirements and user flows, these are the most common queries:

1. **Get Current Business Context** (FR-007):
   ```sql
   SELECT * FROM objectives WHERE user_id = ? AND status = 'active' AND deleted_at IS NULL;
   SELECT * FROM tasks WHERE user_id = ? AND status IN ('pending', 'in_progress') AND deleted_at IS NULL;
   SELECT * FROM unknowns WHERE user_id = ? AND status = 'open' AND deleted_at IS NULL;
   SELECT * FROM signals WHERE user_id = ? ORDER BY created_at DESC LIMIT 50;
   ```
   **Indexes:** `idx_objectives_user_id`, `idx_tasks_user_id`, `idx_unknowns_user_id`, `idx_signals_created_at`

2. **Compute NBA Recommendations** (FR-002):
   ```sql
   -- Get scoreable tasks
   SELECT * FROM tasks
   WHERE user_id = ?
     AND status = 'pending'
     AND deleted_at IS NULL
   ORDER BY score_total DESC
   LIMIT 100;

   -- Check task-unknown relationships for evidence_gap scoring
   SELECT tu.task_id, COUNT(u.id) as unknowns_addressed
   FROM task_unknowns tu
   JOIN unknowns u ON tu.unknown_id = u.id
   WHERE u.status = 'open'
   GROUP BY tu.task_id;
   ```
   **Indexes:** `idx_tasks_score_total`, `idx_task_unknowns_unknown`

3. **Get Recent Overrides for Learning** (FR-009):
   ```sql
   SELECT * FROM overrides
   WHERE user_id = ?
     AND incorporated_in_model = FALSE
   ORDER BY created_at DESC
   LIMIT 100;
   ```
   **Index:** `idx_overrides_learning`

4. **Get Upcoming Calendar Events** (FR-011):
   ```sql
   SELECT * FROM calendar_events
   WHERE user_id = ?
     AND start_time >= NOW()
     AND start_time <= NOW() + INTERVAL '7 days'
   ORDER BY start_time ASC;
   ```
   **Index:** `idx_calendar_events_time`

### Performance Targets

From NFR-001 (Performance Requirements):

- **NBA computation:** <2 seconds for 90th percentile
- **Context retrieval:** <500ms
- **Signal logging:** <100ms

**Optimization Strategies:**
1. **Materialized Views**: For complex aggregations (e.g., objective completion percentage)
2. **Caching**: Redis for user context (cache for 5 minutes)
3. **Partitioning**: `signals` table by month (when volume exceeds 10M rows)
4. **Connection Pooling**: PgBouncer with pool size = 20

---

## Query Patterns

### Pattern 1: Get Full Business Context

```sql
-- Get user profile with preferences
SELECT * FROM user_profiles WHERE user_id = :user_id;

-- Get active objectives with task counts
SELECT
    o.*,
    COUNT(DISTINCT t.id) as task_count,
    COUNT(DISTINCT u.id) as unknown_count
FROM objectives o
LEFT JOIN tasks t ON o.id = t.objective_id AND t.deleted_at IS NULL
LEFT JOIN unknowns u ON o.id = u.objective_id AND u.deleted_at IS NULL
WHERE o.user_id = :user_id
  AND o.status = 'active'
  AND o.deleted_at IS NULL
GROUP BY o.id;

-- Get pending tasks with scores
SELECT * FROM tasks
WHERE user_id = :user_id
  AND status = 'pending'
  AND deleted_at IS NULL
ORDER BY score_total DESC;

-- Get open unknowns
SELECT * FROM unknowns
WHERE user_id = :user_id
  AND status = 'open'
  AND deleted_at IS NULL
ORDER BY importance DESC;

-- Get recent signals (last 7 days)
SELECT * FROM signals
WHERE user_id = :user_id
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Pattern 2: NBA Recommendation with Rationale

```sql
-- Get NBA session with recommendations
SELECT
    ns.*,
    nr.rank,
    nr.action_type,
    nr.score_total,
    nr.confidence_level,
    nr.rationale_summary
FROM nba_sessions ns
JOIN nba_recommendations nr ON ns.id = nr.session_id
WHERE ns.user_id = :user_id
ORDER BY ns.created_at DESC, nr.rank ASC
LIMIT 1, 3;  -- Top recommendation + 2 alternatives

-- Get full rationale for top recommendation
SELECT rationale_full, confidence_factors
FROM nba_recommendations
WHERE id = :recommendation_id;
```

### Pattern 3: Override Learning Analysis

```sql
-- Get override patterns by category
SELECT
    override_category,
    COUNT(*) as override_count,
    AVG(EXTRACT(HOUR FROM created_at)) as avg_hour_of_day
FROM overrides
WHERE user_id = :user_id
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY override_category
ORDER BY override_count DESC;

-- Get weight adjustments to apply
SELECT
    user_id,
    SUM((weight_adjustment_applied->>'objective_impact')::DECIMAL) as total_obj_impact_adj,
    SUM((weight_adjustment_applied->>'time_sensitivity')::DECIMAL) as total_time_sens_adj,
    COUNT(*) as total_overrides
FROM overrides
WHERE incorporated_in_model = FALSE
GROUP BY user_id;
```

### Pattern 4: Task Unblocking Analysis

```sql
-- Find tasks that unblock the most other tasks
SELECT
    t.id,
    t.title,
    CARDINALITY(t.blocks_task_ids) as unblocks_count,
    t.score_total
FROM tasks t
WHERE t.user_id = :user_id
  AND t.status = 'pending'
  AND CARDINALITY(t.blocks_task_ids) > 0
ORDER BY unblocks_count DESC, score_total DESC;
```

### Pattern 5: Evidence Gap Analysis

```sql
-- Find unknowns with insufficient evidence
SELECT
    u.id,
    u.question,
    u.importance,
    COUNT(eu.evidence_id) as evidence_count,
    COALESCE(SUM(eu.resolves_percentage), 0) as total_resolution_percentage
FROM unknowns u
LEFT JOIN evidence_unknowns eu ON u.id = eu.unknown_id
WHERE u.user_id = :user_id
  AND u.status = 'open'
GROUP BY u.id, u.question, u.importance
HAVING COALESCE(SUM(eu.resolves_percentage), 0) < 50
ORDER BY u.importance DESC;
```

---

## Data Lifecycle

### Entity Lifecycle States

#### Objectives
```
Created → Active → [Paused] → Completed/Abandoned → Soft Deleted
```

#### Tasks
```
Pending → In Progress → [Blocked] → Completed/Cancelled → Soft Deleted
```

#### Unknowns
```
Open → Investigating → Resolved/Deferred → Soft Deleted
```

#### NBA Sessions
```
Created → Computed → [User Action: Accepted/Chose Alternative/Dismissed] → Archived (after 90 days)
```

### Data Retention Policies

| Entity | Retention | Cleanup Strategy |
|--------|-----------|------------------|
| `signals` | 1 year | Hard delete after 1 year |
| `nba_sessions` | 90 days active, 1 year archived | Archive to cold storage after 90 days |
| `nba_recommendations` | Same as sessions | Cascade delete with sessions |
| `overrides` | Permanent (for learning) | Never delete |
| `calendar_events` | 6 months past | Hard delete after 6 months |
| `external_tasks` | While integration active | Delete on integration disconnect |
| Core entities | Soft delete only | Restore possible for 30 days, then hard delete |

### Soft Delete Implementation

```sql
-- Example: Soft delete objective and cascade
UPDATE objectives
SET deleted_at = NOW()
WHERE id = :objective_id;

-- Cascade soft delete to tasks
UPDATE tasks
SET deleted_at = NOW()
WHERE objective_id = :objective_id
  AND deleted_at IS NULL;
```

---

## Migration Strategy

### From Existing BeBrahma (if reusing data)

**Assessment:** Most existing data is NOT reusable due to different schema and product vision. However, some patterns can be borrowed:

#### Reusable Components

1. **User Authentication**: Clerk integration already set up
   ```sql
   -- No migration needed; Clerk handles user data externally
   ```

2. **Deployment Patterns**: Database connection pooling, error tracking
   - Reuse: Connection pool configuration
   - Reuse: Sentry error tracking setup

#### NOT Reusable (Fresh Start)

- **Data Models**: Founder OS had different entities (artifacts, playbooks, scoreboards)
- **Frontend**: Next.js web app vs React Native mobile app
- **API Layer**: Express vs FastAPI
- **Business Logic**: NBA engine is entirely new

### Schema Versioning

Use Alembic (Python) for database migrations:

```bash
alembic init alembic
alembic revision --autogenerate -m "Initial schema for BeBrahma v0.3"
alembic upgrade head
```

**Migration Files Structure:**
```
alembic/
├── versions/
│   ├── 001_initial_schema.py
│   ├── 002_add_confidence_scoring.py
│   ├── 003_add_override_taxonomy.py
│   └── ...
```

### Rollback Strategy

Every migration must include `upgrade()` and `downgrade()`:

```python
def upgrade():
    op.create_table('new_table', ...)

def downgrade():
    op.drop_table('new_table')
```

---

## Traceability Matrix

| Requirement ID | Tables Involved | Indexes Required |
|----------------|----------------|------------------|
| FR-001: Progressive Profiling | `user_profiles` | `idx_user_profiles_user_id` |
| FR-002: NBA Recommendations | `nba_sessions`, `nba_recommendations`, `tasks` | `idx_nba_sessions_user_id`, `idx_tasks_score_total` |
| FR-003: Voice Input | `signals` | `idx_signals_type` |
| FR-004: Text Input | `signals` | `idx_signals_type` |
| FR-005: Rationale | `nba_recommendations` (rationale_full) | `idx_nba_recs_session_id` |
| FR-006: Alternatives | `nba_recommendations` (rank > 1) | `idx_nba_recs_rank` |
| FR-007: Context Maintenance | `objectives`, `tasks`, `unknowns`, `evidence`, `decisions`, `signals` | All user_id indexes |
| FR-008: Update Logging | `signals` | `idx_signals_created_at` |
| FR-009: Override Learning | `overrides`, `user_profiles` (weights) | `idx_overrides_learning` |
| FR-010: Confidence Display | `nba_recommendations` (confidence_*) | N/A |
| FR-011: Calendar Integration | `integrations`, `calendar_events` | `idx_calendar_events_time` |
| FR-012: Task Integration | `integrations`, `external_tasks` | `idx_external_tasks_sync_status` |
| FR-013: Business State Graph | All core entities + M:N tables | Graph traversal indexes |
| FR-014: Framework Router | `objectives` (metadata), `tasks` (metadata) | N/A |
| FR-015: Override Taxonomy | `overrides` (override_category) | `idx_overrides_category` |
| FR-016: Quick Updates | `signals` | `idx_signals_created_at` |
| NFR-001: Performance | All | All performance-critical indexes |
| NFR-002: Security | `integrations` (encrypted tokens) | N/A |
| NFR-003: Privacy | GDPR-compliant (user deletion cascades) | N/A |
| NFR-004: Cost | Efficient queries, caching | All indexes to avoid full scans |
| NFR-005: Reliability | Transaction support, FK constraints | N/A |

---

## Next Steps

1. **Implementation:**
   - Create Alembic migration for initial schema
   - Implement SQLAlchemy ORM models (Python)
   - Write database seed scripts for testing

2. **Validation:**
   - Load test with 10K users, 100K tasks, 1M signals
   - Query performance benchmarks (<500ms for context retrieval)
   - Verify cascade deletes work correctly

3. **Documentation:**
   - Create API_SPEC.md (FastAPI endpoint definitions)
   - Create FRAMEWORKS.md (Framework router implementation details)

---

**End of DATA_MODEL.md**
