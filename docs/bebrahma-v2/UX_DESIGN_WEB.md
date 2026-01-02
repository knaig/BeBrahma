# BeBrahma v0.3 - Web App UX Design Document

**Version:** 0.3.0
**Last Updated:** January 2, 2026
**Status:** Design Phase
**Platform:** Web (Desktop/Tablet)

---

## 1. Design Philosophy

### 1.1 Core Principles

1. **Desktop-Optimized Efficiency**
   - Leverage horizontal space for multi-column layouts
   - Show more context simultaneously
   - Reduce clicks with persistent panels
   - Support power users with keyboard shortcuts

2. **Complementary to Mobile**
   - Same core functionality, optimized UI
   - Deeper analysis and planning on desktop
   - Quick actions and voice on mobile
   - Seamless sync between platforms

3. **Information Density**
   - Dashboard-style overview
   - Side-by-side comparisons
   - Persistent navigation
   - More data visible without scrolling

4. **Progressive Disclosure (Desktop Style)**
   - Expandable panels instead of modals
   - Split-screen details
   - Collapsible sidebars
   - Hover previews and tooltips

---

## 2. User Flow Architecture

### 2.1 Primary User Journey

```
[First Visit]
    ↓
[Onboarding: "What are you building?"]
    ↓
[Main Dashboard]
    ├─ Left: Navigation & Context Summary
    ├─ Center: NBA Recommendation
    └─ Right: Rationale & Insights
    ↓
[Continuous Use]
    ├─ Add updates via text/voice
    ├─ Accept/reject recommendations
    ├─ Deep dive into context
    └─ Manage objectives, tasks, unknowns
```

### 2.2 Navigation Pattern

**Persistent Left Sidebar:**
- NBA Recommendations (Home)
- Context & State
- Evidence & Learnings
- Decisions
- Integrations
- Settings

**Main Content Area:**
- Dynamic based on sidebar selection

**Right Panel (Contextual):**
- Rationale details
- Quick actions
- Recent activity
- Insights

---

## 3. Screen Inventory

### 3.1 Onboarding Flow

#### Screen 1: Welcome & Onboarding
**Purpose:** Single-page onboarding experience

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                         [Logo] 🧠                            │
│                                                              │
│                    Your AI Co-Founder                        │
│                                                              │
│           Always knows what to do next (and why)             │
│                                                              │
│                                                              │
│              ┌────────────────────────────────┐              │
│              │                                │              │
│              │  🎯 One Question               │              │
│              │                                │              │
│              │  What are you building?        │              │
│              │                                │              │
│              │  ┌──────────────────────────┐  │              │
│              │  │                          │  │              │
│              │  │  Type your answer...     │  │              │
│              │  │                          │  │              │
│              │  └──────────────────────────┘  │              │
│              │                                │              │
│              │  Or use voice input: 🎤        │              │
│              │                                │              │
│              │       [Get Started →]          │              │
│              │                                │              │
│              └────────────────────────────────┘              │
│                                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Components:**
- Centered layout (max-width: 600px)
- Large logo and tagline
- Single question card
- Text input (primary on desktop)
- Voice input button (secondary)
- Continue CTA

**Interaction:**
- Type answer → Continue
- Or click mic → Record → Transcribe → Continue
- Backend: POST /api/v1/onboarding/initial

---

### 3.2 Main Dashboard (Primary View)

