# BeBrahma AI Workflow System - UX Implementation Guide

## Project Context
BeBrahma is an AI-first workflow platform for startup/business analysis featuring multi-agent collaboration (PM, CEO, CTO, Growth, Research, Data, Strategy, DevOps) across workflow stages: Problem Capture → Clarification → Solution Brainstorm → Competitor Analysis → SCA Analysis → MVP Planning → Task Generation.

**Tech Stack:**
- Frontend: Next.js 15, React 18, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Node.js/Express, PostgreSQL/Prisma, Python FastAPI (crew sidecar)
- Real-time: WebSocket connections for streaming and live updates
- Existing APIs: `/api/chat`, `/api/crew/*`, `/api/ai/*` endpoints

---

## 1. Virtual Meeting Room Interface (RECOMMENDED DESIGN)

### Design Reference
![Virtual Meeting Room - Circular Layout](https://design.canva.ai/y4cfudzv)
**[Full Design Reference](https://design.canva.ai/yc5f4bhk)**

### Implementation Requirements

#### Core Layout Structure
```typescript
interface MeetingRoomProps {
  sessionId: string;
  currentStage: WorkflowStage;
  agents: AgentInfo[];
  messages: ChatMessage[];
  onUserMessage: (message: string) => void;
  onStageProgress: () => void;
}

interface AgentInfo {
  id: string;
  role: 'PM' | 'CEO' | 'CTO' | 'Growth' | 'Research' | 'Data' | 'Strategy' | 'DevOps';
  name: string;
  status: 'speaking' | 'listening' | 'thinking' | 'idle';
  avatar: string;
  color: string; // PM: blue, CEO: gold, CTO: green, etc.
}
```

#### Component Architecture
```
MeetingRoomInterface/
├── AgentCircle/
│   ├── AgentAvatar.tsx          // Individual agent with status
│   ├── AgentStatusIndicator.tsx // Speaking/thinking animations  
│   └── AgentTooltip.tsx         // Role info on hover
├── ChatArea/
│   ├── MessageStream.tsx        // Real-time message display
│   ├── ProgressiveMessage.tsx   // Implement from previous prompt
│   └── MessageInput.tsx         // User input with "Join Discussion"
├── WorkflowHeader/
│   ├── StageIndicator.tsx       // Current stage with progress bar
│   └── StageNavigation.tsx      // Navigate between stages
└── Sidebars/
    ├── DecisionQueue.tsx        // Pending decisions (right)
    └── SessionInfo.tsx          // Project details (left)
```

#### Key Implementation Details

**Circular Agent Layout:**
- 8 agents positioned in perfect circle around central chat
- CSS transforms for positioning: `transform: rotate(${index * 45}deg) translateY(-200px) rotate(-${index * 45}deg)`
- Responsive sizing: agents scale with viewport, minimum 60px avatars
- Z-index management for hover states and animations

**Real-time Status Updates:**
```typescript
// WebSocket integration for agent status
useEffect(() => {
  const ws = new WebSocket(`/ws/session/${sessionId}`);
  
  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    if (update.type === 'agent_status') {
      setAgents(prev => prev.map(agent => 
        agent.id === update.agentId 
          ? { ...agent, status: update.status }
          : agent
      ));
    }
  };
}, [sessionId]);
```

**Chat Integration:**
- Integrate with existing `/api/chat` endpoint
- Support for streaming responses using progressive message rendering
- Message attribution to specific agents with color coding
- Typing indicators when agents are "thinking"

---

## 2. Decision Management Hub (RECOMMENDED DESIGN)

### Design Reference
![Decision Hub - Card Grid](https://design.canva.ai/5333mc59)
**[Full Design Reference](https://design.canva.ai/2p8bx273)**

### Implementation Requirements

#### Core Data Structure
```typescript
interface DecisionItem {
  id: string;
  title: string;
  workflowStage: WorkflowStage;
  involvedAgents: string[];
  evidenceSummary: string;
  confidenceScore: number; // 0-100
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  context: {
    relatedDiscussions: string[];
    supportingData: any[];
    risks: string[];
    recommendations: string[];
  };
}
```

#### Component Structure
```
DecisionHub/
├── DecisionGrid/
│   ├── DecisionCard.tsx         // Individual decision with approve/reject
│   ├── DecisionDetails.tsx      // Expandable details modal
│   └── BulkActions.tsx          // Multi-select operations
├── WorkflowNav/
│   ├── StageProgress.tsx        // Visual workflow with current stage
│   └── StageFilter.tsx          // Filter decisions by stage
├── DecisionHistory/
│   ├── Timeline.tsx             // Right sidebar timeline
│   ├── HistoryItem.tsx          // Individual history entry
│   └── SearchFilter.tsx         // Search historical decisions
└── ContextPanel/
    ├── RelatedDiscussions.tsx   // Bottom context area
    ├── SupportingEvidence.tsx   // Charts, data, references
    └── AgentInsights.tsx        // Agent recommendations/concerns
```

#### Key Features Implementation

**Decision Card Layout:**
- 3x2 grid on desktop, responsive stacking on mobile
- Card dimensions: 320px width, auto height with max 180px
- Hover effects: subtle shadow increase, border color change
- Status indicators: color-coded borders and badges

**Approval Workflow:**
```typescript
const handleDecisionAction = async (decisionId: string, action: 'approve' | 'reject') => {
  await fetch(`/api/decisions/${decisionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action, userId: session.user.id })
  });
  
  // Optimistic UI update
  setDecisions(prev => prev.map(d => 
    d.id === decisionId 
      ? { ...d, status: action === 'approve' ? 'approved' : 'rejected' }
      : d
  ));
  
  // Trigger workflow progression if needed
  if (action === 'approve') {
    await checkWorkflowProgression();
  }
};
```

**Timeline Integration:**
- Real-time updates via WebSocket
- Infinite scroll for historical decisions
- Visual connection lines between related decisions
- Export functionality for decision audit trail

---

## 3. Agent Research Workspace (RECOMMENDED DESIGN)

### Design Reference
![Research Workspace - Quad Dashboard](https://design.canva.ai/y7kuxaxe)
**[Full Design Reference](https://design.canva.ai/2p9dzp3j)**

### Implementation Requirements

#### Data Models
```typescript
interface AgentResearchData {
  agentId: string;
  toolsUsed: ToolUsage[];
  sitesBrowsed: WebsiteVisit[];
  documentsRead: DocumentAccess[];
  contentCreated: GeneratedContent[];
  activityFeed: ActivityItem[];
}

