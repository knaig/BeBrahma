import React, { useState } from 'react';
import { BarChart3, TrendingUp, PieChart, Activity, Download, Share2 } from 'lucide-react';

interface VisualAnalyticsProps {
  messages: any[];
  progressState: any;
}

export function VisualAnalytics({ messages, progressState }: VisualAnalyticsProps) {
  const [activeChart, setActiveChart] = useState<'progress' | 'agents' | 'phases' | 'budget'>('progress');

  // Mock data for charts - in real app this would come from the API
  const chartData = {
    progress: {
      labels: ['Planning', 'Research', 'Analysis', 'Decision', 'Implementation'],
      data: [100, 85, 60, 30, 0],
      colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']
    },
    agents: {
      labels: ['CEO', 'CTO', 'Demand Modeler', 'Product Manager', 'UX Researcher'],
      data: [95, 80, 90, 70, 85],
      colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']
    },
    phases: {
      labels: ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'],
      data: [100, 75, 45, 20],
      colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444']
    },
    budget: {
      labels: ['Research', 'Analysis', 'Tools', 'Remaining'],
      data: [30, 25, 15, 30],
      colors: ['#10B981', '#3B82F6', '#F59E0B', '#6B7280']
    }
  };

  const renderChart = () => {
    const data = chartData[activeChart];
    
    switch (activeChart) {
      case 'progress':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Overall Progress by Phase
            </h3>
            <div className="space-y-3">
              {data.labels.map((label, index) => (
                <div key={label} className="flex items-center gap-4">
                  <div className="w-32 text-sm text-gray-600 dark:text-gray-400">{label}</div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${data.data[index]}%`,
                        backgroundColor: data.colors[index]
                      }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm font-medium text-gray-900 dark:text-white">
                    {data.data[index]}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'agents':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Agent Performance & Progress
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {data.labels.map((label, index) => (
                <div key={label} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">{label}</span>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {data.data[index]}% Complete
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${data.data[index]}%`,
                        backgroundColor: data.colors[index]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'phases':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Phase Completion Timeline
            </h3>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
              {data.labels.map((label, index) => (
                <div key={label} className="relative flex items-center gap-4 mb-6">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center z-10">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: data.colors[index] }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{label}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {data.data[index]}% Complete
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'budget':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Budget Allocation & Usage
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {data.labels.map((label, index) => (
                <div key={label} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    ${data.data[index]}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  Total Budget: $100
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  {data.data.reduce((a, b) => a + b, 0)}% Used
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
        <h1 className="text-2xl font-bold mb-2">📊 Visual Analytics</h1>
        <p className="text-blue-100">
          Data-driven insights and progress visualization for your SaaS analysis
        </p>
      </div>

      {/* Chart Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center space-x-4">
          {[
            { id: 'progress', label: 'Progress', icon: Activity },
            { id: 'agents', label: 'Agents', icon: TrendingUp },
            { id: 'phases', label: 'Phases', icon: BarChart3 },
            { id: 'budget', label: 'Budget', icon: PieChart }
          ].map((chart) => (
            <button
              key={chart.id}
              onClick={() => setActiveChart(chart.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeChart === chart.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <chart.icon className="w-4 h-4" />
              {chart.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          {renderChart()}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            <Download className="w-4 h-4" />
            Export Chart
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
            <Share2 className="w-4 h-4" />
            Share Insights
          </button>
        </div>
      </div>
    </div>
  );
}
