'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, FileText, Code, Activity, BarChart3, ExternalLink, Download, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { handleError, createUserInputError, logError } from '../../utils/errorHandling';

interface AgentResearchData {
  agentId: string;
  toolsUsed: Array<{
    toolName: string;
    callCount: number;
    lastUsed: Date;
    successRate: number;
    avgResponseTime: number;
  }>;
  sitesBrowsed: Array<{
    url: string;
    title: string;
    visitedAt: Date;
    contentExtracted: boolean;
    firecrawlJobId?: string;
    relevanceScore: number;
  }>;
  documentsRead: Array<{
    filename: string;
    type: string;
    readAt: Date;
    progress: number;
  }>;
  contentCreated: Array<{
    type: string;
    title: string;
    createdAt: Date;
    size: number;
  }>;
}

interface ActivityItem {
  id: string;
  type: 'tool_used' | 'site_visited' | 'document_read' | 'content_created';
  description: string;
  timestamp: Date;
  metadata: any;
}

interface AgentResearchWorkspaceProps {
  agentId: string;
  researchData: AgentResearchData;
  onAgentChange: (agentId: string) => void;
}

export default function AgentResearchWorkspace({
  agentId,
  researchData,
  onAgentChange
}: AgentResearchWorkspaceProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [agentChangeError, setAgentChangeError] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState<string | null>(null);

  // Mock activity feed - in real implementation this would come from WebSocket
  useEffect(() => {
    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'tool_used',
        description: 'Used OpenAI API for market analysis',
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        metadata: { tool: 'OpenAI', success: true }
      },
      {
        id: '2',
        type: 'site_visited',
        description: 'Browsed competitor website',
        timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
        metadata: { url: 'https://competitor.com', extracted: true }
      },
      {
        id: '3',
        type: 'document_read',
        description: 'Analyzed market research PDF',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        metadata: { filename: 'market_research.pdf', progress: 85 }
      }
    ];
    setActivityFeed(mockActivities);
  }, [agentId]);

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'tools': return <Code className="w-6 h-6" />;
      case 'sites': return <Globe className="w-6 h-6" />;
      case 'documents': return <FileText className="w-6 h-6" />;
      case 'content': return <BarChart3 className="w-6 h-6" />;
      default: return <Activity className="w-6 h-6" />;
    }
  };

  const getSectionColor = (section: string) => {
    switch (section) {
      case 'tools': return 'from-blue-500 to-blue-600';
      case 'sites': return 'from-green-500 to-green-600';
      case 'documents': return 'from-orange-500 to-orange-600';
      case 'content': return 'from-purple-500 to-purple-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'tool_used': return <Code className="w-4 h-4 text-blue-500" />;
      case 'site_visited': return <Globe className="w-4 h-4 text-green-500" />;
      case 'document_read': return <FileText className="w-4 h-4 text-orange-500" />;
      case 'content_created': return <BarChart3 className="w-4 h-4 text-purple-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Agent Research Workspace</h1>
              <p className="text-gray-600">Monitor agent research activities and tool usage</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Agent Selector */}
              <select
                value={agentId}
                onChange={(e) => {
                  try {
                    setAgentChangeError(null);
                    onAgentChange(e.target.value);
                  } catch (error) {
                    const appError = handleError(error, { context: 'agentChange', newAgentId: e.target.value });
                    setAgentChangeError(appError.userMessage || 'An error occurred while changing agent');
                    logError(appError);
                  }
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pm">Project Manager</option>
                <option value="ceo">Chief Executive</option>
                <option value="cto">Chief Technology Officer</option>
                <option value="growth">Growth Strategist</option>
                <option value="research">Research Analyst</option>
                <option value="data">Data Scientist</option>
                <option value="strategy">Strategy Consultant</option>
                <option value="devops">DevOps Engineer</option>
              </select>

              {/* Time Range Filter */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Error Display */}
        {(agentChangeError || sectionError) && (
          <div className="mt-4 space-y-2">
            {agentChangeError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{agentChangeError}</span>
                <button
                  onClick={() => setAgentChangeError(null)}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
            
            {sectionError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{sectionError}</span>
                <button
                  onClick={() => setSectionError(null)}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Quad Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Tools Used Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              try {
                setSectionError(null);
                setSelectedSection('tools');
              } catch (error) {
                const appError = handleError(error, { context: 'sectionSelection', section: 'tools' });
                setSectionError(appError.userMessage || 'An error occurred while selecting section');
                logError(appError);
              }
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-gradient-to-r ${getSectionColor('tools')} text-white`}>
                {getSectionIcon('tools')}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {researchData.toolsUsed.length}
                </div>
                <div className="text-sm text-gray-500">Tools Used</div>
              </div>
            </div>
            
            <div className="space-y-3">
              {researchData.toolsUsed.slice(0, 3).map((tool, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{tool.toolName}</div>
                    <div className="text-sm text-gray-500">{tool.callCount} calls</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{tool.successRate}%</div>
                    <div className="text-xs text-gray-500">success</div>
                  </div>
                </div>
              ))}
              {researchData.toolsUsed.length > 3 && (
                <div className="text-center text-sm text-blue-600 hover:text-blue-700">
                  View all {researchData.toolsUsed.length} tools
                </div>
              )}
            </div>
          </motion.div>

          {/* Sites Browsed Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              try {
                setSectionError(null);
                setSelectedSection('sites');
              } catch (error) {
                const appError = handleError(error, { context: 'sectionSelection', section: 'sites' });
                setSectionError(appError.userMessage || 'An error occurred while selecting section');
                logError(appError);
              }
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-gradient-to-r ${getSectionColor('sites')} text-white`}>
                {getSectionIcon('sites')}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {researchData.sitesBrowsed.length}
                </div>
                <div className="text-sm text-gray-500">Sites Visited</div>
              </div>
            </div>
            
            <div className="space-y-3">
              {researchData.sitesBrowsed.slice(0, 3).map((site, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{site.title}</div>
                    <div className="text-sm text-gray-500 truncate">{site.url}</div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-sm font-medium text-gray-900">{site.relevanceScore}%</div>
                    <div className="text-xs text-gray-500">relevance</div>
                  </div>
                </div>
              ))}
              {researchData.sitesBrowsed.length > 3 && (
                <div className="text-center text-sm text-green-600 hover:text-green-700">
                  View all {researchData.sitesBrowsed.length} sites
                </div>
              )}
            </div>
          </motion.div>

          {/* Documents Read Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              try {
                setSectionError(null);
                setSelectedSection('documents');
              } catch (error) {
                const appError = handleError(error, { context: 'sectionSelection', section: 'documents' });
                setSectionError(appError.userMessage || 'An error occurred while selecting section');
                logError(appError);
              }
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-gradient-to-r ${getSectionColor('documents')} text-white`}>
                {getSectionIcon('documents')}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {researchData.documentsRead.length}
                </div>
                <div className="text-sm text-gray-500">Documents</div>
              </div>
            </div>
            
            <div className="space-y-3">
              {researchData.documentsRead.slice(0, 3).map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{doc.filename}</div>
                    <div className="text-sm text-gray-500">{doc.type.toUpperCase()}</div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-sm font-medium text-gray-900">{doc.progress}%</div>
                    <div className="text-xs text-gray-500">read</div>
                  </div>
                </div>
              ))}
              {researchData.documentsRead.length > 3 && (
                <div className="text-center text-sm text-orange-600 hover:text-orange-700">
                  View all {researchData.documentsRead.length} documents
                </div>
              )}
            </div>
          </motion.div>

          {/* Content Created Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              try {
                setSectionError(null);
                setSelectedSection('content');
              } catch (error) {
                const appError = handleError(error, { context: 'sectionSelection', section: 'content' });
                setSectionError(appError.userMessage || 'An error occurred while selecting section');
                logError(appError);
              }
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-gradient-to-r ${getSectionColor('content')} text-white`}>
                {getSectionIcon('content')}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {researchData.contentCreated.length}
                </div>
                <div className="text-sm text-gray-500">Artifacts</div>
              </div>
            </div>
            
            <div className="space-y-3">
              {researchData.contentCreated.slice(0, 3).map((content, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{content.title}</div>
                    <div className="text-sm text-gray-500">{content.type}</div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-sm font-medium text-gray-900">{content.size}KB</div>
                    <div className="text-xs text-gray-500">size</div>
                  </div>
                </div>
              ))}
              {researchData.contentCreated.length > 3 && (
                <div className="text-center text-sm text-purple-600 hover:text-purple-700">
                  View all {researchData.contentCreated.length} artifacts
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Real-time Activity Feed</h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500">Live updates</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <AnimatePresence>
              {activityFeed.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <button className="text-xs text-blue-600 hover:text-blue-700">
                      View Details
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Section Details Modal */}
      <AnimatePresence>
        {selectedSection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              try {
                setSelectedSection(null);
              } catch (error) {
                const appError = handleError(error, { context: 'modalBackdropClick', section: selectedSection });
                logError(appError);
                // Force close on error
                setSelectedSection(null);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${getSectionColor(selectedSection)} text-white`}>
                      {getSectionIcon(selectedSection)}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 capitalize">
                      {selectedSection} Details
                    </h2>
                  </div>
                  
                  <button
                    onClick={() => {
                      try {
                        setSelectedSection(null);
                      } catch (error) {
                        const appError = handleError(error, { context: 'closeSectionModal', section: selectedSection });
                        logError(appError);
                        // Force close on error
                        setSelectedSection(null);
                      }
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                {/* Section-specific content would go here */}
                <div className="text-center py-12 text-gray-500">
                  Detailed view for {selectedSection} section
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
