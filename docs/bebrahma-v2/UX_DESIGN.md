# BeBrahma v0.3 - UX Design Document

**Version:** 0.3.0
**Last Updated:** January 2, 2026
**Status:** Design Phase

---

## 1. Design Philosophy

### 1.1 Core Principles

1. **Radical Simplicity**
   - ONE question onboarding
   - ONE recommendation at a time
   - Zero cognitive load
   - No empty states or overwhelming dashboards

2. **Mobile-First, Voice-Native**
   - Designed for thumb reach
   - Voice input as primary interaction
   - Text as fallback
   - Conversational, not transactional

3. **Trust Through Transparency**
   - Always show WHY (rationale)
   - Expose confidence levels
   - Show alternatives
   - Make AI reasoning visible

4. **Progressive Disclosure**
   - Start minimal, grow with user
   - Learn from behavior, not forms
   - Context builds over time
   - No overwhelming setup wizards

---

## 2. User Flow Architecture

### 2.1 Primary User Journey

```
[First Open]
    ↓
[Onboarding: "What are you building?"]
    ↓
[NBA Recommendation #1]
    ↓
[User Action: Accept/Modify/Skip]
    ↓
[Context Building Loop]
    ├─ Add updates (voice/text)
    ├─ Accept/reject recommendations
    └─ System learns preferences
    ↓
[Ongoing NBA Sessions]
```

### 2.2 Secondary Flows

- **Context Review:** View objectives, tasks, unknowns
- **Evidence Adding:** Capture learnings from customer interviews, metrics, etc.
- **Decision Logging:** Record strategic decisions
- **Override Pattern:** Reject recommendation → System asks why → Learns

---

## 3. Screen Inventory

### 3.1 Onboarding Screens

#### Screen 1: Welcome
**Purpose:** Brand introduction, set expectations

**Layout:**
```
┌─────────────────────────┐
│                         │
│    [BeBrahma Logo]      │
│                         │
│   Your AI Co-Founder    │
│                         │
│  Always knows what to   │
│  do next (and why)      │
│                         │
│                         │
│   [Get Started] ───→    │
│                         │
└─────────────────────────┘
```

**Components:**
- Logo (centered, top third)
- Tagline (center)
- Value proposition (1-2 lines)
- Primary CTA button

**Interaction:**
- Tap "Get Started" → Screen 2

---

#### Screen 2: The ONE Question
**Purpose:** Progressive profiling - capture minimum viable context

**Layout:**
```
┌─────────────────────────┐
│  [Back]                 │
│                         │
│  🎯 One Question        │
│                         │
│  What are you building? │
│                         │
│  ┌───────────────────┐  │
│  │                   │  │
│  │ [Voice Input Area]│  │
│  │       🎤          │  │
│  │                   │  │
│  └───────────────────┘  │
│                         │
│  Or type your answer... │
│  ┌───────────────────┐  │
│  │                   │  │
│  └───────────────────┘  │
│                         │
│      [Continue] ───→    │
│                         │
└─────────────────────────┘
```

**Components:**
- Progress indicator (implicit: "1 of 1")
- Question headline
- Voice input button (primary)
- Text fallback input (secondary)
- Continue CTA

**Interaction:**
- Tap mic → Voice recording → Transcription
- Or type text → Continue
- Backend: POST /api/v1/onboarding/initial

**States:**
- Default: Mic ready
- Recording: Pulsing animation
- Processing: Spinner
- Transcribed: Show text, allow edit

---

### 3.2 Main App Screens

#### Screen 3: NBA Recommendation (Primary View)
**Purpose:** Display single recommended action with full context

**Layout:**
```
┌─────────────────────────┐
│  [☰ Menu]    [🔔]       │
│                         │
│  ⭐ Recommended         │
│                         │
│  ┌───────────────────┐  │
│  │                   │  │
│  │ Conduct 5 customer│  │
│  │ interviews with   │  │
│  │ target persona    │  │
│  │                   │  │
│  │ 📊 Score: 8.7/10  │  │
│  │ ✅ Confidence: 82%│  │
│  └───────────────────┘  │
│                         │
│  💡 Why This Matters    │
│  ┌───────────────────┐  │
│  │ You have 3 critical│ │
│  │ unknowns about    │  │
│  │ customer pain...  │  │
│  │                   │  │
│  │ [Read Full] ───→  │  │
│  └───────────────────┘  │
│                         │
│  🔀 Alternatives (2)    │
│  • Survey 50 users    │  │
│  • Build landing page │  │
│                         │
│  [Start Now]   [Skip]   │
│  [Modify]      [Update] │
│                         │
└─────────────────────────┘
```

