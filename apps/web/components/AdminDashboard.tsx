'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { RoleManager } from './admin/RoleManager';
import { AnalyticsDashboard } from './admin/AnalyticsDashboard';
import { FeedbackManager } from './admin/FeedbackManager';

interface DashboardData {
  overview: {
    totalSessions: number;
    activeSessions: number;
    totalMessages: number;
    systemUptime: number;
  };
  agentUsage: Record<string, number>;
  recentActivity: Array<{
    sessionId: string;
    projectTitle: string;
    lastActivity: string;
    messageCount: number;
    status: string;
  }>;
}

interface AgentStats {
  agentId: string;
  agentName: string;
  department: string;
  totalMessages: number;
  averageThinkingTime: number;
  averageConfidence: number;
  dataPoints: number;
  uniqueSessions: number;
}

interface PerformanceMetrics {
  totalSessions: number;
  totalMessages: number;
  totalAgentMessages: number;
  averageResponseTime: number;
  successRate: number;
  systemUptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  activeConnections: number;
}

interface RealTimeData {
  timestamp: string;
  activeSessions: number;
  recentMessages: Array<{
    id: string;
    content: string;
    sender: string;
    timestamp: string;
    sessionId: string;
    projectTitle: string;
  }>;
  systemStatus: string;
  lastActivity: string | null;
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [realTimeData, setRealTimeData] = useState<RealTimeData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'performance' | 'realtime' | 'analytics' | 'feedback' | 'roles'>('overview');
  const [loading, setLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL as string;

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/dashboard`);
      const data = await response.json();
      if (data.success) {
        setDashboardData(data.dashboard);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const fetchAgentStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/agents`);
      const data = await response.json();
      if (data.success) {
        setAgentStats(data.agents);
      }
    } catch (error) {
      console.error('Failed to fetch agent stats:', error);
    }
  };

  const fetchPerformanceMetrics = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/performance`);
      const data = await response.json();
      if (data.success) {
        setPerformanceMetrics(data.performance);
      }
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    }
  };

  const fetchRealTimeData = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/real-time`);
      const data = await response.json();
      if (data.success) {
        setRealTimeData(data.realTime);
      }
    } catch (error) {
      console.error('Failed to fetch real-time data:', error);
    }
  };

  const refreshAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchDashboardData(),
      fetchAgentStats(),
      fetchPerformanceMetrics(),
      fetchRealTimeData()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAllData();

    // Set up real-time updates every 10 seconds
    const interval = setInterval(() => {
      if (activeTab === 'realtime') {
        fetchRealTimeData();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-lg text-gray-900 dark:text-white">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">BeBrahma Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Monitor system performance, agent activities, and real-time requests</p>
        </div>

        {/* Refresh Button */}
        <div className="mb-6">
          <Button
            onClick={refreshAllData}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh All Data'}
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm transition-colors">
          {[
            { id: 'overview', label: '📊 Overview', icon: '📊' },
            { id: 'agents', label: '🤖 Agents', icon: '🤖' },
            { id: 'performance', label: '⚡ Performance', icon: '⚡' },
            { id: 'realtime', label: '🔄 Real-time', icon: '🔄' },
            { id: 'roles', label: '👥 User Roles', icon: '👥' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* System Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                  <div className="h-4 w-4 text-blue-600">📁</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.overview.totalSessions}</div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData.overview.activeSessions} currently active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                  <div className="h-4 w-4 text-green-600">💬</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.overview.totalMessages}</div>
                  <p className="text-xs text-muted-foreground">
                    Across all sessions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
                  <div className="h-4 w-4 text-purple-600">⏱️</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatUptime(dashboardData.overview.systemUptime)}</div>
                  <p className="text-xs text-muted-foreground">
                    Since last restart
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                  <div className="h-4 w-4 text-orange-600">🔥</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.overview.activeSessions}</div>
                  <p className="text-xs text-muted-foreground">
                    In last 30 minutes
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Agent Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Agent Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(dashboardData.agentUsage).map(([agentId, count]) => (
                    <div key={agentId} className="flex items-center justify-between">
                      <span className="font-medium">{agentId}</span>
                      <span className="text-sm text-gray-600">{count} messages</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.recentActivity.map((activity) => (
                    <div key={activity.sessionId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg transition-colors">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{activity.projectTitle}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Session: {activity.sessionId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.messageCount} messages</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(activity.lastActivity).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Agent Performance Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Agent</th>
                        <th className="text-left p-2">Department</th>
                        <th className="text-left p-2">Messages</th>
                        <th className="text-left p-2">Avg Thinking Time</th>
                        <th className="text-left p-2">Confidence</th>
                        <th className="text-left p-2">Data Points</th>
                        <th className="text-left p-2">Sessions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentStats.map((agent) => (
                        <tr key={agent.agentId} className="border-b">
                          <td className="p-2 font-medium">{agent.agentName}</td>
                          <td className="p-2">{agent.department}</td>
                          <td className="p-2">{agent.totalMessages}</td>
                          <td className="p-2">{Math.round(agent.averageThinkingTime)}ms</td>
                          <td className="p-2">{Math.round(agent.averageConfidence * 100)}%</td>
                          <td className="p-2">{agent.dataPoints}</td>
                          <td className="p-2">{agent.uniqueSessions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && performanceMetrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Response Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Avg Response Time:</span>
                      <span className="font-medium">{performanceMetrics.averageResponseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate:</span>
                      <span className="font-medium">{performanceMetrics.successRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Connections:</span>
                      <span className="font-medium">{performanceMetrics.activeConnections}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Memory Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>RSS:</span>
                      <span className="font-medium">{formatBytes(performanceMetrics.memoryUsage.rss)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Heap Total:</span>
                      <span className="font-medium">{formatBytes(performanceMetrics.memoryUsage.heapTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Heap Used:</span>
                      <span className="font-medium">{formatBytes(performanceMetrics.memoryUsage.heapUsed)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Uptime:</span>
                      <span className="font-medium">{formatUptime(performanceMetrics.systemUptime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Sessions:</span>
                      <span className="font-medium">{performanceMetrics.totalSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Messages:</span>
                      <span className="font-medium">{performanceMetrics.totalMessages}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Real-time Tab */}
        {activeTab === 'realtime' && realTimeData && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Real-time System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{realTimeData.activeSessions}</div>
                    <div className="text-sm text-green-600">Active Sessions</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{realTimeData.recentMessages.length}</div>
                    <div className="text-sm text-blue-600">Recent Messages</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{realTimeData.systemStatus}</div>
                    <div className="text-sm text-purple-600">System Status</div>
                  </div>
                </div>

                <div className="text-sm text-gray-600 mb-4">
                  Last updated: {new Date(realTimeData.timestamp).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Messages (Last 10 minutes)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {realTimeData.recentMessages.map((message) => (
                    <div key={message.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${message.sender === 'user' ? 'bg-blue-100 text-blue-800' :
                              message.sender === 'agent' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                              {message.sender}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">{message.content}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Session: {message.sessionId} | Project: {message.projectTitle}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <AnalyticsDashboard />
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <div className="space-y-6">
            <FeedbackManager />
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <RoleManager />
          </div>
        )}
      </div>
    </div>
  );
}
