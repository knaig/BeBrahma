# BeBrahma Business Graph Architecture

**Version:** 0.4.0
**Date:** January 11, 2026
**Status:** Design Complete → Implementation Ready

---

## Executive Summary

This document describes the **Business Graph Engine** - a system that models startup progress as a multi-dimensional directed graph where founders can explore multiple parallel directions simultaneously, with each direction validated through evidence-driven experiments.

**Key Innovation:** Instead of forcing founders down a single "best guess" path, we enable parallel exploration of multiple directions, with automated evaluation of which paths show the most promise.

---

## The Core Concept

### Traditional Approach (Linear)
```
Idea → Pick Direction → Execute → Hope it works → Pivot if wrong → Repeat
```
**Problem:** High cost of being wrong. Serial experimentation. Slow learning.

### Business Graph Approach (Parallel)
```
                    ┌─ Direction A (Solution 1) ─ [Gate] ─→ Node A
                    │
Initial State ──────┼─ Direction B (Solution 2) ─ [Gate] ─→ Node B
                    │
                    └─ Direction C (Market Test) ─ [Gate] ─→ Node C
```
**Innovation:** Evaluate multiple directions in parallel. Let evidence decide which to pursue.

---

## Graph Components

### 1. Nodes = Business States

A **node** represents a specific state of business understanding.

**Properties:**
- `state_id` - Unique identifier
- `label` - Human-readable name
- `stage` - problem_discovery, solution_validation, market_validation, growth
- `context` - Current objectives, unknowns, evidence at this state
- `confidence_score` - How validated is this state (0-100)
- `created_at` - When this state was reached
- `parent_nodes` - Which states led here (can be multiple)

**Example Nodes:**
```
Node 0: "Initial Idea"
  stage: problem_discovery
  context: {
    objectives: ["Find real customer pain"],
    unknowns: ["Who has this problem?", "How painful is it?"],
    evidence: []
  }
  confidence: 5

Node A: "Pain Validated - SMB Sales Teams"
  stage: solution_validation
  context: {
    objectives: ["Build solution for SMB sales"],
    unknowns: ["What features matter most?"],
    evidence: ["8/10 sales managers said outreach takes 5+ hrs/day"]
  }
  confidence: 65
```

### 2. Edges = Directions (Experiments)

An **edge** represents a direction you can take from a state - implemented as an **Experiment**.

**Properties:**
- `experiment_id` - Unique identifier
- `from_node_id` - Starting state
- `to_node_id` - Target state (created when experiment succeeds)
- `hypothesis` - What we're testing
- `approach` - How we'll test it
- `gates` - Success/failure criteria
- `status` - pending, in_progress, passed, failed, abandoned
- `evidence_collected` - What we learned
- `started_at`, `completed_at`

**Example Edges:**
```
Edge 1: "Interview Sales Managers"
  from: Node 0 (Initial Idea)
  to: Node A (Pain Validated)
  hypothesis: "SMB sales managers have outreach pain"
  gates: [
    {type: "evidence_threshold", condition: "5+ interviews confirming pain"}
  ]
  status: passed
  evidence: ["8/10 confirmed 5+ hrs/day on manual outreach"]

Edge 2: "Interview Marketing Teams"
  from: Node 0 (Initial Idea)
  to: Node B (Different Pain Point)
  hypothesis: "Marketing teams have similar pain"
  gates: [...]
  status: in_progress
```

### 3. Gates = Validation Checkpoints

A **gate** is a pass/fail criterion that determines if an experiment succeeds.

**Gate Types:**

1. **Evidence Threshold**
   ```json
   {
     "type": "evidence_threshold",
     "description": "5 customer interviews",
     "condition": "interview_count >= 5 AND pain_confirmed >= 3"
   }
   ```

2. **Artifact Required**
   ```json
   {
     "type": "artifact_required",
     "description": "Landing page launched",
     "condition": "artifact_type == 'landing_page' AND status == 'live'"
   }
   ```