**Components:**

1. **Header**
   - Menu icon (left)
   - Notification bell (right)
   - No title (clean)

2. **Recommendation Card**
   - Badge: "Recommended"
   - Task title (large, readable)
   - Score visualization (number + visual bar)
   - Confidence indicator
   - Expandable details

3. **Rationale Section**
   - "Why This Matters" headline
   - Summary (2-3 lines)
   - Expand to full rationale
   - Framework tags

4. **Alternatives List**
   - Collapsed: Show count only
   - Expanded: 2-3 alternatives
   - Tap to swap with main recommendation

5. **Action Buttons**
   - **Start Now** (primary): Accept recommendation
   - **Skip**: Defer to later
   - **Modify**: Edit task details
   - **Update**: Add context/ask question

**Interactions:**

- **Start Now** →
  - POST /api/v1/nba/accept
  - Transition to task details/tracking
  - Option to add to calendar

- **Skip** →
  - POST /api/v1/nba/defer
  - Show next recommendation or context screen

- **Modify** →
  - Open task editor modal
  - Allow editing title, description, due date
  - POST /api/v1/context/tasks

- **Update** →
  - Voice/text input modal
  - "What's changed?" or "New information?"
  - POST /api/v1/context/signals
  - Refresh NBA

- **Tap Alternative** →
  - Swap alternative into main recommendation
  - Track as override
  - POST /api/v1/overrides

- **Read Full Rationale** →
  - Navigate to Screen 4

**States:**

- Loading: Skeleton UI
- Success: Full recommendation
- Error: Retry UI
- No Recommendation: "Add context" prompt

---

#### Screen 4: Full Rationale
**Purpose:** Explain AI reasoning in detail

**Layout:**
```
┌─────────────────────────┐
│  [← Back]               │
│                         │
│  Why "Conduct 5         │
│  customer interviews"   │
│                         │
│  ┌───────────────────┐  │
│  │ 📊 Breakdown      │  │
│  │                   │  │
│  │ Objective Impact  │  │
│  │ ████████░░ 8.5    │  │
│  │                   │  │
│  │ Time Sensitivity  │  │
│  │ ███████░░░ 7.2    │  │
│  │                   │  │
│  │ Evidence Gap      │  │
│  │ █████████░ 9.1    │  │
│  │                   │  │
│  │ Unblocks          │  │
│  │ ████████░░ 8.0    │  │
│  │                   │  │
│  │ Feasibility       │  │
│  │ ████████░░ 8.3    │  │
│  └───────────────────┘  │
│                         │
│  📝 Reasoning           │
│  ┌───────────────────┐  │
│  │ Your primary      │  │
│  │ objective is      │  │
│  │ "Problem-Solution │  │
│  │ Fit". You have 3  │  │
│  │ critical unknowns │  │
│  │ about customer    │  │
│  │ pain points...    │  │
│  │                   │  │
│  │ Customer interviews│ │
│  │ directly address  │  │
│  │ these unknowns... │  │
│  └───────────────────┘  │
│                         │
│  🎯 Frameworks Applied  │
│  • Problem-Solution Fit│  │
│  • Critical Unknown    │  │
│                         │
│  ℹ️ Confidence: 82%    │
│  Based on: Complete   │  │
│  context, 15 signals, │  │
│  historical accuracy  │  │
│                         │
└─────────────────────────┘
```

**Components:**

1. **Header**
   - Back navigation
   - Task title

2. **Score Breakdown**
   - 5 dimensions
   - Visual bars
   - Numeric scores
   - Tap for explanation

3. **AI Reasoning**
   - Full rationale text
   - Framework references
   - Evidence citations

