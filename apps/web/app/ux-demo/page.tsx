'use client';

import React, { useState } from 'react';
import VirtualMeetingRoom from '../../components/ux-enhanced/VirtualMeetingRoom';
import DecisionHub from '../../components/ux-enhanced/DecisionHub';
import AgentResearchWorkspace from '../../components/ux-enhanced/AgentResearchWorkspace';

// Mock data for demonstration
const mockAgents = [
  { id: 'pm', role: 'PM' as const, name: 'PM', status: 'speaking' as const, avatar: '', color: '#3B82F6' },
  { id: 'ceo', role: 'CEO' as const, name: 'CEO', status: 'listening' as const, avatar: '', color: '#F59E0B' },
  { id: 'cto', role: 'CTO' as const, name: 'CTO', status: 'thinking' as const, avatar: '', color: '#10B981' },
  { id: 'growth', role: 'Growth' as const, name: 'Growth', status: 'idle' as const, avatar: '', color: '#8B5CF6' },
  { id: 'research', role: 'Research' as const, name: 'Research', status: 'speaking' as const, avatar: '', color: '#EF4444' },
  { id: 'data', role: 'Data' as const, name: 'Data', status: 'listening' as const, avatar: '', color: '#06B6D4' },
  { id: 'strategy', role: 'Strategy' as const, name: 'Strategy', status: 'idle' as const, avatar: '', color: '#F97316' },
  { id: 'devops', role: 'DevOps' as const, name: 'DevOps', status: 'thinking' as const, avatar: '', color: '#84CC16' }
];

const mockMessages = [
  { id: '1', content: 'Based on our analysis, the market opportunity looks promising.', agent: 'PM', timestamp: new Date(), type: 'analysis' as const },
  { id: '2', content: 'I agree, but we need to consider the competitive landscape.', agent: 'CEO', timestamp: new Date(), type: 'text' as const },
  { id: '3', content: 'Our technical assessment shows feasibility within 6 months.', agent: 'CTO', timestamp: new Date(), type: 'decision' as const }
];

const mockDecisions = [
  {
    id: '1',
    title: 'Proceed with MVP Development',
    workflowStage: 'mvp-planning',
    involvedAgents: ['PM', 'CTO', 'CEO'],
    evidenceSummary: 'Market research shows strong demand, technical feasibility confirmed',
    confidenceScore: 85,
    status: 'pending' as const,
    createdAt: new Date(),
    context: {
      relatedDiscussions: ['Market Analysis', 'Technical Assessment'],
      supportingData: ['Competitor Analysis', 'User Survey Results'],
      risks: ['Market volatility', 'Resource constraints'],
      recommendations: ['Start with core features', 'Validate with early users']
    }
  },
  {
    id: '2',
    title: 'Adopt Cloud-First Architecture',
    workflowStage: 'solution-brainstorm',
    involvedAgents: ['CTO', 'DevOps'],
    evidenceSummary: 'Cost analysis shows 40% savings, scalability benefits confirmed',
    confidenceScore: 92,
    status: 'approved' as const,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    context: {
      relatedDiscussions: ['Architecture Review', 'Cost Analysis'],
      supportingData: ['Cloud Provider Comparison', 'Performance Benchmarks'],
      risks: ['Vendor lock-in', 'Data sovereignty'],
      recommendations: ['Multi-cloud strategy', 'Hybrid approach for sensitive data']
    }
  }
];

const mockResearchData = {
  agentId: 'research',
  toolsUsed: [
    { toolName: 'OpenAI API', callCount: 45, lastUsed: new Date(), successRate: 98, avgResponseTime: 1200 },
    { toolName: 'Firecrawl', callCount: 23, lastUsed: new Date(), successRate: 95, avgResponseTime: 800 },
    { toolName: 'Google Search', callCount: 67, lastUsed: new Date(), successRate: 100, avgResponseTime: 200 }
  ],
  sitesBrowsed: [
    { url: 'https://competitor.com', title: 'Competitor Website', visitedAt: new Date(), contentExtracted: true, relevanceScore: 95 },
    { url: 'https://market-research.org', title: 'Market Research Portal', visitedAt: new Date(), contentExtracted: true, relevanceScore: 88 },
    { url: 'https://industry-news.com', title: 'Industry News Site', visitedAt: new Date(), contentExtracted: false, relevanceScore: 72 }
  ],
  documentsRead: [
    { filename: 'market_analysis.pdf', type: 'pdf', readAt: new Date(), progress: 100 },
    { filename: 'competitor_report.docx', type: 'docx', readAt: new Date(), progress: 85 },
    { filename: 'user_survey_results.xlsx', type: 'xlsx', readAt: new Date(), progress: 60 }
  ],
  contentCreated: [
    { type: 'Report', title: 'Market Opportunity Analysis', createdAt: new Date(), size: 245 },
    { type: 'Summary', title: 'Competitor Landscape Overview', createdAt: new Date(), size: 128 },
    { type: 'Chart', title: 'User Preference Visualization', createdAt: new Date(), size: 89 }
  ]
};

export default function UXDemoPage() {
  const [currentView, setCurrentView] = useState<'meeting' | 'decisions' | 'research'>('meeting');
  const [sessionId] = useState('demo-session-123');

  const handleUserMessage = (message: string) => {
    console.log('User message:', message);
    // In real implementation, this would send to the chat system
  };

  const handleStageProgress = () => {
    console.log('Stage progress triggered');
    // In real implementation, this would advance the workflow
  };

  const handleDecisionAction = async (decisionId: string, action: 'approve' | 'reject') => {
    console.log('Decision action:', decisionId, action);
    // In real implementation, this would update the decision status
  };

  const handleViewDecisionDetails = (decision: any) => {
    console.log('View decision details:', decision);
    // In real implementation, this would show detailed modal
  };

  const handleAgentChange = (agentId: string) => {
    console.log('Agent changed to:', agentId);
    // In real implementation, this would load different agent data
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">BeBrahma UX Demo</h1>
              <p className="text-gray-600">Experience the enhanced user interface components</p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentView('meeting')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'meeting'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Meeting Room
              </button>
              <button
                onClick={() => setCurrentView('decisions')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'decisions'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Decision Hub
              </button>
              <button
                onClick={() => setCurrentView('research')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'research'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Research Workspace
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Component Views */}
      <div className="max-w-7xl mx-auto">
        {currentView === 'meeting' && (
          <VirtualMeetingRoom
            sessionId={sessionId}
            currentStage="problem-capture"
            agents={mockAgents}
            messages={mockMessages}
            onUserMessage={handleUserMessage}
            onStageProgress={handleStageProgress}
          />
        )}
        
        {currentView === 'decisions' && (
          <DecisionHub
            decisions={mockDecisions}
            onDecisionAction={handleDecisionAction}
            onViewDetails={handleViewDecisionDetails}
          />
        )}
        
        {currentView === 'research' && (
          <AgentResearchWorkspace
            agentId="research"
            researchData={mockResearchData}
            onAgentChange={handleAgentChange}
          />
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 mt-8">
        <div className="max-w-7xl mx-auto text-center text-gray-500">
          <p>This is a demonstration of the new UX-enhanced components for BeBrahma.</p>
          <p className="text-sm mt-2">
            All components are built with React, TypeScript, Tailwind CSS, and Framer Motion.
          </p>
        </div>
      </div>
    </div>
  );
}