3. **Metric Threshold**
   ```json
   {
     "type": "metric_threshold",
     "description": "Conversion rate > 5%",
     "condition": "conversion_rate >= 0.05"
   }
   ```

4. **Manual Approval**
   ```json
   {
     "type": "manual_approval",
     "description": "Team agrees this is promising",
     "condition": "founder_approved == true"
   }
   ```

---

## How Parallel Exploration Works

### Phase 1: Generate Candidate Directions

From any node, the **Framework Router** generates multiple possible experiments:

```
Current Node: "Initial Idea"
Unknowns: ["Who has this problem?", "How painful is it?", "Will they pay?"]

Generated Directions:
1. Interview SMB sales managers (targets unknown 1, 2)
2. Interview enterprise sales managers (targets unknown 1, 2)
3. Survey 100 sales people via LinkedIn (targets unknown 1, 2)
4. Build landing page + ads (targets unknown 3)
5. Analyze competitor reviews (targets unknown 1, 2)
```

### Phase 2: Score & Prioritize

Each direction gets an **NBA score** (0-10):
- Objective impact (30%) - Does this resolve critical unknowns?
- Time sensitivity (25%) - Is timing critical?
- Evidence gap (25%) - How much uncertainty remains?
- Unblocks (10%) - Does this enable other directions?
- Feasibility (10%) - Can we execute this now?

**Output:**
```
Direction 1: Interview SMB sales (Score: 8.7)
Direction 2: Interview enterprise sales (Score: 7.2)
Direction 3: Survey 100 sales people (Score: 6.8)
Direction 4: Landing page + ads (Score: 5.9)
Direction 5: Analyze reviews (Score: 5.1)
```

### Phase 3: Execute in Parallel (Top N)

The founder can run **multiple experiments simultaneously**:

```
✅ RUNNING (Slot 1): Interview SMB sales managers
   Progress: 3/5 interviews done
   Gate: 5 interviews + 3/5 confirm pain
   ETA: 3 days

✅ RUNNING (Slot 2): Survey 100 sales people
   Progress: 47/100 responses
   Gate: 100 responses + 60% confirm pain
   ETA: 5 days

⏸ QUEUED: Landing page + ads (Score: 5.9)
```

**Key Innovation:** Instead of "pick the best and hope," you're gathering evidence from multiple angles simultaneously.

### Phase 4: Evaluate & Branch

When experiments complete, gates determine outcomes:

```
Experiment 1: PASSED ✅
  → Creates Node A: "Pain Validated - SMB"
  → Updates context with evidence
  → Generates new directions from Node A

Experiment 2: FAILED ❌
  → Evidence: Only 23% confirmed pain
  → Does not create new node
  → Insight logged: "Survey approach ineffective"
```

**The Graph Grows:**
```
                    ┌─ [Exp 1: PASSED] ─→ Node A (SMB Pain Validated)
                    │                          │
Initial Idea ───────┤                          ├─→ [New Exp 4: Build MVP]
                    │                          └─→ [New Exp 5: Pricing Test]
                    │
                    └─ [Exp 2: FAILED] ─→ Dead End (Survey approach)
```

### Phase 5: Prune & Focus

As the graph grows, the **Loop Reflector** identifies:
- **Hot paths:** Sequences where multiple gates passed with high confidence
- **Dead ends:** Directions that failed validation
- **Promising unexplored:** High-scoring directions not yet executed

**Output:**
```
🔥 HOT PATH DETECTED:
Node 0 → Node A (SMB Pain) → Node C (MVP Validated) → Node E (10 Paying Customers)
Confidence: 87%
Recommendation: Continue this path, deprioritize others

💀 PRUNE CANDIDATES:
- Direction B (Enterprise): 2 failed gates, low confidence
- Direction D (Freemium model): Blocked on other experiments
```

---

## Integration with Existing NBA Engine