interface ToolUsage {
  toolName: string;
  callCount: number;
  lastUsed: Date;
  successRate: number;
  avgResponseTime: number;
}

interface WebsiteVisit {
  url: string;
  title: string;
  visitedAt: Date;
  contentExtracted: boolean;
  firecrawlJobId?: string;
  relevanceScore: number;
}
```

#### Component Architecture
```
AgentResearchWorkspace/
├── AgentHeader/
│   ├── AgentProfile.tsx         // Name, avatar, current status
│   ├── ActivityStatus.tsx       // Real-time activity indicator
│   └── ResearchMetrics.tsx      // High-level stats
├── QuadDashboard/
│   ├── ToolsUsedPanel.tsx       // API calls, integrations usage
│   ├── SitesBrowsedPanel.tsx    // Firecrawl history, URLs
│   ├── DocumentsReadPanel.tsx   // PDFs, files with progress
│   └── ContentCreatedPanel.tsx  // Generated reports, summaries
├── ActivityFeed/
│   ├── RealTimeStream.tsx       // Live activity updates
│   ├── ActivityItem.tsx         // Individual activity entry
│   └── ActivityFilters.tsx      // Filter by type, time range
└── ArtifactsGallery/
    ├── ContentPreview.tsx       // Thumbnails of generated content
    ├── ContentViewer.tsx        // Full content modal
    └── ContentExport.tsx        // Download/share functionality
```

#### Implementation Details

**Quad-Section Layout:**
- CSS Grid: `grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;`
- Equal height sections with internal scrolling
- Mini-charts using Recharts library for data visualization
- Color coding: Tools (blue), Sites (green), Documents (orange), Content (purple)

**Real-time Activity Monitoring:**
```typescript
// Integration with crew sidecar for research tracking
const useAgentResearch = (agentId: string) => {
  const [researchData, setResearchData] = useState<AgentResearchData>();
  
  useEffect(() => {
    // Subscribe to agent research events
    const eventSource = new EventSource(`/api/crew/research-stream/${agentId}`);
    
    eventSource.onmessage = (event) => {
      const activity = JSON.parse(event.data);
      setResearchData(prev => ({
        ...prev,
        activityFeed: [activity, ...prev.activityFeed.slice(0, 99)]
      }));
    };
    
    return () => eventSource.close();
  }, [agentId]);
};
```

**Tool Usage Visualization:**
- Integration with existing `/api/tools/traces` endpoint
- Bar charts for API call frequency
- Success/error rate indicators
- Cost tracking for paid APIs (OpenAI, Firecrawl)

---

## 4. Task & Action Tracking (RECOMMENDED DESIGN)

### Design Reference
![Task Board - Analytics Kanban](https://design.canva.ai/3vxfhdy2)
**[Full Design Reference](https://design.canva.ai/yckjsz4j)**

### Implementation Requirements

#### Task Data Models
```typescript
interface TaskItem {
  id: string;
  title: string;
  description: string;
  assignedAgent: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'backlog' | 'in_progress' | 'review' | 'completed';
  workflowStage: WorkflowStage;
  createdAt: Date;
  dueDate?: Date;
  dependencies: string[];
  tags: string[];
  progress: number; // 0-100
  estimatedEffort: number; // hours
}

