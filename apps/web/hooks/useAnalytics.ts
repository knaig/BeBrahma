import { useCallback } from 'react';
import { useAnalytics as useAnalyticsContext } from '../components/analytics/AnalyticsProvider';

// Analytics event types
export type AnalyticsEvent = 
  | 'page_view'
  | 'user_action'
  | 'feature_usage'
  | 'conversion'
  | 'feedback'
  | 'error'
  | 'performance'
  | 'subscription_event'
  | 'payment_event'
  | 'search'
  | 'navigation'
  | 'form_submission'
  | 'download'
  | 'share'
  | 'login'
  | 'logout'
  | 'signup'
  | 'upgrade'
  | 'downgrade'
  | 'cancel';

// User properties interface
export interface UserProperties {
  userId?: string;
  email?: string;
  plan?: string;
  planType?: 'free' | 'starter' | 'professional' | 'enterprise';
  userType?: 'individual' | 'team' | 'enterprise';
  region?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  firstSeen?: string;
  lastSeen?: string;
  totalSessions?: number;
  totalPageViews?: number;
  totalTimeSpent?: number;
  featuresUsed?: string[];
  conversionSource?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

// Event properties interface
export interface EventProperties {
  [key: string]: any;
  category?: string;
  action?: string;
  label?: string;
  value?: number;
  nonInteraction?: boolean;
  customDimensions?: Record<string, string>;
  customMetrics?: Record<string, number>;
}

// Analytics hook interface
export interface UseAnalyticsReturn {
  // Core tracking functions
  track: (event: AnalyticsEvent, properties?: EventProperties) => void;
  trackPageView: (url?: string, properties?: EventProperties) => void;
  trackUserAction: (action: string, properties?: EventProperties) => void;
  trackFeatureUsage: (feature: string, action: string, properties?: EventProperties) => void;
  trackConversion: (goal: string, properties?: EventProperties) => void;
  trackFeedback: (type: string, rating?: number, properties?: EventProperties) => void;
  trackError: (error: string, properties?: EventProperties) => void;
  trackPerformance: (metric: string, value: number, properties?: EventProperties) => void;
  
  // Subscription and payment tracking
  trackSubscriptionEvent: (event: string, plan: string, properties?: EventProperties) => void;
  trackPaymentEvent: (event: string, amount: number, currency: string, properties?: EventProperties) => void;
  
  // User identification and properties
  identify: (userId: string, properties?: UserProperties) => void;
  setUserProperties: (properties: UserProperties) => void;
  reset: () => void;
  
  // Feature flags
  getFeatureFlag: (flag: string) => any;
  isFeatureEnabled: (flag: string) => boolean;
  
  // Session management
  startSession: () => void;
  endSession: () => void;
  
  // E-commerce tracking
  trackPurchase: (orderId: string, amount: number, currency: string, properties?: EventProperties) => void;
  trackAddToCart: (productId: string, price: number, properties?: EventProperties) => void;
  trackRemoveFromCart: (productId: string, properties?: EventProperties) => void;
  
  // Search tracking
  trackSearch: (query: string, resultsCount: number, properties?: EventProperties) => void;
  
  // Form tracking
  trackFormStart: (formName: string, properties?: EventProperties) => void;
  trackFormComplete: (formName: string, properties?: EventProperties) => void;
  trackFormError: (formName: string, error: string, properties?: EventProperties) => void;
  
  // Navigation tracking
  trackNavigation: (from: string, to: string, properties?: EventProperties) => void;
  
  // Download tracking
  trackDownload: (fileName: string, fileType: string, properties?: EventProperties) => void;
  
  // Share tracking
  trackShare: (content: string, method: string, properties?: EventProperties) => void;
  
  // A/B testing
  trackExperiment: (experimentName: string, variant: string, properties?: EventProperties) => void;
  