### Current NBA Engine
- Single recommendation per session
- Context = objectives + unknowns + evidence
- Frameworks generate tasks
- Score tasks by 5 dimensions

### Business Graph Enhancement

**NBA becomes the scoring mechanism for edges:**

1. **Node Context → NBA Input**
   ```python
   current_node = graph.get_node(user.current_node_id)
   context = {
       "objectives": current_node.context.objectives,
       "unknowns": current_node.context.unknowns,
       "evidence": current_node.context.evidence
   }
   ```

2. **Framework Router → Edge Generator**
   ```python
   frameworks = select_frameworks(current_node.stage, context)
   candidate_edges = []
   for framework in frameworks:
       experiments = framework.generate_experiments(context)
       candidate_edges.extend(experiments)
   ```

3. **NBA Scorer → Edge Prioritization**
   ```python
   for edge in candidate_edges:
       edge.nba_score = nba_scorer.score(edge, context)

   top_n_edges = sorted(candidate_edges, key=lambda e: e.nba_score, reverse=True)[:N]
   ```

4. **Execution → Edge State Updates**
   ```python
   user_says("Finished 5 interviews, 4 confirmed pain")

   # Update edge
   edge = graph.get_edge(experiment_id)
   edge.evidence_collected.append({"interviews": 5, "pain_confirmed": 4})

   # Evaluate gate
   gate_result = gate_evaluator.evaluate(edge.gates, edge.evidence_collected)
   if gate_result.passed:
       new_node = graph.create_node(from_edge=edge)
       edge.to_node_id = new_node.id
       edge.status = "passed"
   ```

5. **Reflection → Graph Pruning**
   ```python
   loop_run = LoopRun()
   reflection = reflector.analyze_graph(graph, user.current_node_id)

   if reflection.hot_path:
       # Recommend doubling down on this path
       next_edges = graph.get_edges_from_node(reflection.hot_path[-1])
       return top_scored_edges(next_edges)
   ```

---

## Data Model

### New Tables

#### 1. `business_nodes`
```sql
CREATE TABLE business_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(user_id),
    label VARCHAR(500) NOT NULL,
    stage VARCHAR(100) NOT NULL,  -- problem_discovery, solution_validation, etc.
    context JSONB NOT NULL,  -- {objectives: [], unknowns: [], evidence: []}
    confidence_score INTEGER DEFAULT 0,  -- 0-100
    is_current BOOLEAN DEFAULT false,
    parent_node_ids UUID[] DEFAULT '{}',  -- Multiple parents possible
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    meta_data JSONB DEFAULT '{}'
);

CREATE INDEX idx_business_nodes_user ON business_nodes(user_id);
CREATE INDEX idx_business_nodes_current ON business_nodes(user_id, is_current);
CREATE INDEX idx_business_nodes_stage ON business_nodes(stage);
```

#### 2. `experiments` (replaces/extends tasks)
```sql
CREATE TABLE experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(user_id),
    from_node_id UUID NOT NULL REFERENCES business_nodes(id),
    to_node_id UUID REFERENCES business_nodes(id),  -- NULL until passed

    title VARCHAR(500) NOT NULL,
    hypothesis TEXT,
    approach TEXT,

    nba_score NUMERIC(4,2),  -- 0.00-10.00
    nba_score_breakdown JSONB,  -- {objective_impact: 0.3, ...}

    status VARCHAR(50) DEFAULT 'pending',  -- pending, in_progress, passed, failed, abandoned

    gates JSONB NOT NULL DEFAULT '[]',  -- Array of gate objects
    evidence_collected JSONB DEFAULT '[]',

    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    meta_data JSONB DEFAULT '{}'
);

CREATE INDEX idx_experiments_user ON experiments(user_id);
CREATE INDEX idx_experiments_from_node ON experiments(from_node_id);
CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_experiments_nba_score ON experiments(nba_score DESC);
```

