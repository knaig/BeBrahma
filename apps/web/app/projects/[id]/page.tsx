'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  ArrowLeftIcon,
  PlusIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClockIcon,
  CogIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import ProgressDashboard from '../../../components/progress/ProgressDashboard';
import KanbanBoard from '../../../components/kanban/KanbanBoard';
import DependencyGraph from '../../../components/kanban/DependencyGraph';
import ExportModal from '../../../components/export/ExportModal';

interface Project {
  id: string;
  name: string;
  workflowStep: string;
  progress: number;
  selectedSolution?: string;
  createdAt: string;
  updatedAt: string;
  boards: Board[];
  tasks: Task[];
}

interface Board {
  id: string;
  name: string;
  description?: string;
  _count: {
    tasks: number;
  };
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  boardId?: string;
  dependencies?: string[];
}

const ProjectPage = () => {
  const params = useParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'kanban' | 'dependencies' | 'export'>('overview');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'project' | 'tasks' | 'documentation'>('project');

  const workflowSteps = [
    { value: 'PROBLEM_CAPTURE', label: 'Problem Capture', description: 'Define the core problem' },
    { value: 'PROBLEM_CLARIFICATION', label: 'Problem Clarification', description: 'Refine and validate the problem' },
    { value: 'SOLUTION_BRAINSTORM', label: 'Solution Brainstorm', description: 'Generate potential solutions' },
    { value: 'COMPETITOR_ANALYSIS', label: 'Competitor Analysis', description: 'Analyze market competition' },
    { value: 'SCA_ANALYSIS', label: 'SCA Analysis', description: 'Sustainable Competitive Advantage' },
    { value: 'MVP_PLANNING', label: 'MVP Planning', description: 'Plan minimum viable product' },
    { value: 'TASK_GENERATION', label: 'Task Generation', description: 'Break down into actionable tasks' },
  ];

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }

      const data = await response.json();
      if (data.success) {
        setProject(data.project);
        if (data.project.boards.length > 0) {
          setSelectedBoard(data.project.boards[0].id);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch project');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const getWorkflowStepColor = (step: string) => {
    const colors: Record<string, string> = {
      PROBLEM_CAPTURE: 'bg-blue-100 text-blue-800',
      PROBLEM_CLARIFICATION: 'bg-indigo-100 text-indigo-800',
      SOLUTION_BRAINSTORM: 'bg-purple-100 text-purple-800',
      COMPETITOR_ANALYSIS: 'bg-yellow-100 text-yellow-800',
      SCA_ANALYSIS: 'bg-orange-100 text-orange-800',
      MVP_PLANNING: 'bg-green-100 text-green-800',
      TASK_GENERATION: 'bg-emerald-100 text-emerald-800',
    };
    return colors[step] || 'bg-gray-100 text-gray-800';
  };

  const getCurrentStepIndex = () => {
    return workflowSteps.findIndex(step => step.value === project?.workflowStep) || 0;
  };

  const projectMetrics = {
    totalTasks: project?.tasks.length || 0,
    completedTasks: project?.tasks.filter(t => t.status === 'DONE').length || 0,
    inProgressTasks: project?.tasks.filter(t => t.status === 'IN_PROGRESS').length || 0,
    blockedTasks: project?.tasks.filter(t => t.status === 'BLOCKED').length || 0,
    overdueTasks: 0, // Would need due date logic
    totalHours: (project?.tasks.length || 0) * 8, // Estimate 8 hours per task
    completedHours: (project?.tasks.filter(t => t.status === 'DONE').length || 0) * 8,
    teamMembers: 1, // Would need actual team data
    projectProgress: project?.progress || 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg mb-4">
          {error || 'Project not found'}
        </div>
        <Link
          href="/projects"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/projects"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600">Project details and management</p>
          </div>
        </div>

        {/* Workflow Progress */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Workflow Progress</h3>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">
              Current Step: {workflowSteps.find(s => s.value === project.workflowStep)?.label}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {project.progress}% Complete
            </span>
          </div>
          
          <div className="relative">
            <div className="flex justify-between mb-2">
              {workflowSteps.map((step, index) => (
                <div key={step.value} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= getCurrentStepIndex() 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-xs text-gray-500 mt-1 text-center max-w-20">
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Progress Line */}
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 -z-10">
              <div 
                className="h-full bg-blue-600 transition-all duration-500"
                style={{ width: `${(getCurrentStepIndex() / (workflowSteps.length - 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'kanban', label: 'Kanban Board', icon: DocumentTextIcon },
            { id: 'dependencies', label: 'Dependencies', icon: UserGroupIcon },
            { id: 'export', label: 'Export', icon: DocumentArrowDownIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <ProgressDashboard
              metrics={projectMetrics}
              projectName={project.name}
            />
            
            {/* Project Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Project Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Created:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Last Updated:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {project.selectedSolution && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Selected Solution:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {project.selectedSolution}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Boards</h3>
                {project.boards.length === 0 ? (
                  <p className="text-gray-500 text-sm">No boards created yet</p>
                ) : (
                  <div className="space-y-2">
                    {project.boards.map((board) => (
                      <div key={board.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium">{board.name}</span>
                        <span className="text-xs text-gray-500">{board._count.tasks} tasks</span>
                      </div>
                    ))}
                  </div>
                )}
                <button className="mt-3 text-sm text-blue-600 hover:text-blue-800">
                  <PlusIcon className="w-4 h-4 inline mr-1" />
                  Add Board
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kanban' && (
          <div>
            {project.boards.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No boards available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create a board to start organizing tasks
                </p>
                <button className="mt-6 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Board
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Board
                  </label>
                  <select
                    value={selectedBoard || ''}
                    onChange={(e) => setSelectedBoard(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {project.boards.map((board) => (
                      <option key={board.id} value={board.id}>
                        {board.name} ({board._count.tasks} tasks)
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedBoard && (
                  <KanbanBoard boardId={selectedBoard} projectId={project.id} />
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'dependencies' && (
          <div>
            {project.tasks.length === 0 ? (
              <div className="text-center py-12">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create tasks to visualize dependencies
                </p>
              </div>
            ) : (
              <DependencyGraph tasks={project.tasks} />
            )}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Export Project</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { type: 'project', label: 'Project Export', description: 'Complete project overview' },
                { type: 'tasks', label: 'Tasks Export', description: 'Task list and dependencies' },
                { type: 'documentation', label: 'Documentation', description: 'Project documentation' },
              ].map((exportOption) => (
                <button
                  key={exportOption.type}
                  onClick={() => {
                    setExportType(exportOption.type as any);
                    setShowExportModal(true);
                  }}
                  className="p-4 border border-gray-200 rounded-lg text-left hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <h4 className="font-medium text-gray-900">{exportOption.label}</h4>
                  <p className="text-sm text-gray-500 mt-1">{exportOption.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          projectId={project.id}
          exportType={exportType}
        />
      )}
    </div>
  );
};

export default ProjectPage;