4. **Metadata**
   - Frameworks used
   - Confidence score
   - Confidence factors

**Interactions:**

- Tap dimension bar → Tooltip explaining that dimension
- Scroll to read full reasoning
- Back → Return to Screen 3

---

#### Screen 5: Context View
**Purpose:** Review business state graph

**Layout:**
```
┌─────────────────────────┐
│  [← NBA]     Context    │
│                         │
│  ┌───────────────────┐  │
│  │ 📊 Summary        │  │
│  │                   │  │
│  │ 2 Objectives      │  │
│  │ 5 Active Tasks    │  │
│  │ 3 Open Unknowns   │  │
│  │ 15 Recent Signals │  │
│  └───────────────────┘  │
│                         │
│  🎯 Objectives          │
│  ┌───────────────────┐  │
│  │ Problem-Solution  │  │
│  │ Fit               │  │
│  │ ────────── 65%    │  │
│  │ 3 tasks, 2 unknowns│ │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ ICP + Wedge       │  │
│  │ ────────── 40%    │  │
│  │ 2 tasks, 1 unknown │  │
│  └───────────────────┘  │
│                         │
│  ✓ Tasks (5)   [+New]   │
│  • Interview customer #3│ │
│  • Synthesize learnings│  │
│  • Build prototype v1  │  │
│  [Show All] ───→        │
│                         │
│  ❓ Unknowns (3)  [+New]│
│  • What's the #1 pain? │  │
│  • Will they pay $49/mo?│ │
│  [Show All] ───→        │
│                         │
│  [Ask NBA] ───→         │
│                         │
└─────────────────────────┘
```

**Components:**

1. **Summary Card**
   - Count of each entity type
   - Visual metrics

2. **Objectives List**
   - Title
   - Progress bar
   - Task/unknown counts
   - Tap to expand

3. **Tasks Section**
   - Top 3 tasks
   - "Show All" expander
   - [+New] quick add

4. **Unknowns Section**
   - Top 3 unknowns
   - "Show All" expander
   - [+New] quick add

5. **NBA CTA**
   - Prominent "Ask NBA" button

**Interactions:**

- Tap objective → Objective detail screen
- Tap task → Task detail screen
- Tap unknown → Unknown detail screen
- [+New] → Quick add modal
- [Ask NBA] → POST /api/v1/nba/ask → Screen 3

---

#### Screen 6: Voice Update Modal
**Purpose:** Capture updates/signals via voice or text

**Layout:**
```
┌─────────────────────────┐
│  [✕ Close]              │
│                         │
│  💬 What's New?         │
│                         │
│  Tell me anything:      │
│  • Customer feedback    │
│  • New learnings        │
│  • Blockers/challenges  │
│  • Progress updates     │
│                         │
│  ┌───────────────────┐  │
│  │                   │  │
│  │       🎤          │  │
│  │                   │  │
│  │   Tap to speak    │  │
│  │                   │  │
│  └───────────────────┘  │
│                         │
│  Or type here...        │
│  ┌───────────────────┐  │
│  │                   │  │
│  └───────────────────┘  │
│                         │
│     [Submit] ───→       │
│                         │
└─────────────────────────┘
```

**Components:**

1. **Header**
   - Close button
   - Title

2. **Prompt Text**
   - Examples of what to share
   - Conversational tone

3. **Voice Input**
   - Large mic button
   - Recording animation
   - Transcription display

4. **Text Input**
   - Fallback textarea
   - Auto-resize

5. **Submit Button**

**Interactions:**

- Record voice → Transcribe → Submit
- Or type text → Submit
- Backend: POST /api/v1/context/signals
- On success: Show toast "Update captured!"
- Trigger NBA recomputation in background

**States:**

- Default
- Recording
- Processing
- Transcribed (editable)
- Submitting
- Success

---

#### Screen 7: Menu/Navigation
**Purpose:** Access all app sections

