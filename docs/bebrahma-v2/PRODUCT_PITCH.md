# BeBrahma: Your AI Co-Founder That Always Knows What To Do Next

**Version:** 0.3.0
**Status:** Backend Complete, Ready for Frontend
**Target Market:** Pre-seed technical founders
**Differentiator:** Voice-native, mobile-first, AI-powered recommendation engine

---

## The Problem

### Every founder faces the same paralyzing question every morning:

> **"Am I working on the right thing?"**

**The current landscape:**
- **Task managers** (Linear, Asana, Notion) → You decide what to do. They just track it.
- **AI assistants** (ChatGPT, Claude) → You ask questions. They answer. No proactive guidance.
- **Business frameworks** (Lean Canvas, Jobs-to-be-Done) → Static templates. No personalization.
- **Advisors/coaches** → Expensive ($500+/hr). Not always available. Inconsistent quality.

**Result:** Founders waste 40% of their time on the wrong priorities, burn out from analysis paralysis, and fail not from lack of effort but from working on the wrong things.

---

## The Solution

### BeBrahma is an AI co-founder that tells you exactly what to do next—and why.

**Not another task manager.** Not another chatbot. Not another productivity hack.

**It's a decision-making engine** that:
1. Learns your unique business context (goals, unknowns, constraints)
2. Applies proven startup frameworks automatically
3. Recommends the single highest-impact action right now
4. Explains why this matters more than everything else
5. Learns from your choices to get smarter over time

**Think:** If Y Combinator had an AI that could coach every founder 24/7.

---

## How It Works

### 1. Onboarding: ONE Question

**Traditional tools:** 30-minute setup. Forms. Fields. Overwhelming.

**BeBrahma:** "What are you building?"

That's it. We extract everything else progressively from how you use the app.

---

### 2. The NBA (Next Best Action) Engine

**Every time you open the app:**

```
🎯 Recommended (Score: 8.7/10, Confidence: 82%)

Conduct 5 customer interviews with target persona

💡 Why This Matters:
You have 3 critical unknowns about customer pain. Interviews
will validate your problem hypothesis and uncover the #1 pain
to solve.

🔀 Alternatives:
• Survey 50 target users (8.2/10)
• Build landing page to test positioning (7.9/10)

[▶ Start Now]  [✎ Modify]  [⏭ Skip]
```

**Behind the scenes:**
- **5-Dimension Scoring:** Objective impact (30%), Time sensitivity (25%), Evidence gap (25%), Unblocks (10%), Feasibility (10%)
- **Multi-Framework Router:** Auto-selects from Problem-Solution Fit, ICP+Wedge, Critical Unknown Mapping, and more
- **LLM-Powered Rationale:** Claude Sonnet explains the "why" in plain English
- **Confidence Calculation:** Shows how sure we are based on context completeness, historical accuracy, data quality

---

### 3. Voice-Native Updates

**The continuous feedback loop:**

Founder (voice): *"Just finished 10 customer interviews. 8 out of 10 said they'd pay $50/month."*

BeBrahma (processing):
- ✅ Marks "Conduct interviews" task as complete
- ✅ Extracts evidence: "8/10 willing to pay $50/mo"
- ✅ Resolves unknown: "Will customers pay?"
- ✅ Updates NBA: "Next → Validate pricing with prototype"

**Result:** 30-second voice note = Entire business state updated. New recommendation generated.

---

### 4. Learning from Overrides

When you choose an alternative over the top recommendation:

BeBrahma: *"Help me understand—why did you choose the survey instead of interviews?"*

You: *"I'm burned out on customer calls. Need something async."*

BeBrahma (learning):
- Adjusts "energy level" preference
- Deprioritizes high-social-interaction tasks on Fridays
- Suggests async alternatives when context indicates fatigue

**Result:** Recommendations get better every week. Like a co-founder who knows you.

---

## Why This Works

### The Magic: Framework-Based Intelligence

Most AI is general-purpose. BeBrahma is **startup-specific intelligence**.

**We've encoded the best startup frameworks:**
1. **Problem-Solution Fit** → 3-stage validation (Understand → Validate → Test)
2. **ICP + Wedge Strategy** → Define → Narrow → Validate economics
3. **Critical Unknown Mapping** → Systematically resolve blockers
4. **Jobs-to-be-Done** → Customer pain diagnosis
5. *...and more being added*