interface TaskAnalytics {
  totalTasks: number;
  completionRate: number;
  averageCompletionTime: number;
  bottlenecks: string[];
  agentWorkload: Record<string, number>;
  stageDistribution: Record<WorkflowStage, number>;
}
```

#### Component Structure
```
TaskBoard/
├── KanbanBoard/
│   ├── TaskColumn.tsx           // Backlog, In Progress, Review, Completed
│   ├── TaskCard.tsx             // Individual task with agent avatar
│   ├── TaskDetails.tsx          // Expandable task information
│   └── DragDropProvider.tsx     // Drag and drop functionality
├── TaskFilters/
│   ├── AgentFilter.tsx          // Filter by assigned agent
│   ├── PriorityFilter.tsx       // Filter by priority level
│   ├── StageFilter.tsx          // Filter by workflow stage
│   └── DateFilter.tsx           // Filter by due date range
├── AnalyticsSidebar/
│   ├── TaskMetrics.tsx          // Key performance indicators
│   ├── AgentWorkload.tsx        // Workload distribution chart
│   ├── BottleneckAnalysis.tsx   // Identify workflow bottlenecks
│   └── ProgressCharts.tsx       // Completion trends over time
└── TaskActions/
    ├── CreateTask.tsx           // New task creation modal
    ├── BulkActions.tsx          // Multi-task operations
    └── TaskExport.tsx           // Export task data
```

#### Key Implementation Features

**Kanban Drag-and-Drop:**
```typescript
// Using @dnd-kit/core for drag and drop
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  
  if (over && active.id !== over.id) {
    const activeTask = tasks.find(t => t.id === active.id);
    const newStatus = over.id as TaskStatus;
    
    // Optimistic update
    setTasks(prev => prev.map(task => 
      task.id === active.id 
        ? { ...task, status: newStatus }
        : task
    ));
    
    // API update
    updateTaskStatus(active.id, newStatus);
  }
};
```

**Analytics Integration:**
- Real-time metrics calculation
- Charts using Recharts: bar charts, line graphs, pie charts
- Export functionality for project reporting
- Integration with existing task endpoints

**Task Card Design:**
- Agent avatar with color coding
- Priority badges with visual indicators
- Progress bars for completion tracking
- Due date warnings and overdue highlighting

---

## 5. Integration Requirements

### API Extensions Needed
```typescript
// New endpoints to support UX features
POST /api/meeting-room/join-session     // Join meeting room session
GET  /api/decisions/pending             // Get pending decisions
POST /api/decisions/:id/approve         // Approve specific decision
GET  /api/research/:agentId/activity    // Get agent research data
POST /api/tasks                         // Create new task
PATCH /api/tasks/:id/status            // Update task status
GET  /api/analytics/tasks              // Get task analytics data
```

### WebSocket Events
```typescript
// Real-time event types for live updates
interface WebSocketEvents {
  'agent_status_change': { agentId: string; status: AgentStatus };
  'new_message': { message: ChatMessage; agentId: string };
  'decision_created': { decision: DecisionItem };
  'task_updated': { taskId: string; updates: Partial<TaskItem> };
  'research_activity': { agentId: string; activity: ActivityItem };
}
```

### State Management
```typescript
// Redux slices for state management
interface AppState {
  meetingRoom: {
    currentSession: string;
    agents: AgentInfo[];
    messages: ChatMessage[];
    currentStage: WorkflowStage;
  };
  decisions: {
    pending: DecisionItem[];
    history: DecisionItem[];
    filters: DecisionFilters;
  };
  research: {
    agentData: Record<string, AgentResearchData>;
    selectedAgent: string;
  };
  tasks: {
    items: TaskItem[];
    analytics: TaskAnalytics;
    filters: TaskFilters;
  };
}
```

## 6. Responsive Design Requirements

**Breakpoints:**
- Mobile: 320px - 768px (stack components vertically)
- Tablet: 769px - 1024px (2-column layouts)
- Desktop: 1025px+ (full multi-column layouts)

**Mobile Adaptations:**
- Meeting room: Agent grid instead of circle
- Decision hub: Single column card stack
- Research workspace: Tabbed interface instead of quad
- Task board: Horizontal scroll for columns

## 7. Performance Considerations

**Optimization Strategies:**
- Virtual scrolling for long lists (tasks, messages, activities)
- Lazy loading of research artifacts and document previews
- WebSocket connection pooling and cleanup
- Debounced API calls for filters and searches
- Memoized components for expensive renders

**Caching Strategy:**
- React Query for API response caching
- Local storage for user preferences
- Session storage for temporary UI state
- IndexedDB for offline research artifact storage

## 8. Accessibility Requirements

**WCAG 2.1 AA Compliance:**
- Keyboard navigation for all interactive elements
- Screen reader announcements for dynamic content updates
- High contrast mode support
- Focus management during modal interactions
- Alt text for all visual elements and charts

## 9. Testing Strategy

**Unit Tests:**
- Component rendering with various props
- User interaction handlers
- WebSocket event processing
- State management reducers

**Integration Tests:**
- API endpoint integration
- Real-time update flows
- Cross-component communication
- Responsive layout behavior

**E2E Tests:**
- Complete workflow from meeting room to task creation
- Decision approval process
- Agent research monitoring
- Multi-user collaboration scenarios

This implementation guide provides everything needed to build the complete BeBrahma UX system with the recommended designs. All components are designed to work together cohesively while integrating seamlessly with the existing architecture.