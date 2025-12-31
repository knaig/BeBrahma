# BeBrahma Founder OS - User Guide

## What is Founder OS?

**Founder OS** is a cognitive co-pilot for solo founders that solves three critical problems:
1. **Lost Insights**: AI conversations disappear → every insight becomes a saved artifact
2. **No Closure**: Discussions don't lead to action → automatic routing to decisions/tasks
3. **Fragmented Context**: Tools scattered everywhere → unified Mission Control dashboard

Think of it as your "second brain" that remembers everything, structures your thinking, and always shows you what's next.

---

## Quick Start

### 1. Run Database Migration

```bash
cd apps/api

# Apply the Founder OS schema
npx prisma migrate deploy

# Or if in development:
npx prisma migrate dev
```

This creates the following tables:
- `Workspace` - Your business context container
- `Artifact` - Versioned documents (PRDs, pitches, notes)
- `Playbook`, `Phase`, `Gate` - Workflow execution (Phase 2)
- `Scoreboard`, `Metric`, `WeeklyReview` - KPI tracking (Phase 2)

### 2. Start the API Server

```bash
npm run dev
```

The Founder OS endpoints are now available:
- `POST /api/workspaces` - Create workspace
- `POST /api/artifacts` - Save artifact
- `GET /api/search?q=...` - Search everything
- `GET /api/dashboard` - Mission Control view

### 3. Create Your First Workspace

**API Call:**
```bash
curl -X POST http://localhost:3001/api/workspaces \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My SaaS Startup",
    "slug": "my-saas-startup",
    "description": "B2B productivity tool for remote teams",
    "objectives": [
      "Achieve product-market fit by Q2 2025",
      "Sign first 10 paying customers",
      "Build MVP in 8 weeks"
    ],
    "constraints": [
      "Bootstrap - no external funding",
      "Solo founder - technical background",
      "6 months runway"
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "workspace_123abc",
    "slug": "my-saas-startup",
    "name": "My SaaS Startup",
    "status": "active",
    "createdAt": "2025-12-31T10:00:00Z"
  }
}
```

---

## Core Features

### Feature 1: Artifact Vault (Never Lose an Insight)

Every important output becomes a **versioned artifact** with metadata.

**Supported Types:**
- `PRD` - Product requirements
- `PITCH` - Pitch decks / positioning
- `RESEARCH_NOTE` - Market research, customer interviews
- `MEETING_NOTES` - Meeting summaries
- `DESIGN_DOC` - Technical architecture
- `TEST_PLAN` - Testing strategies
- `OTHER` - Anything else

**Create an Artifact:**
```bash
curl -X POST http://localhost:3001/api/artifacts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Customer Validation Plan",
    "type": "PRD",
    "content": "## Objective\nValidate that SMB teams need better async communication.\n\n## Approach\n1. Interview 20 potential customers\n2. Build landing page\n3. Run cold outreach campaign",
    "tags": ["customer-validation", "GTM", "Q1-2025"],
    "status": "DRAFT",
    "source": "conversation:conv_456"
  }'
```

**What Happens:**
1. Content hash calculated (SHA-256) - prevents duplicates
2. Search vector generated (title + content + tags)
3. Version number assigned (v1, v2, v3...)
4. Lineage tracked (this artifact → parent artifact)
5. Auto-categorized into tier (Active / Reference / Archive)

**Get Artifact Details:**
```bash
curl -X GET http://localhost:3001/api/artifacts/artifact_789 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response includes:**
- Full content
- Metadata (type, status, tags, version)
- Parent artifact (if this is v2, v3...)
- Child artifacts (newer versions)
- Source (which conversation created this)

**Create New Version:**
```bash
curl -X POST http://localhost:3001/api/artifacts/artifact_789/version \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "## Objective\nValidate SMB teams AND enterprise teams...\n\n[Updated content]"
  }'
