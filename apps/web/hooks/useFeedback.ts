import { useState, useCallback } from 'react';
import { useAnalytics } from './useAnalytics';

// Feedback types
export type FeedbackType = 'BUG_REPORT' | 'FEATURE_REQUEST' | 'GENERAL' | 'RATING' | 'SURVEY_RESPONSE';

// Feedback status
export type FeedbackStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

// Feedback interface
export interface Feedback {
  id: string;
  userId: string;
  type: FeedbackType;
  rating?: number;
  title: string;
  description?: string;
  metadata?: any;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}

// Survey interface
export interface Survey {
  id: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  isActive: boolean;
  startDate: string;
  endDate?: string;
  targetAudience?: string[];
  triggers?: SurveyTrigger[];
}

// Survey question interface
export interface SurveyQuestion {
  id: string;
  type: 'multiple_choice' | 'rating' | 'text' | 'nps' | 'boolean';
  question: string;
  options?: string[];
  required: boolean;
  conditional?: {
    questionId: string;
    value: string;
  };
}

// Survey trigger interface
export interface SurveyTrigger {
  type: 'page_load' | 'time_on_page' | 'scroll_depth' | 'exit_intent' | 'action';
  value?: number | string;
  page?: string;
}

// Survey response interface
export interface SurveyResponse {
  id: string;
  surveyId: string;
  userId: string;
  responses: Array<{
    questionId: string;
    answer: string | number | boolean;
  }>;
  completedAt: string;
  timeSpent: number;
}

// Feedback submission interface
export interface FeedbackSubmission {
  type: FeedbackType;
  title: string;
  description?: string;
  rating?: number;
  metadata?: {
    screenshot?: string;
    userAgent?: string;
    url?: string;
    timestamp?: string;
    [key: string]: any;
  };
}

// Feedback hook interface
export interface UseFeedbackReturn {
  // State
  feedback: Feedback[];
  surveys: Survey[];
  loading: boolean;
  error: string | null;
  
  // Feedback operations
  submitFeedback: (feedback: FeedbackSubmission) => Promise<Feedback>;
  getFeedback: (userId?: string) => Promise<Feedback[]>;
  updateFeedbackStatus: (feedbackId: string, status: FeedbackStatus) => Promise<void>;
  deleteFeedback: (feedbackId: string) => Promise<void>;
  
  // Survey operations
  getActiveSurveys: () => Promise<Survey[]>;
  submitSurveyResponse: (surveyId: string, responses: SurveyResponse['responses']) => Promise<SurveyResponse>;
  getSurveyResponses: (surveyId: string) => Promise<SurveyResponse[]>;
  
  // Utility functions
  captureScreenshot: () => Promise<string>;
  getFeedbackStats: () => Promise<{
    total: number;
    byType: Record<FeedbackType, number>;
    byStatus: Record<FeedbackStatus, number>;
    averageRating: number;
  }>;
  
  // Error handling
  clearError: () => void;
}

