'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { analytics, AnalyticsEvent, UserProperties } from '../../lib/analytics/posthog';

// Analytics context interface
interface AnalyticsContextType {
  trackEvent: (event: AnalyticsEvent | string, properties?: Record<string, any>) => void;
  trackPageView: (pageName?: string, properties?: Record<string, any>) => void;
  trackFeatureUsage: (feature: string, action: string, properties?: Record<string, any>) => void;
  trackConversion: (funnel: string, step: string, stepNumber: number, properties?: Record<string, any>) => void;
  trackFeedback: (type: string, rating?: number, properties?: Record<string, any>) => void;
  trackError: (error: Error, context?: string, properties?: Record<string, any>) => void;
  isFeatureEnabled: (flagKey: string) => boolean;
  isReady: boolean;
  userId: string | null;
}

// Create analytics context
const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

// Analytics provider props
interface AnalyticsProviderProps {
  children: ReactNode;
}

// Analytics provider component
export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  // Check if auth is disabled
  const isAuthDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';
  
  // Conditionally use Clerk hooks only when auth is enabled
  const clerkUser = isAuthDisabled ? null : useUser();
  const { user, isSignedIn, isLoaded } = isAuthDisabled ? { user: null, isSignedIn: false, isLoaded: true } : clerkUser;
  
  const [isReady, setIsReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize analytics when user data is loaded
  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && user) {
      // Extract user properties
      const userProperties: UserProperties = {
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        signupDate: user.createdAt?.toISOString(),
        lastActive: new Date().toISOString(),
      };

      // Identify user in analytics
      analytics.identify(user.id, userProperties);
      setUserId(user.id);
      setIsReady(true);

      // Track signup completion if this is a new user
      const isNewUser = user.createdAt && 
        (Date.now() - user.createdAt.getTime()) < 24 * 60 * 60 * 1000; // Within 24 hours
      
      if (isNewUser) {
        analytics.track(AnalyticsEvent.SIGNUP_COMPLETED, {
          signupMethod: 'clerk',
          signupDate: user.createdAt.toISOString(),
        });
      }

      // Track user properties updates
      analytics.setUserProperties(userProperties);

    } else if (!isSignedIn) {
      // Reset analytics for signed out users
      analytics.reset();
      setUserId(null);
      setIsReady(false);
    }
  }, [isLoaded, isSignedIn, user]);

  // Track page views on route changes
  useEffect(() => {
    if (!isReady || !user) return;

    // Track initial page view
    analytics.trackPageView();

    // Set up route change tracking
    const handleRouteChange = () => {
      analytics.trackPageView();
    };

    // Listen for route changes (Next.js App Router)
    if (typeof window !== 'undefined') {
      // For Next.js App Router, we'll track on component mount
      // You can also use a router hook if needed
    }

    return () => {
      // Cleanup if needed
    };
  }, [isReady, user]);

  // Track user engagement metrics
  useEffect(() => {
    if (!isReady || !user) return;

    // Track session start
    analytics.track(AnalyticsEvent.SESSION_STARTED, {
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    // Set up beforeunload tracking
    const handleBeforeUnload = () => {
      analytics.track(AnalyticsEvent.SESSION_ENDED, {
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isReady, user]);

  // Track performance metrics
  useEffect(() => {
    if (!isReady || typeof window === 'undefined') return;

    // Track page load time
    const trackPageLoadTime = () => {
      if (performance && performance.timing) {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        analytics.trackPerformance('page_load_time', loadTime);
      }
    };

    // Track when page is fully loaded
    if (document.readyState === 'complete') {
      trackPageLoadTime();
    } else {
      window.addEventListener('load', trackPageLoadTime);
    }

    return () => {
      window.removeEventListener('load', trackPageLoadTime);
    };
  }, [isReady]);

  // Error boundary for analytics failures
  useEffect(() => {
    if (!isReady) return;

    const handleError = (event: ErrorEvent) => {
      analytics.trackError(new Error(event.message), 'window_error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      analytics.trackError(new Error(event.reason), 'unhandled_promise_rejection', {
        reason: event.reason,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [isReady]);

  // Context value
  const contextValue: AnalyticsContextType = {
    trackEvent: (event: AnalyticsEvent | string, properties?: Record<string, any>) => {
      if (isReady) {
        analytics.track(event, properties);
      }
    },
    trackPageView: (pageName?: string, properties?: Record<string, any>) => {
      if (isReady) {
        analytics.trackPageView(pageName, properties);
      }
    },
    trackFeatureUsage: (feature: string, action: string, properties?: Record<string, any>) => {
      if (isReady) {
        analytics.trackFeatureUsage(feature, action, properties);
      }
    },
    trackConversion: (funnel: string, step: string, stepNumber: number, properties?: Record<string, any>) => {
      if (isReady) {
        analytics.trackConversion(funnel, step, stepNumber, properties);
      }
    },
    trackFeedback: (type: string, rating?: number, properties?: Record<string, any>) => {
      if (isReady) {
        analytics.trackFeedback(type, rating, properties);
      }
    },
    trackError: (error: Error, context?: string, properties?: Record<string, any>) => {
      if (isReady) {
        analytics.trackError(error, context, properties);
      }
    },
    isFeatureEnabled: (flagKey: string) => {
      return isReady ? analytics.isFeatureEnabled(flagKey) : false;
    },
    isReady,
    userId,
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
};

// Custom hook to use analytics context
export const useAnalytics = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

// Higher-order component for analytics
export const withAnalytics = <P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> => {
  const WrappedComponent = (props: P) => (
    <AnalyticsProvider>
      <Component {...props} />
    </AnalyticsProvider>
  );

  WrappedComponent.displayName = `withAnalytics(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Analytics error boundary
export class AnalyticsErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Track error in analytics if available
    try {
      if (analytics.isReady()) {
        analytics.trackError(error, 'react_error_boundary', {
          componentStack: errorInfo.componentStack,
        });
      }
    } catch (analyticsError) {
      console.error('Failed to track error in analytics:', analyticsError);
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="p-4 text-center">
          <h2 className="text-lg font-semibold text-red-600">Something went wrong</h2>
          <p className="text-gray-600 mt-2">
            An error occurred while rendering this component.
          </p>
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AnalyticsProvider;
