# Product Requirements Document: BeBrahma Founder OS

**Document Version**: 1.0
**Last Updated**: 2025-12-31
**Status**: Draft - Pending Engineering Review
**Owner**: Product Team
**Engineering Lead**: TBD
**Target Release**: MVP (8 weeks from approval)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [User Personas](#user-personas)
3. [User Stories & Jobs to Be Done](#user-stories--jobs-to-be-done)
4. [MVP Scope](#mvp-scope-phase-1)
5. [Functional Requirements](#functional-requirements)
6. [Non-Functional Requirements](#non-functional-requirements)
7. [Technical Architecture](#technical-architecture)
8. [UI/UX Requirements](#uiux-requirements)
9. [API Requirements](#api-requirements)
10. [Success Metrics](#success-metrics)
11. [Out of Scope](#out-of-scope)
12. [Dependencies & Risks](#dependencies--risks)
13. [Release Plan](#release-plan)

---

## Executive Summary

### Problem
Solo founders using AI tools (ChatGPT, Claude) lose insights in chat history, lack closure mechanisms, and suffer from cognitive fragmentation across 10+ disconnected tools.

### Solution
BeBrahma Founder OS: A cognitive co-pilot that automatically routes LLM conversations to structured outcomes (decisions, documents, tasks), maintains persistent business context, and surfaces priority next actions.

### MVP Goal
Ship **Artifact Vault + Closure Routing + Search** in 8 weeks to validate core hypothesis: Founders will return 5+ times/week to a tool that eliminates context loss and provides next-action clarity.

### Success Criteria
- 100 active users (30-day cohort)
- 50%+ weekly retention
- 80%+ closure rate (conversations → structured outcomes)
- 10+ artifacts created per user per week

---

## User Personas

### Primary: Alex (Solo Technical Founder)
- **Age**: 28-35
- **Background**: Ex-FAANG engineer, building B2B SaaS
- **Stage**: Pre-PMF, 0-3 customers
- **Tools**: ChatGPT Pro, Notion, Linear, HubSpot free
- **Pain**: "I have great conversations with AI but then can't find that insight 3 days later"
- **Motivation**: Needs clarity on what to build next without analysis paralysis
- **Success Metric**: Ships MVP 2 weeks faster due to reduced context switching

### Secondary: Sam (First-Time Founder, Non-Technical)
- **Age**: 30-40
- **Background**: Product manager or consultant going solo
- **Stage**: Idea validation, talking to 20+ potential customers
- **Tools**: ChatGPT, Google Docs, spreadsheets
- **Pain**: "I keep redoing customer research because I lose track of insights"
- **Motivation**: Wants structured process without PM overhead
- **Success Metric**: Closes first 3 paying customers using organized customer intelligence

---

## User Stories & Jobs to Be Done

### Epic 1: Never Lose an Insight

**US-101: Auto-Save AI Conversations as Artifacts**
```
As a founder using BeBrahma's AI chat
I want every meaningful conversation to automatically become a saved artifact
So that I can reference and build on previous insights

Acceptance Criteria:
- User can mark a conversation as "important" during or after chat
- System extracts key content and creates artifact with appropriate type
- Artifact includes: title, content, source (conversation ID), timestamp, auto-tags
- User can edit artifact before saving or let AI auto-title
```

**US-102: Decision Log with Context**
```
As a founder making strategic decisions
I want to capture what was decided, why, and what it affects
So that I have confidence in my direction and can revisit rationale later

Acceptance Criteria:
- User can explicitly mark a conversation as "Decision Made"
- System captures: decision summary, reasoning, alternatives considered, implications
- Decision links to related artifacts (e.g., customer research → ICP decision)
- Decision appears in chronological decision log
- User can tag decisions by domain (product, GTM, hiring, etc.)
```

**US-103: Full-Text Search Across Everything**
```
As a founder looking for past insights
I want to search all my artifacts, decisions, and tasks
So that I can quickly find "that thing about pricing tiers"

Acceptance Criteria:
- Search box in global header
- Searches: artifact content, titles, tags, decisions, task descriptions
- Results grouped by type (Artifacts | Decisions | Tasks)
- Results show snippet with highlighted match
- Search supports: exact phrases, type filters, date ranges
```

---

### Epic 2: Always Know What's Next

**US-201: Mission Control Dashboard**
```
As a founder opening BeBrahma each morning
I want to see exactly what needs my attention today
So that I don't waste time figuring out where to start

Acceptance Criteria:
- Dashboard shows 4 sections: On Fire | In Progress | Next | Blocked
- "On Fire" = tasks due <24h, overdue items, urgent decisions pending
- "In Progress" = tasks with status "IN_PROGRESS", phases currently active
- "Next" = top 3 prioritized tasks not yet started
- "Blocked" = tasks with unmet dependencies, phases waiting on gates
- Each item click-to-open with full context
```

**US-202: Priority Task Queue**
```
As a founder with 50 tasks on my list
I want to see the 5 that actually matter today
So that I focus energy on critical path, not busywork

Acceptance Criteria:
- System calculates priority based on: urgency, dependencies, business impact
- User can manually adjust priority (drag-to-reorder)
- Tasks marked "quick win" (<2 hours, high impact) get special badge
- Tasks on critical path highlighted
- Completed tasks auto-archive after 7 days
```

**US-203: Session Summary (Closure Widget)**
```
As a founder ending a work session
I want to see what I accomplished and what's outstanding
So that I have closure and know where to pick up tomorrow

Acceptance Criteria:
- Widget appears when user is idle >5 min or clicks "End Session"
- Shows: X decisions made, Y artifacts created, Z tasks completed
- Shows: Open threads (conversations without closure)
- Prompts: "You discussed pricing but didn't create a decision - save it?"
- Summary saved to session history (searchable)
```

---

### Epic 3: Persistent Business Context

**US-301: Workspace Setup (Onboarding)**
```
As a new user setting up BeBrahma
I want to define my business context once
So that the system understands my specific situation

Acceptance Criteria:
- Onboarding flow asks: business name, 1-line description, current stage
- User defines objectives (3-5 key goals for next 90 days)
- User defines constraints (budget, timeline, team size)
- Workspace slug generated (editable)
- Context saved and used by AI in all future interactions
```

**US-302: Artifact Versioning**
```
As a founder iterating on a PRD or pitch deck
I want to track changes over time
So that I can see how my thinking evolved

Acceptance Criteria:
- When editing an artifact, user can "Save as v2" (creates new version)
- Version history shows: v1, v2, v3 with dates and change summaries
- User can compare versions (diff view)
- Old versions remain accessible (read-only)
- Parent-child lineage displayed visually
```

**US-303: Artifact Lineage Graph**
```
As a founder tracing decisions back to their origins
I want to see how artifacts are connected
So that I understand: "this pitch came from that PRD which came from that customer insight"

Acceptance Criteria:
- Each artifact shows: "Derived from" (parent) and "Led to" (children)
- Lineage graph view (node-edge visualization)
- Click any node to jump to that artifact
- Filter graph by artifact type or date range
```

---

### Epic 4: Organized Document Structure

**US-401: Tiered Document Organization**
```
As a founder with 100+ documents
I want automatic organization into Active/Reference/Archive
So that my workspace stays clean without manual filing

Acceptance Criteria:
- Active tier: Manually pinned + accessed in last 7 days
- Reference tier: Accessed 8-30 days ago
- Archive tier: Not accessed in 30+ days
- User can manually promote/demote
- Search covers all tiers (with tier indicator in results)
- Archive hidden by default (toggle to show)
```

**US-402: Artifact Types & Templates**
```
As a founder creating different kinds of documents
I want appropriate structure for each type
So that I don't start from blank page every time

Acceptance Criteria:
- 12 artifact types: PRD, Pitch, Playbook, Research Note, etc. (see schema)
- Each type has optional template (e.g., PRD template with sections)
- User can create custom templates
- Auto-suggest type based on conversation content
```

**US-403: Tagging & Filtering**
```
As a founder organizing artifacts
I want flexible tagging and filtering
So that I can find "all GTM-related docs" or "Q1 priorities"

Acceptance Criteria:
- User can add multiple tags to any artifact (free-form or predefined)
- Sidebar filter: by type, status, tags, date range
- Tag autocomplete based on existing tags
- Saved filters (e.g., "Active GTM Work" = type:pitch + tag:GTM + status:draft)
```

---

### Epic 5: Gentle Process Guardrails (Phase 2)

**US-501: Workflow Canvas**
```
As a founder who gets distracted easily
I want to see high-level phases of my journey
So that I know where I am and what not to think about yet

Acceptance Criteria:
- Visual swim-lane view: Product | Sales | Marketing
- Each swim lane has phases (e.g., Product: Validation → MVP → PMF)
- Current phase highlighted
- Can't skip phases (gates prevent it)
- Click phase to see associated tasks/artifacts
```

**US-502: Phase Gates**
```
As a founder tempted to scale too early
I want gates that prevent risky transitions
So that I don't launch marketing before PMF

Acceptance Criteria:
- Each phase has entry gate (must pass to proceed)
- Gate types: Artifact exists, Metric threshold, Manual approval, Checklist
- Gate status: Pending | Passed | Failed (with explanation)
- User can override (with confirmation: "This is risky because...")
- Passed gates unlock next phase
```

---

## MVP Scope (Phase 1)

### In Scope ✅
1. **Workspace Management**
   - Create workspace with name, slug, objectives, constraints
   - Edit workspace metadata
   - Single workspace per user (MVP limit)

2. **Artifact Vault**
   - Create artifacts (manual or from AI chat)
   - Support types: PRD, Pitch, Research Note, Meeting Notes, Other
   - Edit artifact (content, title, tags, status)
   - Version artifacts (save as v2, v3...)
   - Delete artifacts (soft delete → archive)
   - View artifact detail (content + metadata + lineage)

3. **Closure Routing**
   - "Save as Artifact" button in chat interface
   - "Mark as Decision" button → creates decision artifact
   - "Create Task" button → creates task linked to conversation
   - Session summary widget on idle/end

4. **Search & Discovery**
   - Full-text search (PostgreSQL tsvector)
   - Filter by type, status, tags, date
   - Search results with snippets
   - Recently viewed artifacts

5. **Mission Control Dashboard**
   - 4 sections: On Fire | In Progress | Next | Blocked
   - Top 5 priority tasks
   - Active artifacts (pinned + recent)
   - Decision log (last 10)

6. **Task Management (Basic)**
   - Create task (title, description, priority, due date)
   - Link task to artifact or decision
   - Mark task complete
   - Prioritized task queue

### Out of Scope ❌ (for MVP)
- Playbook Runner (Phase 2)
- Scoreboard / Metrics (Phase 2)
- Workflow Canvas visualization (Phase 2)
- Gate automation (Phase 2)
- Integrations (Notion, Linear, HubSpot) (Phase 4)
- Team workspaces / collaboration (post-MVP)
- Mobile app (web-first)
- Advanced AI features (proactive suggestions, pattern recognition) (Phase 3)

---

## Functional Requirements

### FR-1: Workspace
- **FR-1.1**: User can create one workspace during onboarding
- **FR-1.2**: Workspace has: name (required), slug (auto-generated, editable), description, objectives[], constraints[]
- **FR-1.3**: Workspace status: active (default), archived
- **FR-1.4**: User can edit workspace metadata at any time
- **FR-1.5**: Deleting workspace requires confirmation (destructive action)

### FR-2: Artifacts
- **FR-2.1**: User can create artifact manually (title, type, content, tags)
- **FR-2.2**: User can create artifact from AI conversation (one-click)
- **FR-2.3**: Artifact types: PRD, Pitch, Research Note, Meeting Notes, Other (MVP subset)
- **FR-2.4**: Artifact status: Draft, Review, Approved, Archived
- **FR-2.5**: Artifact content supports Markdown formatting
- **FR-2.6**: User can add tags (comma-separated, autocomplete)
- **FR-2.7**: Artifact metadata: createdBy (userId), createdAt, updatedAt, version, source
- **FR-2.8**: Content hash calculated on save (SHA-256) for de-duplication warning
- **FR-2.9**: Parent-child lineage tracked (optional parentId)

### FR-3: Versioning
- **FR-3.1**: "Save as new version" creates child artifact with incremented version number
- **FR-3.2**: Version history view shows all versions in timeline
- **FR-3.3**: User can view any previous version (read-only)
- **FR-3.4**: Lineage shown as breadcrumb: v1 → v2 → v3

### FR-4: Search
- **FR-4.1**: Global search box in header (always accessible)
- **FR-4.2**: Search indexes: artifact content, titles, tags, decision summaries
- **FR-4.3**: Search uses PostgreSQL full-text search (tsvector)
- **FR-4.4**: Results grouped by type (Artifacts, Decisions, Tasks)
- **FR-4.5**: Results show: title, snippet (150 chars with highlight), type, date
- **FR-4.6**: Filters: type, status, date range (last 7d, 30d, 90d, all)
- **FR-4.7**: Search supports exact phrase matching ("customer pain points")

### FR-5: Decisions
- **FR-5.1**: Decision is a special artifact type with additional fields: reasoning, alternatives, implications
- **FR-5.2**: User can mark conversation as decision during or after chat
- **FR-5.3**: Decision log view shows chronological list of all decisions
- **FR-5.4**: Decisions can be tagged by domain (product, GTM, hiring, technical)

### FR-6: Tasks
- **FR-6.1**: User can create task: title (required), description, priority (P0/P1/P2), due date, status
- **FR-6.2**: Task statuses: TODO, IN_PROGRESS, DONE, BLOCKED
- **FR-6.3**: Task can link to artifact (artifactId) or decision (decisionId)
- **FR-6.4**: User can mark task complete (sets completedAt timestamp)
- **FR-6.5**: Task queue sorted by: priority, due date, creation date
- **FR-6.6**: Overdue tasks highlighted in red

### FR-7: Mission Control Dashboard
- **FR-7.1**: Dashboard is default landing page after login
- **FR-7.2**: Shows 4 sections in grid layout
- **FR-7.3**: "On Fire" shows: tasks due <24h, overdue tasks (max 5 items)
- **FR-7.4**: "In Progress" shows: tasks with status IN_PROGRESS (max 5 items)
- **FR-7.5**: "Next" shows: top 3 priority tasks with status TODO
- **FR-7.6**: "Blocked" shows: tasks with status BLOCKED
- **FR-7.7**: Dashboard shows: active artifacts (last 5 accessed)
- **FR-7.8**: Dashboard shows: recent decisions (last 3)

### FR-8: Session Summary
- **FR-8.1**: Widget appears when user idle >5 minutes or clicks "End Session"
- **FR-8.2**: Summary shows: decisions made (count + list), artifacts created/edited, tasks created/completed
- **FR-8.3**: Summary highlights: open threads (conversations without closure)
- **FR-8.4**: User can dismiss or save summary to history
- **FR-8.5**: Session history searchable (future enhancement)

### FR-9: Closure Routing
- **FR-9.1**: AI chat interface has buttons: "Save as Artifact", "Mark as Decision", "Create Task"
- **FR-9.2**: Clicking button opens quick-create modal with AI-suggested content pre-filled
- **FR-9.3**: User can edit and save or cancel
- **FR-9.4**: Saved outcome links back to conversation (source field)
- **FR-9.5**: Closure rate tracked per user (analytics)

---

## Non-Functional Requirements

### NFR-1: Performance
- **NFR-1.1**: Dashboard loads in <2 seconds (p95)
- **NFR-1.2**: Search results return in <500ms (p95)
- **NFR-1.3**: Artifact save completes in <1 second (p95)
- **NFR-1.4**: Full-text search supports 10,000 artifacts per workspace without degradation

### NFR-2: Scalability
- **NFR-2.1**: System supports 1,000 concurrent users (MVP target)
- **NFR-2.2**: Database can handle 100,000 artifacts (across all users)
- **NFR-2.3**: Search index updates asynchronously (doesn't block UI)

### NFR-3: Reliability
- **NFR-3.1**: 99.5% uptime (MVP target, 99.9% post-launch)
- **NFR-3.2**: Data backup every 24 hours (PostgreSQL snapshots)
- **NFR-3.3**: Soft delete for artifacts (recoverable within 30 days)

### NFR-4: Security
- **NFR-4.1**: All API endpoints require authentication (Clerk)
- **NFR-4.2**: User can only access their own workspace/artifacts (row-level security)
- **NFR-4.3**: Artifact content encrypted at rest (database-level encryption)
- **NFR-4.4**: No PII logged in application logs

### NFR-5: Usability
- **NFR-5.1**: Onboarding completes in <3 minutes
- **NFR-5.2**: User can create first artifact in <1 minute
- **NFR-5.3**: Mobile-responsive design (works on tablets, basic phone support)
- **NFR-5.4**: Accessible (WCAG 2.1 AA compliance target)

### NFR-6: Data
- **NFR-6.1**: User can export all their data (JSON format)
- **NFR-6.2**: User can delete workspace and all artifacts (GDPR compliance)
- **NFR-6.3**: Deleted data purged from backups after 30 days

---

## Technical Architecture

### Tech Stack (Existing BeBrahma)
- **Frontend**: Next.js 14, React 18, Radix UI, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: Clerk
- **Hosting**: Vercel (frontend), Fly.io or Railway (backend)

### New Components for Founder OS

#### 1. Data Model (Prisma Schema - Already Defined)
```
Workspace (userId, slug, name, objectives[], constraints[])
Artifact (workspaceId, title, type, status, content, contentHash, version, parentId, searchVector)
Decision (extends Artifact with reasoning, alternatives, implications)
Task (workspaceId, title, priority, status, dueDate, artifactId)
```

#### 2. Search Implementation
- **Technology**: PostgreSQL full-text search with `tsvector`
- **Index**: GIN index on `Artifact.searchVector`
- **Update Strategy**: Trigger on INSERT/UPDATE to regenerate `searchVector`
- **Query**: Use `ts_rank` for relevance scoring

**SQL Example**:
```sql
-- Generate search vector
UPDATE artifacts SET searchVector = to_tsvector('english', title || ' ' || content || ' ' || array_to_string(tags, ' '));

-- Search query
SELECT * FROM artifacts
WHERE searchVector @@ to_tsquery('english', 'customer & validation')
ORDER BY ts_rank(searchVector, to_tsquery('english', 'customer & validation')) DESC;
```

#### 3. Closure Routing Service
**Location**: `apps/api/src/services/closureService.ts`

**Methods**:
- `createArtifactFromConversation(conversationId, userId, metadata)`
- `createDecisionFromConversation(conversationId, userId, decisionData)`
- `createTaskFromConversation(conversationId, userId, taskData)`
- `getSessionSummary(userId, sessionStart, sessionEnd)`

**Logic**:
- Extract conversation content via `conversationId`
- Use AI to suggest title, tags, type
- Create artifact with `source: "conversation:{conversationId}"`

#### 4. Priority Calculation Service
**Location**: `apps/api/src/services/priorityService.ts`

**Algorithm**:
```typescript
priority_score =
  (urgency * 0.4) +        // Due date proximity
  (dependency * 0.3) +     // Blocks other tasks?
  (user_priority * 0.3)    // Manual P0/P1/P2

urgency =
  - Overdue: 100
  - Due <24h: 80
  - Due <7d: 50
  - Due >7d: 20

dependency =
  - Blocks 3+ tasks: 100
  - Blocks 1-2 tasks: 60
  - Blocks 0: 20
```

#### 5. API Routes

**New Routes**:
```
# Workspace
POST   /api/workspaces                 # Create workspace
GET    /api/workspaces/:slug           # Get workspace
PUT    /api/workspaces/:slug           # Update workspace

# Artifacts
POST   /api/artifacts                  # Create artifact
GET    /api/artifacts/:id              # Get artifact
PUT    /api/artifacts/:id              # Update artifact
DELETE /api/artifacts/:id              # Soft delete artifact
GET    /api/artifacts/:id/versions     # Get version history
POST   /api/artifacts/:id/version      # Create new version

# Search
GET    /api/search?q=...&type=...&status=...  # Search artifacts

# Decisions
GET    /api/decisions                  # List all decisions
POST   /api/decisions                  # Create decision (special artifact)

# Tasks (extend existing)
GET    /api/tasks/priority-queue       # Get prioritized task list
PUT    /api/tasks/:id/complete         # Mark complete

# Dashboard
GET    /api/dashboard                  # Get mission control data

# Closure
POST   /api/closure/artifact           # Create artifact from conversation
POST   /api/closure/decision           # Create decision from conversation
POST   /api/closure/task               # Create task from conversation
GET    /api/closure/session-summary    # Get current session summary
```

---

## UI/UX Requirements

### Design System
- **Use Existing**: Radix UI components, Tailwind CSS (BeBrahma design system)
- **Typography**: Inter font (headings), Source Sans Pro (body)
- **Colors**: Keep consistent with BeBrahma brand
- **Icons**: Heroicons or Lucide

### Key Screens

#### 1. Onboarding Flow
```
Screen 1: Welcome
- "Let's set up your Founder Operating System"
- Continue button

Screen 2: Workspace Setup
- Workspace name (input)
- Slug (auto-generated, editable)
- Description (textarea)
- Continue button

Screen 3: Objectives
- "What are your top 3-5 goals for the next 90 days?"
- Multi-input (add/remove)
- Skip button
- Continue button

Screen 4: Constraints
- "Any constraints we should know about?" (budget, timeline, team size)
- Multi-input (add/remove)
- Skip button
- Finish button → redirect to Dashboard
```

#### 2. Mission Control Dashboard
```
Layout:
┌──────────────────────────────────────────────────┐
│ Header: BeBrahma | Search Box | User Menu        │
├──────────────────────────────────────────────────┤
│ Sidebar: Dashboard | Artifacts | Decisions |     │
│          Tasks | Settings                         │
├─────────┬────────────────┬────────────────────────┤
│ On Fire │ In Progress    │ Next                   │
│ [5 items│ [5 items]      │ [3 items]              │
│  in list]                │                        │
├─────────┴────────────────┴────────────────────────┤
│ Blocked                                           │
│ [3 items if any, otherwise "Nothing blocked!"]   │
├───────────────────────────────────────────────────┤
│ Active Artifacts          │ Recent Decisions      │
│ [5 cards]                 │ [3 cards]             │
└───────────────────────────────────────────────────┘
```

**Interactions**:
- Click item → opens detail view (artifact/task/decision)
- Drag-to-reorder in "Next" section (re-prioritize)
- Mark task complete (checkbox, strikes through)

#### 3. Artifact Detail View
```
Layout:
┌──────────────────────────────────────────────────┐
│ ← Back to Dashboard                               │
├──────────────────────────────────────────────────┤
│ [Title] (editable)                    [Edit] [v] │
│ Type: PRD | Status: Draft | v2 | Tags: [GTM]    │
├──────────────────────────────────────────────────┤
│ Lineage: [v1] → [v2 (current)]                  │
│ Source: Conversation on Dec 30, 2025            │
├──────────────────────────────────────────────────┤
│ Content (Markdown editor)                        │
│                                                  │
│ [Editable text area with live preview]          │
│                                                  │
├──────────────────────────────────────────────────┤
│ [Save] [Save as v3] [Delete]                    │
└──────────────────────────────────────────────────┘
```

#### 4. Search Interface
```
Global header search box:
[🔍 Search artifacts, decisions, tasks...]

Results dropdown:
┌──────────────────────────────────────────────────┐
│ Artifacts (5)                                     │
│ ─────────────────────────────────────────────────│
│ 📄 PRD v3 - Customer validation plan             │
│    ...focused on SMB customers with budgets...   │
│    Updated 2 days ago                            │
│                                                  │
│ Decisions (2)                                    │
│ ─────────────────────────────────────────────────│
│ ✅ Focus on SMBs instead of Enterprise           │
│    ...based on 15 customer interviews...        │
│    Decided 1 week ago                            │
│                                                  │
│ View all results →                               │
└──────────────────────────────────────────────────┘
```

#### 5. AI Chat with Closure Buttons
```
Existing BeBrahma chat interface, add:

During conversation:
[💬 Chat message from AI]
[💬 Your response]

After meaningful exchange:
┌──────────────────────────────────────────────────┐
│ Capture this insight:                            │
│ [Save as Artifact] [Mark as Decision] [+ Task]  │
└──────────────────────────────────────────────────┘

Quick-create modal (triggered by button):
┌──────────────────────────────────────────────────┐
│ Save as Artifact                          [×]    │
├──────────────────────────────────────────────────┤
│ Title: [AI-suggested title, editable]            │
│ Type: [Dropdown: PRD, Pitch, Research, ...]     │
│ Tags: [customer-validation, GTM]                │
│ Content: [Extracted from conversation]          │
│                                                  │
│ [Cancel] [Save Artifact]                        │
└──────────────────────────────────────────────────┘
```

#### 6. Session Summary Widget
```
Appears after 5 min idle or "End Session" click:

┌──────────────────────────────────────────────────┐
│ Today's Session Summary                  [×]     │
├──────────────────────────────────────────────────┤
│ ✅ 2 Decisions Made                              │
│    • Focus on SMBs                               │
│    • Price at $49/month                          │
│                                                  │
│ 📄 3 Artifacts Created                           │
│    • PRD v3                                      │
│    • Pitch Deck v2                               │
│    • Customer Interview Notes                    │
│                                                  │
│ ✏️ 5 Tasks Created                               │
│    • Build auth flow (P0, due tomorrow)         │
│    • Schedule investor call                      │
│    ...                                           │
│                                                  │
│ ⚠️ 1 Open Thread                                 │
│    • You discussed pricing tiers but didn't     │
│      create a decision - save it?               │
│      [Save Decision] [Ignore]                   │
│                                                  │
│ [Dismiss] [View Full History]                   │
└──────────────────────────────────────────────────┘
```

---

## API Requirements

### Authentication
- All endpoints require Clerk JWT token in `Authorization: Bearer {token}` header
- Middleware: `requireAuth` validates token and extracts `userId`

### Rate Limiting
- 100 requests/minute per user (global)
- 1000 requests/hour per user
- Search: 30 requests/minute (heavier operation)

### Request/Response Format
- **Request**: JSON body (POST/PUT)
- **Response**: JSON with structure:
  ```json
  {
    "success": true,
    "data": { ... },
    "error": null,
    "meta": { timestamp, requestId }
  }
  ```

### Error Handling
- **400 Bad Request**: Invalid input (with validation errors)
- **401 Unauthorized**: Missing/invalid auth token
- **403 Forbidden**: Accessing another user's resource
- **404 Not Found**: Resource doesn't exist
- **409 Conflict**: Duplicate slug/content hash
- **500 Internal Server Error**: Server error (logged)

### API Examples

**Create Artifact**:
```http
POST /api/artifacts
Authorization: Bearer {token}
Content-Type: application/json

{
  "workspaceId": "workspace_123",
  "title": "Customer Validation Plan",
  "type": "PRD",
  "content": "## Objective\n...",
  "tags": ["customer-validation", "GTM"],
  "source": "conversation:conv_456"
}

Response 201:
{
  "success": true,
  "data": {
    "id": "artifact_789",
    "workspaceId": "workspace_123",
    "title": "Customer Validation Plan",
    "type": "PRD",
    "status": "DRAFT",
    "version": 1,
    "contentHash": "sha256:abc123...",
    "createdAt": "2025-12-31T10:00:00Z",
    "updatedAt": "2025-12-31T10:00:00Z"
  }
}
```

**Search**:
```http
GET /api/search?q=customer+validation&type=PRD&limit=10
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "artifact_789",
        "title": "Customer Validation Plan",
        "type": "PRD",
        "snippet": "...focused on SMB customers with budgets...",
        "rank": 0.95,
        "updatedAt": "2025-12-29T10:00:00Z"
      }
    ],
    "total": 1,
    "query": "customer validation"
  }
}
```

**Dashboard Data**:
```http
GET /api/dashboard
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "onFire": [
      { "type": "task", "id": "task_1", "title": "Fix auth bug", "dueDate": "2025-12-31T23:59:59Z" }
    ],
    "inProgress": [
      { "type": "task", "id": "task_2", "title": "Build MVP", "status": "IN_PROGRESS" }
    ],
    "next": [
      { "type": "task", "id": "task_3", "title": "Write PRD", "priority": "P1" }
    ],
    "blocked": [],
    "activeArtifacts": [...],
    "recentDecisions": [...]
  }
}
```

---

## Success Metrics

### Primary Metrics (Validate Hypothesis)
1. **Weekly Retention**: 50%+ after Week 4
2. **Closure Rate**: 80%+ of conversations → structured outcome
3. **Engagement**: 5+ sessions/week per active user
4. **Artifact Creation**: 10+ artifacts per user per week

### Secondary Metrics
5. **Search Usage**: 3+ searches per session (indicates value)
6. **Session Duration**: 15+ minutes average (deep engagement)
7. **Task Completion**: 50%+ tasks marked done within 7 days
8. **NPS**: 50+ (strong word-of-mouth)

### Analytics Instrumentation
- Track events: `artifact_created`, `artifact_searched`, `task_completed`, `decision_made`, `session_summary_viewed`
- Cohort analysis: Weekly retention by signup date
- Funnel analysis: Onboarding completion rate (target: 80%+)

---

## Out of Scope (Deferred to Phase 2+)

### Phase 2 (Months 4-6)
- Playbook Runner (workflow canvas, phases, gates)
- Dependency visualization
- Parallel track view (product | sales | marketing)
- Advanced priority algorithm (critical path analysis)

### Phase 3 (Months 7-12)
- Intelligence Hub (customer signals, market trends)
- Pattern recognition (AI suggests insights across artifacts)
- Proactive suggestions ("You haven't talked to a customer in 2 weeks")
- Weekly digest email

### Phase 4 (Months 13-18)
- Integrations: Notion sync, Linear sync, HubSpot connector
- Team workspaces (multi-user collaboration)
- Role-based permissions
- Slack/email interfaces

### Not Planned (Out of Vision)
- Full CRM replacement
- Marketing automation
- Detailed project management (Gantt charts, resource allocation)
- White-labeling
- On-premise deployment

---

## Dependencies & Risks

### Dependencies
1. **Prisma Migration**: Database schema must be migrated before backend work
2. **Clerk Auth**: User creation flow depends on Clerk webhooks
3. **Existing BeBrahma Chat**: Closure routing integrates with existing chat UI
4. **Search Index**: PostgreSQL full-text search performance at scale (monitor)

### Technical Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Postgres full-text search too slow at 10K+ artifacts | Medium | High | Pre-build benchmark, have Elasticsearch fallback plan |
| Content hash collisions causing UX issues | Low | Medium | SHA-256 is collision-resistant, add user override |
| AI chat integration breaks existing users | Low | High | Feature flag closure buttons, gradual rollout |
| Session summary widget annoys users | Medium | Low | Make dismissible, track dismiss rate, adjust timing |

### Product Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Users don't return (retention <30%) | Medium | Critical | Early user interviews, adjust onboarding/value prop |
| Users don't close loops (closure rate <50%) | Medium | High | Improve UX, add nudges, simplify closure flow |
| Too complex for solo founders | Low | High | User testing with non-technical founders |
| Not differentiated from Notion+AI | Medium | High | Emphasize closure automation + context graph |

### Launch Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Server downtime during launch | Low | Medium | Pre-launch load testing, monitoring alerts |
| Data loss bug in soft delete | Low | Critical | Extensive testing of delete/archive flows |
| GDPR compliance issues | Low | High | Legal review of data export/delete features |

---

## Release Plan

### Pre-Launch (Weeks 1-6)
- **Week 1-2**: Backend (Prisma migration, API routes for workspace/artifacts)
- **Week 3-4**: Frontend (Dashboard, artifact CRUD, search UI)
- **Week 5**: Integration (closure routing in chat, session summary)
- **Week 6**: Testing (E2E tests, load testing, bug fixes)

### Alpha Testing (Week 7)
- **Goal**: Validate core functionality with 10 internal users
- **Criteria**: No critical bugs, 50%+ say "I'd use this daily"
- **Feedback Loop**: Daily standups, iterate on UX

### Beta Launch (Week 8)
- **Audience**: 100 early adopters (waitlist, founder communities)
- **Communication**: Email invite, onboarding video, support channel
- **Monitoring**: Dashboard for retention, closure rate, errors
- **Success Criteria**: 50%+ weekly retention, 80%+ closure rate

### Public Launch (Week 12)
- **Prerequisite**: Beta success metrics met
- **Audience**: Public (Product Hunt, HN, Twitter)
- **Pricing**: Free tier active, Pro tier announced ($29/month)

---

## Open Questions for Engineering

1. **Database**: Should we use a separate `decisions` table or extend `artifacts` with optional decision fields?
2. **Search**: At what artifact count should we migrate from Postgres to Elasticsearch?
3. **Real-time**: Do we need WebSocket updates for dashboard, or is polling sufficient?
4. **Storage**: Should artifact content >1MB be stored in S3 with pointer in DB?
5. **AI Integration**: Reuse BeBrahma's existing multi-agent system or add OpenAI API for closure suggestions?

---

**Next Steps**:
1. Engineering review of PRD (timeline estimates, technical feasibility)
2. Design mockups for key screens (Figma)
3. Kickoff meeting (assign owners, set sprint goals)
4. Begin Week 1: Prisma migration + workspace API

---

**Document Status**: Draft v1.0 - Awaiting Engineering Review
**Last Updated**: 2025-12-31
**Owner**: Product Team
**Reviewers**: Engineering Lead, Design Lead, Founder