#### Screen 2: NBA Dashboard - Three Column Layout
**Purpose:** Main workspace showing recommendation, context, and rationale simultaneously

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo] BeBrahma                                        [Profile] [Settings] │
├────────┬────────────────────────────────────────────┬───────────────────────┤
│        │                                            │                       │
│  📊    │  ⭐ Recommended                            │  💡 Why This Matters  │
│  NBA   │                                            │                       │
│  ───── │  ┌──────────────────────────────────────┐ │  Based on your 3      │
│        │  │                                      │ │  critical unknowns    │
│  📈    │  │ Conduct 5 customer interviews        │ │  about customer pain  │
│  Context│  │ with target persona                  │ │  points...            │
│  ───── │  │                                      │ │                       │
│        │  │ 📊 Score: 8.7/10                     │ │  Full Rationale:      │
│  📝    │  │ ✅ 82% Confidence                    │ │                       │
│  Evidence│                                        │ │  Your primary         │
│  ───── │  └──────────────────────────────────────┘ │  objective is         │
│        │                                            │  "Problem-Solution    │
│  ⚖️    │  📊 Score Breakdown                       │  Fit". You have 3     │
│  Decisions│                                         │  critical unknowns... │
│  ───── │  Objective Impact     ████████░░  8.5    │                       │
│        │  Time Sensitivity     ███████░░░  7.2    │  Frameworks:          │
│  🔗    │  Evidence Gap         █████████░  9.1    │  • Problem-Solution   │
│  Integrations                                      │  • Critical Unknown   │
│  ───── │  Unblocks             ████████░░  8.0    │                       │
│        │  Feasibility          ████████░░  8.3    │  Confidence Factors:  │
│  ⚙️    │                                            │  • Context: Complete  │
│  Settings│                                          │  • Historical: 78%    │
│        │  🔀 Alternatives (2)                       │  • Data Quality: High │
│        │                                            │  • Recency: Fresh     │
│        │  • Survey 50 users           8.2/10       │                       │
│        │  • Build landing page        7.9/10       │  [View Full Analysis] │
│        │                                            │                       │
│        │  [▶ Start Now] [✎ Modify] [⏭ Skip]       │                       │
│        │                                            │                       │
│        │  [+ Add Update]                            │  📊 Quick Stats       │
│        │                                            │  2 Objectives         │
│        │                                            │  5 Active Tasks       │
│        │                                            │  3 Open Unknowns      │
│        │                                            │                       │
└────────┴────────────────────────────────────────────┴───────────────────────┘
```

**Left Sidebar (240px):**
- Logo/App name
- Primary navigation
- Active state highlighting
- Collapsible (keyboard: Cmd+B)

**Center Panel (Flex, ~600-800px):**
- NBA recommendation card
- Score breakdown
- Alternatives list
- Action buttons
- Add update button

**Right Panel (320px):**
- Rationale summary
- Full reasoning (scrollable)
- Framework tags
- Confidence breakdown
- Quick stats

**Top Bar:**
- App branding (left)
- Search (center) - future
- Profile + Settings (right)

---

### 3.3 Context View (Full Screen)

#### Screen 3: Business State Graph Dashboard
**Purpose:** Comprehensive view of all business context

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo] BeBrahma           Context & State          [Profile] [Settings]   │
├────────┬────────────────────────────────────────────────────────────────────┤
│        │                                                                    │
│  📊    │  ┌─────────────────────────────────────────────────────────────┐  │
│  NBA   │  │  📊 Summary                                                 │  │
│  ───── │  │                                                             │  │
│        │  │  2 Objectives    5 Active Tasks    3 Open Unknowns          │  │
│  📈    │  │  15 Recent Signals                                          │  │
│  Context│  └─────────────────────────────────────────────────────────────┘  │
│  ───── │                                                                    │
│        │  🎯 Objectives                                [+ New Objective]   │
│  📝    │                                                                    │
│  Evidence│ ┌───────────────────────────┐  ┌───────────────────────────┐   │
│  ───── │  │ Problem-Solution Fit      │  │ ICP + Wedge               │   │
│        │  │ ─────────────────── 65%   │  │ ─────────────────── 40%   │   │
│  ⚖️    │  │ 3 tasks, 2 unknowns       │  │ 2 tasks, 1 unknown        │   │
│  Decisions│ └───────────────────────────┘  └───────────────────────────┘   │
│  ───── │                                                                    │
│        │  ✓ Tasks (5)                                    [+ New Task]      │
│  🔗    │                                                                    │
│  Integrations│ ┌────────────────────────────────────────────────────────┐  │
│  ───── │  │ □ Conduct customer interview #3                Priority: H │  │
│        │  │ □ Synthesize learnings from interviews         Priority: M │  │
│  ⚙️    │  │ □ Build prototype v1                           Priority: M │  │
│  Settings│  │ □ Test prototype with 5 users                 Priority: M │  │
│        │  │ □ Define pricing hypothesis                    Priority: L │  │
│        │  └────────────────────────────────────────────────────────────┘  │
│        │                                                                    │
│        │  ❓ Critical Unknowns (3)                        [+ New Unknown]  │
│        │                                                                    │
│        │  • What's the #1 pain point?                    Status: Open      │
│        │  • Will they pay $49/mo?                        Status: Open      │
│        │  • What are current alternatives?               Status: Open      │
│        │                                                                    │
└────────┴────────────────────────────────────────────────────────────────────┘
```

