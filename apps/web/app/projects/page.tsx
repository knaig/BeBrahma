'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  DocumentTextIcon,
  LightBulbIcon,
  UserGroupIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import ProgressDashboard from '../../components/progress/ProgressDashboard';

interface Project {
  id: string;
  name: string;
  workflowStep: string;
  progress: number;
  selectedSolution?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
    boards: number;
  };
}

const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkflowStep, setSelectedWorkflowStep] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const workflowSteps = [
    { value: 'all', label: 'All Steps' },
    { value: 'PROBLEM_CAPTURE', label: 'Problem Capture' },
    { value: 'PROBLEM_CLARIFICATION', label: 'Problem Clarification' },
    { value: 'SOLUTION_BRAINSTORM', label: 'Solution Brainstorm' },
    { value: 'COMPETITOR_ANALYSIS', label: 'Competitor Analysis' },
    { value: 'SCA_ANALYSIS', label: 'SCA Analysis' },
    { value: 'MVP_PLANNING', label: 'MVP Planning' },
    { value: 'TASK_GENERATION', label: 'Task Generation' },
  ];

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

  const getWorkflowStepIcon = (step: string) => {
    const icons: Record<string, React.ReactNode> = {
      PROBLEM_CAPTURE: <DocumentTextIcon className="w-4 h-4" />,
      PROBLEM_CLARIFICATION: <MagnifyingGlassIcon className="w-4 h-4" />,
      SOLUTION_BRAINSTORM: <LightBulbIcon className="w-4 h-4" />,
      COMPETITOR_ANALYSIS: <UserGroupIcon className="w-4 h-4" />,
      SCA_ANALYSIS: <ChartBarIcon className="w-4 h-4" />,
      MVP_PLANNING: <ChartBarIcon className="w-4 h-4" />,
      TASK_GENERATION: <ClockIcon className="w-4 h-4" />,
    };
    return icons[step] || <DocumentTextIcon className="w-4 h-4" />;
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
      } else {
        throw new Error(data.error || 'Failed to fetch projects');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWorkflow = selectedWorkflowStep === 'all' || project.workflowStep === selectedWorkflowStep;
    return matchesSearch && matchesWorkflow;
  });

  const overallMetrics = {
    totalTasks: projects.reduce((sum, p) => sum + (p._count?.tasks || 0), 0),
    completedTasks: projects.reduce((sum, p) => sum + Math.round((p.progress / 100) * (p._count?.tasks || 0)), 0),
    inProgressTasks: projects.reduce((sum, p) => sum + Math.round((p.progress / 100) * (p._count?.tasks || 0) * 0.3), 0),
    blockedTasks: projects.reduce((sum, p) => sum + Math.round((p._count?.tasks || 0) * 0.1), 0),
    overdueTasks: 0, // Would need to calculate based on due dates
    totalHours: projects.reduce((sum, p) => sum + (p._count?.tasks || 0) * 8, 0), // Estimate 8 hours per task
    completedHours: projects.reduce((sum, p) => sum + Math.round((p.progress / 100) * (p._count?.tasks || 0) * 8), 0),
    teamMembers: projects.length > 0 ? 1 : 0, // Would need actual team data
    projectProgress: projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length) : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 dark:text-red-400 text-lg mb-4">Error: {error}</div>
        <button
          onClick={fetchProjects}
          className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Manage your projects and track progress through the workflow
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New Project
          </button>
        </div>
      </div>

      {/* Progress Dashboard */}
      <div className="mb-8">
        <ProgressDashboard
          metrics={overallMetrics}
          projectName="All Projects"
          className="bg-gradient-to-r from-blue-50 to-indigo-50"
        />
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          <select
            value={selectedWorkflowStep}
            onChange={(e) => setSelectedWorkflowStep(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {workflowSteps.map(step => (
              <option key={step.value} value={step.value}>
                {step.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No projects found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || selectedWorkflowStep !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Get started by creating a new project.'
            }
          </p>
          {!searchTerm && selectedWorkflowStep === 'all' && (
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                New Project
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block group"
            >
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {project.name}
                  </h3>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getWorkflowStepColor(project.workflowStep)}`}>
                    {workflowSteps.find(s => s.value === project.workflowStep)?.label}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-2">
                    {getWorkflowStepIcon(project.workflowStep)}
                    <span>Workflow Step</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{project.progress}% complete</div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-4">
                    <span>{project._count?.tasks || 0} tasks</span>
                    <span>{project._count?.boards || 0} boards</span>
                  </div>
                  <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>

                {project.selectedSolution && (
                  <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-700 dark:text-green-300">
                    Solution: {project.selectedSolution}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Modal would go here */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Create New Project</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Project creation functionality would be implemented here.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