#### 3. `gates`
```sql
CREATE TABLE gates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    gate_order INTEGER NOT NULL,  -- 1, 2, 3 (sequential evaluation)

    gate_type VARCHAR(100) NOT NULL,  -- evidence_threshold, artifact_required, etc.
    description TEXT NOT NULL,
    condition JSONB NOT NULL,  -- JSON rule for evaluation

    status VARCHAR(50) DEFAULT 'pending',  -- pending, passed, failed
    evaluated_at TIMESTAMP,
    evaluation_result JSONB,  -- Result details

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gates_experiment ON gates(experiment_id, gate_order);
```

#### 4. `loop_runs`
```sql
CREATE TABLE loop_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(user_id),

    trigger VARCHAR(100) NOT NULL,  -- scheduled, user_request, auto_reflection
    current_node_id UUID NOT NULL REFERENCES business_nodes(id),

    selected_experiments UUID[] DEFAULT '{}',  -- Experiments recommended this run
    reflection JSONB,  -- Insights from reflector

    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    meta_data JSONB DEFAULT '{}'
);

CREATE INDEX idx_loop_runs_user ON loop_runs(user_id, started_at DESC);
```

#### 5. `graph_insights`
```sql
CREATE TABLE graph_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(user_id),

    insight_type VARCHAR(100) NOT NULL,  -- hot_path, dead_end, pattern_detected
    description TEXT NOT NULL,
    node_sequence UUID[],  -- Path through graph
    confidence_score INTEGER,  -- 0-100

    actionable_recommendation TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    meta_data JSONB DEFAULT '{}'
);

CREATE INDEX idx_graph_insights_user ON graph_insights(user_id, created_at DESC);
```

---

## Core Services

### 1. ExperimentGenerator
**Input:** Current node, context
**Output:** List of candidate experiments with NBA scores

```python
class ExperimentGenerator:
    def generate_from_node(
        self,
        node: BusinessNode,
        user_profile: UserProfile
    ) -> List[Experiment]:
        # Select frameworks
        frameworks = self.framework_router.select(node.stage, node.context)

        # Generate experiments from each framework
        candidates = []
        for framework in frameworks:
            experiments = framework.generate_experiments(
                objectives=node.context.objectives,
                unknowns=node.context.unknowns,
                evidence=node.context.evidence
            )
            candidates.extend(experiments)

        # Score each experiment
        for exp in candidates:
            exp.nba_score = self.scorer.score(exp, node.context)

        return sorted(candidates, key=lambda e: e.nba_score, reverse=True)
```

### 2. GateEvaluator
**Input:** Experiment + Evidence
**Output:** Pass/Fail + Reasoning

```python
class GateEvaluator:
    def evaluate_experiment(
        self,
        experiment: Experiment
    ) -> GateEvaluationResult:
        results = []

        for gate in sorted(experiment.gates, key=lambda g: g.gate_order):
            result = self._evaluate_gate(gate, experiment.evidence_collected)
            results.append(result)

            if result.status == "failed":
                break  # Stop at first failure

        all_passed = all(r.status == "passed" for r in results)

        return GateEvaluationResult(
            passed=all_passed,
            gate_results=results,
            reasoning=self._generate_reasoning(results)
        )

    def _evaluate_gate(self, gate: Gate, evidence: List[Dict]) -> GateResult:
        if gate.gate_type == "evidence_threshold":
            return self._evaluate_evidence_threshold(gate, evidence)
        elif gate.gate_type == "artifact_required":
            return self._evaluate_artifact(gate, evidence)
        # ... other gate types
```

### 3. GraphNavigator
**Input:** User signals
**Output:** Updated graph state

