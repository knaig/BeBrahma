# BeBrahma v0.3 - API Specification

**Document ID:** DES-004
**Traceability:** Maps to all FR-xxx requirements (API layer implementation)
**Last Updated:** 2026-01-01
**Status:** Draft

---

## Table of Contents

1. [Overview](#overview)
2. [Base Configuration](#base-configuration)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
   - [Progressive Profiling](#progressive-profiling)
   - [NBA Recommendations](#nba-recommendations)
   - [Context Management](#context-management)
   - [Updates & Signals](#updates--signals)
   - [Overrides](#overrides)
   - [Integrations](#integrations)
   - [Calendar](#calendar)
   - [Tasks](#tasks)
   - [Objectives](#objectives)
   - [Unknowns](#unknowns)
   - [Evidence](#evidence)
   - [Decisions](#decisions)
5. [WebSocket Events](#websocket-events)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Versioning](#versioning)
9. [Traceability Matrix](#traceability-matrix)

---

## Overview

BeBrahma v0.3 API is built with **FastAPI** (Python 3.11+) and follows REST principles with some real-time WebSocket endpoints.

### Key Characteristics

- **Protocol:** HTTPS only (TLS 1.3+)
- **Format:** JSON (application/json)
- **Authentication:** Clerk JWT tokens
- **API Version:** v1 (current)
- **Base URL:** `https://api.bebrahma.com/api/v1`
- **WebSocket URL:** `wss://api.bebrahma.com/ws`

### Design Principles

1. **Mobile-First:** Low latency, minimal payload sizes
2. **Offline-Friendly:** Support for offline-first clients (eventual consistency)
3. **Real-Time:** WebSocket for live updates during NBA computation
4. **Idempotent:** All POST/PUT/DELETE use idempotency keys
5. **Paginated:** All list endpoints support cursor-based pagination

---

## Base Configuration

### Request Headers

```http
Authorization: Bearer <clerk_jwt_token>
Content-Type: application/json
X-Client-Version: 1.0.0
X-Platform: ios|android|web
X-Idempotency-Key: <uuid>  # Required for POST/PUT/DELETE
```

### Response Headers

```http
Content-Type: application/json
X-Request-ID: <uuid>
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

### Standard Response Envelope

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "uuid",
    "timestamp": "2026-01-01T12:00:00Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      {
        "field": "email",
        "issue": "Invalid email format"
      }
    ]
  },
  "meta": {
    "request_id": "uuid",
    "timestamp": "2026-01-01T12:00:00Z"
  }
}
```

---

## Authentication

### Clerk JWT Authentication

All endpoints (except health check) require a valid Clerk JWT token in the `Authorization` header.

**Flow:**
1. Client authenticates with Clerk (handled by Clerk SDK)
2. Client receives JWT token
3. Client includes token in all API requests: `Authorization: Bearer <token>`
4. API validates token with Clerk's public key

**Verification:**
- **Library:** `clerk-sdk-python`
- **Validation:** JWT signature, expiration, issuer
- **Claims Used:** `sub` (user_id), `email`, `exp`

**Example Middleware (FastAPI):**
```python
from fastapi import Depends, HTTPException, Header
from clerk_sdk import Clerk

async def get_current_user(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    try:
        user = clerk.verify_token(token)
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
```

---

## API Endpoints

### Progressive Profiling

#### `POST /api/v1/onboarding/initial`

**Traceability:** FR-001 (Progressive Profiling)

**Description:** First interaction - ask ONE question and create user profile.

**Request:**
```json
{
  "question": "What are you building?",
  "answer": "A mobile app for dog walkers"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_profile": {
      "id": "uuid",
      "user_id": "clerk_user_id",
      "onboarding_step": "first_recommendation",
      "initial_question_answer": "A mobile app for dog walkers",
      "created_at": "2026-01-01T12:00:00Z"
    },
    "next_step": "first_recommendation"
  }
}
```

**Status Codes:**
- `201 Created`: Profile created successfully
- `400 Bad Request`: Missing or invalid answer
- `409 Conflict`: User already onboarded

---

#### `POST /api/v1/onboarding/complete`

**Description:** Mark onboarding as complete (after first recommendation is accepted).

**Request:**
```json
{
  "nba_session_id": "uuid",
  "action_taken": "accepted"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "onboarding_completed": true,
    "user_profile": { ... }
  }
}
```

---

### NBA Recommendations

#### `POST /api/v1/nba/ask`

**Traceability:** FR-002 (Next Best Action Recommendation), FR-010 (Confidence Display)

**Description:** Compute NBA recommendation (top + alternatives) based on current business context.

**Request:**
```json
{
  "query": "What should I do next?",  // Optional: user's specific question
  "trigger_type": "explicit_ask",  // explicit_ask | daily_prompt | post_update | scheduled
  "include_alternatives_count": 2  // Default: 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "recommendation": {
      "id": "uuid",
      "rank": 1,
      "action_type": "complete_task",
      "task": {
        "id": "uuid",
        "title": "Interview 10 target customers",
        "description": "Conduct problem interviews to validate pain points",
        "objective_id": "uuid",
        "estimated_duration_minutes": 300
      },
      "score": {
        "total": 0.87,
        "objective_impact": 0.90,
        "time_sensitivity": 0.85,
        "evidence_gap": 0.92,
        "unblocks": 0.70,
        "feasibility": 0.80
      },
      "confidence": {
        "level": "high",  // very_high | high | moderate | low
        "score": 0.78,
        "factors": {
          "context_completeness": 0.85,
          "historical_accuracy": 0.72,
          "data_quality": 0.80,
          "recency": 0.75
        }
      },
      "rationale_summary": "Your next critical step is to interview target customers. This directly addresses your most important unknown (will customers pay?) and has the highest impact on validating product-solution fit.",
      "framework_source": "problem_solution_fit"
    },
    "alternatives": [
      {
        "id": "uuid",
        "rank": 2,
        "action_type": "gather_evidence",
        "suggested_task": {
          "title": "Analyze competitor pricing",
          "description": "Research how competitors price similar solutions"
        },
        "score": {
          "total": 0.74,
          "objective_impact": 0.70,
          "time_sensitivity": 0.60,
          "evidence_gap": 0.85,
          "unblocks": 0.50,
          "feasibility": 0.90
        },
        "confidence": {
          "level": "moderate",
          "score": 0.65
        },
        "rationale_summary": "Understanding competitor pricing helps inform your value proposition and pricing strategy.",
        "framework_source": "icp_wedge"
      },
      {
        "id": "uuid",
        "rank": 3,
        "action_type": "create_task",
        "suggested_task": {
          "title": "Draft landing page copy",
          "description": "Create initial landing page to test value proposition"
        },
        "score": {
          "total": 0.68,
          ...
        },
        "confidence": {
          "level": "moderate",
          "score": 0.62
        },
        "rationale_summary": "Landing page helps test messaging clarity and generate early interest.",
        "framework_source": "problem_solution_fit"
      }
    ],
    "computation_time_ms": 1247,
    "frameworks_used": ["problem_solution_fit", "icp_wedge", "critical_unknown_mapping"]
  }
}
```

**Status Codes:**
- `200 OK`: Recommendation computed successfully
- `400 Bad Request`: Invalid request
- `503 Service Unavailable`: NBA engine timeout

**Performance SLA:** <2000ms for 90th percentile (NFR-001)

---

#### `GET /api/v1/nba/sessions/{session_id}`

**Description:** Get details of a specific NBA session.

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "uuid",
      "user_id": "clerk_user_id",
      "trigger_type": "explicit_ask",
      "user_query": "What should I do next?",
      "computation_time_ms": 1247,
      "frameworks_used": ["problem_solution_fit"],
      "user_action": "accepted",  // accepted | chose_alternative | dismissed | deferred | null
      "chosen_recommendation_id": "uuid",
      "created_at": "2026-01-01T12:00:00Z"
    },
    "recommendations": [ ... ]  // Array of recommendations (rank 1-N)
  }
}
```

---

#### `GET /api/v1/nba/rationale/{recommendation_id}`

**Traceability:** FR-005 (Rationale Display)

**Description:** Get full rationale for a specific recommendation (expanded view).

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendation_id": "uuid",
    "rationale": {
      "summary": "Your next critical step is to interview target customers...",
      "full": {
        "why": "Interviewing customers is the fastest way to validate your core assumptions about the problem space. Without customer evidence, you risk building something nobody wants.",
        "why_now": "You have 3 critical unknowns that can only be resolved through customer conversations. The longer you wait, the more risk you accumulate.",
        "expected_outcome": "After 10 interviews, you'll have clear evidence about:\n- Whether customers feel the pain you're solving (8/10 should confirm)\n- What they currently do to solve it (workarounds indicate pain)\n- Whether they'd pay for a solution (willingness-to-pay signals)",
        "what_you_learn": "You'll identify the strongest pain points, validate your ICP assumptions, and gather language/framing for your value prop.",
        "estimated_effort": "5 hours (10 x 30min interviews)",
        "frameworks_applied": [
          {
            "name": "Problem-Solution Fit",
            "reason": "You're in the 'Validate Problem' phase - customer interviews are the primary evidence-gathering mechanism."
          },
          {
            "name": "Critical Unknown Mapping",
            "reason": "This task addresses 3 open unknowns: pain severity, willingness to pay, and current solution satisfaction."
          }
        ],
        "risks_if_skipped": [
          "Building features customers don't care about",
          "Misunderstanding the core pain point",
          "Targeting the wrong customer segment"
        ],
        "dependencies": "No blockers. You can start immediately.",
        "next_steps_after": "After interviews, synthesize findings and update your ICP definition."
      }
    }
  }
}
```

---

#### `GET /api/v1/nba/alternatives/{recommendation_id}`

**Traceability:** FR-006 (Alternatives Display)

**Description:** Get detailed alternatives for a specific recommendation.

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendation_id": "uuid",
    "alternatives": [
      {
        "id": "uuid",
        "rank": 2,
        "action_type": "gather_evidence",
        "score": { ... },
        "confidence": { ... },
        "rationale_summary": "...",
        "comparison_to_top": {
          "score_difference": 0.13,
          "key_tradeoffs": [
            "Lower impact on objective (0.70 vs 0.90)",
            "Higher feasibility (0.90 vs 0.80)",
            "Can be done in parallel with customer interviews"
          ]
        }
      },
      ...
    ]
  }
}
```

---

### Context Management

#### `GET /api/v1/context`

**Traceability:** FR-007 (Context Maintenance)

**Description:** Get full business context (objectives, tasks, unknowns, recent signals).

**Query Parameters:**
- `include_completed`: boolean (default: false) - Include completed objectives/tasks
- `signals_days`: integer (default: 7) - Days of signal history to include

**Response:**
```json
{
  "success": true,
  "data": {
    "objectives": [
      {
        "id": "uuid",
        "title": "Validate Product-Solution Fit",
        "description": "...",
        "objective_type": "problem_solution_fit",
        "status": "active",
        "priority": 95,
        "confidence_level": "moderate",
        "task_count": 12,
        "unknown_count": 4,
        "evidence_count": 8,
        "created_at": "2025-12-01T00:00:00Z"
      },
      ...
    ],
    "tasks": [
      {
        "id": "uuid",
        "objective_id": "uuid",
        "title": "Interview 10 target customers",
        "status": "pending",
        "priority": 90,
        "due_date": "2026-01-15",
        "score_total": 0.87,
        "estimated_duration_minutes": 300
      },
      ...
    ],
    "unknowns": [
      {
        "id": "uuid",
        "objective_id": "uuid",
        "question": "Will customers pay $50/month?",
        "importance": "critical",
        "status": "open",
        "evidence_count": 2
      },
      ...
    ],
    "recent_signals": [
      {
        "id": "uuid",
        "signal_type": "update",
        "content": "Had coffee with potential customer - very excited about the idea",
        "intent_category": "insight",
        "sentiment": "positive",
        "created_at": "2026-01-01T10:30:00Z"
      },
      ...
    ],
    "summary": {
      "total_objectives": 3,
      "active_tasks": 12,
      "open_unknowns": 4,
      "signals_last_7_days": 15,
      "last_nba_session": "2026-01-01T09:00:00Z"
    }
  }
}
```

**Performance SLA:** <500ms (NFR-001)

---

#### `GET /api/v1/context/changes`

**Description:** Get what changed since last session (for "What's new?" view).

**Query Parameters:**
- `since`: ISO 8601 timestamp (default: last session)

**Response:**
```json
{
  "success": true,
  "data": {
    "since": "2025-12-31T12:00:00Z",
    "changes": {
      "tasks_completed": 3,
      "new_evidence": 2,
      "unknowns_resolved": 1,
      "new_signals": 8
    },
    "highlights": [
      {
        "type": "task_completed",
        "entity_id": "uuid",
        "title": "Completed: Set up landing page",
        "timestamp": "2025-12-31T15:00:00Z"
      },
      {
        "type": "evidence_added",
        "entity_id": "uuid",
        "title": "New Evidence: Customer interview #1 insights",
        "timestamp": "2026-01-01T10:00:00Z"
      }
    ]
  }
}
```

---

#### `POST /api/v1/context/update`

**Description:** Manually update business context (e.g., complete task, add evidence).

**Request:**
```json
{
  "updates": [
    {
      "entity_type": "task",
      "entity_id": "uuid",
      "action": "complete",
      "metadata": {
        "completion_notes": "Finished all 10 interviews"
      }
    },
    {
      "entity_type": "evidence",
      "action": "create",
      "data": {
        "objective_id": "uuid",
        "title": "Customer interview findings",
        "description": "8/10 customers confirmed they'd pay $50/mo",
        "evidence_type": "customer_interview",
        "reliability": "high"
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updated_count": 2,
    "created_count": 1,
    "entities": [ ... ]
  }
}
```

---

### Updates & Signals

#### `POST /api/v1/updates`

**Traceability:** FR-003 (Voice Input), FR-004 (Text Input), FR-008 (Update Logging)

**Description:** Log an update (voice transcription or text).

**Request:**
```json
{
  "signal_type": "update",  // update | voice_note | quick_log
  "content": "Just had a great conversation with a potential customer. They loved the idea and said they'd definitely pay for it.",
  "source": "mobile_app",  // mobile_app | web_app
  "transcription_metadata": {  // Optional: for voice
    "audio_duration_seconds": 12.5,
    "transcription_confidence": 0.96,
    "language": "en-US"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signal_id": "uuid",
    "processed": {
      "intent_category": "insight",  // progress_update | blocker | insight | question | decision | milestone
      "sentiment": "positive",
      "entities_extracted": {
        "potential_evidence": [
          {
            "type": "customer_feedback",
            "content": "customer loved the idea",
            "suggested_unknown_ids": ["uuid"]  // Which unknowns this might address
          }
        ],
        "suggested_actions": [
          {
            "type": "create_evidence",
            "title": "Customer expressed willingness to pay",
            "confidence": 0.75
          }
        ]
      }
    },
    "created_at": "2026-01-01T12:00:00Z"
  }
}
```

**Performance SLA:** <100ms to acknowledge, background processing for entity extraction

---

#### `GET /api/v1/signals`

**Description:** Get signal history.

**Query Parameters:**
- `days`: integer (default: 7) - Days of history
- `type`: string (optional) - Filter by signal_type
- `cursor`: string (optional) - Pagination cursor
- `limit`: integer (default: 50, max: 200)

**Response:**
```json
{
  "success": true,
  "data": {
    "signals": [ ... ],
    "pagination": {
      "next_cursor": "base64_encoded_cursor",
      "has_more": true
    }
  }
}
```

---

### Overrides

#### `POST /api/v1/overrides`

**Traceability:** FR-009 (Override Learning), FR-015 (Taxonomy)

**Description:** Log when user chooses alternative over top recommendation.

**Request:**
```json
{
  "session_id": "uuid",
  "recommended_id": "uuid",  // Rank 1 recommendation
  "chosen_id": "uuid",  // Rank 2+ alternative
  "override_category": "time_preference",  // time_preference | energy_level | skill_match | emotional_state | external_constraint | strategic_disagreement | other
  "user_reason": "I don't have time for 10 interviews this week, so I'll start with competitive analysis instead.",  // Optional
  "context": {
    "time_of_day": "evening",
    "day_of_week": "friday",
    "energy_level": "low"  // Optional user input
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "override_id": "uuid",
    "learning_status": "queued",  // queued | processed | incorporated
    "estimated_weight_adjustment": {
      "time_sensitivity": -0.03,
      "feasibility": +0.05
    },
    "message": "Thanks for the feedback! We'll use this to improve your recommendations."
  }
}
```

---

#### `GET /api/v1/overrides/patterns`

**Description:** Get user's override patterns (for self-reflection).

**Response:**
```json
{
  "success": true,
  "data": {
    "total_overrides": 23,
    "patterns": [
      {
        "category": "time_preference",
        "count": 12,
        "percentage": 52.2,
        "typical_time": "evening",
        "insight": "You tend to prefer shorter tasks in the evening"
      },
      {
        "category": "energy_level",
        "count": 7,
        "percentage": 30.4,
        "insight": "You often choose lower-effort tasks on Fridays"
      }
    ],
    "current_weights": {
      "objective_impact": 0.32,  // Adjusted from default 0.30
      "time_sensitivity": 0.22,  // Adjusted from default 0.25
      "evidence_gap": 0.26,
      "unblocks": 0.10,
      "feasibility": 0.10
    }
  }
}
```

---

### Integrations

#### `POST /api/v1/integrations/connect`

**Traceability:** FR-011 (Calendar Integration), FR-012 (Task Integration)

**Description:** Connect external integration (Google Calendar, Linear, Asana).

**Request:**
```json
{
  "provider": "google_calendar",  // google_calendar | linear | asana
  "auth_code": "oauth_authorization_code",  // From OAuth flow
  "redirect_uri": "https://app.bebrahma.com/integrations/callback"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "integration_id": "uuid",
    "provider": "google_calendar",
    "status": "active",
    "initial_sync_status": "in_progress",  // in_progress | completed | failed
    "created_at": "2026-01-01T12:00:00Z"
  }
}
```

---

#### `GET /api/v1/integrations`

**Description:** List all connected integrations.

**Response:**
```json
{
  "success": true,
  "data": {
    "integrations": [
      {
        "id": "uuid",
        "provider": "google_calendar",
        "integration_type": "calendar",
        "status": "active",
        "last_sync_at": "2026-01-01T11:00:00Z",
        "last_sync_status": "success",
        "sync_frequency_minutes": 15
      },
      {
        "id": "uuid",
        "provider": "linear",
        "integration_type": "task_manager",
        "status": "active",
        "last_sync_at": "2026-01-01T11:30:00Z",
        "last_sync_status": "success"
      }
    ]
  }
}
```

---

#### `POST /api/v1/integrations/{integration_id}/sync`

**Description:** Trigger manual sync for an integration.

**Response:**
```json
{
  "success": true,
  "data": {
    "sync_job_id": "uuid",
    "status": "in_progress",
    "estimated_completion_seconds": 30
  }
}
```

---

#### `DELETE /api/v1/integrations/{integration_id}`

**Description:** Disconnect integration.

**Response:**
```json
{
  "success": true,
  "data": {
    "integration_id": "uuid",
    "status": "disconnected",
    "data_retention": "External data (calendar events, tasks) will be deleted in 7 days"
  }
}
```

---

### Calendar

#### `GET /api/v1/calendar/events`

**Traceability:** FR-011 (Calendar Integration)

**Description:** Get synced calendar events.

**Query Parameters:**
- `start_date`: ISO 8601 date (required)
- `end_date`: ISO 8601 date (required)
- `category`: string (optional) - Filter by event_category

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "uuid",
        "external_event_id": "google_event_id",
        "title": "Customer interview with Jane Doe",
        "start_time": "2026-01-02T14:00:00Z",
        "end_time": "2026-01-02T14:30:00Z",
        "event_category": "customer_meeting",
        "is_customer_facing": true,
        "confidence_score": 0.85
      },
      ...
    ]
  }
}
```

---

#### `GET /api/v1/calendar/availability`

**Description:** Get available time slots for scheduling tasks.

**Query Parameters:**
- `date`: ISO 8601 date (default: today)
- `duration_minutes`: integer (required) - Task duration

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2026-01-02",
    "available_slots": [
      {
        "start_time": "2026-01-02T09:00:00Z",
        "end_time": "2026-01-02T11:00:00Z",
        "duration_minutes": 120
      },
      {
        "start_time": "2026-01-02T15:00:00Z",
        "end_time": "2026-01-02T18:00:00Z",
        "duration_minutes": 180
      }
    ],
    "working_hours": {
      "start": "09:00",
      "end": "18:00",
      "timezone": "America/Los_Angeles"
    }
  }
}
```

---

### Tasks

#### `GET /api/v1/tasks`

**Description:** Get user's tasks.

**Query Parameters:**
- `objective_id`: UUID (optional) - Filter by objective
- `status`: string (optional) - Filter by status
- `sort_by`: string (default: "score_total") - score_total | due_date | priority
- `cursor`: string (optional) - Pagination
- `limit`: integer (default: 50, max: 200)

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [ ... ],
    "pagination": {
      "next_cursor": "...",
      "has_more": false
    }
  }
}
```

---

#### `POST /api/v1/tasks`

**Description:** Create a new task.

**Request:**
```json
{
  "objective_id": "uuid",
  "title": "Research competitor pricing",
  "description": "Analyze top 5 competitors and document pricing tiers",
  "task_type": "research",
  "priority": 75,
  "due_date": "2026-01-10",
  "estimated_duration_minutes": 120,
  "unknown_ids": ["uuid1", "uuid2"]  // Optional: link to unknowns
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "uuid",
      "objective_id": "uuid",
      "title": "Research competitor pricing",
      "status": "pending",
      "created_at": "2026-01-01T12:00:00Z",
      ...
    }
  }
}
```

---

#### `PATCH /api/v1/tasks/{task_id}`

**Description:** Update task (including mark as complete).

**Request:**
```json
{
  "status": "completed",
  "completion_notes": "Analyzed 5 competitors. Pricing ranges from $20-100/mo."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "task": { ... },
    "triggered_updates": {
      "unknowns_potentially_resolved": ["uuid"],  // Unknowns this task addressed
      "tasks_unblocked": ["uuid1", "uuid2"]  // Tasks now unblocked
    }
  }
}
```

---

#### `DELETE /api/v1/tasks/{task_id}`

**Description:** Delete task (soft delete).

**Response:**
```json
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "deleted_at": "2026-01-01T12:00:00Z"
  }
}
```

---

### Objectives

#### `GET /api/v1/objectives`

**Description:** Get user's objectives.

**Query Parameters:**
- `status`: string (optional) - Filter by status
- `type`: string (optional) - Filter by objective_type

**Response:**
```json
{
  "success": true,
  "data": {
    "objectives": [
      {
        "id": "uuid",
        "title": "Validate Product-Solution Fit",
        "objective_type": "problem_solution_fit",
        "status": "active",
        "priority": 95,
        "task_count": 12,
        "unknown_count": 4,
        "completion_percentage": 35.5,
        "created_at": "2025-12-01T00:00:00Z"
      },
      ...
    ]
  }
}
```

---

#### `POST /api/v1/objectives`

**Description:** Create new objective.

**Request:**
```json
{
  "title": "Define Ideal Customer Profile",
  "description": "Narrow down target customer segment and validate ICP assumptions",
  "objective_type": "icp_wedge",
  "priority": 80,
  "target_completion_date": "2026-02-15"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "objective": {
      "id": "uuid",
      "title": "Define Ideal Customer Profile",
      ...
    }
  }
}
```

---

#### `PATCH /api/v1/objectives/{objective_id}`

**Description:** Update objective.

**Request:**
```json
{
  "status": "completed",
  "confidence_level": "high"
}
```

---

### Unknowns

#### `GET /api/v1/unknowns`

**Description:** Get critical unknowns.

**Query Parameters:**
- `objective_id`: UUID (optional)
- `status`: string (optional) - open | investigating | resolved
- `importance`: string (optional) - critical | high | medium | low

**Response:**
```json
{
  "success": true,
  "data": {
    "unknowns": [
      {
        "id": "uuid",
        "objective_id": "uuid",
        "question": "Will customers pay $50/month?",
        "category": "business_model",
        "importance": "critical",
        "status": "open",
        "evidence_count": 2,
        "tasks_addressing": 3,
        "resolution_percentage": 25  // Based on evidence
      },
      ...
    ]
  }
}
```

---

#### `POST /api/v1/unknowns`

**Description:** Create new unknown.

**Request:**
```json
{
  "objective_id": "uuid",
  "question": "What's the optimal pricing tier structure?",
  "category": "business_model",
  "importance": "high",
  "target_resolution_date": "2026-01-31"
}
```

---

#### `PATCH /api/v1/unknowns/{unknown_id}`

**Description:** Update unknown (e.g., mark as resolved).

**Request:**
```json
{
  "status": "resolved",
  "resolution_confidence": "high",
  "resolution_summary": "Validated that customers will pay $50/mo. 8/10 interviews confirmed willingness to pay at this price point."
}
```

---

### Evidence

#### `GET /api/v1/evidence`

**Description:** Get evidence.

**Query Parameters:**
- `objective_id`: UUID (optional)
- `unknown_id`: UUID (optional) - Filter evidence addressing specific unknown
- `type`: string (optional) - Filter by evidence_type

**Response:**
```json
{
  "success": true,
  "data": {
    "evidence": [
      {
        "id": "uuid",
        "objective_id": "uuid",
        "title": "Customer interview findings - willingness to pay",
        "description": "8 out of 10 customers confirmed they would pay $50/mo",
        "evidence_type": "customer_interview",
        "reliability": "high",
        "sample_size": 10,
        "unknowns_addressed": ["uuid1", "uuid2"],
        "collected_at": "2026-01-01T10:00:00Z"
      },
      ...
    ]
  }
}
```

---

#### `POST /api/v1/evidence`

**Description:** Create new evidence.

**Request:**
```json
{
  "objective_id": "uuid",
  "title": "Survey results - pain point validation",
  "description": "Survey of 50 dog walkers showed 78% experience scheduling pain daily",
  "evidence_type": "user_data",
  "source": "Online survey via Google Forms",
  "reliability": "medium",
  "sample_size": 50,
  "unknown_ids": ["uuid1"],  // Link to unknowns this addresses
  "resolves_percentages": [60],  // How much each unknown is resolved (0-100)
  "raw_data": {
    "survey_url": "https://...",
    "key_stats": {
      "total_responses": 50,
      "pain_frequency_daily": 39,
      "pain_frequency_weekly": 8
    }
  }
}
```

---

### Decisions

#### `GET /api/v1/decisions`

**Description:** Get strategic decisions.

**Query Parameters:**
- `objective_id`: UUID (optional)
- `status`: string (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "decisions": [
      {
        "id": "uuid",
        "objective_id": "uuid",
        "title": "Decision: Target SMB market instead of enterprise",
        "decision_type": "strategic",
        "status": "approved",
        "chosen_option": "Focus on SMBs (10-50 employees)",
        "rationale": "Customer interviews showed SMBs have acute pain and faster sales cycles",
        "evidence_ids": ["uuid1", "uuid2"],  // Evidence informing decision
        "decided_at": "2025-12-15T00:00:00Z"
      },
      ...
    ]
  }
}
```

---

#### `POST /api/v1/decisions`

**Description:** Create new decision.

**Request:**
```json
{
  "objective_id": "uuid",
  "title": "Pricing model decision",
  "description": "Choose between freemium and paid-only model",
  "decision_type": "strategic",
  "options_considered": [
    {
      "option": "Freemium with basic features free",
      "pros": ["Lower barrier to entry", "Faster user acquisition"],
      "cons": ["Risk of low conversion", "Support costs for free users"]
    },
    {
      "option": "Paid-only ($50/mo)",
      "pros": ["Higher revenue per user", "Attracts serious customers"],
      "cons": ["Higher barrier to entry"]
    }
  ],
  "chosen_option": "Paid-only ($50/mo)",
  "rationale": "Evidence from interviews shows customers with acute pain will pay. Freemium increases complexity.",
  "evidence_ids": ["uuid1", "uuid2"],
  "unknown_ids": ["uuid3"]  // Unknowns this decision resolves
}
```

---

## WebSocket Events

### Connection

**URL:** `wss://api.bebrahma.com/ws`

**Authentication:** Query parameter `?token=<clerk_jwt>`

**Example:**
```javascript
const ws = new WebSocket('wss://api.bebrahma.com/ws?token=' + clerkToken);

ws.onopen = () => {
  console.log('Connected to BeBrahma');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handleMessage(message);
};
```

---

### Event: `nba.computing`

**Description:** Sent while NBA recommendation is being computed (real-time progress).

**Payload:**
```json
{
  "event": "nba.computing",
  "data": {
    "session_id": "uuid",
    "status": "in_progress",
    "current_step": "scoring_tasks",  // framework_selection | candidate_generation | scoring_tasks | confidence_calculation | rationale_generation
    "progress_percentage": 60,
    "estimated_remaining_ms": 800
  }
}
```

---

### Event: `nba.complete`

**Description:** NBA computation finished.

**Payload:**
```json
{
  "event": "nba.complete",
  "data": {
    "session_id": "uuid",
    "recommendation_id": "uuid",
    "computation_time_ms": 1247
  }
}
```

---

### Event: `context.updated`

**Description:** Business context changed (task completed, evidence added, etc.).

**Payload:**
```json
{
  "event": "context.updated",
  "data": {
    "update_type": "task_completed",  // task_completed | evidence_added | unknown_resolved | integration_synced
    "entity_id": "uuid",
    "entity_type": "task",
    "summary": "Completed: Interview 10 customers"
  }
}
```

---

### Event: `integration.sync_complete`

**Description:** Integration sync finished.

**Payload:**
```json
{
  "event": "integration.sync_complete",
  "data": {
    "integration_id": "uuid",
    "provider": "google_calendar",
    "sync_status": "success",
    "items_synced": 15,
    "new_events_count": 3
  }
}
```

---

## Error Handling

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | User lacks permission |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., already exists) |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |
| `NBA_TIMEOUT` | 503 | NBA computation exceeded timeout |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "objective_id",
        "issue": "Invalid UUID format"
      }
    ],
    "request_id": "uuid",
    "documentation_url": "https://docs.bebrahma.com/api/errors/validation"
  },
  "meta": {
    "request_id": "uuid",
    "timestamp": "2026-01-01T12:00:00Z"
  }
}
```

---

## Rate Limiting

### Limits by Endpoint Type

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Read (GET) | 100 requests | per minute |
| Write (POST/PATCH/DELETE) | 30 requests | per minute |
| NBA computation | 10 requests | per minute |
| Signals/Updates | 50 requests | per minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200  # Unix timestamp
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 42 seconds.",
    "retry_after_seconds": 42
  }
}
```

**HTTP Status:** 429 Too Many Requests

---

## Versioning

### API Version Strategy

- **Current Version:** v1
- **Version in URL:** `/api/v1/...`
- **Deprecation Policy:** 6 months notice before deprecation
- **Breaking Changes:** Require new version (v2, v3, etc.)
- **Non-Breaking Changes:** Added to current version

### Version Header (Optional)

```http
X-API-Version: 1
```

### Deprecation Warnings

When an endpoint is deprecated:

```http
X-API-Deprecation: true
X-API-Sunset: 2026-07-01
Link: <https://docs.bebrahma.com/api/v2/migration>; rel="migration-guide"
```

---

## Traceability Matrix

| Requirement ID | Endpoints |
|----------------|-----------|
| FR-001: Progressive Profiling | `POST /onboarding/initial`, `POST /onboarding/complete` |
| FR-002: NBA Recommendations | `POST /nba/ask`, `GET /nba/sessions/{id}` |
| FR-003: Voice Input | `POST /updates` (with transcription_metadata) |
| FR-004: Text Input | `POST /updates` |
| FR-005: Rationale | `GET /nba/rationale/{id}` |
| FR-006: Alternatives | `GET /nba/alternatives/{id}` |
| FR-007: Context Maintenance | `GET /context`, `GET /context/changes` |
| FR-008: Update Logging | `POST /updates`, `GET /signals` |
| FR-009: Override Learning | `POST /overrides`, `GET /overrides/patterns` |
| FR-010: Confidence Display | `POST /nba/ask` (confidence in response) |
| FR-011: Calendar Integration | `POST /integrations/connect`, `GET /calendar/events`, `GET /calendar/availability` |
| FR-012: Task Integration | `POST /integrations/connect`, `GET /tasks` (with external_task_id) |
| FR-013: Business State Graph | All CRUD endpoints for objectives, tasks, unknowns, evidence, decisions |
| FR-014: Framework Router | Implicit in `POST /nba/ask` (frameworks_used in response) |
| FR-015: Override Taxonomy | `POST /overrides` (override_category field) |
| FR-016: Quick Updates | `POST /updates` with signal_type=quick_log |
| NFR-001: Performance | All endpoints designed for <2s NBA, <500ms context retrieval |
| NFR-002: Security | Clerk JWT authentication on all endpoints |
| NFR-003: Privacy | Encrypted tokens in integrations, GDPR-compliant deletion |
| NFR-004: Cost | Efficient queries, caching strategy |
| NFR-005: Reliability | Idempotency keys, transaction support |

---

## Next Steps

1. **Implementation:**
   - Set up FastAPI project structure
   - Implement Clerk authentication middleware
   - Create Pydantic models for request/response validation
   - Implement endpoint handlers

2. **Testing:**
   - Create Postman/Insomnia collection
   - Write integration tests for all endpoints
   - Load test NBA endpoint for <2s latency
   - Test rate limiting

3. **Documentation:**
   - Generate OpenAPI/Swagger docs (auto-generated by FastAPI)
   - Create API client SDKs (TypeScript for React Native)
   - Write example code for common flows

---

**End of API_SPEC.md**