```

Creates `v2` linked to `v1` via `parentId`.

---

### Feature 2: Search & Discovery (Find Anything Fast)

**Full-Text Search:**
```bash
curl -X GET "http://localhost:3001/api/search?q=customer+validation&type=PRD&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "artifacts": [
      {
        "id": "artifact_789",
        "title": "Customer Validation Plan",
        "type": "PRD",
        "snippet": "...focused on SMB teams with budgets between $10-100K...",
        "rank": 0.95,
        "updatedAt": "2025-12-29T10:00:00Z",
        "workspace": {
          "name": "My SaaS Startup",
          "slug": "my-saas-startup"
        }
      }
    ],
    "tasks": [],
    "total": 1,
    "query": "customer validation"
  }
}
```

**Search Filters:**
- `q` - Search query (required, min 2 chars)
- `type` - Filter by artifact type (PRD, PITCH, etc.)
- `status` - Filter by status (DRAFT, REVIEW, etc.)
- `workspaceId` - Limit to specific workspace
- `dateFrom`, `dateTo` - Date range (YYYY-MM-DD)
- `limit` - Max results (default 20, max 100)

**Search Suggestions (Autocomplete):**
```bash
curl -X GET "http://localhost:3001/api/search/suggest?q=cust" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Returns:
- Recent artifact titles matching "cust"
- Popular tags matching "cust"

---

### Feature 3: Mission Control Dashboard (Always Know What's Next)

**Get Dashboard Data:**
```bash
curl -X GET http://localhost:3001/api/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "onFire": [
      {
        "id": "task_1",
        "title": "Fix critical auth bug",
        "priority": "P0",
        "dueDate": "2025-12-31T23:59:59Z",
        "status": "TODO",
        "project": { "name": "MVP Build" }
      }
    ],
    "inProgress": [
      {
        "id": "task_2",
        "title": "Build billing integration",
        "status": "IN_PROGRESS"
      }
    ],
    "next": [
      {
        "id": "task_3",
        "title": "Write onboarding docs",
        "priority": "P1"
      }
    ],
    "blocked": [],
    "activeArtifacts": [
      {
        "id": "artifact_789",
        "title": "PRD v3",
        "type": "PRD",
        "updatedAt": "2025-12-30T10:00:00Z"
      }
    ],
    "recentDecisions": [
      {
        "id": "artifact_999",
        "title": "Decision: Focus on SMBs not Enterprise",
        "createdAt": "2025-12-28T10:00:00Z"
      }
    ],
    "stats": {
      "totalTasks": 15,
      "completedToday": 3,
      "artifactsThisWeek": 8
    }
  }
}
```

**Dashboard Sections:**

1. **On Fire** 🔥
   - Tasks overdue or due <24 hours
   - High priority (P0) urgent items
   - Max 5 items shown

2. **In Progress** ⚙️
   - Tasks with status `IN_PROGRESS`
   - Currently being worked on
   - Max 5 items shown

3. **Next** ➡️
   - Top 3 priority TODO tasks
   - Not urgent but important
   - Ordered by priority score

4. **Blocked** 🚫
   - Tasks with status `BLOCKED`
   - Need attention to unblock
   - All blockers shown

5. **Active Artifacts** 📄
   - Recently updated (last 7 days)
   - Or status DRAFT/REVIEW
   - Top 5 most recent

6. **Recent Decisions** ✅
   - Artifacts tagged as decisions
   - Last 3 decisions made

**Priority Calculation:**
Tasks are ranked by a priority score:
```
Score = (base_priority * 70) + (urgency_bonus * 30) + (status_bonus * 15)

Base Priority:
- P0 = 70 points
- P1 = 40 points
- P2 = 20 points

Urgency Bonus:
- Overdue = +30 points
- Due <24h = +20 points
- Due <7d = +10 points

Status Bonus:
- BLOCKED = +25 points
- IN_PROGRESS = +15 points
```

---

### Feature 4: Session Summary (Closure Widget)

**Get Session Summary:**
```bash
curl -X GET "http://localhost:3001/api/dashboard/session-summary?since=2025-12-31T08:00:00Z" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionStart": "2025-12-31T08:00:00Z",
    "summary": {
      "artifactsCreated": 3,
      "artifactsEdited": 2,
      "tasksCreated": 5,
      "tasksCompleted": 2,
      "decisionsMade": 1
    },
    "details": {
      "artifactsCreated": [
        { "id": "artifact_789", "title": "PRD v3", "type": "PRD" }
      ],
      "tasksCreated": [
        { "id": "task_1", "title": "Fix auth bug", "priority": "P0" }
      ],
      "tasksCompleted": [
        { "id": "task_5", "title": "Setup CI/CD" }
      ],
      "decisions": [
        { "id": "artifact_999", "title": "Decision: Focus on SMBs" }
      ]
    }
  }
}
```