```python
class GraphNavigator:
    def process_update(
        self,
        user_id: str,
        update: str  # Voice or text update
    ) -> GraphUpdateResult:
        # Extract signals from update
        signals = self.nlp_extractor.extract(update)

        # Determine affected experiments
        current_node = self.get_current_node(user_id)
        active_experiments = self.get_active_experiments(current_node.id)

        # Update experiments with new evidence
        for exp in active_experiments:
            if self._is_relevant(signals, exp):
                exp.evidence_collected.extend(signals.evidence)

                # Evaluate gates
                gate_result = self.gate_evaluator.evaluate_experiment(exp)

                if gate_result.passed:
                    # Create new node
                    new_node = self._create_node_from_experiment(exp)
                    exp.to_node_id = new_node.id
                    exp.status = "passed"

                    # Update current node
                    self.set_current_node(user_id, new_node.id)

        return GraphUpdateResult(...)
```

### 4. LoopOrchestrator
**Input:** User context
**Output:** Next recommended experiments

```python
class LoopOrchestrator:
    async def run_loop(self, user_id: str) -> LoopRunResult:
        # Get current state
        current_node = await self.graph.get_current_node(user_id)

        # Generate candidate experiments
        candidates = await self.experiment_generator.generate_from_node(current_node)

        # Get reflection insights
        reflection = await self.reflector.analyze_graph(user_id, current_node.id)

        # Select top N experiments (parallel execution)
        n_parallel = self._determine_parallel_capacity(user_profile)
        selected = candidates[:n_parallel]

        # Log loop run
        loop_run = LoopRun(
            user_id=user_id,
            current_node_id=current_node.id,
            selected_experiments=[e.id for e in selected],
            reflection=reflection
        )
        await self.db.save(loop_run)

        return LoopRunResult(
            top_recommendation=selected[0],
            alternatives=selected[1:],
            reflection=reflection
        )
```

### 5. GraphReflector
**Input:** User's graph history
**Output:** Insights (hot paths, dead ends, patterns)

```python
class GraphReflector:
    async def analyze_graph(
        self,
        user_id: str,
        current_node_id: UUID
    ) -> GraphReflection:
        # Get all nodes and edges
        nodes = await self.db.get_nodes(user_id)
        experiments = await self.db.get_experiments(user_id)

        # Detect hot paths
        hot_paths = self._detect_hot_paths(nodes, experiments)

        # Detect dead ends
        dead_ends = self._detect_dead_ends(experiments)

        # Detect patterns
        patterns = self._detect_patterns(experiments)

        # Generate insights
        insights = []

        if hot_paths:
            insights.append(GraphInsight(
                type="hot_path",
                description=f"Path with {len(hot_paths[0])} consecutive successes",
                node_sequence=hot_paths[0],
                confidence=self._calculate_path_confidence(hot_paths[0]),
                recommendation="Continue this direction, deprioritize alternatives"
            ))

        if dead_ends:
            insights.append(GraphInsight(
                type="dead_end",
                description=f"{len(dead_ends)} failed experiments",
                recommendation="Avoid similar approaches"
            ))

        return GraphReflection(
            hot_paths=hot_paths,
            dead_ends=dead_ends,
            patterns=patterns,
            insights=insights
        )
```

---

## API Endpoints

### Graph Management

#### `POST /api/v1/graph/initialize`
Create initial node for new user.

**Request:**
```json
{
  "initial_description": "Building B2B SaaS for sales automation"
}
```

**Response:**
```json
{
  "node_id": "uuid",
  "label": "Initial Idea",
  "stage": "problem_discovery",
  "context": {
    "objectives": ["Validate problem exists"],
    "unknowns": ["Who has this problem?", "How painful is it?"],
    "evidence": []
  }
}
```

#### `GET /api/v1/graph/current`
Get current node and active experiments.

**Response:**
```json
{
  "current_node": {...},
  "active_experiments": [
    {
      "id": "uuid",
      "title": "Interview 10 sales managers",
      "status": "in_progress",
      "progress": "3/10 interviews complete",
      "gates": [...],
      "nba_score": 8.7
    }
  ],
  "available_directions": [...]
}
```

#### `GET /api/v1/graph/visualize`
Get full graph for visualization.