**Layout:**
```
┌─────────────────────────┐
│  [✕ Close]              │
│                         │
│  [Profile Avatar]       │
│  Jane Founder           │
│  jane@startup.com       │
│                         │
│  ────────────────────   │
│                         │
│  🎯 NBA Recommendations │
│  📊 Context & State     │
│  📝 Evidence & Learnings│
│  ⚖️  Decisions          │
│  📈 Integrations        │
│  ⚙️  Settings           │
│                         │
│  ────────────────────   │
│                         │
│  💡 Feedback            │
│  📚 Help & Docs         │
│  🚪 Sign Out            │
│                         │
└─────────────────────────┘
```

**Components:**

1. **User Profile**
   - Avatar
   - Name
   - Email

2. **Primary Navigation**
   - NBA Recommendations
   - Context & State
   - Evidence & Learnings
   - Decisions
   - Integrations
   - Settings

3. **Secondary Actions**
   - Feedback
   - Help
   - Sign Out

**Interactions:**

- Tap any item → Navigate to screen
- Tap outside → Close menu

---

### 3.3 Additional Screens

#### Screen 8: Task Detail
- Task title, description
- Status (pending/in_progress/completed)
- Priority, due date
- Related objective
- Blockers/dependencies
- Edit/Delete actions

#### Screen 9: Objective Detail
- Objective title, type
- Progress metrics
- Related tasks (list)
- Related unknowns (list)
- Evidence count
- Edit/Archive actions

#### Screen 10: Unknown Detail
- Question
- Category, importance
- Status (open/investigating/resolved)
- Related evidence
- Resolution notes (if resolved)
- Edit/Resolve actions

#### Screen 11: Evidence List
- Filter by type (interview, metric, research)
- Search
- Add new evidence
- Tap → Evidence detail

#### Screen 12: Decision Log
- Chronological list
- Decision title, date
- Options considered
- Chosen option + rationale
- Add new decision
- Tap → Decision detail

#### Screen 13: Settings
- Account settings
- Notification preferences
- Scoring weights (advanced)
- Framework preferences
- Working hours
- Timezone
- Data export
- Privacy settings

---

## 4. Component Library

### 4.1 Design Tokens

**Colors:**

```
Primary Brand:
- Primary Blue: #2563EB
- Primary Blue Dark: #1E40AF
- Primary Blue Light: #60A5FA

Semantic:
- Success Green: #10B981
- Warning Yellow: #F59E0B
- Error Red: #EF4444
- Info Blue: #3B82F6

Neutrals:
- Gray 50: #F9FAFB
- Gray 100: #F3F4F6
- Gray 200: #E5E7EB
- Gray 300: #D1D5DB
- Gray 400: #9CA3AF
- Gray 500: #6B7280
- Gray 600: #4B5563
- Gray 700: #374151
- Gray 800: #1F2937
- Gray 900: #111827

Background:
- White: #FFFFFF
- Off-White: #F9FAFB
- Dark Mode BG: #111827
- Dark Mode Surface: #1F2937
```

**Typography:**

```
Font Family: Inter (sans-serif)

Sizes:
- Headline 1: 32px / 700 weight / -0.02em
- Headline 2: 24px / 700 weight / -0.01em
- Headline 3: 20px / 600 weight / normal
- Body Large: 18px / 400 weight / normal
- Body: 16px / 400 weight / normal
- Body Small: 14px / 400 weight / normal
- Caption: 12px / 400 weight / normal

Line Heights:
- Headlines: 1.2
- Body: 1.5
- Captions: 1.4
```

**Spacing:**

```
Base unit: 4px

Scale:
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

Component Padding:
- Card: 16px
- Screen: 20px
- Modal: 24px
```

**Border Radius:**

```
- sm: 4px
- md: 8px
- lg: 12px
- xl: 16px
- full: 9999px (pill)
```

**Shadows:**

```
- sm: 0 1px 2px rgba(0, 0, 0, 0.05)
- md: 0 4px 6px rgba(0, 0, 0, 0.1)
- lg: 0 10px 15px rgba(0, 0, 0, 0.1)
- xl: 0 20px 25px rgba(0, 0, 0, 0.15)
```

---

### 4.2 Core Components

#### Button

**Variants:**

1. **Primary**
   - Background: Primary Blue
   - Text: White
   - Height: 48px (mobile)
   - Border radius: 8px
   - Font: 16px / 600 weight

