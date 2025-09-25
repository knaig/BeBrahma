'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Star, Bug, Lightbulb, MessageCircle, ThumbsUp, Camera, Paperclip, Send } from 'lucide-react';
import { useAnalytics } from '../analytics/AnalyticsProvider';
import html2canvas from 'html2canvas';

// Feedback form schemas
const BugReportSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description must be less than 2000 characters'),
  category: z.enum(['UI/UX', 'Functionality', 'Performance', 'Security', 'Other']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  steps: z.string().optional(),
  expectedBehavior: z.string().optional(),
  actualBehavior: z.string().optional(),
});

const FeatureRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description must be less than 2000 characters'),
  category: z.enum(['New Feature', 'Enhancement', 'Integration', 'Other']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  useCase: z.string().min(10, 'Use case must be at least 10 characters'),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

const GeneralFeedbackSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description must be less than 2000 characters'),
  category: z.enum(['General', 'Support', 'Documentation', 'Other']),
  contactMe: z.boolean().default(false),
  email: z.string().email('Invalid email').optional(),
});

const RatingSchema = z.object({
  rating: z.number().min(1).max(5),
  category: z.enum(['Overall Experience', 'AI Agents', 'Workflow System', 'User Interface', 'Performance', 'Support']),
  comment: z.string().max(1000, 'Comment must be less than 1000 characters').optional(),
});

// Feedback types
type FeedbackType = 'BUG_REPORT' | 'FEATURE_REQUEST' | 'GENERAL' | 'RATING';

// Feedback modal props
interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: FeedbackType;
  triggerSource?: string;
}