**Response:**
```json
{
  "nodes": [
    {"id": "uuid", "label": "Initial Idea", "confidence": 5, ...},
    {"id": "uuid", "label": "Pain Validated", "confidence": 78, ...}
  ],
  "edges": [
    {
      "from": "node1",
      "to": "node2",
      "experiment": {...},
      "status": "passed"
    }
  ]
}
```

### Loop Operations

#### `POST /api/v1/loop/run`
Trigger loop execution (generate recommendations).

**Request:**
```json
{
  "parallel_capacity": 2  // How many experiments to run simultaneously
}
```

**Response:**
```json
{
  "loop_run_id": "uuid",
  "recommendations": [
    {
      "rank": 1,
      "experiment": {...},
      "nba_score": 8.7,
      "rationale": "..."
    }
  ],
  "reflection": {
    "insights": [...]
  }
}
```

#### `POST /api/v1/loop/update`
Process user update (voice/text signal).

**Request:**
```json
{
  "content": "Just finished 5 customer interviews. 4 out of 5 confirmed they spend 3+ hours per day on manual outreach."
}
```

**Response:**
```json
{
  "processed_signals": [
    {"type": "task_completion", "experiment_id": "uuid"},
    {"type": "evidence", "data": {"interviews": 5, "pain_confirmed": 4}}
  ],
  "experiments_updated": [
    {
      "experiment_id": "uuid",
      "status": "passed",
      "new_node_created": {
        "id": "uuid",
        "label": "Problem Validated - Sales Teams"
      }
    }
  ],
  "next_recommendations": [...]
}
```

### Experiment Management

#### `POST /api/v1/experiments`
Create custom experiment.

**Request:**
```json
{
  "title": "Landing page MVP test",
  "hypothesis": "Sales managers will sign up for beta",
  "gates": [
    {
      "type": "artifact_required",
      "description": "Landing page live",
      "condition": {"artifact_type": "landing_page", "status": "live"}
    },
    {
      "type": "metric_threshold",
      "description": "50+ signups in 2 weeks",
      "condition": {"signup_count >= 50", "timeframe": "14_days"}
    }
  ]
}
```

#### `PUT /api/v1/experiments/{id}/evidence`
Add evidence to experiment.

**Request:**
```json
{
  "evidence": [
    {"type": "interview", "interview_id": 1, "pain_confirmed": true},
    {"type": "interview", "interview_id": 2, "pain_confirmed": true}
  ]
}
```

#### `POST /api/v1/experiments/{id}/evaluate`
Manually trigger gate evaluation.

**Response:**
```json
{
  "passed": true,
  "gate_results": [
    {
      "gate_order": 1,
      "status": "passed",
      "reasoning": "5 interviews completed, 4 confirmed pain"
    }
  ],
  "new_node_created": {...}
}
```

### Insights

#### `GET /api/v1/insights`
Get graph insights and recommendations.

**Response:**
```json
{
  "insights": [
    {
      "type": "hot_path",
      "description": "3 consecutive experiments passed on SMB sales path",
      "confidence": 87,
      "recommendation": "Focus resources here"
    },
    {
      "type": "dead_end",
      "description": "Enterprise approach: 2 failed gates",
      "recommendation": "Deprioritize this segment"
    }
  ]
}
```

---

## User Experience (Voice-First)

### Scenario 1: Starting Fresh

**User:** "What should I work on?"

**BeBrahma:**
```
You're at the starting point. I see 3 promising directions:

🎯 Recommended (Score: 8.7)
Interview 10 sales managers to validate problem

Gates:
✓ Complete 5 interviews
✓ 3+ confirm they have this pain

Why: You have critical unknowns about customer pain.

🔀 Also consider:
• Survey 100 sales people (8.2)
• Build simple landing page (7.1)

You can run the top 2 in parallel. Which do you want to start?
```

### Scenario 2: Progress Update

**User (voice):** "Just finished 5 interviews. 4 sales managers confirmed they spend 3-5 hours daily on outreach and said it's their biggest pain point."