2. **Secondary**
   - Background: White
   - Border: 1px Gray 300
   - Text: Gray 900
   - Height: 48px
   - Border radius: 8px

3. **Ghost**
   - Background: Transparent
   - Text: Primary Blue
   - No border
   - Height: 48px

**States:**
- Default
- Hover (darken 10%)
- Active (darken 20%)
- Disabled (opacity 40%)
- Loading (spinner)

---

#### Card

**Default:**
- Background: White
- Border: 1px Gray 200
- Border radius: 12px
- Padding: 16px
- Shadow: sm

**Variants:**
- **Elevated**: Shadow md
- **Highlighted**: Border Primary Blue 2px
- **Error**: Border Error Red

---

#### Input Field

**Text Input:**
- Height: 48px
- Padding: 12px 16px
- Border: 1px Gray 300
- Border radius: 8px
- Font: 16px
- Focus: Border Primary Blue, Shadow md

**Voice Input Button:**
- Circular
- Diameter: 64px
- Background: Primary Blue
- Icon: Mic (white)
- Pulsing animation when recording

---

#### Score Bar

**Visual:**
```
Label: "Objective Impact"
[████████░░] 8.5/10
```

**Components:**
- Label (Body Small, Gray 600)
- Progress bar (height 8px, Primary Blue fill)
- Score text (Body, Gray 900)

---

#### Confidence Badge

**Visual:**
```
✅ 82% Confidence
```

**Components:**
- Icon (checkmark or warning)
- Percentage
- Background color based on level:
  - High (≥70%): Success Green
  - Medium (50-69%): Warning Yellow
  - Low (<50%): Error Red

---

#### Rationale Card

**Components:**
- "Why This Matters" headline
- Summary text (2-3 lines)
- "Read Full" CTA
- Expandable/collapsible

---

#### Alternative List Item

**Visual:**
```
• Survey 50 target users
  Score: 8.2/10
```

**Components:**
- Bullet point
- Task title
- Score (optional)
- Tap to swap

---

## 5. Interaction Patterns

### 5.1 Voice Input

**Flow:**
1. Tap mic button
2. Request microphone permission (first time)
3. Start recording → Pulsing animation
4. Tap again to stop OR auto-stop at 60s
5. Send audio to backend transcription
6. Display transcribed text
7. Allow editing
8. Submit

**Error Handling:**
- No permission → Show alert, deep link to settings
- Transcription failure → Fallback to text input
- Network error → Retry logic

---

### 5.2 Pull to Refresh

**Screens with PTR:**
- NBA Recommendation (Screen 3)
- Context View (Screen 5)

**Behavior:**
- Pull down from top
- Show loading spinner
- Refresh NBA recommendation
- Haptic feedback on refresh

---

### 5.3 Swipe Gestures

**Task List Items:**
- Swipe right → Mark complete
- Swipe left → Delete/archive

**Alternative Cards:**
- Swipe up → Promote to main recommendation

---

### 5.4 Loading States

**NBA Recommendation Loading:**
```
┌─────────────────────────┐
│  ⭐ Computing...        │
│                         │
│  ┌───────────────────┐  │
│  │                   │  │
│  │   [Skeleton UI]   │  │
│  │                   │  │
│  │   ─────────       │  │
│  │   ─────           │  │
│  │   ───────────     │  │
│  │                   │  │
│  └───────────────────┘  │
│                         │
│  Analyzing your context│  │
│  and selecting the best│  │
│  next action...        │  │
│                         │
└─────────────────────────┘
```

**Progress Messages:**
- "Analyzing your context..."
- "Selecting frameworks..."
- "Scoring candidates..."
- "Generating recommendation..."

---

### 5.5 Empty States

**No Objectives:**
```
┌─────────────────────────┐
│                         │
│      🎯                 │
│                         │
│  No objectives yet      │
│                         │
│  Tell me what you're    │
│  working on to get      │
│  started.               │
│                         │
│  [Add Update] ───→      │
│                         │
└─────────────────────────┘
```

