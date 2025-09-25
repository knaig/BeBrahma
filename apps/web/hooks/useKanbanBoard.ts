import { useState, useEffect, useCallback } from 'react';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  category: string;
  estimatedHours?: number;
  assigneeId?: string;
  dueDate?: string;
  position: number;
  boardId?: string;
  projectId: string;
}

interface ReorderTask {
  id: string;
  position: number;
  status: string;
}

export const useKanbanBoard = (boardId: string) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tasks for the board
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/tasks/board/${boardId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      } else {
        throw new Error(data.error || 'Failed to fetch tasks');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  // Update task status
  const updateTaskStatus = useCallback(async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        // Update local state
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        ));
        return true;
      } else {
        throw new Error(data.error || 'Failed to update task');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error updating task status:', err);
      return false;
    }
  }, []);

  // Reorder tasks
  const reorderTasks = useCallback(async (reorderData: ReorderTask[]) => {
    try {
      const response = await fetch('/api/tasks/reorder', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tasks: reorderData }),
      });

      if (!response.ok) {
        throw new Error(`Failed to reorder tasks: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        // Refresh tasks to get updated order
        await fetchTasks();
        return true;
      } else {
        throw new Error(data.error || 'Failed to reorder tasks');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error reordering tasks:', err);
      return false;
    }
  }, [fetchTasks]);

  // Create new task
  const createTask = useCallback(async (taskData: Partial<Task>) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...taskData,
          boardId,
          position: tasks.length, // Add to end of current board
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        // Refresh tasks to include new task
        await fetchTasks();
        return data.task;
      } else {
        throw new Error(data.error || 'Failed to create task');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error creating task:', err);
      return null;
    }
  }, [boardId, tasks.length, fetchTasks]);

  // Update task
  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        // Update local state
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, ...updates } : task
        ));
        return true;
      } else {
        throw new Error(data.error || 'Failed to update task');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error updating task:', err);
      return false;
    }
  }, []);

  // Delete task
  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        // Remove from local state
        setTasks(prev => prev.filter(task => task.id !== taskId));
        return true;
      } else {
        throw new Error(data.error || 'Failed to delete task');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error deleting task:', err);
      return false;
    }
  }, []);

  // Add dependency
  const addDependency = useCallback(async (taskId: string, dependsOnId: string, type: string = 'BLOCKS') => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/dependencies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dependsOnId, type }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add dependency: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        // Refresh tasks to get updated dependencies
        await fetchTasks();
        return true;
      } else {
        throw new Error(data.error || 'Failed to add dependency');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error adding dependency:', err);
      return false;
    }
  }, [fetchTasks]);

  // Remove dependency
  const removeDependency = useCallback(async (taskId: string, dependsOnId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/dependencies/${dependsOnId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to remove dependency: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        // Refresh tasks to get updated dependencies
        await fetchTasks();
        return true;
      } else {
        throw new Error(data.error || 'Failed to remove dependency');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error removing dependency:', err);
      return false;
    }
  }, [fetchTasks]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    updateTaskStatus,
    reorderTasks,
    createTask,
    updateTask,
    deleteTask,
    addDependency,
    removeDependency,
  };
};
