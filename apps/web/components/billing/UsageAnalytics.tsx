'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Filter,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useAnalytics } from '../analytics/AnalyticsProvider';

// Usage data interface
interface UsageData {
  projects: number;
  tasks: number;
  storage: number;
  apiCalls: number;
  limits: {
    projects: number;
    tasks: number;
    storage: number;
    apiCalls: number;
  };
}

// Time series data interface
interface TimeSeriesData {
  date: string;
  projects: number;
  tasks: number;
  storage: number;
  apiCalls: number;
}

// Usage analytics props
interface UsageAnalyticsProps {
  usage: UsageData;
}

// Usage analytics component
export const UsageAnalytics: React.FC<UsageAnalyticsProps> = ({ usage }) => {
  const { trackFeatureUsage } = useAnalytics();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(false);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<keyof Omit<UsageData, 'limits'>>('projects');

  // Fetch time series data
  useEffect(() => {
    const fetchTimeSeriesData = async () => {
      setLoading(true);
      try {
        // Simulate API call - replace with actual endpoint
        const response = await fetch(`/api/analytics/usage/timeseries?range=${timeRange}`);
        const data = await response.json();
        setTimeSeriesData(data);
        
        trackFeatureUsage('usage_analytics', 'data_fetched', { timeRange });
      } catch (error) {
        console.error('Error fetching time series data:', error);
        // Generate mock data for demonstration
        generateMockData();
      } finally {
        setLoading(false);
      }
    };

    fetchTimeSeriesData();
  }, [timeRange, trackFeatureUsage]);

  // Generate mock data for demonstration
  const generateMockData = () => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const mockData: TimeSeriesData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      mockData.push({
        date: date.toISOString().split('T')[0],
        projects: Math.floor(Math.random() * 10) + 1,
        tasks: Math.floor(Math.random() * 50) + 10,
        storage: Math.floor(Math.random() * 100) + 50,
        apiCalls: Math.floor(Math.random() * 1000) + 500,
      });
    }
    
    setTimeSeriesData(mockData);
  };

  // Calculate usage percentage
  const getUsagePercentage = (current: number, limit: number) => {
    return limit ? Math.min((current / limit) * 100, 100) : 0;
  };

  // Get usage status color
  const getUsageStatusColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600 bg-red-100';
    if (percentage >= 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  // Get usage status text
  const getUsageStatusText = (percentage: number) => {
    if (percentage >= 100) return 'Over Limit';
    if (percentage >= 80) return 'Near Limit';
    return 'Normal';
  };

  // Format storage size
  const formatStorageSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      trackFeatureUsage('usage_analytics', 'export_started', { format, timeRange });
      
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
        a.download = `usage-analytics-${timeRange}.csv`;
        a.click();
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `usage-analytics-${timeRange}.json`;
        a.click();
      }
      
      trackFeatureUsage('usage_analytics', 'export_completed', { format, timeRange });
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    trackFeatureUsage('usage_analytics', 'refresh_clicked');
    generateMockData();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Usage Analytics</h3>
          <p className="text-sm text-gray-600">
            Monitor your resource usage and track trends over time
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {/* Export Button */}
          <div className="relative group">
            <button className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2">
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

      {/* Usage Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Object.entries(usage).filter(([key]) => key !== 'limits').map(([key, value]) => {
          const limit = usage.limits[key as keyof typeof usage.limits];
          const percentage = getUsagePercentage(value, limit);
          const statusColor = getUsageStatusColor(percentage);
          const statusText = getUsageStatusText(percentage);
          
          return (
            <div key={key} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-600 capitalize">{key}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                  {statusText}
                </span>
              </div>
              
              <div className="mb-4">
                <p className="text-2xl font-bold text-gray-900">
                  {key === 'storage' ? formatStorageSize(value) : formatNumber(value)}
                </p>
                {limit && (
                  <p className="text-sm text-gray-500">
                    of {key === 'storage' ? formatStorageSize(limit) : formatNumber(limit)}
                  </p>
                )}
              </div>
              
              {/* Progress Bar */}
              {limit && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      percentage >= 100 ? 'bg-red-500' : percentage >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              )}
              
              {/* Usage Trend */}
              <div className="mt-3 flex items-center text-sm">
                {Math.random() > 0.5 ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={Math.random() > 0.5 ? 'text-green-600' : 'text-red-600'}>
                  {Math.floor(Math.random() * 20) + 1}% from last period
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Line Chart - Usage Over Time */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Usage Over Time</h4>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as keyof Omit<UsageData, 'limits'>)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="projects">Projects</option>
              <option value="tasks">Tasks</option>
              <option value="storage">Storage</option>
              <option value="apiCalls">API Calls</option>
            </select>
          </div>
          
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            {loading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading chart...</p>
              </div>
            ) : (
              <div className="text-center">
                <LineChart className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} usage over {timeRange}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Chart visualization would be implemented with a charting library
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart - Usage Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Usage Distribution</h4>
          
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <PieChart className="w-16 h-16 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Resource usage breakdown</p>
              <p className="text-xs text-gray-500 mt-1">
                Pie chart showing relative usage of different resources
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Usage Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">Detailed Usage History</h4>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projects
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Storage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  API Calls
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timeSeriesData.slice(0, 10).map((data, index) => {
                const totalUsage = data.projects + data.tasks + data.storage + data.apiCalls;
                const isHighUsage = totalUsage > 1000; // Example threshold
                
                return (
                  <tr key={index} className={isHighUsage ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(data.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {data.projects}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {data.tasks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatStorageSize(data.storage)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(data.apiCalls)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isHighUsage ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {isHighUsage ? 'High' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {timeSeriesData.length > 10 && (
          <div className="px-6 py-4 border-t border-gray-200 text-center">
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View all {timeSeriesData.length} records
            </button>
          </div>
        )}
      </div>

      {/* Usage Insights */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-blue-900 mb-4">Usage Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-blue-800">
              <strong>Peak Usage:</strong> Tuesdays between 2-4 PM
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-blue-800">
              <strong>Growth Trend:</strong> 15% increase this month
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-blue-800">
              <strong>Recommendation:</strong> Consider upgrading plan
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageAnalytics;
