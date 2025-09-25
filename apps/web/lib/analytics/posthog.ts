import posthog from 'posthog-js';

// PostHog configuration
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

// Initialize PostHog if key is available
if (POSTHOG_KEY && typeof window !== 'undefined') {
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          posthog.debug();
        }
      },
      autocapture: false, // Disable autocapture to prevent spam
      capture_pageview: false, // We'll handle this manually
      capture_pageleave: false, // Disable page leave tracking
      disable_session_recording: true, // Disable session recording
      enable_recording_console_log: false,
      respect_dnt: true,
      persistence: 'localStorage',
      disable_persistence: false,
      cross_subdomain_cookie: false,
      secure_cookie: true,
      property_blacklist: ['$initial_referrer', '$initial_referring_domain'],
      sanitize_properties: (properties, eventName) => {
        // Remove sensitive information
        const sanitized = { ...properties };
        delete sanitized.password;
        delete sanitized.token;
        delete sanitized.apiKey;
        return sanitized;
      },
    });
  } catch (error) {
    console.warn('PostHog initialization failed:', error);
  }
} else if (typeof window !== 'undefined') {
  console.log('PostHog completely disabled: No API key provided');
  // Completely disable PostHog to prevent any network calls
  posthog.init = () => posthog as any;
  posthog.capture = () => undefined;
  posthog.identify = () => {};
  posthog.reset = () => {};
  posthog.people = { set: () => {}, set_once: () => {} };
  posthog.getFeatureFlag = () => undefined;
  posthog.isFeatureEnabled = () => false;
  posthog.debug = () => {};
  posthog.opt_in_capturing = () => {};
  posthog.opt_out_capturing = () => {};
  posthog.has_opted_in_capturing = () => false;
  posthog.has_opted_out_capturing = () => true;
}

// Analytics event types
export enum AnalyticsEvent {
  // Page views
  PAGE_VIEW = 'page_view',
  
  // User actions
  BUTTON_CLICK = 'button_click',
  FORM_SUBMIT = 'form_submit',
  LINK_CLICK = 'link_click',
  
  // Feature usage
  FEATURE_USED = 'feature_used',
  FEATURE_ACCESSED = 'feature_accessed',
  
  // Conversion funnel
  SIGNUP_STARTED = 'signup_started',
  SIGNUP_COMPLETED = 'signup_completed',
  FIRST_PROJECT_CREATED = 'first_project_created',
  SUBSCRIPTION_STARTED = 'subscription_started',
  SUBSCRIPTION_COMPLETED = 'subscription_completed',
  
  // User engagement
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  TIME_ON_PAGE = 'time_on_page',
  
  // Feedback
  FEEDBACK_SUBMITTED = 'feedback_submitted',
  SURVEY_COMPLETED = 'survey_completed',
  RATING_SUBMITTED = 'rating_submitted',
  
  // Error tracking
  ERROR_OCCURRED = 'error_occurred',
  API_ERROR = 'api_error',
  
  // Performance
  PAGE_LOAD_TIME = 'page_load_time',
  API_RESPONSE_TIME = 'api_response_time',
}

// Analytics properties interface
export interface AnalyticsProperties {
  [key: string]: any;
}

// User properties interface
export interface UserProperties {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  totalProjects?: number;
  totalTasks?: number;
  lastActive?: string;
  signupDate?: string;
  [key: string]: any;
}

