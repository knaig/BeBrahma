'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, GitBranch, Settings } from 'lucide-react';
import { TodayView } from '@/components/decision-os/TodayView';
import { ThisWeekView } from '@/components/decision-os/ThisWeekView';
import { GraphView } from '@/components/decision-os/GraphView';

type TabType = 'today' | 'this-week' | 'graph';

export default function DecisionOSPage() {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [ventureId, setVentureId] = useState<string>('v1'); // Mock venture ID

  const tabs = [
    { id: 'today' as TabType, label: 'Today', icon: Calendar },
    { id: 'this-week' as TabType, label: 'This Week', icon: TrendingUp },
    { id: 'graph' as TabType, label: 'Graph', icon: GitBranch },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Decision OS
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Revenue Loop Wedge
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'today' && <TodayView ventureId={ventureId} />}
        {activeTab === 'this-week' && <ThisWeekView ventureId={ventureId} />}
        {activeTab === 'graph' && <GraphView ventureId={ventureId} />}
      </div>
    </div>
  );
}