// Feedback modal component
export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'GENERAL',
  triggerSource = 'manual',
}) => {
  const { trackFeedback, trackFeatureUsage } = useAnalytics();
  const [activeType, setActiveType] = useState<FeedbackType>(defaultType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const screenshotRef = useRef<HTMLDivElement>(null);

  // Form hooks for different feedback types
  const bugReportForm = useForm({
    resolver: zodResolver(BugReportSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'UI/UX',
      priority: 'MEDIUM',
      steps: '',
      expectedBehavior: '',
      actualBehavior: '',
    },
  });

  const featureRequestForm = useForm({
    resolver: zodResolver(FeatureRequestSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'New Feature',
      priority: 'MEDIUM',
      useCase: '',
      impact: 'MEDIUM',
    },
  });

  const generalFeedbackForm = useForm({
    resolver: zodResolver(GeneralFeedbackSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'General',
      contactMe: false,
      email: '',
    },
  });

  const ratingForm = useForm({
    resolver: zodResolver(RatingSchema),
    defaultValues: {
      rating: 0,
      category: 'Overall Experience',
      comment: '',
    },
  });

  // Track modal open
  useEffect(() => {
    if (isOpen) {
      trackFeatureUsage('feedback_modal', 'opened', { source: triggerSource });
    }
  }, [isOpen, triggerSource, trackFeatureUsage]);

  // Handle feedback type change
  const handleTypeChange = (type: FeedbackType) => {
    setActiveType(type);
    trackFeatureUsage('feedback_modal', 'type_changed', { type, source: triggerSource });
  };

  // Capture screenshot
  const captureScreenshot = async () => {
    if (!screenshotRef.current) return;

    try {
      const canvas = await html2canvas(screenshotRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
      });
      const dataUrl = canvas.toDataURL('image/png');
      setScreenshot(dataUrl);
      trackFeatureUsage('feedback_modal', 'screenshot_captured', { source: triggerSource });
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }
  };

  // Handle form submission
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);

    try {
      const feedbackData = {
        type: activeType,
        ...data,
        ...(screenshot && { attachments: [screenshot] }),
        metadata: {
          source: triggerSource,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        },
      };

      // Submit feedback to API
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (response.ok) {
        // Track feedback submission
        trackFeedback(activeType, data.rating || undefined, {
          category: data.category,
          priority: data.priority,
          source: triggerSource,
        });

        // Show thank you message
        setShowThankYou(true);
        
        // Reset forms
        bugReportForm.reset();
        featureRequestForm.reset();
        generalFeedbackForm.reset();
        ratingForm.reset();
        setRating(0);
        setScreenshot(null);

        // Close modal after delay
        setTimeout(() => {
          setShowThankYou(false);
          onClose();
        }, 3000);
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Handle error (show error message)
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle rating change
  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    ratingForm.setValue('rating', newRating);
  };

  // Render rating stars
  const renderRatingStars = () => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleRatingChange(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="focus:outline-none"
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                star <= (hoveredRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  // Render form based on active type
  const renderForm = () => {
    switch (activeType) {
      case 'BUG_REPORT':
        return (
          <form onSubmit={bugReportForm.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                {...bugReportForm.register('title')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of the bug"
              />
              {bugReportForm.formState.errors.title && (
                <p className="text-red-500 text-sm mt-1">
                  {bugReportForm.formState.errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                {...bugReportForm.register('description')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Detailed description of the bug"
              />
              {bugReportForm.formState.errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {bugReportForm.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  {...bugReportForm.register('category')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="UI/UX">UI/UX</option>
                  <option value="Functionality">Functionality</option>
                  <option value="Performance">Performance</option>
                  <option value="Security">Security</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority *
                </label>
                <select
                  {...bugReportForm.register('priority')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Steps to Reproduce
              </label>
              <textarea
                {...bugReportForm.register('steps')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Behavior
                </label>
                <textarea
                  {...bugReportForm.register('expectedBehavior')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What should happen?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actual Behavior
                </label>
                <textarea
                  {...bugReportForm.register('actualBehavior')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What actually happens?"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Bug className="w-4 h-4" />
                  <span>Submit Bug Report</span>
                </>
              )}
            </button>
          </form>
        );

      case 'FEATURE_REQUEST':
        return (
          <form onSubmit={featureRequestForm.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feature Title *
              </label>
              <input
                {...featureRequestForm.register('title')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Name of the feature you'd like to see"
              />
              {featureRequestForm.formState.errors.title && (
                <p className="text-red-500 text-sm mt-1">
                  {featureRequestForm.formState.errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                {...featureRequestForm.register('description')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Detailed description of the feature"
              />
              {featureRequestForm.formState.errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {featureRequestForm.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  {...featureRequestForm.register('category')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="New Feature">New Feature</option>
                  <option value="Enhancement">Enhancement</option>
                  <option value="Integration">Integration</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority *
                </label>
                <select
                  {...featureRequestForm.register('priority')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Use Case *
              </label>
              <textarea
                {...featureRequestForm.register('useCase')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="How would you use this feature?"
              />
              {featureRequestForm.formState.errors.useCase && (
                <p className="text-red-500 text-sm mt-1">
                  {featureRequestForm.formState.errors.useCase.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Impact *
              </label>
              <select
                {...featureRequestForm.register('impact')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LOW">Low - Nice to have</option>
                <option value="MEDIUM">Medium - Would improve workflow</option>
                <option value="HIGH">High - Essential for my work</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4" />
                  <span>Submit Feature Request</span>
                </>
              )}
            </button>
          </form>
        );

      case 'GENERAL':
        return (
          <form onSubmit={generalFeedbackForm.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                {...generalFeedbackForm.register('title')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief summary of your feedback"
              />
              {generalFeedbackForm.formState.errors.title && (
                <p className="text-red-500 text-sm mt-1">
                  {generalFeedbackForm.formState.errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                {...generalFeedbackForm.register('description')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Share your thoughts, suggestions, or concerns"
              />
              {generalFeedbackForm.formState.errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {generalFeedbackForm.formState.errors.description.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                {...generalFeedbackForm.register('category')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="General">General</option>
                <option value="Support">Support</option>
                <option value="Documentation">Documentation</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                {...generalFeedbackForm.register('contactMe')}
                type="checkbox"
                id="contactMe"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="contactMe" className="text-sm text-gray-700">
                Contact me about this feedback
              </label>
            </div>

            {generalFeedbackForm.watch('contactMe') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  {...generalFeedbackForm.register('email')}
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                />
                {generalFeedbackForm.formState.errors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {generalFeedbackForm.formState.errors.email.message}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4" />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </form>
        );

      case 'RATING':
        return (
          <form onSubmit={ratingForm.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                {...ratingForm.register('category')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Overall Experience">Overall Experience</option>
                <option value="AI Agents">AI Agents</option>
                <option value="Workflow System">Workflow System</option>
                <option value="User Interface">User Interface</option>
                <option value="Performance">Performance</option>
                <option value="Support">Support</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating *
              </label>
              <div className="flex items-center space-x-4">
                {renderRatingStars()}
                <span className="text-sm text-gray-600">
                  {rating > 0 ? `${rating} star${rating > 1 ? 's' : ''}` : 'Select rating'}
                </span>
              </div>
              {ratingForm.formState.errors.rating && (
                <p className="text-red-500 text-sm mt-1">
                  {ratingForm.formState.errors.rating.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Comments
              </label>
              <textarea
                {...ratingForm.register('comment')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us more about your experience..."
              />
              {ratingForm.formState.errors.comment && (
                <p className="text-red-500 text-sm mt-1">
                  {ratingForm.formState.errors.comment.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <ThumbsUp className="w-4 h-4" />
                  <span>Submit Rating</span>
                </>
              )}
            </button>
          </form>
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
            <ThumbsUp className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h3>
          <p className="text-gray-600 mb-4">
            Your feedback has been submitted successfully. We appreciate you taking the time to help us improve.
          </p>
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Share Your Feedback</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Feedback Type Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { type: 'BUG_REPORT', label: 'Bug Report', icon: Bug, color: 'red' },
            { type: 'FEATURE_REQUEST', label: 'Feature Request', icon: Lightbulb, color: 'blue' },
            { type: 'GENERAL', label: 'General Feedback', icon: MessageCircle, color: 'green' },
            { type: 'RATING', label: 'Rating', icon: ThumbsUp, color: 'yellow' },
          ].map(({ type, label, icon: Icon, color }) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type as FeedbackType)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 transition-colors ${
                activeType === type
                  ? `bg-${color}-50 text-${color}-600 border-b-2 border-${color}-600`
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="p-6">
          {renderForm()}
        </div>

        {/* Screenshot Capture (for bug reports) */}
        {activeType === 'BUG_REPORT' && (
          <div className="px-6 pb-6">
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Screenshot (Optional)
                </label>
                <button
                  type="button"
                  onClick={captureScreenshot}
                  className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Screenshot</span>
                </button>
              </div>
              
              {screenshot && (
                <div className="relative">
                  <img
                    src={screenshot}
                    alt="Screenshot"
                    className="max-w-full h-auto border border-gray-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => setScreenshot(null)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