**Components:**

1. **Summary Cards**
   - Grid layout (4 metrics)
   - Large numbers with labels
   - Quick overview

2. **Objectives Section**
   - Card grid (2 columns on desktop)
   - Progress bars
   - Task/unknown counts
   - Click to expand

3. **Tasks List**
   - Table-like layout
   - Checkboxes
   - Priority indicators
   - Inline editing

4. **Unknowns List**
   - Expandable items
   - Status badges
   - Quick actions

**Interactions:**
- Click objective → Expand to show all related tasks/unknowns
- Check task → Mark complete
- Hover task → Show quick actions (edit, delete, reschedule)
- Drag to reorder (future)

---

### 3.4 Evidence & Learnings View

#### Screen 4: Evidence Library
**Purpose:** Repository of all learnings, interviews, metrics

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo] BeBrahma        Evidence & Learnings         [Profile] [Settings]  │
├────────┬────────────────────────────────────────────────────────────────────┤
│        │                                                                    │
│  📊    │  [Search evidence...]               [Filter ▼] [+ Add Evidence]   │
│  NBA   │                                                                    │
│  ───── │  ┌────────────────────────────────────────────────────────────┐  │
│        │  │ 📊 Customer Interview #1                    May 15, 2025   │  │
│  📈    │  │                                                             │  │
│  Context│  │ Key Findings: Customer spends 2 hours/day on manual...    │  │
│  ───── │  │                                                             │  │
│        │  │ Reliability: ⭐⭐⭐⭐ (High)        Sample Size: 1           │  │
│  📝    │  │ Tags: problem-validation, customer-pain                    │  │
│  Evidence│  └────────────────────────────────────────────────────────────┘  │
│  ───── │                                                                    │
│        │  ┌────────────────────────────────────────────────────────────┐  │
│  ⚖️    │  │ 📈 Landing Page Conversion Rate                Jan 2, 2026│  │
│  Decisions│ │                                                             │  │
│  ───── │  │ Metric: 12.5% conversion from visitor to signup           │  │
│        │  │                                                             │  │
│  🔗    │  │ Reliability: ⭐⭐⭐⭐⭐ (Very High)  Sample: 400 visitors   │  │
│  Integrations│ Tags: solution-validation, metrics                        │  │
│  ───── │  └────────────────────────────────────────────────────────────┘  │
│        │                                                                    │
│  ⚙️    │  ┌────────────────────────────────────────────────────────────┐  │
│  Settings│  │ 🔍 Competitor Research: Notion                 Apr 3, 2025│  │
│        │  │                                                             │  │
│        │  │ Finding: Notion charges $10/user/mo for teams...          │  │
│        │  │                                                             │  │
│        │  │ Reliability: ⭐⭐⭐ (Medium)         Sample: Public data    │  │
│        │  │ Tags: market-research, pricing                             │  │
│        │  └────────────────────────────────────────────────────────────┘  │
│        │                                                                    │
└────────┴────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Search and filter
- Evidence cards with metadata
- Reliability indicators
- Sample size
- Tags for categorization
- Chronological ordering