// Custom feedback hook
export const useFeedback = (): UseFeedbackReturn => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { trackFeedback, trackFeatureUsage } = useAnalytics();

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Submit feedback
  const submitFeedback = useCallback(async (feedbackData: FeedbackSubmission): Promise<Feedback> => {
    setLoading(true);
    setError(null);
    
    try {
      trackFeatureUsage('feedback', 'submission_started', { type: feedbackData.type });
      
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }
      
      const newFeedback = await response.json();
      
      setFeedback(prev => [newFeedback, ...prev]);
      
      trackFeedback(feedbackData.type, feedbackData.rating, {
        title: feedbackData.title,
        hasDescription: !!feedbackData.description,
        hasScreenshot: !!feedbackData.metadata?.screenshot
      });
      
      trackFeatureUsage('feedback', 'submission_completed', { type: feedbackData.type });
      
      return newFeedback;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit feedback';
      setError(errorMessage);
      
      trackFeatureUsage('feedback', 'submission_failed', { 
        type: feedbackData.type, 
        error: errorMessage 
      });
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [trackFeedback, trackFeatureUsage]);

  // Get feedback
  const getFeedback = useCallback(async (userId?: string): Promise<Feedback[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const url = userId ? `/api/feedback?userId=${userId}` : '/api/feedback';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch feedback');
      }
      
      const feedbackData = await response.json();
      setFeedback(feedbackData);
      
      trackFeatureUsage('feedback', 'list_fetched', { userId: !!userId });
      
      return feedbackData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch feedback';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [trackFeatureUsage]);

  // Update feedback status
  const updateFeedbackStatus = useCallback(async (feedbackId: string, status: FeedbackStatus): Promise<void> => {
    try {
      const response = await fetch(`/api/feedback/${feedbackId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update feedback status');
      }
      
      setFeedback(prev => prev.map(item => 
        item.id === feedbackId ? { ...item, status, updatedAt: new Date().toISOString() } : item
      ));
      
      trackFeatureUsage('feedback', 'status_updated', { feedbackId, status });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update feedback status';
      setError(errorMessage);
      throw err;
    }
  }, [trackFeatureUsage]);

  // Delete feedback
  const deleteFeedback = useCallback(async (feedbackId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete feedback');
      }
      
      setFeedback(prev => prev.filter(item => item.id !== feedbackId));
      
      trackFeatureUsage('feedback', 'deleted', { feedbackId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete feedback';
      setError(errorMessage);
      throw err;
    }
  }, [trackFeatureUsage]);

  // Get active surveys
  const getActiveSurveys = useCallback(async (): Promise<Survey[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/feedback/surveys/active');
      
      if (!response.ok) {
        throw new Error('Failed to fetch active surveys');
      }
      
      const surveysData = await response.json();
      setSurveys(surveysData);
      
      trackFeatureUsage('survey', 'list_fetched', { count: surveysData.length });
      
      return surveysData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch active surveys';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [trackFeatureUsage]);

  // Submit survey response
  const submitSurveyResponse = useCallback(async (surveyId: string, responses: SurveyResponse['responses']): Promise<SurveyResponse> => {
    try {
      const startTime = Date.now();
      
      const response = await fetch('/api/feedback/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId,
          responses,
          timeSpent: Date.now() - startTime
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit survey response');
      }
      
      const surveyResponse = await response.json();
      
      trackFeatureUsage('survey', 'response_submitted', { 
        surveyId, 
        questionCount: responses.length,
        timeSpent: Date.now() - startTime
      });
      
      return surveyResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit survey response';
      setError(errorMessage);
      throw err;
    }
  }, [trackFeatureUsage]);

  // Get survey responses
  const getSurveyResponses = useCallback(async (surveyId: string): Promise<SurveyResponse[]> => {
    try {
      const response = await fetch(`/api/feedback/surveys/${surveyId}/responses`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch survey responses');
      }
      
      const responses = await response.json();
      
      trackFeatureUsage('survey', 'responses_fetched', { surveyId, count: responses.length });
      
      return responses;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch survey responses';
      setError(errorMessage);
      throw err;
    }
  }, [trackFeatureUsage]);

  // Capture screenshot
  const captureScreenshot = useCallback(async (): Promise<string> => {
    try {
      // This would typically use html2canvas or similar library
      // For now, return a placeholder
      trackFeatureUsage('feedback', 'screenshot_captured');
      return 'data:image/png;base64,placeholder';
    } catch (err) {
      trackFeatureUsage('feedback', 'screenshot_failed', { error: err instanceof Error ? err.message : 'Unknown error' });
      throw new Error('Failed to capture screenshot');
    }
  }, [trackFeatureUsage]);

  // Get feedback stats
  const getFeedbackStats = useCallback(async () => {
    try {
      const response = await fetch('/api/feedback/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch feedback stats');
      }
      
      const stats = await response.json();
      
      trackFeatureUsage('feedback', 'stats_fetched');
      
      return stats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch feedback stats';
      setError(errorMessage);
      throw err;
    }
  }, [trackFeatureUsage]);

  return {
    feedback,
    surveys,
    loading,
    error,
    submitFeedback,
    getFeedback,
    updateFeedbackStatus,
    deleteFeedback,
    getActiveSurveys,
    submitSurveyResponse,
    getSurveyResponses,
    captureScreenshot,
    getFeedbackStats,
    clearError
  };
};

export default useFeedback;