  // Custom events
  trackCustomEvent: (eventName: string, properties?: EventProperties) => void;
}

// Custom analytics hook
export const useAnalytics = (): UseAnalyticsReturn => {
  const analytics = useAnalyticsContext();

  // Core tracking functions
  const track = useCallback((event: AnalyticsEvent, properties?: EventProperties) => {
    analytics.track(event, properties);
  }, [analytics]);

  const trackPageView = useCallback((url?: string, properties?: EventProperties) => {
    analytics.trackPageView(url, properties);
  }, [analytics]);

  const trackUserAction = useCallback((action: string, properties?: EventProperties) => {
    analytics.track('user_action', { action, ...properties });
  }, [analytics]);

  const trackFeatureUsage = useCallback((feature: string, action: string, properties?: EventProperties) => {
    analytics.trackFeatureUsage(feature, action, properties);
  }, [analytics]);

  const trackConversion = useCallback((goal: string, properties?: EventProperties) => {
    analytics.trackConversion(goal, properties);
  }, [analytics]);

  const trackFeedback = useCallback((type: string, rating?: number, properties?: EventProperties) => {
    analytics.trackFeedback(type, rating, properties);
  }, [analytics]);

  const trackError = useCallback((error: string, properties?: EventProperties) => {
    analytics.trackError(error, properties);
  }, [analytics]);

  const trackPerformance = useCallback((metric: string, value: number, properties?: EventProperties) => {
    analytics.trackPerformance(metric, value, properties);
  }, [analytics]);

  // Subscription and payment tracking
  const trackSubscriptionEvent = useCallback((event: string, plan: string, properties?: EventProperties) => {
    analytics.track('subscription_event', { event, plan, ...properties });
  }, [analytics]);

  const trackPaymentEvent = useCallback((event: string, amount: number, currency: string, properties?: EventProperties) => {
    analytics.track('payment_event', { event, amount, currency, ...properties });
  }, [analytics]);

  // User identification and properties
  const identify = useCallback((userId: string, properties?: UserProperties) => {
    analytics.identify(userId, properties);
  }, [analytics]);

  const setUserProperties = useCallback((properties: UserProperties) => {
    analytics.setUserProperties(properties);
  }, [analytics]);

  const reset = useCallback(() => {
    analytics.reset();
  }, [analytics]);

  // Feature flags
  const getFeatureFlag = useCallback((flag: string) => {
    return analytics.getFeatureFlag(flag);
  }, [analytics]);

  const isFeatureEnabled = useCallback((flag: string) => {
    return analytics.isFeatureEnabled(flag);
  }, [analytics]);

  // Session management
  const startSession = useCallback(() => {
    analytics.track('session_start', { timestamp: new Date().toISOString() });
  }, [analytics]);

  const endSession = useCallback(() => {
    analytics.track('session_end', { timestamp: new Date().toISOString() });
  }, [analytics]);

  // E-commerce tracking
  const trackPurchase = useCallback((orderId: string, amount: number, currency: string, properties?: EventProperties) => {
    analytics.track('purchase', { orderId, amount, currency, ...properties });
  }, [analytics]);

  const trackAddToCart = useCallback((productId: string, price: number, properties?: EventProperties) => {
    analytics.track('add_to_cart', { productId, price, ...properties });
  }, [analytics]);

  const trackRemoveFromCart = useCallback((productId: string, properties?: EventProperties) => {
    analytics.track('remove_from_cart', { productId, ...properties });
  }, [analytics]);

  // Search tracking
  const trackSearch = useCallback((query: string, resultsCount: number, properties?: EventProperties) => {
    analytics.track('search', { query, resultsCount, ...properties });
  }, [analytics]);

  // Form tracking
  const trackFormStart = useCallback((formName: string, properties?: EventProperties) => {
    analytics.track('form_start', { formName, ...properties });
  }, [analytics]);

  const trackFormComplete = useCallback((formName: string, properties?: EventProperties) => {
    analytics.track('form_complete', { formName, ...properties });
  }, [analytics]);

  const trackFormError = useCallback((formName: string, error: string, properties?: EventProperties) => {
    analytics.track('form_error', { formName, error, ...properties });
  }, [analytics]);

  // Navigation tracking
  const trackNavigation = useCallback((from: string, to: string, properties?: EventProperties) => {
    analytics.track('navigation', { from, to, ...properties });
  }, [analytics]);

  // Download tracking
  const trackDownload = useCallback((fileName: string, fileType: string, properties?: EventProperties) => {
    analytics.track('download', { fileName, fileType, ...properties });
  }, [analytics]);

  // Share tracking
  const trackShare = useCallback((content: string, method: string, properties?: EventProperties) => {
    analytics.track('share', { content, method, ...properties });
  }, [analytics]);

  // A/B testing
  const trackExperiment = useCallback((experimentName: string, variant: string, properties?: EventProperties) => {
    analytics.track('experiment', { experimentName, variant, ...properties });
  }, [analytics]);

  // Custom events
  const trackCustomEvent = useCallback((eventName: string, properties?: EventProperties) => {
    analytics.track(eventName as AnalyticsEvent, properties);
  }, [analytics]);

  return {
    track,
    trackPageView,
    trackUserAction,
    trackFeatureUsage,
    trackConversion,
    trackFeedback,
    trackError,
    trackPerformance,
    trackSubscriptionEvent,
    trackPaymentEvent,
    identify,
    setUserProperties,
    reset,
    getFeatureFlag,
    isFeatureEnabled,
    startSession,
    endSession,
    trackPurchase,
    trackAddToCart,
    trackRemoveFromCart,
    trackSearch,
    trackFormStart,
    trackFormComplete,
    trackFormError,
    trackNavigation,
    trackDownload,
    trackShare,
    trackExperiment,
    trackCustomEvent
  };
};

export default useAnalytics;