---

### 3.5 Decision Log View

#### Screen 5: Strategic Decisions
**Purpose:** Track all major decisions with rationale

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo] BeBrahma              Decisions               [Profile] [Settings] │
├────────┬────────────────────────────────────────────────────────────────────┤
│        │                                                                    │
│  📊    │  Timeline View                              [+ Log New Decision]  │
│  NBA   │                                                                    │
│  ───── │  January 2026                                                     │
│        │  ──────────────────────────────────────────────────────────────   │
│  📈    │  ┌────────────────────────────────────────────────────────────┐  │
│  Context│  │ ⚖️ Pricing Strategy                         Jan 2, 2026   │  │
│  ───── │  │                                                             │  │
│        │  │ Decision: Start with $49/mo per user                       │  │
│  📝    │  │                                                             │  │
│  Evidence│  │ Options Considered:                                        │  │
│  ───── │  │ • $29/mo (rejected - too low for value delivered)          │  │
│        │  │ • $49/mo (chosen - aligns with competitor pricing)         │  │
│  ⚖️    │  │ • $99/mo (rejected - too high for early stage)             │  │
│  Decisions│ │                                                             │  │
│  ───── │  │ Rationale:                                                  │  │
│        │  │ Based on competitor analysis and customer interviews,      │  │
│  🔗    │  │ $49/mo positions us competitively while allowing for       │  │
│  Integrations│ discounting during beta...                                │  │
│  ───── │  │                                                             │  │
│        │  │ Related Evidence: 3 items                                   │  │
│  ⚙️    │  │ Impact: High                                                │  │
│  Settings│  └────────────────────────────────────────────────────────────┘  │
│        │                                                                    │
│        │  December 2025                                                    │
│        │  ──────────────────────────────────────────────────────────────   │
│        │  ┌────────────────────────────────────────────────────────────┐  │
│        │  │ ⚖️ Tech Stack Selection                    Dec 15, 2025   │  │
│        │  │                                                             │  │
│        │  │ Decision: React Native for mobile, FastAPI for backend    │  │
│        │  │ [View Details...]                                          │  │
│        │  └────────────────────────────────────────────────────────────┘  │
│        │                                                                    │
└────────┴────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Timeline view (reverse chronological)
- Expandable decision cards
- Options considered
- Chosen option highlighted
- Full rationale
- Related evidence links
- Impact indicators

---

### 3.6 Full Rationale Modal

#### Screen 6: Deep Dive Analysis
**Purpose:** In-depth view of NBA recommendation reasoning

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Why "Conduct 5 customer interviews"                              [✕ Close]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📊 Score Breakdown                                                         │
│                                                                             │
│  ┌───────────────────────────────────┐  ┌───────────────────────────────┐ │
│  │ Objective Impact          8.5/10  │  │ Why this score?               │ │
│  │ ████████████████░░░░              │  │                               │ │
│  │                                   │  │ This task directly addresses  │ │
│  │                                   │  │ your primary objective        │ │
│  │                                   │  │ "Problem-Solution Fit" by...  │ │
│  └───────────────────────────────────┘  └───────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────┐  ┌───────────────────────────────┐ │
│  │ Time Sensitivity          7.2/10  │  │ Why this score?               │ │
│  │ ██████████████░░░░░░              │  │                               │ │
│  │                                   │  │ While important, this can be  │ │
│  │                                   │  │ done over the next 2 weeks... │ │
│  └───────────────────────────────────┘  └───────────────────────────────┘ │
│                                                                             │
│  ... (3 more dimensions)                                                   │
│                                                                             │
│  💡 Full Reasoning                                                          │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Your primary objective is "Problem-Solution Fit". You currently have 3    │
│  critical unknowns:                                                         │
│                                                                             │
│  1. What's the #1 pain point?                                              │
│  2. How severe is this pain?                                               │
│  3. What are they using today?                                             │
│                                                                             │
│  Customer interviews are the fastest and most reliable way to resolve      │
│  these unknowns. This task has:                                            │
│                                                                             │
│  • High feasibility - you can start today by reaching out to your network │
│  • Direct impact - each interview resolves multiple unknowns               │
│  • No blockers - doesn't depend on other tasks                             │
│                                                                             │
│  Based on your context, I applied the Problem-Solution Fit framework...    │
│                                                                             │
│  🎯 Frameworks Applied                                                      │
│  • Problem-Solution Fit Framework                                          │
│  • Critical Unknown Mapping                                                │
│                                                                             │
│  ✅ Confidence: 82%                                                         │
│                                                                             │
│  Context Completeness:  ████████░░  80%                                    │
│  Historical Accuracy:   ███████░░░  70%                                    │
│  Data Quality:          ████████░░  85%                                    │
│  Recency:               █████████░  95%                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Modal overlay (darkened background)
- Two-column layout for score explanations
- Expandable score dimensions
- Full rationale text
- Framework details
- Confidence breakdown
- Close button

