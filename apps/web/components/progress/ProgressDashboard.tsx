'use client';

import React from 'react';
import { 
  ChartBarIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  UserGroupIcon 
} from '@heroicons/react/24/outline';

interface ProgressMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  totalHours: number;
  completedHours: number;
  teamMembers: number;
  projectProgress: number;
}

interface ProgressDashboardProps {
  metrics: ProgressMetrics;
  projectName: string;
  className?: string;
}

const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ 
  metrics, 
  projectName, 
  className = '' 
}) => {
  const completionRate = metrics.totalTasks > 0 
    ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100) 
    : 0;
  
  const timeCompletionRate = metrics.totalHours > 0 
    ? Math.round((metrics.completedHours / metrics.totalHours) * 100) 
    : 0;

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    if (rate >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressBarColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 60) return 'bg-yellow-500';
    if (rate >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{projectName} Progress</h2>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{metrics.projectProgress}%</div>
          <div className="text-sm text-gray-500">Overall Progress</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Project Completion</span>
          <span>{metrics.projectProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${getProgressBarColor(metrics.projectProgress)}`}
            style={{ width: `${metrics.projectProgress}%` }}
          ></div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Task Completion */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Task Completion</p>
              <p className="text-2xl font-bold text-blue-900">{completionRate}%</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-blue-500" />
          </div>
          <div className="mt-2 text-sm text-blue-600">
            {metrics.completedTasks} of {metrics.totalTasks} tasks
          </div>
        </div>

        {/* Time Tracking */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Time Completion</p>
              <p className="text-2xl font-bold text-green-900">{timeCompletionRate}%</p>
            </div>
            <ClockIcon className="w-8 h-8 text-green-500" />
          </div>
          <div className="mt-2 text-sm text-green-600">
            {metrics.completedHours}h of {metrics.totalHours}h
          </div>
        </div>

        {/* Team */}
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Team Members</p>
              <p className="text-2xl font-bold text-purple-900">{metrics.teamMembers}</p>
            </div>
            <UserGroupIcon className="w-8 h-8 text-purple-500" />
          </div>
          <div className="mt-2 text-sm text-purple-600">
            Active contributors
          </div>
        </div>

        {/* Issues */}
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Blocked Tasks</p>
              <p className="text-2xl font-bold text-red-900">{metrics.blockedTasks}</p>
            </div>
            <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
          </div>
          <div className="mt-2 text-sm text-red-600">
            {metrics.overdueTasks} overdue
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{metrics.inProgressTasks}</div>
          <div className="text-sm text-gray-500">In Progress</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{metrics.blockedTasks}</div>
          <div className="text-sm text-gray-500">Blocked</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{metrics.overdueTasks}</div>
          <div className="text-sm text-gray-500">Overdue</div>
        </div>
      </div>

      {/* Progress Chart Placeholder */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <ChartBarIcon className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-700">Progress Trend</span>
        </div>
        <div className="h-32 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-sm">
          Chart visualization would go here
        </div>
      </div>
    </div>
  );
};

export default ProgressDashboard;