**Use Case:**
At end of work session, see what you accomplished to get closure.

---

## Document Organization (Tiered System)

Artifacts auto-organize into 3 tiers:

### Active Tier (Hot Documents)
**Criteria:**
- Status = DRAFT or REVIEW
- OR updated in last 7 days

**Example:** PRD v3 (working draft), Pitch deck (under review)

### Reference Tier (Warm Documents)
**Criteria:**
- Updated 8-30 days ago
- Status ≠ DRAFT/REVIEW

**Example:** Market research from 2 weeks ago, competitor analysis

### Archive Tier (Cold Documents)
**Criteria:**
- Not accessed in 30+ days
- OR status = ARCHIVED

**Example:** Old PRD versions, abandoned ideas

**Filter by Tier:**
```bash
curl -X GET "http://localhost:3001/api/artifacts?tier=active" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Versioning & Lineage

### Example Flow:

1. **Create PRD v1**
```json
{
  "title": "MVP Requirements",
  "type": "PRD",
  "content": "Initial draft...",
  "version": 1,
  "parentId": null
}
```

2. **Create PRD v2** (revision)
```bash
POST /api/artifacts/artifact_v1/version
```

```json
{
  "title": "MVP Requirements",
  "version": 2,
  "parentId": "artifact_v1",
  "lineage": ["artifact_v1"]
}
```

3. **Create PRD v3** (another revision)
```bash
POST /api/artifacts/artifact_v2/version
```

```json
{
  "title": "MVP Requirements",
  "version": 3,
  "parentId": "artifact_v2",
  "lineage": ["artifact_v1", "artifact_v2"]
}
```

**Lineage Graph:**
```
artifact_v1 (v1)
    ↓
artifact_v2 (v2)
    ↓
artifact_v3 (v3) ← current
```

**Get Version History:**
```bash
GET /api/artifacts/artifact_v3
```

Response includes `parent` and `children` for full lineage.

---

## API Reference

### Workspaces

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workspaces` | Create workspace |
| GET | `/api/workspaces` | List all workspaces |
| GET | `/api/workspaces/:slug` | Get workspace details |
| PUT | `/api/workspaces/:slug` | Update workspace |
| DELETE | `/api/workspaces/:slug` | Archive workspace |

