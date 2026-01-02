# BeBrahma v0.3 - Product Requirements Document (PRD)

**AI Co-Founder That Always Knows What To Do Next**

---

## Executive Summary

BeBrahma is an AI co-founder that helps founders always know "what to do next" and why. It's mobile-first (iOS/Android), voice-driven, and uses progressive profiling (ONE question upfront) to provide intelligent Next Best Action (NBA) recommendations.

**Core Value Prop:** Your AI co-founder that always knows what to do next — and why.

---

## 1. Vision & Goals

### Vision
Eliminate the founder's constant anxiety of "am I working on the right thing?" by providing intelligent, context-aware recommendations that adapt to their unique journey.

### Goals
1. **Activation:** 80% of users get their first recommendation in <2 minutes with ≤1 question asked
2. **Core Functionality:** Voice AND text input work smoothly (<1s transcription, >95% accuracy)
3. **Value Delivery:** Top-1 recommendation accuracy >60% vs expert panel
4. **Engagement:** 75% of sessions end with user starting or scheduling the recommended action
5. **Cost Efficiency:** <$0.10 per session average (via aggressive caching and tiered LLM strategy)

---

## 2. User Personas

### Primary: Solo Technical Founder (Pre-Seed)
- Building first startup
- Technical background, less business experience
- Overwhelmed by "what to do next"
- Values: Speed, clarity, actionability
- Pain: Paralysis from too many options

### Secondary: Non-Technical Founder
- Has domain expertise but less product/tech knowledge
- Needs structured guidance
- Values: Step-by-step clarity, learning
- Pain: Doesn't know what questions to ask

---

## 3. Core User Flow

### First-Time User
1. **Launch app** → ONE question: "What are you building?" (text or voice)
2. **Immediate NBA recommendation** → Shows: Action + Confidence + 2 Alternatives
3. **Tap for rationale** → Expands to show full "why, why now, expected outcome"
4. **Take action** → Start task, schedule it, or choose alternative
5. **Progressive learning** → System learns from choices, refines future recommendations

### Returning User
1. **Quick update** → "Just finished 10 customer interviews" (voice/text)
2. **Context update** → System extracts: completed tasks, new evidence, insights
3. **New NBA** → Updated recommendation based on latest context
4. **Continuous loop** → Update → Recommend → Act → Update

---

## 4. Key Features

### 4.1 Progressive Profiling (FR-001)
**Problem:** Traditional tools require extensive setup (objectives, tasks, milestones) before providing value.

**Solution:** Ask ONE question upfront: "What are you building?"
- Extract: Problem space, target customer (loose), stage hint
- Generate first recommendation immediately
- Learn everything else progressively from:
  - User updates (voice/text)
  - Override patterns (when they choose alternatives)
  - Task completion signals
  - Calendar sync (meetings = customer-facing signals)

**Acceptance Criteria:**
- 80% of users get first recommendation with ≤1 question asked
- First-time user can start an action within 3 minutes of signup

---

### 4.2 Next Best Action (NBA) Recommendation (FR-002)

**Core Algorithm:**

System computes ONE recommended action + 2-3 alternatives, each with:
- **Confidence level** (Very High / High / Moderate / Low)
- **Score breakdown** across 5 dimensions
- **Rationale** (always visible summary, expandable full explanation)

**5-Dimension Scoring:**

1. **Objective Impact** (30% weight)
   - How much does this advance your top objective?
   - Considers: objective priority, task's contribution to completion

2. **Time Sensitivity** (25% weight)
   - How urgent is this?
   - Considers: deadlines, external triggers (e.g., upcoming customer meeting)

3. **Evidence Gap** (25% weight)
   - Does this reduce critical unknowns?
   - Considers: number of unknowns addressed, importance of unknowns, current evidence level

4. **Unblocks** (10% weight)
   - Does this unblock other high-priority tasks?
   - Considers: dependency chains, blocked task priority

