'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  MapPin, 
  Device, 
  Globe, 
  BarChart3, 
  PieChart, 
  LineChart, 
  Download, 
  Filter, 
  Search, 
  RefreshCw,
  Eye,
  MousePointer,
  Target,
  Zap,
  X,
  ChevronRight
} from 'lucide-react';
import { useAnalytics } from '../analytics/AnalyticsProvider';

// User behavior interfaces
interface UserBehavior {
  userId: string;
  email: string;
  plan: string;
  lastActive: string;
  sessionCount: number;
  totalTime: number;
  pageViews: number;
  featuresUsed: string[];
  conversionPath: string[];
  engagementScore: number;
  churnRisk: 'low' | 'medium' | 'high';
}

interface BehaviorMetrics {
  totalUsers: number;
  activeUsers: number;
  averageSessionDuration: number;
  averagePagesPerSession: number;
  topFeatures: Array<{ feature: string; usage: number; growth: number }>;
  userSegments: Array<{ segment: string; count: number; percentage: number }>;
  geographicDistribution: Array<{ country: string; users: number; percentage: number }>;
  deviceUsage: Array<{ device: string; users: number; percentage: number }>;
}

interface TimeSeriesBehavior {
  date: string;
  activeUsers: number;
  sessions: number;
  pageViews: number;
  engagementScore: number;
}

// User behavior analytics props
interface UserBehaviorAnalyticsProps {
  timeRange?: '7d' | '30d' | '90d' | '1y';
}