**The NBA Engine auto-selects** the right framework for your stage, then generates tasks that actually move you forward.

**It's like having:**
- A Y Combinator partner (frameworks)
- A personal coach (accountability)
- An AI analyst (data processing)
- A co-founder (always available)

All in your pocket. For $49/month instead of $50K in equity.

---

## Product Design Principles

### 1. Mobile-First (iOS/Android)
Founders are constantly moving. BeBrahma goes with them.
- Coffee shop sessions
- Post-meeting reflections
- Commutes
- Walking between calls

### 2. Voice-Native
Typing is slow. Voice is 10x faster.
- <1s transcription (Whisper API)
- >95% accuracy target
- Natural language entity extraction

### 3. Radical Simplicity
ONE recommendation. Not 10. Not a list.
- Eliminates choice paralysis
- Forces prioritization
- Builds trust through clarity

### 4. Trust Through Transparency
Always show the "why":
- Confidence scores
- Full rationale (expandable)
- Framework sources
- Score breakdowns

### 5. Progressive Profiling
Learn from behavior, not forms:
- Override patterns → Preference learning
- Task completions → Progress tracking
- Calendar sync → Context signals
- Voice notes → Evidence gathering

---

## Current State

### ✅ What's Built (Backend 100% Complete)

**Technology:**
- **FastAPI** Python backend (async, production-ready)
- **PostgreSQL** database with 10 tables, 50+ indexes
- **Multi-tier LLM** strategy (GPT-3.5 → Claude Sonnet → Claude Opus)
- **3 business frameworks** fully implemented
- **9 API endpoints** operational

**Architecture Highlights:**
- NBA engine with 5-dimension scoring ✅
- Confidence calculation (4 factors) ✅
- Framework router (auto-selects 1-3 frameworks) ✅
- Override tracking for learning ✅
- Business state graph (objectives, tasks, unknowns, evidence) ✅

**Documentation:**
- 305KB of design specs
- Complete RTM (requirements traceability)
- API specifications for 40+ endpoints
- UX design (mobile + web, 31 screens designed)

### ⏳ What's Next (Frontend 0% Complete)

**Immediate (4-8 weeks):**
- React Native mobile app (iOS + Android)
- Voice input integration (Whisper API)
- Real Clerk authentication
- Missing API endpoints (signals, overrides, evidence CRUD)

**Short-term (3 months):**
- Web app (React)
- Google Calendar integration
- Analytics dashboard
- Test with 50 beta users

---

## Business Model

### Pricing

**Freemium:**
- **Free:** 10 NBA recommendations/month, 1 framework
- **Pro ($49/mo):** Unlimited NBA, all frameworks, voice input, integrations
- **Team ($149/mo):** Shared objectives, delegate tasks, team NBA

**Why founders will pay:**
- Replaces $500/hr advisor sessions
- Saves 5-10 hours/week of "what to do next" paralysis
- Cheaper than therapy for founder anxiety
- ROI: If it helps you avoid 1 wasted week = $10K+ in opportunity cost

### Market Size

**TAM:** 50M+ founders worldwide
**SAM:** 5M pre-seed technical founders (English-speaking, venture-backable ideas)
**SOM (Year 1):** 10K paying users ($490K ARR at $49/mo)

**Acquisition strategy:**
- Product Hunt launch
- Y Combinator network (we have connections)
- Indie Hackers / Twitter / Reddit
- Content marketing (startup framework guides)
- Referral program (1 month free for referrals)

---

## Competitive Landscape

| Competitor | What They Do | Why We Win |
|------------|--------------|------------|
| **Notion AI** | Task management + AI chat | Generic. Doesn't tell you *what* to do. |
| **ChatGPT** | General Q&A | No state. No learning. No proactive guidance. |
| **Linear** | Issue tracking | For *executing* the plan. Doesn't help *decide* the plan. |
| **Y Combinator** | Advisor network | $500K for 7%. We're $49/mo. Always available. |
| **Exec coaches** | 1-on-1 coaching | $500/hr. 1x/week. We're 24/7. |

**Our moat:**
1. **Framework library** → Not easy to replicate domain knowledge
2. **NBA algorithm** → Proprietary scoring + learning engine
3. **Voice-native UX** → Hard to nail (<1s latency, >95% accuracy)
4. **Network effects** → More users → Better frameworks → Better accuracy