---

## 4. Component Library

### 4.1 Design Tokens (Same as Mobile)

**Colors:** (Identical to mobile)
- Primary Blue: #2563EB
- Success Green: #10B981
- Gray scale
- Etc.

**Typography:**
```
Font Family: Inter

Desktop Sizes:
- Headline 1: 36px / 700 weight
- Headline 2: 28px / 700 weight
- Headline 3: 22px / 600 weight
- Body Large: 18px / 400 weight
- Body: 16px / 400 weight
- Body Small: 14px / 400 weight
- Caption: 12px / 400 weight
```

**Spacing:**
```
Same as mobile, plus:
- 4xl: 80px
- 5xl: 120px
```

---

### 4.2 Desktop-Specific Components

#### Sidebar Navigation

**Specs:**
- Width: 240px (expanded), 60px (collapsed)
- Background: White
- Border right: 1px Gray 200
- Fixed position

**Items:**
- Icon + Label (expanded)
- Icon only (collapsed)
- Active state: Primary Blue background
- Hover: Gray 50 background

---

#### Dashboard Card

**Specs:**
- Background: White
- Border: 1px Gray 200
- Border radius: 12px
- Padding: 24px
- Shadow: sm
- Min-height: 200px

---

#### Data Table

**Specs:**
- Header: Gray 50 background, 600 weight
- Rows: White background, 1px bottom border
- Hover: Gray 50 background
- Padding: 12px 16px
- Font: 14px

---

#### Modal Overlay

**Specs:**
- Background: rgba(0, 0, 0, 0.5)
- Modal: White, centered
- Max-width: 900px
- Border radius: 16px
- Padding: 32px
- Shadow: xl

---

#### Split Panel

**Specs:**
- Two columns: 60% / 40% or 50% / 50%
- Resizable divider (future)
- Gap: 24px

---

## 5. Interaction Patterns

### 5.1 Keyboard Shortcuts

**Global:**
- `Cmd/Ctrl + K` - Command palette (future)
- `Cmd/Ctrl + B` - Toggle sidebar
- `Cmd/Ctrl + N` - New task
- `Cmd/Ctrl + /` - Focus search
- `Esc` - Close modal/panel

**Navigation:**
- `Cmd/Ctrl + 1` - NBA Dashboard
- `Cmd/Ctrl + 2` - Context View
- `Cmd/Ctrl + 3` - Evidence
- `Cmd/Ctrl + 4` - Decisions

**Tasks:**
- `Cmd/Ctrl + Enter` - Accept recommendation
- `Cmd/Ctrl + S` - Skip recommendation

---

### 5.2 Hover Interactions

**Cards:**
- Hover: Shadow md → lg
- Cursor: pointer

**Buttons:**
- Hover: Darken 10%
- Cursor: pointer

