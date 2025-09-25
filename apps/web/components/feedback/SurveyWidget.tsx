'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, ChevronLeft, ChevronRight, Check, MessageCircle, BarChart3, Star, Send } from 'lucide-react';
import { useAnalytics } from '../analytics/AnalyticsProvider';

// Survey question types
type QuestionType = 'multiple_choice' | 'rating' | 'text' | 'nps' | 'boolean';

// Survey question interface
interface SurveyQuestion {
  id: string;
  type: QuestionType;
  question: string;
  required: boolean;
  options?: string[];
  minRating?: number;
  maxRating?: number;
  placeholder?: string;
  conditional?: {
    questionId: string;
    value: string | number | boolean;
  };
}

// Survey interface
interface Survey {
  id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  trigger: 'manual' | 'page_load' | 'time_on_page' | 'scroll_depth' | 'exit_intent';
  triggerValue?: number;
  targetAudience?: string[];
  startDate?: string;
  endDate?: string;
  maxResponses?: number;
}

// Survey response interface
interface SurveyResponse {
  surveyId: string;
  responses: Record<string, any>;
  metadata: {
    timestamp: string;
    url: string;
    userAgent: string;
    timeOnPage: number;
    scrollDepth: number;
  };
}

// Survey widget props
interface SurveyWidgetProps {
  survey: Survey;
  onClose: () => void;
  onComplete: (response: SurveyResponse) => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  variant?: 'slide-in' | 'modal' | 'banner';
}

// Survey form schema
const createSurveySchema = (questions: SurveyQuestion[]) => {
  const schemaFields: Record<string, any> = {};
  
  questions.forEach(question => {
    switch (question.type) {
      case 'multiple_choice':
        schemaFields[question.id] = question.required 
          ? z.string().min(1, 'This question is required')
          : z.string().optional();
        break;
      case 'rating':
        schemaFields[question.id] = question.required
          ? z.number().min(question.minRating || 1).max(question.maxRating || 5)
          : z.number().optional();
        break;
      case 'text':
        schemaFields[question.id] = question.required
          ? z.string().min(1, 'This question is required')
          : z.string().optional();
        break;
      case 'nps':
        schemaFields[question.id] = question.required
          ? z.number().min(0).max(10)
          : z.number().optional();
        break;
      case 'boolean':
        schemaFields[question.id] = question.required
          ? z.boolean()
          : z.boolean().optional();
        break;
    }
  });
  
  return z.object(schemaFields);
};

