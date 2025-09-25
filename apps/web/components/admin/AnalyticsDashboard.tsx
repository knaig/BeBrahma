'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  BarChart3, 
  PieChart, 
  LineChart, 
  Download, 
  RefreshCw, 
  Calendar,
  Eye,
  MousePointer,
  Clock,
  MapPin,
  Device,
  Globe,
  Filter,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { useAnalytics } from '../analytics/AnalyticsProvider';

// Analytics data interfaces
interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  churnedUsers: number;
  userGrowth: number;
  retentionRate: number;
}

interface RevenueMetrics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
  revenueGrowth: number;
  conversionRate: number;
}

interface EngagementMetrics {
  averageSessionDuration: number;
  pagesPerSession: number;
  bounceRate: number;
  featureUsage: Record<string, number>;
  topPages: Array<{ path: string; views: number; uniqueViews: number }>;
}

interface SystemMetrics {
  uptime: number;
  responseTime: number;
  errorRate: number;
  activeConnections: number;
  databaseSize: number;
}

interface TimeSeriesData {
  date: string;
  users: number;
  revenue: number;
  sessions: number;
  errors: number;
}

// Analytics dashboard props
interface AnalyticsDashboardProps {
  timeRange?: '24h' | '7d' | '30d' | '90d' | '1y';
}