**Task Items:**
- Hover: Show quick actions (edit, delete)
- Background: Gray 50

**Tooltips:**
- Delay: 500ms
- Position: Above element
- Max-width: 200px

---

### 5.3 Drag and Drop (Future)

**Task Reordering:**
- Drag handle on hover
- Ghost preview while dragging
- Drop zones highlighted

---

### 5.4 Loading States

**Page Load:**
- Skeleton screens for main content
- Animated shimmer effect
- Preserve layout

**Action Loading:**
- Button: Spinner inside button
- Disable interactions
- Show loading text

---

### 5.5 Empty States

**No Recommendations:**
```
┌────────────────────────────────┐
│                                │
│         🎯                     │
│                                │
│    No recommendations yet      │
│                                │
│    Add some context to get     │
│    your first NBA.             │
│                                │
│    [+ Add Update]              │
│                                │
└────────────────────────────────┘
```

**No Tasks:**
```
┌────────────────────────────────┐
│                                │
│         ✓                      │
│                                │
│    No tasks yet                │
│                                │
│    Ask for an NBA to get       │
│    recommended tasks.          │
│                                │
│    [Ask NBA]                   │
│                                │
└────────────────────────────────┘
```

---

## 6. Responsive Behavior

### 6.1 Breakpoints

**Desktop Large (>1440px):**
- Three-column layout
- Sidebar + Main + Right panel
- Maximum width: 1920px

**Desktop Medium (1024px - 1440px):**
- Three-column layout
- Narrower right panel (280px)

**Tablet (768px - 1024px):**
- Two-column layout
- Sidebar + Main (right panel collapses into main)
- Collapsible sidebar by default

**Mobile (<768px):**
- Use mobile UX design
- Stack layout
- Bottom tabs instead of sidebar

---

### 6.2 Layout Adjustments

**Desktop Large:**
```
[Sidebar 240px] [Main 60%] [Right Panel 40%]
```

**Desktop Medium:**
```
[Sidebar 240px] [Main 65%] [Right Panel 35%]
```

**Tablet:**
```
[Sidebar 60px collapsed] [Main 100%]
[Expandable overlay sidebar on click]
```

---

## 7. Dark Mode

### 7.1 Color Adjustments

**Same as mobile, plus:**

**Sidebar:**
- Background: Gray 900
- Border: Gray 800
- Active item: Gray 800

**Cards:**
- Background: Gray 800
- Border: Gray 700

**Tables:**
- Header: Gray 800
- Row: Gray 900
- Hover: Gray 800

---

## 8. Accessibility

### 8.1 WCAG 2.1 AA Compliance

**Same as mobile, plus:**

**Keyboard Navigation:**
- All interactive elements keyboard accessible
- Focus visible (2px Primary Blue outline)
- Tab order logical (left to right, top to bottom)
- Skip links for main content

**Screen Reader:**
- Landmark regions (nav, main, aside)
- Heading hierarchy (h1 → h2 → h3)
- ARIA labels for icons
- Live regions for dynamic updates

---

## 9. Performance Targets

**Target Metrics:**

1. **Initial Load:** <1.5s to interactive
2. **NBA Computation:** <3s to result
3. **Page Transitions:** <200ms
4. **Search:** <100ms (client-side filtering)
5. **Data Refresh:** <500ms

**Optimization:**
- Code splitting by route
- Lazy load right panel content
- Virtual scrolling for long lists
- Optimistic UI updates
- Service worker for offline support

---

## 10. Desktop-Specific Features

### 10.1 Multi-Select

**Tasks/Evidence:**
- Shift+Click for range selection
- Cmd/Ctrl+Click for individual selection
- Bulk actions toolbar appears

---

### 10.2 Quick Actions Menu

**Right-click context menu:**
- Edit
- Delete
- Duplicate
- Move to...
- Share

---

### 10.3 Command Palette (Future)

