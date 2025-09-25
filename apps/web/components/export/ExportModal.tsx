'use client';

import React, { useState } from 'react';
import { XMarkIcon, DocumentArrowDownIcon, CogIcon } from '@heroicons/react/24/outline';
import { useExport } from '../../hooks/useExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  boardId?: string;
  exportType: 'project' | 'tasks' | 'documentation' | 'custom';
}

const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, 
  onClose, 
  projectId, 
  boardId, 
  exportType 
}) => {
  const { exportData, loading, error } = useExport();
  const [format, setFormat] = useState<'pdf' | 'markdown' | 'json' | 'csv' | 'html'>('pdf');
  const [sections, setSections] = useState<string[]>([]);
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeProgress, setIncludeProgress] = useState(true);
  const [includeTimeline, setIncludeTimeline] = useState(false);
  const [customName, setCustomName] = useState('');

  const availableSections = {
    project: ['overview', 'problems', 'solutions', 'competitors', 'sca_factors', 'mvp_features'],
    tasks: ['task_list', 'dependencies', 'assignments', 'time_tracking'],
    documentation: ['user_guide', 'technical_specs', 'api_docs', 'workflow_guide']
  };

  const availableFormats = {
    project: ['pdf', 'markdown', 'json'],
    tasks: ['csv', 'pdf', 'json'],
    documentation: ['pdf', 'markdown', 'html']
  };

  const handleExport = async () => {
    if (!projectId && exportType !== 'custom') return;

    const config = {
      format,
      sections: sections.length > 0 ? sections : undefined,
      includeTasks,
      includeProgress,
      includeTimeline,
      name: customName || undefined
    };

    try {
      const result = await exportData(exportType, config, projectId, boardId);
      if (result.success) {
        // Handle successful export
        console.log('Export successful:', result);
        onClose();
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleSectionToggle = (section: string) => {
    setSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <DocumentArrowDownIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Export {exportType.charAt(0).toUpperCase() + exportType.slice(1)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableFormats[exportType as keyof typeof availableFormats]?.map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt as any)}
                  className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                    format === fmt
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Section Selection */}
          {availableSections[exportType as keyof typeof availableSections] && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Include Sections
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableSections[exportType as keyof typeof availableSections]?.map(section => (
                  <label key={section} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sections.includes(section)}
                      onChange={() => handleSectionToggle(section)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {section.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Options */}
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={includeTasks}
                onChange={(e) => setIncludeTasks(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include tasks and assignments</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={includeProgress}
                onChange={(e) => setIncludeProgress(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include progress metrics</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={includeTimeline}
                onChange={(e) => setIncludeTimeline(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include timeline and milestones</span>
            </label>
          </div>

          {/* Custom Name */}
          {exportType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Name
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter export name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <CogIcon className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="w-4 h-4" />
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