// User behavior analytics component
export const UserBehaviorAnalytics: React.FC<UserBehaviorAnalyticsProps> = ({ 
  timeRange = '30d' 
}) => {
  const { trackFeatureUsage } = useAnalytics();
  const [loading, setLoading] = useState(true);
  const [userBehaviors, setUserBehaviors] = useState<UserBehavior[]>([]);
  const [metrics, setMetrics] = useState<BehaviorMetrics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesBehavior[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserBehavior | null>(null);
  const [filters, setFilters] = useState({
    plan: 'all',
    engagement: 'all',
    churnRisk: 'all',
    dateRange: timeRange
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<keyof TimeSeriesBehavior>('activeUsers');

  // Fetch user behavior data
  useEffect(() => {
    const fetchBehaviorData = async () => {
      setLoading(true);
      try {
        trackFeatureUsage('user_behavior_analytics', 'data_fetched', { timeRange: filters.dateRange });
        
        // Fetch user behaviors
        const behaviorsResponse = await fetch(`/api/analytics/user-behavior?range=${filters.dateRange}`);
        const behaviorsData = await behaviorsResponse.json();
        setUserBehaviors(behaviorsData.behaviors);
        
        // Fetch behavior metrics
        const metricsResponse = await fetch(`/api/analytics/behavior-metrics?range=${filters.dateRange}`);
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
        
        // Fetch time series data
        const timeSeriesResponse = await fetch(`/api/analytics/behavior-timeseries?range=${filters.dateRange}`);
        const timeSeriesData = await timeSeriesResponse.json();
        setTimeSeriesData(timeSeriesData);
        
      } catch (error) {
        console.error('Error fetching behavior data:', error);
        generateMockData();
      } finally {
        setLoading(false);
      }
    };

    fetchBehaviorData();
  }, [filters.dateRange, trackFeatureUsage]);

  // Generate mock data
  const generateMockData = () => {
    const mockBehaviors: UserBehavior[] = [
      {
        userId: 'user1',
        email: 'john@example.com',
        plan: 'professional',
        lastActive: new Date().toISOString(),
        sessionCount: 45,
        totalTime: 7200,
        pageViews: 156,
        featuresUsed: ['Project Creation', 'Task Management', 'Analytics'],
        conversionPath: ['Landing Page', 'Sign Up', 'Dashboard', 'Project Creation'],
        engagementScore: 8.5,
        churnRisk: 'low'
      },
      {
        userId: 'user2',
        email: 'sarah@example.com',
        plan: 'starter',
        lastActive: new Date(Date.now() - 86400000).toISOString(),
        sessionCount: 12,
        totalTime: 1800,
        pageViews: 34,
        featuresUsed: ['Project Creation'],
        conversionPath: ['Landing Page', 'Sign Up', 'Dashboard'],
        engagementScore: 4.2,
        churnRisk: 'medium'
      },
      {
        userId: 'user3',
        email: 'mike@example.com',
        plan: 'free',
        lastActive: new Date(Date.now() - 172800000).toISOString(),
        sessionCount: 3,
        totalTime: 300,
        pageViews: 8,
        featuresUsed: ['Project Creation'],
        conversionPath: ['Landing Page', 'Sign Up'],
        engagementScore: 1.8,
        churnRisk: 'high'
      }
    ];

    setUserBehaviors(mockBehaviors);
    setMetrics({
      totalUsers: 1247,
      activeUsers: 892,
      averageSessionDuration: 1247,
      averagePagesPerSession: 4.2,
      topFeatures: [
        { feature: 'Project Creation', usage: 78, growth: 12 },
        { feature: 'Task Management', usage: 92, growth: 8 },
        { feature: 'Analytics', usage: 45, growth: 25 },
        { feature: 'Team Collaboration', usage: 67, growth: 15 }
      ],
      userSegments: [
        { segment: 'Power Users', count: 234, percentage: 18.8 },
        { segment: 'Regular Users', count: 456, percentage: 36.6 },
        { segment: 'Occasional Users', count: 345, percentage: 27.7 },
        { segment: 'At Risk', count: 212, percentage: 17.0 }
      ],
      geographicDistribution: [
        { country: 'United States', users: 456, percentage: 36.6 },
        { country: 'United Kingdom', users: 234, percentage: 18.8 },
        { country: 'Germany', users: 123, percentage: 9.9 },
        { country: 'Canada', users: 98, percentage: 7.9 }
      ],
      deviceUsage: [
        { device: 'Desktop', users: 789, percentage: 63.3 },
        { device: 'Mobile', users: 345, percentage: 27.7 },
        { device: 'Tablet', users: 113, percentage: 9.1 }
      ]
    });

    // Generate time series data
    const days = filters.dateRange === '7d' ? 7 : 
                 filters.dateRange === '30d' ? 30 : 
                 filters.dateRange === '90d' ? 90 : 365;
    
    const mockTimeSeriesData: TimeSeriesBehavior[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      mockTimeSeriesData.push({
        date: date.toISOString().split('T')[0],
        activeUsers: Math.floor(Math.random() * 100) + 800,
        sessions: Math.floor(Math.random() * 200) + 150,
        pageViews: Math.floor(Math.random() * 500) + 300,
        engagementScore: Math.random() * 5 + 3
      });
    }
    
    setTimeSeriesData(mockTimeSeriesData);
  };

  // Filter user behaviors
  const filteredBehaviors = userBehaviors.filter(behavior => {
    if (filters.plan !== 'all' && behavior.plan !== filters.plan) return false;
    if (filters.engagement !== 'all') {
      if (filters.engagement === 'high' && behavior.engagementScore < 7) return false;
      if (filters.engagement === 'medium' && (behavior.engagementScore < 4 || behavior.engagementScore >= 7)) return false;
      if (filters.engagement === 'low' && behavior.engagementScore >= 4) return false;
    }
    if (filters.churnRisk !== 'all' && behavior.churnRisk !== filters.churnRisk) return false;
    if (searchTerm && !behavior.email.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Handle export
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      trackFeatureUsage('user_behavior_analytics', 'export_started', { format });
      
      const response = await fetch('/api/analytics/export', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-behavior-${filters.dateRange}.csv`;
        a.click();
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-behavior-${filters.dateRange}.json`;
        a.click();
      }
      
      trackFeatureUsage('user_behavior_analytics', 'export_completed', { format });
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Get churn risk color
  const getChurnRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get engagement level
  const getEngagementLevel = (score: number) => {
    if (score >= 7) return 'High';
    if (score >= 4) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user behavior analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Behavior Analytics</h1>
          <p className="text-gray-600">
            Deep insights into user interactions, engagement patterns, and conversion paths
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-md transition-colors ${
              showFilters ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4 mr-2 inline" />
            Filters
          </button>
          
          <div className="relative group">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            
            <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <button
                onClick={() => handleExport('csv')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-md"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-b-md"
              >
                Export as JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{metrics.totalUsers.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Total Users</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{metrics.activeUsers.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Active Users</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{formatDuration(metrics.averageSessionDuration)}</p>
                <p className="text-sm text-gray-600">Avg Session</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <MousePointer className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{metrics.averagePagesPerSession}</p>
                <p className="text-sm text-gray-600">Pages/Session</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
              <select
                value={filters.plan}
                onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Plans</option>
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Engagement</label>
              <select
                value={filters.engagement}
                onChange={(e) => setFilters({ ...filters, engagement: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Levels</option>
                <option value="high">High (7+)</option>
                <option value="medium">Medium (4-6)</option>
                <option value="low">Low (&lt;4)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Churn Risk</label>
              <select
                value={filters.churnRisk}
                onChange={(e) => setFilters({ ...filters, churnRisk: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Risks</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as typeof timeRange })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Time Series Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Behavior Trends</h4>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as keyof TimeSeriesBehavior)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="activeUsers">Active Users</option>
              <option value="sessions">Sessions</option>
              <option value="pageViews">Page Views</option>
              <option value="engagementScore">Engagement Score</option>
            </select>
          </div>
          
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <LineChart className="w-16 h-16 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1).replace(/([A-Z])/g, ' $1')} over {filters.dateRange}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Chart visualization would be implemented with a charting library
              </p>
            </div>
          </div>
        </div>

        {/* Feature Usage Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Top Features</h4>
          
          {metrics && (
            <div className="space-y-4">
              {metrics.topFeatures.map((feature) => (
                <div key={feature.feature} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{feature.feature}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${feature.usage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {feature.usage}%
                    </span>
                    <span className={`text-xs ${
                      feature.growth >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {feature.growth >= 0 ? '+' : ''}{feature.growth}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Segments & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* User Segments */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">User Segments</h4>
          
          {metrics && (
            <div className="space-y-3">
              {metrics.userSegments.map((segment) => (
                <div key={segment.segment} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{segment.segment}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{segment.count}</span>
                    <span className="text-xs text-gray-500">({segment.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Geographic Distribution</h4>
          
          {metrics && (
            <div className="space-y-3">
              {metrics.geographicDistribution.map((geo) => (
                <div key={geo.country} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{geo.country}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{geo.users}</span>
                    <span className="text-xs text-gray-500">({geo.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device Usage */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Device Usage</h4>
          
          {metrics && (
            <div className="space-y-3">
              {metrics.deviceUsage.map((device) => (
                <div key={device.device} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{device.device}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{device.users}</span>
                    <span className="text-xs text-gray-500">({device.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search users by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* User Behavior List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            User Behaviors ({filteredBehaviors.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredBehaviors.map((behavior) => (
            <div key={behavior.userId} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-medium text-gray-900">{behavior.email}</h4>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full capitalize">
                      {behavior.plan}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getChurnRiskColor(behavior.churnRisk)}`}>
                      {behavior.churnRisk} Risk
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <span className="text-sm text-gray-600">Sessions:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900">{behavior.sessionCount}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Total Time:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900">{formatDuration(behavior.totalTime)}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Page Views:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900">{behavior.pageViews}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Engagement:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900">{behavior.engagementScore.toFixed(1)}</span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <span className="text-sm text-gray-600">Features Used:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {behavior.featuresUsed.map((feature) => (
                        <span key={feature} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    Last active: {new Date(behavior.lastActive).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => setSelectedUser(behavior)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredBehaviors.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No user behaviors found matching your criteria</p>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">User Behavior Details</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{selectedUser.email}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full capitalize">
                      {selectedUser.plan}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Churn Risk</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getChurnRiskColor(selectedUser.churnRisk)}`}>
                      {selectedUser.churnRisk}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conversion Path</label>
                  <div className="flex items-center space-x-2">
                    {selectedUser.conversionPath.map((step, index) => (
                      <React.Fragment key={step}>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {step}
                        </span>
                        {index < selectedUser.conversionPath.length - 1 && (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Features Used</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.featuresUsed.map((feature) => (
                      <span key={feature} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBehaviorAnalytics;
