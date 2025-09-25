export interface DecisionPoint {
  id: string;
  topic: string;
  status: 'discussing' | 'pending_approval' | 'approved' | 'rejected' | 'paused';
  agentContributions: AgentContribution[];
  decisionText: string;
  userResponse?: 'approve' | 'reject' | 'refine' | 'pause';
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentContribution {
  agentId: string;
  agentName: string;
  agentTitle?: string;
  message: string;
  timestamp: Date;
  dataPoints?: string[];
  source?: string;
  department?: string;
}

export interface BusinessDecisionLog {
  projectTitle: string;
  currentTopic: string;
  decisions: DecisionPoint[];
  createdAt: Date;
  updatedAt: Date;
}

export class DecisionTracker {
  private decisionLog: BusinessDecisionLog;

  constructor(projectTitle: string) {
    this.decisionLog = {
      projectTitle,
      currentTopic: '',
      decisions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  startNewTopic(topic: string): string {
    const decisionId = `decision_${Date.now()}`;
    const decision: DecisionPoint = {
      id: decisionId,
      topic,
      status: 'discussing',
      agentContributions: [],
      decisionText: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.decisionLog.currentTopic = topic;
    this.decisionLog.decisions.push(decision);
    this.decisionLog.updatedAt = new Date();

    return decisionId;
  }

  addAgentContribution(decisionId: string, contribution: Omit<AgentContribution, 'timestamp'>): void {
    const decision = this.decisionLog.decisions.find(d => d.id === decisionId);
    if (decision) {
      decision.agentContributions.push({
        ...contribution,
        timestamp: new Date()
      });
      decision.updatedAt = new Date();
      this.decisionLog.updatedAt = new Date();
    }
  }

  setDecisionPoint(decisionId: string, decisionText: string): void {
    const decision = this.decisionLog.decisions.find(d => d.id === decisionId);
    if (decision) {
      decision.decisionText = decisionText;
      decision.status = 'pending_approval';
      decision.updatedAt = new Date();
      this.decisionLog.updatedAt = new Date();
    }
  }

  userResponse(decisionId: string, response: 'approve' | 'reject' | 'refine' | 'pause'): void {
    const decision = this.decisionLog.decisions.find(d => d.id === decisionId);
    if (decision) {
      decision.userResponse = response;
      decision.status = response === 'approve' ? 'approved' : 
                       response === 'reject' ? 'rejected' : 
                       response === 'pause' ? 'paused' : 'discussing';
      decision.updatedAt = new Date();
      this.decisionLog.updatedAt = new Date();
    }
  }

  generateMarkdown(): string {
    let markdown = `# Business Decision Log: ${this.decisionLog.projectTitle}\n\n`;
    markdown += `**Created**: ${this.decisionLog.createdAt.toLocaleDateString()}\n`;
    markdown += `**Last Updated**: ${this.decisionLog.updatedAt.toLocaleDateString()}\n\n`;

    if (this.decisionLog.currentTopic) {
      markdown += `## 🎯 **Current Topic**: ${this.decisionLog.currentTopic}\n\n`;
    }

    this.decisionLog.decisions.forEach((decision, index) => {
      markdown += `## 🎯 **Topic ${index + 1}: ${decision.topic}**\n`;
      
      // Status and approval
      const statusEmoji = {
        'discussing': '🔄',
        'pending_approval': '⏳',
        'approved': '✅',
        'rejected': '❌',
        'paused': '⏸️'
      }[decision.status];
      
      markdown += `**Status**: ${statusEmoji} ${decision.status.replace('_', ' ')}\n`;
      
      if (decision.userResponse) {
        markdown += `**User Response**: ${decision.userResponse}\n`;
      }
      
      markdown += `**Created**: ${decision.createdAt.toLocaleDateString()}\n\n`;

      // Agent contributions grouped by department
      if (decision.agentContributions.length > 0) {
        markdown += `### Agent Contributions:\n`;
        
        // Group by department
        const byDepartment = decision.agentContributions.reduce((acc, contribution) => {
          const dept = contribution.department || 'other';
          if (!acc[dept]) acc[dept] = [];
          acc[dept].push(contribution);
          return acc;
        }, {} as Record<string, AgentContribution[]>);

        // Display by department with headers
        Object.entries(byDepartment).forEach(([dept, contributions]) => {
          const deptEmoji = {
            'leadership': '👑',
            'technical': '⚙️',
            'domain': '🏢',
            'business': '📈',
            'data': '📊',
            'user-research': '🔍',
            'market-intelligence': '🎯',
            'other': '🤖'
          }[dept] || '🤖';
          
          markdown += `\n**${deptEmoji} ${dept.charAt(0).toUpperCase() + dept.slice(1).replace('-', ' ')}**\n`;
          
          contributions.forEach(contribution => {
            const title = contribution.agentTitle ? ` (${contribution.agentTitle})` : '';
            markdown += `- **${contribution.agentName}${title}**: "${contribution.message}"\n`;
            
            if (contribution.dataPoints && contribution.dataPoints.length > 0) {
              markdown += `  - Data: ${contribution.dataPoints.join(', ')}\n`;
            }
            
            if (contribution.source) {
              markdown += `  - Source: ${contribution.source}\n`;
            }
          });
        });
        
        markdown += `\n`;
      }

      // Decision point
      if (decision.decisionText) {
        markdown += `### Decision Point:\n`;
        markdown += `**${decision.decisionText}**\n\n`;
      }

      // User approval options
      if (decision.status === 'pending_approval') {
        markdown += `### User Response Required:\n`;
        markdown += `[ ] **Approve** → Move to next topic\n`;
        markdown += `[ ] **Refine** → Agents continue discussion\n`;
        markdown += `[ ] **Reject** → Start over with new approach\n`;
        markdown += `[ ] **Pause** → Save progress, resume later\n\n`;
      }

      markdown += `---\n\n`;
    });

    return markdown;
  }

  getCurrentDecision(): DecisionPoint | null {
    return this.decisionLog.decisions.find(d => d.status === 'discussing' || d.status === 'pending_approval') || null;
  }

  getDecisionLog(): BusinessDecisionLog {
    return { ...this.decisionLog };
  }
}