**Cmd/Ctrl + K:**
```
┌────────────────────────────────┐
│  🔍 Search or run command...   │
├────────────────────────────────┤
│  Quick Actions                 │
│  → Ask NBA                     │
│  → Add Update                  │
│  → New Task                    │
│  → New Unknown                 │
│                                │
│  Navigation                    │
│  → Go to Dashboard             │
│  → Go to Context               │
│  → Go to Evidence              │
└────────────────────────────────┘
```

---

### 10.4 Notifications (Browser)

**Desktop notifications:**
- New NBA recommendation available
- Task due soon
- Override pattern detected
- Permission requested on first use

---

## 11. Cross-Platform Sync

### 11.1 Real-Time Updates

**WebSocket connection:**
- Live sync between devices
- Show indicator when updating
- Conflict resolution (last write wins)

**Visual feedback:**
```
"Updated 2 seconds ago" (bottom of screen)
[Sync icon animation when saving]
```

---

### 11.2 Handoff (Future)

**Mobile → Desktop:**
- Continue reading rationale
- Pick up where you left off
- Deep links to specific views

**Desktop → Mobile:**
- Send task to mobile
- Share NBA recommendation
- QR code for quick handoff

---

## 12. Onboarding Differences from Mobile

### 12.1 First-Time User

**Desktop Flow:**
1. Welcome screen (full page, centered)
2. ONE question (larger text input, voice secondary)
3. Processing (show progress)
4. Dashboard with tutorial overlay
5. Highlight key areas (sidebar, NBA card, rationale)

**Tutorial Overlay:**
```
┌─────────────────────────────────────────┐
│  👋 Welcome to BeBrahma                 │
│                                         │
│  Here's your first recommendation:     │
│  → [Arrow pointing to NBA card]        │
│                                         │
│  See why I recommended it:             │
│  → [Arrow pointing to right panel]     │
│                                         │
│  Add context anytime:                  │
│  → [Arrow pointing to sidebar]         │
│                                         │
│  [Got it →]                            │
└─────────────────────────────────────────┘
```

---

## 13. Analytics & Insights Panel (Future)

### 13.1 Dashboard Widget

**Right panel addition:**
```
📊 Your Progress

This Week:
• 3 recommendations accepted
• 2 tasks completed
• 5 updates added
• 85% recommendation accuracy

Insights:
• You prefer customer-facing tasks
• Morning is your most productive time
• Your ICP is becoming clearer
```

---

## 14. Integration Screens

### 14.1 Integrations Dashboard

**Purpose:** Connect external tools

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Integrations                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Connected (2)                                                  │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │ 📅 Google Calendar   │  │ 📝 Notion             │           │
│  │ Connected            │  │ Connected             │           │
│  │ [Settings]           │  │ [Settings]            │           │
│  └──────────────────────┘  └──────────────────────┘           │
│                                                                 │
│  Available (5)                                                  │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │ 💬 Slack             │  │ 📊 Linear             │           │
│  │ [Connect]            │  │ [Connect]             │           │
│  └──────────────────────┘  └──────────────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 15. Settings Screen

### 15.1 Settings Layout

**Tabs:**
- Account
- Preferences
- Notifications
- Advanced
- Billing

**Account Tab:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Account Settings                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Profile                                                        │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ [Avatar]  Jane Founder                                 │   │
│  │          jane@startup.com                              │   │
│  │          [Edit Profile]                                │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Working Hours                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Timezone: PST (GMT-8)                                  │   │
│  │ Start: [9:00 AM ▼]  End: [6:00 PM ▼]                  │   │
│  │ □ Don't recommend tasks outside these hours            │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Data & Privacy                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ [Export All Data]                                      │   │
│  │ [Delete Account]                                       │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Advanced Tab:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Advanced Settings                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  NBA Scoring Weights                                            │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Objective Impact      [══════════] 30%                 │   │
│  │ Time Sensitivity      [═══════  ] 25%                  │   │
│  │ Evidence Gap          [═══════  ] 25%                  │   │
│  │ Unblocks              [═══      ] 10%                  │   │
│  │ Feasibility           [═══      ] 10%                  │   │
│  │                                                        │   │
│  │ [Reset to Defaults]                                    │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Framework Preferences                                          │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ ☑ Problem-Solution Fit                                 │   │
│  │ ☑ ICP + Wedge                                          │   │
│  │ ☑ Critical Unknown Mapping                             │   │
│  │ ☐ Custom Framework 1 (coming soon)                     │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 16. Handoff Notes for Developers

