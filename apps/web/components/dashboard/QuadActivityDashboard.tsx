'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, FileText, Code, Activity, BarChart3, ExternalLink, Download, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { useActivityDashboard } from '../../hooks/useActivityDashboard';

interface QuadActivityDashboardProps {
  sessionId: string;
}

export default function QuadActivityDashboard({ sessionId }: QuadActivityDashboardProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  const {
    connectionStatus,
    loading,
    error,
    toolsUsed,
    sitesBrowsed,
    documentsRead,
    contentCreated,
    activityFeed,
    refreshData,
    isConnected,
    totalTools,
    totalSites,
    totalDocuments,
    totalContent
  } = useActivityDashboard({
    sessionId,
    autoConnect: true
  });

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

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getSectionData = (section: string) => {
    switch (section) {
      case 'tools':
        return toolsUsed.map((tool, idx) => (
          <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">{tool.toolName}</div>
              <div className="text-sm text-gray-500">{tool.callCount} calls • Last used {formatTimeAgo(tool.lastUsed)}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-900">{Math.round(tool.successRate * 100)}%</div>
              <div className="text-xs text-gray-500">success rate</div>
            </div>
          </div>
        ));
      case 'sites':
        return sitesBrowsed.map((site, idx) => (
          <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{site.title}</div>
              <div className="text-sm text-gray-500 truncate">{site.url}</div>
              <div className="text-xs text-gray-400">Visited {site.visitCount} times • Last visit {formatTimeAgo(site.lastVisited)}</div>
            </div>
            <button
              onClick={() => window.open(site.url, '_blank')}
              className="ml-3 text-blue-600 hover:text-blue-700"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        ));
      case 'documents':
        return documentsRead.map((doc, idx) => (
          <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{doc.title}</div>
              <div className="text-sm text-gray-500">{doc.type.toUpperCase()}</div>
              <div className="text-xs text-gray-400">{formatTimeAgo(doc.timestamp)}</div>
            </div>
            <div className="text-right ml-3">
              <div className="text-sm font-medium text-gray-900">{doc.content.length} chars</div>
              <div className="text-xs text-gray-500">content</div>
            </div>
          </div>
        ));
      case 'content':
        return contentCreated.map((content, idx) => (
          <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{content.title}</div>
              <div className="text-sm text-gray-500">{content.type}</div>
              <div className="text-xs text-gray-400">{formatTimeAgo(content.timestamp)}</div>
            </div>
            <div className="text-right ml-3">
              <div className="text-sm font-medium text-gray-900">{Math.round(content.content.length / 1024)}KB</div>
              <div className="text-xs text-gray-500">size</div>
            </div>
          </div>
        ));
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading activity dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Activity Dashboard</h1>
              <p className="text-gray-600">Real-time agent activity and tool usage monitoring</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-500">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Refresh Button */}
              <button
                onClick={refreshData}
                disabled={loading}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

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
        {error && (
          <div className="mt-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
              <button
                onClick={refreshData}
                className="ml-auto text-red-600 hover:text-red-700"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </motion.div>
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
            onClick={() => setSelectedSection('tools')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-gradient-to-r ${getSectionColor('tools')} text-white`}>
                {getSectionIcon('tools')}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{totalTools}</div>
                <div className="text-sm text-gray-500">Tools Used</div>
              </div>
            </div>
            
            <div className="space-y-3">
              {toolsUsed.slice(0, 3).map((tool, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{tool.toolName}</div>
                    <div className="text-sm text-gray-500">{tool.callCount} calls</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{Math.round(tool.successRate * 100)}%</div>
                    <div className="text-xs text-gray-500">success</div>
                  </div>
                </div>
              ))}
              {totalTools > 3 && (
                <div className="text-center text-sm text-blue-600 hover:text-blue-700">
                  View all {totalTools} tools
                </div>
              )}
              {totalTools === 0 && (
                <div className="text-center text-sm text-gray-500 py-4">
                  No tools used yet
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
            onClick={() => setSelectedSection('sites')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-gradient-to-r ${getSectionColor('sites')} text-white`}>
                {getSectionIcon('sites')}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{totalSites}</div>
                <div className="text-sm text-gray-500">Sites Visited</div>
              </div>
            </div>
            
            <div className="space-y-3">
              {sitesBrowsed.slice(0, 3).map((site, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{site.title}</div>
                    <div className="text-sm text-gray-500 truncate">{site.url}</div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-sm font-medium text-gray-900">{site.visitCount}</div>
                    <div className="text-xs text-gray-500">visits</div>
                  </div>
                </div>
              ))}
              {totalSites > 3 && (
                <div className="text-center text-sm text-green-600 hover:text-green-700">
                  View all {totalSites} sites
                </div>
              )}
              {totalSites === 0 && (
                <div className="text-center text-sm text-gray-500 py-4">
                  No sites visited yet
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
            onClick={() => setSelectedSection('documents')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-gradient-to-r ${getSectionColor('documents')} text-white`}>
                {getSectionIcon('documents')}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{totalDocuments}</div>
                <div className="text-sm text-gray-500">Documents</div>
              </div>
            </div>
            
            <div className="space-y-3">
              {documentsRead.slice(0, 3).map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{doc.title}</div>
                    <div className="text-sm text-gray-500">{doc.type.toUpperCase()}</div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-sm font-medium text-gray-900">{Math.round(doc.content.length / 1024)}KB</div>
                    <div className="text-xs text-gray-500">size</div>
                  </div>
                </div>
              ))}
              {totalDocuments > 3 && (
                <div className="text-center text-sm text-orange-600 hover:text-orange-700">
                  View all {totalDocuments} documents
                </div>
              )}
              {totalDocuments === 0 && (
                <div className="text-center text-sm text-gray-500 py-4">
                  No documents read yet
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
            onClick={() => setSelectedSection('content')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-gradient-to-r ${getSectionColor('content')} text-white`}>
                {getSectionIcon('content')}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{totalContent}</div>
                <div className="text-sm text-gray-500">Artifacts</div>
              </div>
            </div>
            
            <div className="space-y-3">
              {contentCreated.slice(0, 3).map((content, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{content.title}</div>
                    <div className="text-sm text-gray-500">{content.type}</div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-sm font-medium text-gray-900">{Math.round(content.content.length / 1024)}KB</div>
                    <div className="text-xs text-gray-500">size</div>
                  </div>
                </div>
              ))}
              {totalContent > 3 && (
                <div className="text-center text-sm text-purple-600 hover:text-purple-700">
                  View all {totalContent} artifacts
                </div>
              )}
              {totalContent === 0 && (
                <div className="text-center text-sm text-gray-500 py-4">
                  No content created yet
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
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-500">
                {isConnected ? 'Live updates' : 'Disconnected'}
              </span>
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
            
            {activityFeed.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No recent activity</p>
                <p className="text-sm">Activity will appear here as agents work</p>
              </div>
            )}
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
            onClick={() => setSelectedSection(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${getSectionColor(selectedSection)} text-white`}>
                      {getSectionIcon(selectedSection)}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 capitalize">
                      {selectedSection} Details
                    </h2>
                  </div>
                  
                  <button
                    onClick={() => setSelectedSection(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-4">
                  {getSectionData(selectedSection)}
                  {getSectionData(selectedSection)?.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      No {selectedSection} data available
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}