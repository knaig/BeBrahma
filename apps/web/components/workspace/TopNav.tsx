'use client';

import React from 'react';
import { Activity, BarChart3, FileText, Globe, Wrench, FolderOpen, LayoutTemplate } from 'lucide-react';

type TabKey = 'workflow' | 'firecrawl' | 'docs' | 'tracker' | 'dashboard' | 'projects' | 'templates';

export function TopNav({ activeTab, onTabChange }: { activeTab: TabKey; onTabChange: (tab: TabKey) => void }) {
  const tabs: TabKey[] = ['workflow', 'firecrawl', 'docs', 'tracker', 'dashboard', 'projects', 'templates'];
  
  const getTabIcon = (tab: TabKey) => {
    switch (tab) {
      case 'workflow': return <Wrench className="w-4 h-4" />;
      case 'firecrawl': return <Globe className="w-4 h-4" />;
      case 'docs': return <FileText className="w-4 h-4" />;
      case 'tracker': return <Activity className="w-4 h-4" />;
      case 'dashboard': return <BarChart3 className="w-4 h-4" />;
      case 'projects': return <FolderOpen className="w-4 h-4" />;
      case 'templates': return <LayoutTemplate className="w-4 h-4" />;
      default: return null;
    }
  };
  
  const getTabLabel = (tab: TabKey) => {
    switch (tab) {
      case 'workflow': return 'Workflow';
      case 'firecrawl': return 'Firecrawl';
      case 'docs': return 'Documentation';
      case 'tracker': return 'Actions Tracker';
      case 'dashboard': return 'Dashboard';
      case 'projects': return 'Projects';
      case 'templates': return 'Templates';
      default: return tab;
    }
  };
  
  return (
    <nav className="flex gap-3 bg-blue-600 text-white px-4 py-3 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`relative flex items-center gap-2 px-3 py-1 rounded-md transition-all whitespace-nowrap ${
            activeTab === tab 
              ? 'font-semibold bg-blue-700 after:content-[""] after:block after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:bg-white' 
              : 'opacity-90 hover:opacity-100 hover:bg-blue-700'
          }`}
          onClick={() => onTabChange(tab)}
          title={`${getTabLabel(tab)} (Cmd/Ctrl+${tabs.indexOf(tab) + 1})`}
        >
          {getTabIcon(tab)}
          <span className="hidden sm:inline">{getTabLabel(tab)}</span>
        </button>
      ))}
    </nav>
  );
}


