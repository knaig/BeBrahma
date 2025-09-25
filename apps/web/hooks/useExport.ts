import { useState, useCallback } from 'react';

interface ExportConfig {
  format: 'pdf' | 'markdown' | 'json' | 'csv' | 'html';
  sections?: string[];
  includeTasks?: boolean;
  includeProgress?: boolean;
  includeTimeline?: boolean;
  name?: string;
}

interface ExportResult {
  success: boolean;
  exportId?: string;
  filename?: string;
  downloadUrl?: string;
  error?: string;
}

export const useExport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = useCallback(async (
    exportType: 'project' | 'tasks' | 'documentation' | 'custom',
    config: ExportConfig,
    projectId?: string,
    boardId?: string
  ): Promise<ExportResult> => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = '';
      let payload: any = { ...config };

      switch (exportType) {
        case 'project':
          if (!projectId) {
            throw new Error('Project ID is required for project export');
          }
          endpoint = `/api/export/project/${projectId}`;
          break;

        case 'tasks':
          if (!projectId && !boardId) {
            throw new Error('Project ID or Board ID is required for task export');
          }
          if (boardId) {
            endpoint = `/api/export/tasks/board/${boardId}`;
          } else {
            endpoint = `/api/export/tasks/project/${projectId}`;
          }
          break;

        case 'documentation':
          if (!projectId) {
            throw new Error('Project ID is required for documentation export');
          }
          endpoint = `/api/export/documentation/${projectId}`;
          break;

        case 'custom':
          endpoint = '/api/export/custom';
          payload.name = config.name || 'Custom Export';
          break;

        default:
          throw new Error(`Unknown export type: ${exportType}`);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Export failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return {
          success: true,
          exportId: data.exportId,
          filename: data.filename,
          downloadUrl: data.downloadUrl,
        };
      } else {
        throw new Error(data.error || 'Export failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during export';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadExport = useCallback(async (exportId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // First get download info
      const infoResponse = await fetch(`/api/export/${exportId}/info`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!infoResponse.ok) {
        throw new Error('Failed to get export info');
      }

      const infoData = await infoResponse.json();
      
      if (!infoData.success) {
        throw new Error(infoData.error || 'Failed to get export info');
      }

      // Then download the file
      const downloadResponse = await fetch(`/api/export/${exportId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!downloadResponse.ok) {
        throw new Error('Failed to download export');
      }

      // Create blob and download
      const blob = await downloadResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = infoData.filename || `export-${exportId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getExportStatus = useCallback(async (exportId: string): Promise<any> => {
    try {
      const response = await fetch(`/api/export/${exportId}/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get export status');
      }

      const data = await response.json();
      return data.success ? data.status : null;
    } catch (err) {
      console.error('Error getting export status:', err);
      return null;
    }
  }, []);

  const cancelExport = useCallback(async (exportId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/export/${exportId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel export');
      }

      const data = await response.json();
      return data.success;
    } catch (err) {
      console.error('Error canceling export:', err);
      return false;
    }
  }, []);

  const getExportHistory = useCallback(async (): Promise<any[]> => {
    try {
      const response = await fetch('/api/export/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get export history');
      }

      const data = await response.json();
      return data.success ? data.exports : [];
    } catch (err) {
      console.error('Error getting export history:', err);
      return [];
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    exportData,
    downloadExport,
    getExportStatus,
    cancelExport,
    getExportHistory,
    loading,
    error,
    clearError,
  };
};