### Artifacts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/artifacts` | Create artifact |
| GET | `/api/artifacts` | List artifacts (with filters) |
| GET | `/api/artifacts/:id` | Get artifact details |
| PUT | `/api/artifacts/:id` | Update artifact |
| POST | `/api/artifacts/:id/version` | Create new version |
| DELETE | `/api/artifacts/:id` | Archive artifact |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=...` | Full-text search |
| GET | `/api/search/suggest?q=...` | Autocomplete suggestions |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Mission Control data |
| GET | `/api/dashboard/session-summary` | Session summary |

---

## Authentication

All endpoints require **Clerk authentication**:

```
Authorization: Bearer YOUR_CLERK_JWT_TOKEN
```

The `requireAuth` middleware extracts `userId` from the token and ensures row-level security (users can only access their own data).

---

## Best Practices

### 1. Tag Consistently
Use standardized tags for better search:
- **Domain tags**: `product`, `GTM`, `engineering`, `sales`
- **Stage tags**: `validation`, `MVP`, `scaling`
- **Quarter tags**: `Q1-2025`, `Q2-2025`

### 2. Version Liberally
Don't edit artifacts in-place when making major changes. Create a new version to preserve history.

**When to create new version:**
- Changing core direction (e.g., PRD scope shift)
- Major rewrites (e.g., pitch deck overhaul)
- After getting feedback that changes assumptions

**When to edit in-place:**
- Fixing typos
- Adding small details
- Formatting changes

### 3. Use Source Field
Always set `source` when creating artifacts:
- `"conversation:conv_123"` - From AI chat
- `"manual"` - User-created
- `"import:notion"` - Imported from Notion
- `"workflow:gtm_plan"` - Generated by workflow

This helps you trace back where insights came from.

### 4. Leverage Tiers
Don't manually file documents. Let the tiered system work:
- **Active**: Things you're working on NOW (auto-surfaced)
- **Reference**: Things you might need (searchable)
- **Archive**: Old versions, done projects (out of sight)

Search covers all tiers, so you can always find archived items.

### 5. Review Session Summary Daily
At end of each work session, check:
```
GET /api/dashboard/session-summary
```

Gives you closure and helps identify:
- **Open threads** (conversations without artifacts)
- **Accomplishments** (what you shipped today)
- **Momentum** (are you creating/completing consistently?)

---

## Phase 2 Features (Not Yet Implemented)

The following are designed but not yet built:

### Playbook Runner
- Phased workflows (Validation → MVP → PMF → Scale)
- Gate checks (can't skip steps)
- Task sequencing with dependencies

### Scoreboard Loop
- KPI tracking (ARR, MRR, churn, NPS)
- Weekly review ritual
- Failure taxonomy (learn from mistakes)
- Metric snapshots over time

### Integrations
- Notion sync (two-way)
- Google Drive connector
- HubSpot CRM integration
- Slack notifications

**Estimated Timeline:** Phase 2 in Q1 2025

---

## Troubleshooting

### "Workspace not found" Error
Make sure you created a workspace first:
```bash
POST /api/workspaces
```

You need at least one active workspace to create artifacts.

### Search Returns No Results
Check:
1. Are you searching the correct workspace? (use `workspaceId` filter)
2. Is the artifact archived? (search covers all tiers by default)
3. Try broader search terms (search is case-insensitive, partial match)

### Duplicate Content Warning
When creating an artifact, you get:
```json
{
  "warnings": ["Similar content exists: 'Old PRD' (v2)"]
}
```

This means an artifact with identical SHA-256 hash exists. Review before saving to avoid duplicates.

### Priority Score Seems Wrong
Priority is calculated automatically based on:
- Manual priority (P0/P1/P2)
- Due date urgency
- Current status

If a task is showing as "On Fire" but shouldn't be, check:
1. Is due date set correctly?
2. Is priority level appropriate (P0 = critical)?
3. Is status BLOCKED (auto-boosted)?

---

## Performance Notes

### Search Performance
- **Current**: PostgreSQL ILIKE (simple substring match)
- **Limitation**: Slows down at 10,000+ artifacts per workspace
- **Future**: Migrate to PostgreSQL tsvector full-text search or Elasticsearch

### Caching
Not implemented yet. All queries hit database directly.

**Recommended for production:**
- Cache dashboard data (5-minute TTL)
- Cache search results (query-specific cache)
- Cache workspace metadata

---

## Data Privacy & Security

### Encryption
- Artifacts stored as plain text in PostgreSQL
- **TODO**: Add column-level encryption for sensitive content

### Access Control
- Row-level security via `userId` checks
- Users can only access their own workspaces/artifacts
- No cross-user data leakage

### Data Export
Not yet implemented. Planned:
```bash
GET /api/workspaces/:slug/export
```

Returns JSON dump of all data (GDPR compliance).

---

## Development Roadmap

### ✅ Phase 1: MVP (8 weeks) - COMPLETED
- [x] Prisma schema
- [x] Workspace CRUD
- [x] Artifact CRUD + versioning
- [x] Search API
- [x] Mission Control dashboard
- [x] Session summary

### 🚧 Phase 1.5: Frontend (Next 4 weeks)
- [ ] Workspace onboarding UI
- [ ] Mission Control dashboard UI
- [ ] Artifact creation/editing UI
- [ ] Search interface
- [ ] Session summary widget

### 📅 Phase 2: Process (Months 4-6)
- [ ] Playbook Runner (workflows)
- [ ] Phase gates
- [ ] Dependency visualization
- [ ] Parallel track view

### 📅 Phase 3: Intelligence (Months 7-12)
- [ ] Customer signal aggregation
- [ ] Pattern recognition
- [ ] Proactive suggestions
- [ ] Weekly digest

### 📅 Phase 4: Integrations (Months 13-18)
- [ ] Notion sync
- [ ] Linear/Jira integration
- [ ] Google Drive connector
- [ ] Slack interface

---

## Support

**Questions?** Check:
1. This README
2. [Product Definition](./PRODUCT_DEFINITION.md)
3. [PRD](./PRD_FOUNDER_OS.md)
4. GitHub Issues

**Found a bug?** Open an issue with:
- API endpoint called
- Request payload
- Expected vs. actual response
- Error logs (if any)

---

**Last Updated:** 2025-12-31
**Version:** 1.0.0 (MVP Backend Complete)