---

## Success Metrics (MVP Validation)

**Activation:**
- 80% get first recommendation in <2 minutes ✅ (by design)
- <1 question asked ✅ (only 1 question)

**Core Functionality:**
- Voice transcription <1s (p90) → Need to test
- Transcription accuracy >95% → Need to test
- Top-1 NBA accuracy >60% vs expert panel → Need to validate

**Engagement:**
- 75% of sessions end with action started/scheduled → Need to measure
- 3+ sessions/week average → Need to measure
- 30% choose alternatives over top rec → Need to measure

**Cost Efficiency:**
- <$0.10 per session average → Currently ~$0.07-0.10 ✅

**Retention:**
- 40% weekly active users (Week 4)
- 20% still using at Week 12

---

## The Vision

### Short-term (6 months)
Every pre-seed founder has BeBrahma as their AI co-founder.
**Metric:** 10K paying users, $500K ARR

### Medium-term (18 months)
BeBrahma becomes the "operating system" for building startups.
- Integrates with Linear, Notion, Slack, Google Calendar
- Learns from 1M+ startup decisions
- Accuracy hits 80%+ (better than human advisors)

**Metric:** 100K paying users, $5M ARR

### Long-term (3-5 years)
BeBrahma powers every founder, from pre-seed to Series B.
- Team mode (delegate tasks to co-founders)
- Custom frameworks (industry-specific playbooks)
- Integration marketplace (Stripe, AWS, analytics tools)
- AI-first "virtual co-founder"

**Metric:** 1M+ paying users, $50M+ ARR

---

## Why Now?

### 1. LLMs Are Good Enough
- Claude Sonnet 4 can reason about complex startup decisions
- GPT-3.5 Turbo makes classification cheap (<$0.001/call)
- Whisper API makes voice transcription reliable (<1s, >95%)

### 2. Founders Are Drowning
- More founders than ever (thanks to no-code, AI tools)
- Less access to quality advisors (YC acceptance rate: 1.5%)
- Remote work = Isolated founders = More anxiety

### 3. Voice Interfaces Are Mainstream
- Everyone uses Siri/Alexa/voice notes
- Founders already voice-note their cofounders
- Natural behavior to digitize

### 4. Proven Willingness to Pay
- Founders already pay for:
  - Exec coaches ($500/hr)
  - Masterminds ($5K-10K)
  - YC equity ($500K for 7%)
- We're 100x cheaper for 80% of the value

---

## Ask

### What We're Building Next

**Phase 1 (8 weeks):** React Native mobile app + voice input → Beta with 50 users
**Phase 2 (12 weeks):** Web app + integrations → Product Hunt launch
**Phase 3 (6 months):** Team mode + custom frameworks → Scale to 10K users

### What We Need

**From investors:** $200K seed to hire 1 FT engineer + pay LLM API costs for 12 months

**From advisors:** YC founders who can beta test + provide framework feedback

**From users:** Pre-seed founders willing to be design partners

---

## Team

**[Your Name]** - Founder
- Previous: [Your background]
- Why this: [Your founder journey pain]

**Technical Capabilities:**
- FastAPI backend: ✅ Complete
- NBA engine: ✅ Operational
- Frontend: Looking to hire or partner

**Domain Expertise:**
- Startup frameworks: Deep knowledge
- Founder psychology: Lived experience
- AI/LLM: Production experience

---

## The Bet

**Most founders fail not because they don't work hard enough.**
**They fail because they work hard on the wrong things.**

If we can help founders:
- **Focus** on what matters (vs. what's easy/urgent)
- **Validate** assumptions faster (via frameworks)
- **Learn** from their choices (via override patterns)

Then we can **increase the success rate of startups by 10-20%**.

That's worth billions.

**BeBrahma:** The AI co-founder every founder deserves.

---

## Get Involved

**Try the backend:** API running at `http://localhost:3001/docs`
**See the designs:** 31 screens fully designed (mobile + web)
**Read the vision:** 300KB of documentation

**Contact:** [Your email]
**Demo:** [Schedule a call]
**Early access:** [Waitlist link]

---

**Last Updated:** January 11, 2026
**Version:** 0.3.0
**Status:** Backend 100% → Frontend 0% → Ship in 8 weeks

**Tagline:** *Your AI co-founder that always knows what to do next—and why.*