// Survey widget component
export const SurveyWidget: React.FC<SurveyWidgetProps> = ({
  survey,
  onClose,
  onComplete,
  position = 'bottom-right',
  variant = 'slide-in',
}) => {
  const { trackFeatureUsage } = useAnalytics();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [timeOnPage, setTimeOnPage] = useState(0);
  const [scrollDepth, setScrollDepth] = useState(0);
  const [showThankYou, setShowThankYou] = useState(false);

  // Create form schema and hook
  const schema = createSurveySchema(survey.questions);
  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  // Track survey interaction
  useEffect(() => {
    if (isVisible) {
      trackFeatureUsage('survey_widget', 'opened', { surveyId: survey.id });
    }
  }, [isVisible, survey.id, trackFeatureUsage]);

  // Track time on page
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOnPage(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.body.offsetHeight;
      const winHeight = window.innerHeight;
      const scrollPercent = (scrollTop / (docHeight - winHeight)) * 100;
      setScrollDepth(Math.round(scrollPercent));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check survey triggers
  useEffect(() => {
    const checkTriggers = () => {
      let shouldShow = false;

      switch (survey.trigger) {
        case 'page_load':
          shouldShow = true;
          break;
        case 'time_on_page':
          shouldShow = timeOnPage >= (survey.triggerValue || 30);
          break;
        case 'scroll_depth':
          shouldShow = scrollDepth >= (survey.triggerValue || 50);
          break;
        case 'exit_intent':
          // Handle exit intent in component
          break;
        default:
          shouldShow = false;
      }

      if (shouldShow && !isVisible) {
        setIsVisible(true);
      }
    };

    checkTriggers();
  }, [survey.trigger, survey.triggerValue, timeOnPage, scrollDepth, isVisible]);

  // Handle exit intent
  useEffect(() => {
    if (survey.trigger !== 'exit_intent') return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !isVisible) {
        setIsVisible(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [survey.trigger, isVisible]);

  // Handle form submission
  const onSubmit = async (data: any) => {
    try {
      const response: SurveyResponse = {
        surveyId: survey.id,
        responses: data,
        metadata: {
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          timeOnPage,
          scrollDepth,
        },
      };

      // Submit to API
      await fetch('/api/feedback/survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(response),
      });

      // Track completion
      trackFeatureUsage('survey_widget', 'completed', { 
        surveyId: survey.id,
        questionCount: survey.questions.length,
        timeToComplete: timeOnPage,
      });

      // Show thank you message
      setShowThankYou(true);
      
      // Call onComplete callback
      onComplete(response);

      // Auto-close after delay
      setTimeout(() => {
        setShowThankYou(false);
        onClose();
      }, 3000);

    } catch (error) {
      console.error('Error submitting survey:', error);
    }
  };

  // Navigate to next question
  const nextQuestion = () => {
    if (currentQuestionIndex < survey.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  // Navigate to previous question
  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Check if current question should be shown (conditional logic)
  const shouldShowQuestion = (question: SurveyQuestion): boolean => {
    if (!question.conditional) return true;

    const { questionId, value } = question.conditional;
    const response = form.watch(questionId);
    return response === value;
  };

  // Get visible questions
  const visibleQuestions = survey.questions.filter(shouldShowQuestion);

  // Render question based on type
  const renderQuestion = (question: SurveyQuestion) => {
    const isRequired = question.required;
    const fieldName = question.id;
    const error = form.formState.errors[fieldName];

    switch (question.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  {...form.register(fieldName)}
                  value={option}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
            {error && (
              <p className="text-red-500 text-sm">{error.message}</p>
            )}
          </div>
        );

      case 'rating':
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              {Array.from({ length: (question.maxRating || 5) - (question.minRating || 1) + 1 }, (_, i) => {
                const rating = (question.minRating || 1) + i;
                return (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => form.setValue(fieldName, rating)}
                    className={`w-10 h-10 rounded-full border-2 transition-colors ${
                      form.watch(fieldName) === rating
                        ? 'border-yellow-400 bg-yellow-400 text-white'
                        : 'border-gray-300 text-gray-400 hover:border-yellow-300'
                    }`}
                  >
                    {rating}
                  </button>
                );
              })}
            </div>
            {error && (
              <p className="text-red-500 text-sm">{error.message}</p>
            )}
          </div>
        );

      case 'text':
        return (
          <div>
            <textarea
              {...form.register(fieldName)}
              rows={3}
              placeholder={question.placeholder || 'Type your answer here...'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && (
              <p className="text-red-500 text-sm">{error.message}</p>
            )}
          </div>
        );

      case 'nps':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Not likely at all</span>
              <span className="text-sm text-gray-500">Extremely likely</span>
            </div>
            <div className="flex items-center space-x-1">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => form.setValue(fieldName, i)}
                  className={`w-8 h-8 rounded border transition-colors ${
                    form.watch(fieldName) === i
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            {error && (
              <p className="text-red-500 text-sm">{error.message}</p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  {...form.register(fieldName)}
                  value="true"
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Yes</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  {...form.register(fieldName)}
                  value="false"
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">No</span>
              </label>
            </div>
            {error && (
              <p className="text-red-500 text-sm">{error.message}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Render thank you message
  if (showThankYou) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h3>
          <p className="text-gray-600">
            Your survey response has been submitted. We appreciate your feedback!
          </p>
        </div>
      </div>
    );
  }

  // Don't render if not visible
  if (!isVisible) return null;

  // Render minimized state
  if (isMinimized) {
    return (
      <div className={`fixed ${position} m-4 z-40`}>
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Open survey"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    );
  }

  // Render survey widget
  const currentQuestion = visibleQuestions[currentQuestionIndex];
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === visibleQuestions.length - 1;
  const progress = ((currentQuestionIndex + 1) / visibleQuestions.length) * 100;

  return (
    <div className={`fixed ${position} m-4 z-40`}>
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-96 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">{survey.title}</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(true)}
                className="text-white/80 hover:text-white transition-colors"
                title="Minimize"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-blue-100 text-sm">{survey.description}</p>
          
          {/* Progress bar */}
          <div className="mt-3 bg-blue-500/30 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-blue-100 mt-1">
            <span>Question {currentQuestionIndex + 1} of {visibleQuestions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Question Content */}
        <div className="p-6">
          {currentQuestion && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  {currentQuestion.question}
                  {currentQuestion.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </h4>
                {renderQuestion(currentQuestion)}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={prevQuestion}
                  disabled={isFirstQuestion}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                    isFirstQuestion
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {isLastQuestion ? (
                  <button
                    type="button"
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={!form.formState.isValid}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>Submit</span>
                    <Send className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={nextQuestion}
                    disabled={!form.watch(currentQuestion.id)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyWidget;