// Analytics dashboard component
export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  timeRange = '30d' 
}) => {
  const { trackFeatureUsage } = useAnalytics();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<keyof TimeSeriesData>('users');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    userType: 'all',
    region: 'all',
    device: 'all',
    plan: 'all'
  });

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        trackFeatureUsage('admin_analytics', 'data_fetched', { timeRange: selectedTimeRange });
        
        // Fetch dashboard data
        const dashboardResponse = await fetch(`/api/analytics/dashboard?range=${selectedTimeRange}`);
        const dashboardData = await dashboardResponse.json();
        
        setUserMetrics(dashboardData.userMetrics);
        setRevenueMetrics(dashboardData.revenueMetrics);
        setEngagementMetrics(dashboardData.engagementMetrics);
        setSystemMetrics(dashboardData.systemMetrics);
        
        // Fetch time series data
        const timeSeriesResponse = await fetch(`/api/analytics/timeseries?range=${selectedTimeRange}`);
        const timeSeriesData = await timeSeriesResponse.json();
        setTimeSeriesData(timeSeriesData);
        
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        setError('Failed to load analytics data. Please try again.');
        
        // Generate mock data for demonstration
        generateMockData();
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [selectedTimeRange, trackFeatureUsage]);

  // Generate mock data for demonstration
  const generateMockData = () => {
    // Mock user metrics
    setUserMetrics({
      totalUsers: 1247,
      activeUsers: 892,
      newUsers: 156,
      churnedUsers: 23,
      userGrowth: 12.5,
      retentionRate: 87.3
    });

    // Mock revenue metrics
    setRevenueMetrics({
      totalRevenue: 45678.90,
      monthlyRecurringRevenue: 12345.67,
      averageRevenuePerUser: 36.67,
      revenueGrowth: 18.2,
      conversionRate: 3.4
    });

    // Mock engagement metrics
    setEngagementMetrics({
      averageSessionDuration: 1247,
      pagesPerSession: 4.2,
      bounceRate: 32.1,
      featureUsage: {
        'Project Creation': 78,
        'Task Management': 92,
        'Analytics': 45,
        'Team Collaboration': 67,
        'API Usage': 34
      },
      topPages: [
        { path: '/dashboard', views: 1247, uniqueViews: 892 },
        { path: '/projects', views: 987, uniqueViews: 654 },
        { path: '/tasks', views: 876, uniqueViews: 543 },
        { path: '/analytics', views: 654, uniqueViews: 432 },
        { path: '/settings', views: 432, uniqueViews: 321 }
      ]
    });

    // Mock system metrics
    setSystemMetrics({
      uptime: 99.97,
      responseTime: 245,
      errorRate: 0.12,
      activeConnections: 156,
      databaseSize: 2.4
    });

    // Mock time series data
    const days = selectedTimeRange === '24h' ? 24 : 
                 selectedTimeRange === '7d' ? 7 : 
                 selectedTimeRange === '30d' ? 30 : 
                 selectedTimeRange === '90d' ? 90 : 365;
    
    const mockTimeSeriesData: TimeSeriesData[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      if (selectedTimeRange === '24h') {
        date.setHours(date.getHours() - i);
      } else {
        date.setDate(date.getDate() - i);
      }
      
      mockTimeSeriesData.push({
        date: selectedTimeRange === '24h' ? 
              date.toISOString().split('T')[1].substring(0, 5) : 
              date.toISOString().split('T')[0],
        users: Math.floor(Math.random() * 100) + 800,
        revenue: Math.floor(Math.random() * 500) + 300,
        sessions: Math.floor(Math.random() * 200) + 150,
        errors: Math.floor(Math.random() * 10) + 1
      });
    }
    
    setTimeSeriesData(mockTimeSeriesData);
  };

  // Handle time range change
  const handleTimeRangeChange = (newRange: typeof selectedTimeRange) => {
    setSelectedTimeRange(newRange);
    trackFeatureUsage('admin_analytics', 'time_range_changed', { timeRange: newRange });
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      trackFeatureUsage('admin_analytics', 'export_started', { format, timeRange: selectedTimeRange });
      
      const response = await fetch('/api/analytics/export', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // Add query parameters for export
      });
      
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin-analytics-${selectedTimeRange}.csv`;
        a.click();
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin-analytics-${selectedTimeRange}.json`;
        a.click();
      }
      
      trackFeatureUsage('admin_analytics', 'export_completed', { format, timeRange: selectedTimeRange });
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    trackFeatureUsage('admin_analytics', 'refresh_clicked');
    generateMockData();
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Get metric status
  const getMetricStatus = (value: number, threshold: number, type: 'positive' | 'negative') => {
    if (type === 'positive') {
      return value >= threshold ? 'good' : 'warning';
    } else {
      return value <= threshold ? 'good' : 'warning';
    }
  };

  // Get status icon
  const getStatusIcon = (status: 'good' | 'warning' | 'error') => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <XCircle className="w-6 h-6 text-red-500 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-800">Error Loading Analytics</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">
            Comprehensive insights into user behavior, revenue, and system performance
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-md transition-colors ${
              showFilters 
                ? 'bg-blue-600 text-white' 
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4 mr-2 inline" />
            Filters
          </button>
          
          {/* Time Range Selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value as typeof selectedTimeRange)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          
          {/* Export Button */}
          <div className="relative group">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            
            {/* Export Dropdown */}
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

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User Type</label>
              <select
                value={filters.userType}
                onChange={(e) => setFilters({ ...filters, userType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Users</option>
                <option value="free">Free Users</option>
                <option value="premium">Premium Users</option>
                <option value="enterprise">Enterprise Users</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
              <select
                value={filters.region}
                onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Regions</option>
                <option value="us">United States</option>
                <option value="eu">Europe</option>
                <option value="asia">Asia</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Device</label>
              <select
                value={filters.device}
                onChange={(e) => setFilters({ ...filters, device: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Devices</option>
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablet</option>
              </select>
            </div>
            
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
          </div>
        </div>
      )}

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* User Metrics */}
        {userMetrics && (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className={`flex items-center space-x-1 ${
                  userMetrics.userGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {userMetrics.userGrowth >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {Math.abs(userMetrics.userGrowth)}%
                  </span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{userMetrics.totalUsers.toLocaleString()}</h3>
              <p className="text-sm text-gray-600">Total Users</p>
              <div className="mt-2 text-xs text-gray-500">
                {userMetrics.activeUsers.toLocaleString()} active • {userMetrics.newUsers} new
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-green-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{formatPercentage(userMetrics.retentionRate)}</h3>
              <p className="text-sm text-gray-600">Retention Rate</p>
              <div className="mt-2 text-xs text-gray-500">
                {userMetrics.churnedUsers} churned this period
              </div>
            </div>
          </>
        )}

        {/* Revenue Metrics */}
        {revenueMetrics && (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <div className={`flex items-center space-x-1 ${
                  revenueMetrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {revenueMetrics.revenueGrowth >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {Math.abs(revenueMetrics.revenueGrowth)}%
                  </span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(revenueMetrics.monthlyRecurringRevenue)}</h3>
              <p className="text-sm text-gray-600">Monthly Recurring Revenue</p>
              <div className="mt-2 text-xs text-gray-500">
                {formatCurrency(revenueMetrics.averageRevenuePerUser)} per user
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="text-green-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{formatPercentage(revenueMetrics.conversionRate)}</h3>
              <p className="text-sm text-gray-600">Conversion Rate</p>
              <div className="mt-2 text-xs text-gray-500">
                Free to paid conversion
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Time Series Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Trends Over Time</h4>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as keyof TimeSeriesData)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="users">Users</option>
              <option value="revenue">Revenue</option>
              <option value="sessions">Sessions</option>
              <option value="errors">Errors</option>
            </select>
          </div>
          
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <LineChart className="w-16 h-16 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} over {selectedTimeRange}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Chart visualization would be implemented with a charting library
              </p>
            </div>
          </div>
        </div>

        {/* Feature Usage Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Feature Usage</h4>
          
          <div className="space-y-4">
            {engagementMetrics && Object.entries(engagementMetrics.featureUsage).map(([feature, usage]) => (
              <div key={feature} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{feature}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${usage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {usage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Health & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* System Metrics */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">System Health</h4>
          
          {systemMetrics && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Uptime</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatPercentage(systemMetrics.uptime)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    systemMetrics.responseTime < 300 ? 'bg-green-500' : 
                    systemMetrics.responseTime < 500 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm text-gray-700">Response Time</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {systemMetrics.responseTime}ms
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    systemMetrics.errorRate < 0.1 ? 'bg-green-500' : 
                    systemMetrics.errorRate < 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm text-gray-700">Error Rate</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatPercentage(systemMetrics.errorRate)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Active Connections</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {systemMetrics.activeConnections}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Database Size</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {systemMetrics.databaseSize} GB
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Top Pages */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h4>
          
          {engagementMetrics && (
            <div className="space-y-3">
              {engagementMetrics.topPages.map((page, index) => (
                <div key={page.path} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-700 font-medium">{page.path}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {page.views.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {page.uniqueViews.toLocaleString()} unique
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">User Engagement</h4>
        
        {engagementMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <h5 className="text-lg font-semibold text-gray-900">
                {formatDuration(engagementMetrics.averageSessionDuration)}
              </h5>
              <p className="text-sm text-gray-600">Average Session Duration</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MousePointer className="w-8 h-8 text-green-600" />
              </div>
              <h5 className="text-lg font-semibold text-gray-900">
                {engagementMetrics.pagesPerSession}
              </h5>
              <p className="text-sm text-gray-600">Pages Per Session</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Eye className="w-8 h-8 text-yellow-600" />
              </div>
              <h5 className="text-lg font-semibold text-gray-900">
                {formatPercentage(engagementMetrics.bounceRate)}
              </h5>
              <p className="text-sm text-gray-600">Bounce Rate</p>
            </div>
          </div>
        )}
      </div>

      {/* Insights & Recommendations */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-blue-900 mb-4">Insights & Recommendations</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-medium text-blue-800 mb-2">Performance Insights</h5>
            <ul className="space-y-2 text-sm text-blue-700">
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                System uptime is excellent at {systemMetrics?.uptime}%
              </li>
              <li className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                Response time could be improved (currently {systemMetrics?.responseTime}ms)
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                Error rate is within acceptable limits
              </li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-medium text-blue-800 mb-2">Business Recommendations</h5>
            <ul className="space-y-2 text-sm text-blue-700">
              <li className="flex items-start">
                <TrendingUp className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                User growth is strong at {userMetrics?.userGrowth}% - consider scaling infrastructure
              </li>
              <li className="flex items-start">
                <DollarSign className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                Revenue growth at {revenueMetrics?.revenueGrowth}% - focus on retention strategies
              </li>
              <li className="flex items-start">
                <Users className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                {userMetrics?.retentionRate}% retention rate - implement engagement campaigns
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