// Analytics service class
export class AnalyticsService {
  private static instance: AnalyticsService;
  private isInitialized = false;
  private userId: string | null = null;
  private sessionId: string | null = null;
  private pageStartTime: number = 0;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private initialize() {
    if (typeof window === 'undefined' || !POSTHOG_KEY) {
      return;
    }

    try {
      // Generate session ID
      this.sessionId = this.getOrCreateSessionId();
      
      // Set up page visibility change tracking
      this.setupPageVisibilityTracking();
      
      // Set up beforeunload tracking
      this.setupBeforeUnloadTracking();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }

  /**
   * Identify user with PostHog
   */
  public identify(userId: string, properties?: UserProperties) {
    if (!this.isInitialized || !POSTHOG_KEY || !posthog) return;

    try {
      this.userId = userId;
      
      // Identify user in PostHog
      posthog.identify(userId, {
        ...properties,
        sessionId: this.sessionId,
        lastIdentified: new Date().toISOString(),
      });

      // Set user properties
      if (properties) {
        posthog.people.set(properties);
      }

      // Track identification event
      this.track(AnalyticsEvent.SESSION_STARTED, {
        userId,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Failed to identify user:', error);
    }
  }

  /**
   * Track custom events
   */
  public track(event: AnalyticsEvent | string, properties?: AnalyticsProperties) {
    if (!this.isInitialized || !POSTHOG_KEY || !posthog) return;

    try {
      const enhancedProperties = {
        ...properties,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        path: window.location.pathname,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      posthog.capture(event, enhancedProperties);

      // Also send to our API for server-side tracking
      this.sendToAPI(event, enhancedProperties);

    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  /**
   * Track page views
   */
  public trackPageView(pageName?: string, properties?: AnalyticsProperties) {
    if (!this.isInitialized || !POSTHOG_KEY || !posthog) return;

    try {
      const pageProperties = {
        pageName: pageName || window.location.pathname,
        pageTitle: document.title,
        pageUrl: window.location.href,
        referrer: document.referrer,
        ...properties,
      };

      // Track in PostHog
      posthog.capture(AnalyticsEvent.PAGE_VIEW, pageProperties);

      // Send to API
      this.sendToAPI(AnalyticsEvent.PAGE_VIEW, pageProperties);

      // Start timing for this page
      this.pageStartTime = Date.now();

    } catch (error) {
      console.error('Failed to track page view:', error);
    }
  }

  /**
   * Track feature usage
   */
  public trackFeatureUsage(feature: string, action: string, properties?: AnalyticsProperties) {
    this.track(AnalyticsEvent.FEATURE_USED, {
      feature,
      action,
      ...properties,
    });
  }

  /**
   * Track conversion funnel steps
   */
  public trackConversion(funnel: string, step: string, stepNumber: number, properties?: AnalyticsProperties) {
    this.track('conversion_step_completed', {
      funnel,
      step,
      stepNumber,
      ...properties,
    });
  }

  /**
   * Track user feedback
   */
  public trackFeedback(type: string, rating?: number, properties?: AnalyticsProperties) {
    this.track(AnalyticsEvent.FEEDBACK_SUBMITTED, {
      feedbackType: type,
      rating,
      ...properties,
    });
  }

  /**
   * Track errors
   */
  public trackError(error: Error, context?: string, properties?: AnalyticsProperties) {
    this.track(AnalyticsEvent.ERROR_OCCURRED, {
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      context,
      ...properties,
    });
  }

  /**
   * Track performance metrics
   */
  public trackPerformance(metric: string, value: number, properties?: AnalyticsProperties) {
    this.track('performance_metric', {
      metric,
      value,
      ...properties,
    });
  }

  /**
   * Set user properties
   */
  public setUserProperties(properties: UserProperties) {
    if (!this.isInitialized || !POSTHOG_KEY || !posthog) return;

    try {
      posthog.people.set(properties);
    } catch (error) {
      console.error('Failed to set user properties:', error);
    }
  }

  /**
   * Get feature flag value
   */
  public getFeatureFlag(flagKey: string): boolean | string | undefined {
    if (!this.isInitialized || !POSTHOG_KEY || !posthog) return undefined;

    try {
      return posthog.getFeatureFlag(flagKey);
    } catch (error) {
      console.error('Failed to get feature flag:', error);
      return undefined;
    }
  }

  /**
   * Check if feature flag is enabled
   */
  public isFeatureEnabled(flagKey: string): boolean {
    if (!this.isInitialized || !POSTHOG_KEY || !posthog) return false;

    try {
      return posthog.isFeatureEnabled(flagKey);
    } catch (error) {
      console.error('Failed to check feature flag:', error);
      return false;
    }
  }

  /**
   * Reset user identity
   */
  public reset() {
    if (!this.isInitialized || !POSTHOG_KEY || !posthog) return;

    try {
      this.userId = null;
      this.sessionId = null;
      posthog.reset();
    } catch (error) {
      console.error('Failed to reset analytics:', error);
    }
  }

  /**
   * Get current user ID
   */
  public getUserId(): string | null {
    return this.userId;
  }

  /**
   * Get current session ID
   */
  public getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Check if analytics is initialized
   */
  public isReady(): boolean {
    return this.isInitialized && !!POSTHOG_KEY && !!posthog || false;
  }

  // Private helper methods

  private getOrCreateSessionId(): string {
    const existingSessionId = sessionStorage.getItem('analytics_session_id');
    if (existingSessionId) {
      return existingSessionId;
    }

    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', newSessionId);
    return newSessionId;
  }

  private setupPageVisibilityTracking() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page hidden - track time on page
        this.trackTimeOnPage();
      } else {
        // Page visible - start new timing
        this.pageStartTime = Date.now();
      }
    });
  }

  private setupBeforeUnloadTracking() {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeunload', () => {
      this.trackTimeOnPage();
      this.track(AnalyticsEvent.SESSION_ENDED, {
        sessionId: this.sessionId,
        sessionDuration: this.getSessionDuration(),
      });
    });
  }

  private trackTimeOnPage() {
    if (this.pageStartTime > 0) {
      const timeOnPage = Date.now() - this.pageStartTime;
      this.track(AnalyticsEvent.TIME_ON_PAGE, {
        timeOnPage,
        pagePath: window.location.pathname,
      });
    }
  }

  private getSessionDuration(): number {
    const sessionStart = sessionStorage.getItem('session_start_time');
    if (sessionStart) {
      return Date.now() - parseInt(sessionStart);
    }
    return 0;
  }

  private async sendToAPI(event: string, properties: AnalyticsProperties) {
    if (!this.userId) return;

    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          eventType: event,
          eventData: properties,
        }),
      });
    } catch (error) {
      // Silently fail for API tracking - don't block user experience
      console.debug('Failed to send analytics to API:', error);
    }
  }
}

// Export singleton instance
export const analytics = AnalyticsService.getInstance();

// Export utility functions for easy use
export const trackEvent = (event: AnalyticsEvent | string, properties?: AnalyticsProperties) => {
  analytics.track(event, properties);
};

export const trackPageView = (pageName?: string, properties?: AnalyticsProperties) => {
  analytics.trackPageView(pageName, properties);
};

export const trackFeatureUsage = (feature: string, action: string, properties?: AnalyticsProperties) => {
  analytics.trackFeatureUsage(feature, action, properties);
};

export const trackConversion = (funnel: string, step: string, stepNumber: number, properties?: AnalyticsProperties) => {
  analytics.trackConversion(funnel, step, stepNumber, properties);
};

export const identifyUser = (userId: string, properties?: UserProperties) => {
  analytics.identify(userId, properties);
};

export const isFeatureEnabled = (flagKey: string): boolean => {
  return analytics.isFeatureEnabled(flagKey);
};

export default analytics;