**No Tasks:**
```
┌─────────────────────────┐
│                         │
│      ✓                  │
│                         │
│  No active tasks        │
│                         │
│  Add some context and   │
│  I'll recommend what    │
│  to do next.            │
│                         │
│  [Ask NBA] ───→         │
│                         │
└─────────────────────────┘
```

---

### 5.6 Error States

**NBA Computation Timeout:**
```
┌─────────────────────────┐
│                         │
│      ⚠️                 │
│                         │
│  Couldn't generate      │
│  recommendation         │
│                         │
│  This is taking longer  │
│  than expected. Please  │
│  try again.             │
│                         │
│  [Retry]   [Add Context]│
│                         │
└─────────────────────────┘
```

**Network Error:**
- Toast notification
- "No internet connection"
- Auto-retry when back online

---

## 6. Navigation Architecture

### 6.1 App Structure

```
┌─ Onboarding Flow ────────┐
│  Screen 1: Welcome       │
│  Screen 2: One Question  │
└──────────────────────────┘
           ↓
┌─ Main App ───────────────┐
│                          │
│  Tab 1: NBA (Home)       │──→ Screen 3, 4
│  Tab 2: Context          │──→ Screen 5, 8, 9, 10
│  Tab 3: Evidence         │──→ Screen 11
│  Tab 4: Decisions        │──→ Screen 12
│                          │
│  Drawer Menu ────────────┼──→ Screen 7
│                          │
└──────────────────────────┘
```

### 6.2 Navigation Hierarchy

**Primary:** Bottom Tab Navigation (4 tabs)
- NBA (Home)
- Context
- Evidence
- Decisions

**Secondary:** Hamburger Menu
- Settings
- Integrations
- Help
- Feedback

**Modals:**
- Voice Update
- Quick Add (Task/Unknown)
- Task Editor

---

## 7. Responsive Behavior

### 7.1 Mobile Breakpoints

**Phone (Primary):**
- Width: 320px - 428px
- Single column layout
- Bottom tabs

**Tablet:**
- Width: 768px - 1024px
- Two-column layout on some screens
- Side navigation instead of bottom tabs

---

### 7.2 Thumb Reach Zones

**Safe Zone (Green):**
- Bottom 60% of screen
- Primary actions here

**Stretch Zone (Yellow):**
- Middle 25% of screen
- Secondary actions

**Hard to Reach (Red):**
- Top 15% of screen
- Navigation only, no critical actions

**Design Rule:** All primary CTAs in bottom 40% of screen.

---

## 8. Accessibility

### 8.1 Requirements

1. **WCAG 2.1 AA Compliance**
   - Color contrast ≥4.5:1 for body text
   - Color contrast ≥3:1 for large text
   - Touch targets ≥48x48px

2. **Screen Reader Support**
   - All interactive elements labeled
   - Semantic HTML/React Native components
   - Focus management

3. **Keyboard Navigation**
   - Tab order logical
   - Focus visible
   - Shortcuts for common actions

4. **Voice Input Alternative**
   - Always provide text input fallback
   - Never voice-only

---

### 8.2 Inclusive Design

**Color Blindness:**
- Don't rely on color alone
- Use icons + text labels
- Test with deuteranopia simulator

**Motor Impairments:**
- Large touch targets
- Generous spacing
- Swipe gestures optional (provide buttons)

**Cognitive Load:**
- ONE primary action per screen
- Clear hierarchy
- Plain language, no jargon

---

## 9. Animation & Motion

### 9.1 Principles

1. **Functional, not decorative**
   - Animations communicate state changes
   - Guide user attention
   - Provide feedback

2. **Fast and subtle**
   - Duration: 200-300ms
   - Easing: ease-out
   - Respect reduced motion preference

---

### 9.2 Key Animations

**Screen Transitions:**
- Slide left/right: 250ms
- Fade in: 200ms
- Modal slide up: 300ms

**Button Press:**
- Scale down to 0.95: 100ms
- Haptic feedback

**Voice Recording:**
- Pulsing animation: 1.5s loop
- Waveform visualization

**Loading States:**
- Skeleton shimmer: 1.5s loop
- Spinner rotation: 800ms