### 16.1 Tech Stack Recommendation

**Frontend:**
- React 18+
- TypeScript
- Vite for build
- TailwindCSS for styling
- React Query for data fetching
- Zustand for state management

**Component Structure:**
```
/src
  /layouts
    DashboardLayout.tsx
    OnboardingLayout.tsx
  /pages
    Dashboard.tsx
    ContextView.tsx
    EvidenceView.tsx
    DecisionLog.tsx
    Integrations.tsx
    Settings.tsx
  /components
    /sidebar
      Sidebar.tsx
      NavItem.tsx
    /nba
      RecommendationCard.tsx
      ScoreBreakdown.tsx
      AlternativesList.tsx
      RationalePanel.tsx
    /context
      ObjectiveCard.tsx
      TaskTable.tsx
      UnknownList.tsx
    /ui
      Button.tsx
      Card.tsx
      Modal.tsx
      Table.tsx
      Input.tsx
  /hooks
    useNBA.ts
    useContext.ts
    useKeyboard.ts
  /utils
    api.ts
    shortcuts.ts
```

---

### 16.2 State Management

**Server State (React Query):**
- NBA sessions
- Business context
- Evidence
- Decisions

**Client State (Zustand):**
- Sidebar collapsed/expanded
- Active modal
- Selected items
- Filter states

---

### 16.3 Routing

**Routes:**
```
/ → Dashboard (NBA)
/context → Context View
/evidence → Evidence Library
/decisions → Decision Log
/integrations → Integrations
/settings → Settings
/onboarding → Onboarding (first-time only)
```

---

## 17. Future Enhancements

**Phase 2:**
1. Command palette (Cmd+K)
2. Multi-select bulk actions
3. Drag-and-drop reordering
4. Real-time collaboration
5. Advanced filtering
6. Custom views
7. Export to PDF
8. Calendar integration
9. Browser notifications
10. Offline support

**Phase 3:**
1. Analytics dashboard
2. Team workspaces
3. Custom frameworks
4. API access
5. Webhooks
6. Advanced reporting

---

## 18. Design QA Checklist

- [ ] All screens designed at 1440px width
- [ ] Responsive behavior defined for 768px, 1024px, 1440px
- [ ] Dark mode for all screens
- [ ] All keyboard shortcuts documented
- [ ] Focus states for all interactive elements
- [ ] Loading states for all async actions
- [ ] Error states for all failure scenarios
- [ ] Empty states for all data collections
- [ ] Hover states for all clickable elements
- [ ] ARIA labels for accessibility
- [ ] Color contrast checked (WCAG AA)

---

## Appendix: Mobile vs. Web Comparison

| Feature | Mobile | Web |
|---------|--------|-----|
| **Primary Input** | Voice | Keyboard/Mouse |
| **Navigation** | Bottom tabs | Sidebar |
| **Layout** | Single column | Multi-column |
| **Screen Size** | 375-428px | 1024-1920px |
| **Information Density** | Low (focus) | High (overview) |
| **Gestures** | Swipe, tap | Click, drag, hover |
| **Shortcuts** | None | Extensive |
| **Use Case** | On-the-go, quick updates | Deep work, analysis |
| **Session Length** | 2-5 minutes | 15-30 minutes |

**Design Philosophy:**
- **Mobile:** Quick, focused, voice-first
- **Web:** Comprehensive, analytical, keyboard-first

---

**End of Web App UX Design Document**
