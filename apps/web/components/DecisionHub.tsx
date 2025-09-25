import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Edit3, Pause, Play, Download, FileText, TrendingUp, Target, Users, Calendar } from 'lucide-react';

interface DecisionHubProps {
  decisionDocument: string;
}

interface Decision {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'refined' | 'paused';
  agents: string[];
  createdAt: string;
  deadline?: string;
  approvedAt?: string;
  category: 'business-model' | 'pricing' | 'go-to-market' | 'technical' | 'user-experience';
  priority: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  estimatedEffort: string;
  businessValue: string;
}

export function DecisionHub({ decisionDocument }: DecisionHubProps) {
  const [activeTab, setActiveTab] = useState<'decisions' | 'approvals' | 'history' | 'analytics'>('decisions');
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize with dynamic data based on decision document content
  useEffect(() => {
    if (decisionDocument) {
      // Parse decision document to extract decisions
      const extractedDecisions = extractDecisionsFromDocument(decisionDocument);
      setDecisions(extractedDecisions);
    } else {
      // Show placeholder decisions for demonstration
      setDecisions([
        {
          id: '1',
          title: 'Business Model Selection',
          description: 'Choose between freemium, premium, or hybrid SaaS business model',
          status: 'pending',
          agents: ['CEO', 'Business Analyst'],
          createdAt: new Date().toISOString(),
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'business-model',
          priority: 'high',
          impact: 'high',
          estimatedEffort: '2-3 weeks',
          businessValue: 'Revenue model definition'
        },
        {
          id: '2',
          title: 'Pricing Strategy',
          description: 'Define pricing tiers, pricing model, and competitive positioning',
          status: 'pending',
          agents: ['Product Manager', 'Business Analyst'],
          createdAt: new Date().toISOString(),
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'pricing',
          priority: 'high',
          impact: 'high',
          estimatedEffort: '1-2 weeks',
          businessValue: 'Market competitiveness'
        },
        {
          id: '3',
          title: 'Go-to-Market Strategy',
          description: 'Select primary channels, tactics, and budget allocation',
          status: 'pending',
          agents: ['Marketing Lead', 'Sales Lead'],
          createdAt: new Date().toISOString(),
          deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'go-to-market',
          priority: 'medium',
          impact: 'high',
          estimatedEffort: '3-4 weeks',
          businessValue: 'Customer acquisition'
        }
      ]);
    }
    setIsLoading(false);
  }, [decisionDocument]);

  const extractDecisionsFromDocument = (document: string): Decision[] => {
    // This would parse the actual decision document to extract real decisions
    // For now, return empty array to be populated by real data
    return [];
  };

  const handleDecisionAction = (decisionId: string, action: 'approve' | 'reject' | 'refine' | 'pause') => {
    setDecisions(prev => prev.map(decision => {
      if (decision.id === decisionId) {
        const updatedDecision = { ...decision };
        
        switch (action) {
          case 'approve':
            updatedDecision.status = 'approved';
            updatedDecision.approvedAt = new Date().toISOString();
            break;
          case 'reject':
            updatedDecision.status = 'rejected';
            break;
          case 'refine':
            updatedDecision.status = 'refined';
            break;
          case 'pause':
            updatedDecision.status = 'paused';
            break;
        }
        
        return updatedDecision;
      }
      return decision;
    }));
  };

  const exportDecisionDocument = () => {
    if (decisionDocument) {
      const blob = new Blob([decisionDocument], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decision-document-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'refined': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-purple-100 text-purple-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'business-model': return '🏢';
      case 'pricing': return '💰';
      case 'go-to-market': return '🚀';
      case 'technical': return '⚡';
      case 'user-experience': return '🎨';
      default: return '📋';
    }
  };

  const renderDecisionsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Active Strategic Decisions
        </h2>
        <button
          onClick={exportDecisionDocument}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Document
        </button>
      </div>

      {decisions.filter(d => d.status === 'pending').map((decision) => (
        <div key={decision.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{getCategoryIcon(decision.category)}</span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{decision.title}</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-3">{decision.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(decision.priority)}`}>
                  Priority: {decision.priority}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getImpactColor(decision.impact)}`}>
                  Impact: {decision.impact}
                </span>
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  Effort: {decision.estimatedEffort}
                </span>
                <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                  Value: {decision.businessValue}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{decision.agents.join(', ')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Due: {decision.deadline ? new Date(decision.deadline).toLocaleDateString() : 'No deadline'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleDecisionAction(decision.id, 'approve')}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={() => handleDecisionAction(decision.id, 'refine')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Refine
            </button>
            <button
              onClick={() => handleDecisionAction(decision.id, 'pause')}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
            <button
              onClick={() => handleDecisionAction(decision.id, 'reject')}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderApprovalsView = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pending Approvals</h2>
      {decisions.filter(d => d.status === 'pending').length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No pending approvals! All decisions have been processed.</p>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Target className="w-16 h-16 mx-auto" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">Review the decisions above and take action!</p>
        </div>
      )}
    </div>
  );

  const renderHistoryView = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Decision History</h2>
      {decisions.filter(d => d.status !== 'pending').map((decision) => (
        <div key={decision.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getCategoryIcon(decision.category)}</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{decision.title}</h3>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(decision.status)}`}>
              {decision.status.charAt(0).toUpperCase() + decision.status.slice(1)}
            </span>
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 mb-3">{decision.description}</p>
          
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Agents: {decision.agents.join(', ')}</span>
            <span>Created: {new Date(decision.createdAt).toLocaleDateString()}</span>
            {decision.approvedAt && (
              <span>Approved: {new Date(decision.approvedAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderAnalyticsView = () => {
    const totalDecisions = decisions.length;
    const pendingDecisions = decisions.filter(d => d.status === 'pending').length;
    const approvedDecisions = decisions.filter(d => d.status === 'approved').length;
    const highPriorityDecisions = decisions.filter(d => d.priority === 'high').length;
    const highImpactDecisions = decisions.filter(d => d.impact === 'high').length;

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Decision Analytics</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalDecisions}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Decisions</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{pendingDecisions}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{approvedDecisions}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Approved</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{highPriorityDecisions}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">High Priority</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Decision Categories</h3>
          <div className="space-y-3">
            {['business-model', 'pricing', 'go-to-market', 'technical', 'user-experience'].map(category => {
              const count = decisions.filter(d => d.category === category).length;
              return (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{getCategoryIcon(category)}</span>
                    <span className="capitalize">{category.replace('-', ' ')}</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading decisions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6">
        <h1 className="text-2xl font-bold mb-2">🎯 Decision Hub</h1>
        <p className="text-green-100">
          Strategic decision-making center for your SaaS business analysis
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-8 px-6">
          {[
            { id: 'decisions', label: 'Active Decisions', count: decisions.filter(d => d.status === 'pending').length },
            { id: 'approvals', label: 'Pending Approvals', count: decisions.filter(d => d.status === 'pending').length },
            { id: 'history', label: 'Decision History', count: decisions.filter(d => d.status !== 'pending').length },
            { id: 'analytics', label: 'Analytics', count: null }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className="ml-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium px-2 py-1 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'decisions' && renderDecisionsView()}
        {activeTab === 'approvals' && renderApprovalsView()}
        {activeTab === 'history' && renderHistoryView()}
        {activeTab === 'analytics' && renderAnalyticsView()}
      </div>
    </div>
  );
}