**Success Feedback:**
- Checkmark scale in: 300ms
- Green flash: 200ms
- Haptic success pattern

---

## 10. Dark Mode

### 10.1 Color Adjustments

**Background:**
- Primary: Gray 900 (#111827)
- Surface: Gray 800 (#1F2937)
- Elevated: Gray 700 (#374151)

**Text:**
- Primary: White (#FFFFFF)
- Secondary: Gray 300 (#D1D5DB)
- Tertiary: Gray 400 (#9CA3AF)

**Brand Colors:**
- Primary Blue stays same
- Reduce saturation 10% for backgrounds

**Borders:**
- Gray 700 instead of Gray 200

---

### 10.2 Component Adjustments

**Cards:**
- Background: Gray 800
- Border: Gray 700
- Shadow: Increase opacity 2x

**Input Fields:**
- Background: Gray 900
- Border: Gray 600
- Text: White

---

## 11. Onboarding UX Nuances

### 11.1 First Session Flow

1. **Welcome Screen (2s)** → Auto-advance
2. **ONE Question** → User answers
3. **Processing** (2-5s) → Show progress
4. **First NBA Recommendation** → Critical moment
5. **Accept** → Immediate value
6. **Onboarding Complete** → No additional forms

**Success Metric:** Time to first recommendation <60s.

---

### 11.2 Onboarding Copy

**Screen 1:**
- "Your AI Co-Founder"
- "Always knows what to do next (and why)"

**Screen 2:**
- "One Question"
- "What are you building?"
- "I'll figure out the rest as we go."

**First NBA:**
- "Based on what you told me..."
- "Here's what I recommend doing first:"
- [Recommendation]
- "I'll get better as we work together."

---

## 12. Trust & Transparency UX

### 12.1 Showing AI Reasoning

**Always Visible:**
- Confidence score
- "Why This Matters" summary
- Frameworks applied

**One Tap Away:**
- Full rationale
- Score breakdown
- Evidence citations

**Progressive Disclosure:**
- Don't overwhelm with AI internals
- Provide depth for curious users
- Balance transparency with simplicity

---

### 12.2 Handling Disagreement

**Override Flow:**

1. User taps alternative or "Skip"
2. System asks: "Why did you choose this instead?"
3. User provides reason (voice/text)
4. System logs override
5. System learns: Adjust weights/frameworks

**Copy:**
- "Help me understand"
- "What made this a better choice?"
- "Got it. I'll remember this."

---

## 13. Performance Targets

**Target Metrics:**

1. **Initial Load:** <2s to interactive
2. **NBA Computation:** <3s to result
3. **Screen Transitions:** <100ms
4. **Voice Transcription:** <1s
5. **Background Refresh:** Every 5 minutes (when active)

**Optimization Strategies:**

- Preload next likely screen
- Cache NBA results (5min TTL)
- Optimistic UI updates
- Lazy load images
- Code splitting

---

## 14. Localization Considerations

**Initial Launch:** English only

**Future:**
- RTL support (Arabic, Hebrew)
- Date/time formatting
- Number formatting
- Voice input in multiple languages

**Design Accommodations:**
- Flexible layouts (no fixed widths)
- Icon-first when possible
- Test with 2x text length

---

## 15. Platform-Specific Considerations

### 15.1 iOS

**Native Elements:**
- Use SF Symbols icons
- iOS native share sheet
- Haptic feedback (UIImpactFeedback)
- Native date/time pickers

**Gestures:**
- Swipe back from left edge (native)
- Long press for context menus

---

### 15.2 Android

**Native Elements:**
- Material Design icons
- Android share intent
- Native pickers
- Snackbar for toasts

**Navigation:**
- Hardware back button support
- FAB for primary action (optional)

---

## 16. Handoff Notes for Developers

### 16.1 Component Structure (React Native)

```
/src
  /screens
    /onboarding
      WelcomeScreen.tsx
      OnboardingQuestionScreen.tsx
    /main
      NBARecommendationScreen.tsx
      FullRationaleScreen.tsx
      ContextViewScreen.tsx
      MenuScreen.tsx
    /modals
      VoiceUpdateModal.tsx
      QuickAddModal.tsx
  /components
    /ui
      Button.tsx
      Card.tsx
      InputField.tsx
      VoiceInputButton.tsx
      ScoreBar.tsx
      ConfidenceBadge.tsx
      RationaleCard.tsx
    /nba
      RecommendationCard.tsx
      AlternativesList.tsx
      RationaleBreakdown.tsx
    /context
      ObjectiveCard.tsx
      TaskListItem.tsx
      UnknownListItem.tsx
  /navigation
    AppNavigator.tsx
    TabNavigator.tsx
    DrawerNavigator.tsx
  /theme
    colors.ts
    typography.ts
    spacing.ts
    shadows.ts
```

---

### 16.2 State Management

**Libraries:**
- React Query for server state
- Zustand for client state
- AsyncStorage for persistence

**Key State Slices:**
- User profile
- Current NBA session
- Business context (cached)
- UI state (modals, loading)

---

### 16.3 API Integration

**Base URL:** `https://api.bebrahma.com/api/v1`

**Key Endpoints:**
- `POST /onboarding/initial`
- `POST /nba/ask`
- `GET /nba/rationale/:id`
- `GET /context`
- `POST /context/signals`
- `POST /context/tasks`
- `POST /overrides`

**Authentication:**
- Clerk JWT in `Authorization: Bearer <token>` header

---

### 16.4 Voice Input Implementation

**Libraries:**
- `react-native-voice` for recording
- Backend transcription via Whisper API

**Flow:**
```typescript
const startRecording = async () => {
  const permission = await checkMicrophonePermission();
  if (!permission) {
    showPermissionAlert();
    return;
  }

  Voice.start('en-US');
  setIsRecording(true);
};

const stopRecording = async () => {
  Voice.stop();
  setIsRecording(false);

  const audioFile = await Voice.getAudioFile();
  const transcription = await transcribeAudio(audioFile);

  setTranscribedText(transcription);
};
```

---

## 17. Future Enhancements

**Post-MVP:**

1. **Smart Scheduling**
   - Calendar integration
   - Suggest best times for tasks
   - Block time automatically

2. **Integrations**
   - Google Calendar
   - Notion
   - Slack
   - Linear

3. **Team Mode**
   - Shared objectives
   - Delegate tasks
   - Team NBA recommendations

4. **Analytics Dashboard**
   - Progress metrics
   - Historical trends
   - Prediction accuracy

5. **Custom Frameworks**
   - User-defined frameworks
   - Industry-specific templates

---

## 18. Design QA Checklist

**Before Handoff:**

- [ ] All screens designed at 375x812 (iPhone 13)
- [ ] Dark mode variants for all screens
- [ ] All interactive states defined (hover, active, disabled)
- [ ] All error states designed
- [ ] All empty states designed
- [ ] All loading states designed
- [ ] Color contrast checked (WCAG AA)
- [ ] Touch targets ≥48x48px
- [ ] Copy finalized and reviewed
- [ ] Icon set complete
- [ ] Animation specs documented
- [ ] Responsive behavior defined

---

## Appendix: Design Rationale

### Why Mobile-First?

Founders are constantly on the move. BeBrahma must be accessible during:
- Commutes
- Coffee shop sessions
- Between meetings
- Waiting rooms

Mobile-first ensures the core experience is optimized for the most common context.

### Why Voice-Native?

Voice input is:
- **Faster** than typing on mobile
- **More natural** for updates/thoughts
- **Lower friction** for busy founders
- **Differentiating** from form-based tools

### Why ONE Question Onboarding?

Traditional onboarding kills momentum:
- Forms create fatigue
- Users quit before value
- Most data goes unused

ONE question + progressive profiling:
- Immediate value (first NBA)
- Learn from behavior (more accurate)
- Respects user time

### Why ONE Recommendation?

Choice paralysis is real. Founders already have:
- Too many ideas
- Too many options
- Too much analysis paralysis

BeBrahma's job: **Decide for them.**
- ONE clear recommendation
- Show WHY (build trust)
- Provide alternatives (escape hatch)
- Learn from overrides (get better)

---

**End of UX Design Document**