5. **Feasibility** (10% weight)
   - Can you do this right now?
   - Considers: time available (from calendar), estimated duration, dependencies

**Weighted Sum = Total Score** → Rank all candidate tasks → Top 3 become: Recommendation + 2 Alternatives

**Acceptance Criteria:**
- Top-1 accuracy >60% when compared to expert panel recommendations
- Confidence score correlates with actual override rate (r > 0.5)
- 75% of sessions end with user starting or scheduling an action

---

### 4.3 Voice Input (FR-003)

**Problem:** Founders want to update on-the-go (post-meeting, driving, etc.)

**Solution:** Voice-first input for all interactions
- Transcription: <1 second latency, >95% accuracy
- Intent classification: Update vs Question vs Override
- Entity extraction: Tasks completed, evidence gathered, blockers, insights

**Acceptance Criteria:**
- Voice transcription <1s (p90)
- Transcription accuracy >95% (measured on sample dataset)
- Users can complete full "update → new NBA" loop via voice only

---

### 4.4 Text Input (FR-004)

**Problem:** Some contexts require precise text (links, numbers, names)

**Solution:** Text input as alternative to voice
- Quick text box always accessible
- Same intent classification and entity extraction as voice
- Supports pasting links, screenshots (future)

**Acceptance Criteria:**
- Text updates processed in <500ms
- Entity extraction works equally well on text and voice

---

### 4.5 Rationale (FR-005)

**Problem:** Users won't trust recommendations without understanding the "why"

**Solution:** Always show rationale, with 2 levels of detail:

**Level 1: Summary (always visible)**
- 1-2 sentence explanation
- Example: "Your next critical step is to interview 10 target customers. This directly addresses your most important unknown (will customers pay?) and has the highest impact on validating product-solution fit."

**Level 2: Full Rationale (tap to expand)**
- **Why:** Why this task matters for your business
- **Why Now:** Why this is the right time (urgency, dependencies, context)
- **Expected Outcome:** What you'll learn/achieve
- **Frameworks Applied:** Which frameworks (Problem-Solution Fit, ICP+Wedge, etc.) suggest this
- **Risks if Skipped:** What happens if you don't do this

**Acceptance Criteria:**
- Users rate rationale clarity >7/10 on average
- <5% of users report "unclear why" in feedback

---

### 4.6 Alternatives (FR-006)

**Problem:** One-size-fits-all recommendations ignore context (energy level, time available, emotional state)