**BeBrahma (processing):**
- Detects: Task completion signal
- Extracts: 5 interviews, 4 confirmed pain
- Evaluates gates: ✓ Passed
- Creates new node: "Problem Validated - SMB Sales"
- Generates new experiments from this node

**BeBrahma (response):**
```
✅ Great progress! Gate passed on "Interview sales managers"

New State: Problem Validated - SMB Sales Teams
Confidence: 78%

🎯 Next Recommended (Score: 9.1)
Build clickable MVP prototype to test willingness to pay

Gates:
✓ Prototype built
✓ 10 sales managers test it
✓ 5+ say they'd pay $X/month

Why: Problem is validated. Now test if your solution resonates.

You have 2 experiments running:
• Interviews (Complete ✓)
• Survey (47/100 responses, ongoing)

Want to start the MVP experiment?
```

### Scenario 3: Graph Reflection

**User:** "Show me where we are"

**BeBrahma:**
```
📊 Your Business Graph

Path 1 (HOT 🔥):
Initial → Problem Validated (SMB) → MVP Prototype → 10 Beta Users
Confidence: 87% | 4/4 gates passed

Path 2 (Cooling):
Initial → Enterprise Market Test → FAILED
2 gates failed. Recommendation: Deprioritize enterprise for now.

Path 3 (Active):
Problem Validated → Pricing Test
2/3 gates passed, 1 pending

🎯 Recommendation: Double down on Path 1. You're on a hot streak.
```

---

## Implementation Phases

### Phase 1: Core Graph Engine (Week 1-2)
- [ ] Create 5 new tables (business_nodes, experiments, gates, loop_runs, graph_insights)
- [ ] Implement ExperimentGenerator
- [ ] Implement GateEvaluator
- [ ] Implement GraphNavigator
- [ ] Basic graph CRUD operations

### Phase 2: Loop Orchestration (Week 3)
- [ ] Implement LoopOrchestrator
- [ ] Integrate with existing NBA engine
- [ ] API endpoints: /loop/run, /loop/update
- [ ] Voice signal extraction

### Phase 3: Graph Intelligence (Week 4)
- [ ] Implement GraphReflector
- [ ] Hot path detection
- [ ] Dead end detection
- [ ] Pattern recognition
- [ ] Insight generation

### Phase 4: Frontend (Week 5-6)
- [ ] Graph visualization component
- [ ] Experiment cards with progress
- [ ] Voice input for updates
- [ ] Multi-experiment status view

---

## Success Metrics

### Activation
- [ ] First graph node created in <2 minutes
- [ ] First experiment started in <5 minutes

### Engagement
- [ ] 2+ experiments running in parallel (per active user)
- [ ] 5+ voice updates per week
- [ ] 80%+ of experiments have gates evaluated

### Learning
- [ ] 70%+ gate evaluation accuracy (vs manual review)
- [ ] 60%+ hot path detection leads to success
- [ ] 40%+ reduction in time to validated insight

### Retention
- [ ] 50% of users reach 3+ nodes in first 2 weeks
- [ ] 30% of users have a "hot path" by week 4

---

## Conclusion

The **Business Graph Engine** transforms BeBrahma from a recommendation system into a **parallel experimentation platform**.

**Key Benefits:**
1. **Reduces risk** - Multiple experiments hedge against wrong bets
2. **Faster learning** - Parallel validation vs serial guessing
3. **Clear progress** - Visual graph shows validated vs failed paths
4. **Automated guidance** - Hot paths emerge from data, not gut feel

**Integration with Existing System:**
- NBA engine becomes the scoring mechanism for graph edges
- Frameworks generate experiments (edges)
- Voice updates process signals and update graph state
- Reflector identifies patterns and recommends focus

**Next Step:** Implement Phase 1 (Core Graph Engine)

---

**Last Updated:** January 11, 2026
**Status:** Ready for Implementation
**Estimated Completion:** 4-6 weeks