**Solution:** Always show 2-3 alternatives with scores and rationale
- Ranked by total score (alternative #1 = 2nd highest score, etc.)
- Each alternative shows: title, score, confidence, brief rationale
- User can tap alternative to see full rationale
- User can "choose this instead" → Logs as override for learning

**Acceptance Criteria:**
- 30% of users choose alternatives over top recommendation (indicates good diversity)
- Alternatives differ meaningfully in at least 2 dimensions (e.g., time-intensive vs quick win)

---

### 4.7 Context Maintenance (FR-007)

**System automatically maintains "Business State Graph":**

**Entities:**
- **Objectives:** Top-level goals (e.g., "Validate Product-Solution Fit")
- **Tasks:** Actionable items (status: pending/in-progress/blocked/completed)
- **Critical Unknowns:** Questions that must be answered (e.g., "Will customers pay $X?")
- **Evidence:** Facts, data, learnings gathered
- **Decisions:** Key strategic choices made
- **Signals:** Time-series events (updates, voice notes, calendar events, task completions)

**Graph Relationships:**
- Objectives → Tasks (which tasks advance which objectives)
- Tasks → Unknowns (which tasks address which unknowns)
- Evidence → Unknowns (which evidence resolves which unknowns)
- Decisions → Evidence (which evidence informed which decisions)

**Acceptance Criteria:**
- Context persists across sessions (user returns 1 week later, context intact)
- "What changed since last session" view shows accurate delta
- Context updates from voice/text are 90% accurate (measured on sample)

---

### 4.8 Update Logging (FR-008)

**User can log updates anytime via voice or text:**

**Example voice updates:**
- "Just finished 10 customer interviews. 8 out of 10 said they'd pay for this."
- "Blocked on landing page. Designer ghosted me."
- "Had coffee with potential investor. They're interested."

**System extracts:**
- **Completed tasks:** "10 customer interviews" → Mark task as done
- **New evidence:** "8/10 would pay" → Create evidence, link to unknown "will customers pay?"
- **Blockers:** "Designer ghosted" → Mark task as blocked, flag for NBA adjustment
- **Signals:** "Investor interested" → Log signal for future context

**Acceptance Criteria:**
- 90% of updates correctly classified (task completion vs evidence vs blocker vs insight)
- Entity extraction accuracy >80% (measured on sample dataset)
- Updates reflected in next NBA recommendation (no stale recommendations)

---

### 4.9 Override Learning (FR-009)

**Problem:** Everyone's context is unique (energy levels, preferences, constraints)

**Solution:** Learn from when users choose alternatives over top recommendation

**Override Taxonomy:**
1. **Time Preference:** User chose shorter/longer task than recommended
2. **Energy Level:** User chose less demanding task (e.g., Friday evening)
3. **Skill Match:** User chose task better suited to their skills
4. **Emotional State:** User chose task that feels more motivating right now
5. **External Constraint:** User has calendar conflict, deadline, etc.
6. **Strategic Disagreement:** User has different view on priority

**Learning Loop:**
- User chooses alternative → System logs override + context (time of day, day of week, recent completions)
- Weekly batch: Aggregate override patterns → Adjust user-specific scoring weights
- Example: If user consistently chooses low-feasibility tasks in evenings → Increase feasibility weight for evening sessions

**Acceptance Criteria:**
- Override patterns detected with >70% accuracy (classify correctly into taxonomy)
- Scoring weights adapt: Users with >10 overrides have personalized weights different from defaults
- Override rate decreases over time (system learns user preferences)

---

### 4.10 Confidence Display (FR-010)

**System shows confidence level for every recommendation:**

**Confidence Levels:**
- **Very High (>80%):** Strong data, clear choice, high historical accuracy
- **High (60-80%):** Good data, solid choice, decent track record
- **Moderate (40-60%):** Adequate data, reasonable choice, some uncertainty
- **Low (<40%):** Limited data, uncertain choice, many unknowns

**Confidence Factors (shown on tap):**
- Context completeness (Do we have enough info about objectives, unknowns, etc.?)
- Historical accuracy (Have past recommendations been accepted?)
- Data quality (Is evidence reliable? Are unknowns well-defined?)
- Recency (Is context up-to-date?)

**Acceptance Criteria:**
- Confidence level correlates with user acceptance rate (r > 0.5)
- Users trust high-confidence recommendations >80% of the time
- Low-confidence recommendations prompt users to add more context (measured via follow-up actions)

---

### 4.11 Calendar Integration (Read-Only) (FR-011)

**Problem:** Calendar is rich signal for context (customer meetings, focus time, deadlines)

**Solution:** Sync Google Calendar (read-only)
- Detect customer-facing meetings (heuristics: "interview", "demo", "customer", external attendees)
- Use for time-sensitivity scoring (e.g., "You have a customer meeting tomorrow → prep task scores higher")
- Use for feasibility scoring (e.g., "You have 2 hours free this afternoon → suggest 2hr task")

**Privacy:** Read-only. Never write to calendar. User controls which calendars to sync.

**Acceptance Criteria:**
- Calendar events synced within 15 minutes
- Customer-facing meetings detected with >70% accuracy
- NBA recommendations adapt to upcoming calendar events (validated via user feedback)

---

### 4.12 Task Integration (Linear OR Asana, Two-Way Sync) (FR-012)

**Problem:** Founders already use Linear/Asana for task management. Don't want another tool.

**Solution:** Two-way sync with Linear OR Asana (user chooses one)
- **Import:** Pull existing tasks into BeBrahma context
- **Export:** Tasks recommended by NBA can be pushed to Linear/Asana
- **Sync:** Task status updates (completed, blocked) sync bidirectionally
- **Conflict resolution:** Last-write-wins with conflict log

**Acceptance Criteria:**
- Tasks sync within 5 minutes of creation/update
- Sync conflicts <5% of updates
- Users can "live" primarily in Linear/Asana while NBA engine works in background

---

### 4.13 Business State Graph (PostgreSQL with Good Schema) (FR-013)

**Database Choice:** PostgreSQL (NOT Neo4j initially)

**Why PostgreSQL:**
- Simple relationships (foreign keys, JOINs) work fine for moderate graph depth
- Easier ops, better ecosystem, lower cost
- Can add pgvector extension for semantic search later
- **Trigger for migrating to Neo4j:** If multi-hop graph queries become >50% of query load

**Schema Design:**
- Normalized (3NF)
- Indexes on all foreign keys and frequent query paths
- JSONB for flexible metadata (e.g., framework-specific task metadata)
- Time-series optimizations for signals table (partitioning if volume grows)

**Acceptance Criteria:**
- Query performance: Context retrieval <500ms (p90)
- NBA computation <2s (p90) end-to-end
- Database handles 10K users, 100K tasks, 1M signals without degradation

---

### 4.14 Framework Router (FR-014)

**Problem:** Different business stages need different frameworks (Problem-Solution Fit vs Growth vs Fundraising)

**Solution:** Intelligent framework router that selects 1-3 relevant frameworks based on:

**Available Frameworks:**
1. **Problem-Solution Fit:** Validate you're solving a real, painful problem
2. **ICP + Wedge:** Define your ideal customer profile and initial wedge market
3. **Critical Unknown Mapping:** Systematically resolve critical unknowns
4. **(Future) Growth:** Scale what's working (channels, loops, flywheels)
5. **(Future) Fundraising:** Prepare and execute fundraising process

**Router Logic:**
- Analyze user's objectives and unknowns
- Map to frameworks (e.g., "Validate Product-Solution Fit" objective → Problem-Solution Fit framework)
- Select top 1-3 frameworks (can combine, e.g., Problem-Solution Fit + Critical Unknown)
- Each framework generates candidate tasks
- NBA engine scores all candidates across frameworks

**Acceptance Criteria:**
- Framework selection accuracy >80% when validated against expert judgment
- Multi-framework recommendations (when appropriate) score higher than single-framework

---

### 4.15 Override Taxonomy (FR-015)

**(See FR-009 for details)**

**Additional Requirement:** Taxonomy must be:
- **Comprehensive:** Covers >90% of override reasons
- **Mutually Exclusive:** Each override maps to one category
- **Actionable:** Each category drives specific weight adjustments

**Acceptance Criteria:**
- Manual labeling of 100 overrides: taxonomy covers >90% cleanly
- Inter-rater reliability >80% (two raters agree on category)

---

### 4.16 Quick Update (Voice/Text) (FR-016)

**Problem:** Users want to log quick updates without friction

**Solution:**
- Voice: Hold mic button → Speak → Release → Auto-sends
- Text: Quick text box at top of app → Type → Hit enter → Auto-sends
- **No multi-step forms**
- **No "are you sure?" prompts**

**Processing:**
- Updates processed in background (<100ms to acknowledge)
- Entity extraction happens asynchronously
- Next NBA auto-refreshes when extraction completes

**Acceptance Criteria:**
- Voice update: <2 seconds from start speaking to seeing "Got it, processing..."
- Text update: <500ms from hitting enter to acknowledgment
- 95% of users find quick update "easy to use" (UX survey)

---

## 5. Non-Functional Requirements

### NFR-001: Performance
- Voice transcription: <1s latency (p90)
- NBA computation: <2s latency (p90)
- Context retrieval: <500ms (p90)
- App launch to first interaction: <2s (p90)

### NFR-002: Security
- All API calls over HTTPS/TLS 1.3
- JWT-based authentication (via Clerk)
- Encrypted data at rest (database encryption)
- SOC 2 compliance path (for enterprise later)

### NFR-003: Privacy
- User controls all data (export, delete account)
- No selling of user data
- Minimal PII collection (email only for auth)
- Calendar/task sync: read-only where possible, user-controlled permissions

### NFR-004: Cost Efficiency
- **LLM Cost Target:** <$0.10 per session average
- **Strategy:**
  - Tiered LLM usage (GPT-3.5 for classification, Claude Sonnet for reasoning, Claude Opus for complex)
  - Aggressive caching (Redis: 5-minute TTL for similar queries)
  - Batch processing where possible
  - Streaming for rationale generation (user sees partial response faster)

### NFR-005: Reliability
- 99.9% uptime SLA (after GA)
- Graceful degradation (if LLM API down, show cached/default recommendations)
- Data durability: 99.999999999% (use AWS RDS Multi-AZ)

---

## 6. Technical Architecture

### Tech Stack
- **Mobile:** React Native (iOS + Android from single codebase)
- **Backend:** Python FastAPI (async, high performance)
- **Database:** PostgreSQL 15+ (primary), Redis (caching)
- **Auth:** Clerk (handles user management, JWT, social login)
- **LLM:** Claude (Anthropic) for rationale, GPT-3.5/4 for classification
- **Hosting:** AWS (ECS for API, RDS for DB, CloudFront for CDN)
- **Monitoring:** Sentry (errors), Datadog (APM), PostHog (product analytics)

### Key Design Decisions
1. **Mobile-first:** React Native (not web-first) because founders are mobile-first
2. **PostgreSQL not Neo4j:** Simpler ops, graph is logical not physical (can migrate later)
3. **Python not Node.js:** Better LLM ecosystem, easier ML integration later
4. **Clerk not custom auth:** Focus on product, not reinventing auth

---

## 7. Success Metrics

### North Star Metric
**Weekly Active Sessions with Action Taken**
- Session = user opens app, gets NBA recommendation
- Action Taken = user starts task, schedules task, or marks task complete

**Target:** 4+ sessions/week/user with >75% action rate

### Supporting Metrics
1. **Activation:** % users who get first recommendation in <2 min with ≤1 question
2. **Engagement:** Sessions/week per active user
3. **Value Delivery:** % sessions ending with action taken
4. **Retention:** D7, D30 retention
5. **NBA Quality:** Top-1 accuracy vs expert panel, confidence correlation
6. **Cost:** LLM cost per session

---

## 8. MVP Scope (v0.3)

### In Scope (P0 - Must Have)
- ✅ Progressive profiling (ONE question)
- ✅ NBA recommendation (top + 2 alternatives)
- ✅ Voice input
- ✅ Text input
- ✅ Rationale (summary + full)
- ✅ Context maintenance (Business State Graph)
- ✅ Update logging
- ✅ Quick update (voice/text)
- ✅ Problem-Solution Fit framework
- ✅ ICP + Wedge framework
- ✅ Critical Unknown Mapping framework

### In Scope (P1 - Should Have)
- Override learning (basic)
- Confidence display
- Calendar integration (Google Calendar, read-only)
- Task integration (Linear OR Asana, basic two-way sync)

### Out of Scope (P2 - Phase 2)
- Multiple framework combinations (for now, router picks 1 framework)
- Advanced override learning (detailed taxonomy)
- Growth framework
- Fundraising framework
- Team collaboration (multi-user)
- Web app (companion to mobile)
- Integrations beyond Calendar + Linear/Asana

---

## 9. Validation Framework

### Pre-Launch Validation
1. **NBA Quality Test:**
   - Curate 20 scenarios (different founder types, stages, contexts)
   - Generate NBA recommendations
   - Compare to expert panel (3 experienced founders + 1 advisor)
   - Target: >60% Top-1 agreement

2. **Voice Input Test:**
   - 50 voice samples (different accents, environments, speaking styles)
   - Measure: transcription accuracy (target >95%), intent classification accuracy (target >90%)

3. **Rationale Quality Test:**
   - 30 users read rationales for 5 recommendations each
   - Rate clarity (1-10 scale)
   - Target: >7.0 average

### Post-Launch Validation
1. **Activation Test:**
   - Track: % users completing onboarding in <2 min, % getting first recommendation with ≤1 question
   - Target: >80%

2. **Engagement Test:**
   - Track: Sessions/week, action rate, retention (D7, D30)
   - Target: 4+ sessions/week, >75% action rate, >40% D7 retention

3. **Value Delivery Test:**
   - User survey (weekly): "Did BeBrahma help you make progress this week?" (Yes/No)
   - Target: >70% Yes

---

## 10. Open Questions & Risks

### Open Questions
1. **Framework routing:** How to handle when multiple frameworks are equally relevant? (Current: pick highest scoring, but may want to combine)
2. **Override learning speed:** How many overrides before weights stabilize? (Estimate: 10-20, need validation)
3. **Calendar heuristics:** How to accurately detect customer-facing meetings? (Current: keyword matching + external attendee count, may need ML)

### Risks
1. **LLM cost:** If caching doesn't work well, cost could exceed $0.10/session → Mitigation: aggressive caching, tiered LLM strategy, monitor cost per session
2. **Voice transcription accuracy:** If accuracy <95%, users won't trust voice input → Mitigation: Use best-in-class API (Deepgram or Whisper), test extensively
3. **NBA accuracy:** If Top-1 accuracy <60%, users won't trust recommendations → Mitigation: Validate with expert panel pre-launch, continuous learning from overrides
4. **Cold start:** New users have no context → Mitigation: Progressive profiling + smart defaults based on "what are you building" answer

---

## 11. Timeline & Milestones

### Phase 1: Design & Architecture (Week 1-2) ✅ COMPLETED
- Requirements gathering
- Architecture design
- Database schema design
- API design
- Framework design

### Phase 2: Core Backend (Week 3-4) ✅ COMPLETED
- FastAPI setup
- Database models + migrations
- NBA engine implementation
- Framework implementations (3 frameworks)
- API endpoints

### Phase 3: Mobile App (Week 5-6) ⏳ IN PROGRESS
- React Native setup
- Onboarding flow
- NBA recommendation UI
- Voice input
- Text input

### Phase 4: Integrations (Week 7)
- Google Calendar integration
- Linear/Asana integration

### Phase 5: Testing & Launch (Week 8)
- Expert panel validation
- Beta testing (10 founders)
- Bug fixes
- Launch

---

## 12. Appendix

### Reference: Problem-Solution Fit Framework

**Stage 1: Understand the Problem**
- Interview customers to understand pain points
- Map customer journey
- Identify top 3 pain points

**Stage 2: Validate Problem Severity**
- Quantify pain (frequency, severity)
- Assess willingness to pay
- Understand current solutions

**Stage 3: Test Solution Fit**
- Build prototype
- Test with customers
- Iterate based on feedback

### Reference: ICP + Wedge Framework

**Stage 1: Define Broad ICP**
- Industry, company size, role
- Pain points, budget authority
- Buying behavior

**Stage 2: Narrow to Wedge**
- Identify 3 potential wedges
- Score wedges (pain × reach × economics)
- Choose initial wedge

**Stage 3: Validate Wedge Economics**
- Calculate TAM for wedge
- Estimate CAC
- Validate unit economics (LTV > 3x CAC)

### Reference: Critical Unknown Mapping

**Process:**
1. List all critical unknowns
2. Prioritize by importance × uncertainty
3. For each unknown, design cheapest/fastest test
4. Execute tests in priority order
5. Update beliefs based on evidence
6. Repeat

---

**End of PRD**
