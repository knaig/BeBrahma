import { PostHog } from 'posthog-node';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// PostHog client initialization
let posthog: PostHog | null = null;

if (process.env.POSTHOG_API_KEY) {
  posthog = new PostHog(
    process.env.POSTHOG_API_KEY,
    {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      flushAt: 20,
      flushInterval: 10000,
    }
  );
}

// Event tracking schemas
const UserActionSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  eventType: z.string(),
  eventData: z.record(z.any()),
  metadata: z.record(z.any()).optional(),
});

const ConversionSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  funnel: z.string(),
  step: z.string(),
  stepNumber: z.number(),
  metadata: z.record(z.any()).optional(),
});

const FeatureUsageSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  feature: z.string(),
  action: z.string(),
  duration: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

const SubscriptionEventSchema = z.object({
  userId: z.string(),
  eventType: z.enum(['subscription_created', 'subscription_updated', 'subscription_cancelled', 'payment_success', 'payment_failed']),
  planId: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export class AnalyticsService {
  /**
   * Track user actions and store in database
   */
  static async trackUserAction(data: z.infer<typeof UserActionSchema>) {
    try {
      const validatedData = UserActionSchema.parse(data);
      
      // Store in database
      await prisma.analyticsEvent.create({
        data: {
          userId: validatedData.userId,
          sessionId: validatedData.sessionId,
          eventType: validatedData.eventType,
          eventData: validatedData.eventData,
          metadata: validatedData.metadata,
        },
      });

      // Track in PostHog
      if (posthog) {
        posthog.capture({
          distinctId: validatedData.userId,
          event: validatedData.eventType,
          properties: {
            sessionId: validatedData.sessionId,
            ...validatedData.eventData,
            ...validatedData.metadata,
          },
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error tracking user action:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Track conversion funnel steps
   */
  static async trackConversion(data: z.infer<typeof ConversionSchema>) {
    try {
      const validatedData = ConversionSchema.parse(data);
      
      // Store conversion event
      await prisma.analyticsEvent.create({
        data: {
          userId: validatedData.userId,
          sessionId: validatedData.sessionId,
          eventType: `conversion_${validatedData.funnel}_${validatedData.step}`,
          eventData: {
            funnel: validatedData.funnel,
            step: validatedData.step,
            stepNumber: validatedData.stepNumber,
            ...validatedData.metadata,
          },
          metadata: validatedData.metadata,
        },
      });

      // Track in PostHog with funnel properties
      if (posthog) {
        posthog.capture({
          distinctId: validatedData.userId,
          event: 'conversion_step_completed',
          properties: {
            sessionId: validatedData.sessionId,
            funnel: validatedData.funnel,
            step: validatedData.step,
            stepNumber: validatedData.stepNumber,
            ...validatedData.metadata,
          },
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error tracking conversion:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Track feature usage
   */
  static async trackFeatureUsage(data: z.infer<typeof FeatureUsageSchema>) {
    try {
      const validatedData = FeatureUsageSchema.parse(data);
      
      // Store feature usage event
      await prisma.analyticsEvent.create({
        data: {
          userId: validatedData.userId,
          sessionId: validatedData.sessionId,
          eventType: `feature_${validatedData.feature}_${validatedData.action}`,
          eventData: {
            feature: validatedData.feature,
            action: validatedData.action,
            duration: validatedData.duration,
            ...validatedData.metadata,
          },
          metadata: validatedData.metadata,
        },
      });

      // Track in PostHog
      if (posthog) {
        posthog.capture({
          distinctId: validatedData.userId,
          event: 'feature_used',
          properties: {
            sessionId: validatedData.sessionId,
            feature: validatedData.feature,
            action: validatedData.action,
            duration: validatedData.duration,
            ...validatedData.metadata,
          },
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error tracking feature usage:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Track subscription events
   */
  static async trackSubscriptionEvent(data: z.infer<typeof SubscriptionEventSchema>) {
    try {
      const validatedData = SubscriptionEventSchema.parse(data);
      
      // Store subscription event
      await prisma.analyticsEvent.create({
        data: {
          userId: validatedData.userId,
          sessionId: 'subscription', // Special session for subscription events
          eventType: validatedData.eventType,
          eventData: {
            planId: validatedData.planId,
            amount: validatedData.amount,
            currency: validatedData.currency,
            ...validatedData.metadata,
          },
          metadata: validatedData.metadata,
        },
      });

      // Track in PostHog
      if (posthog) {
        posthog.capture({
          distinctId: validatedData.userId,
          event: validatedData.eventType,
          properties: {
            planId: validatedData.planId,
            amount: validatedData.amount,
            currency: validatedData.currency,
            ...validatedData.metadata,
          },
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error tracking subscription event:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Aggregate usage metrics for a user
   */
  static async aggregateUsageMetrics(userId: string, date: Date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get events for the day
      const events = await prisma.analyticsEvent.findMany({
        where: {
          userId,
          timestamp: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      // Calculate metrics
      const sessionsCount = new Set(events.map(e => e.sessionId)).size;
      const messagesCount = events.filter(e => e.eventType.includes('message')).length;
      const toolsUsed = events
        .filter(e => e.eventType.includes('tool'))
        .map(e => e.eventData.tool || 'unknown');
      const featuresUsed = events
        .filter(e => e.eventType.includes('feature'))
        .map(e => e.eventData.feature || 'unknown');

      // Calculate time spent (in minutes)
      let timeSpent = 0;
      const sessionEvents = events.filter(e => e.eventType.includes('session'));
      for (const event of sessionEvents) {
        if (event.eventData.duration) {
          timeSpent += event.eventData.duration;
        }
      }

      // Upsert usage metrics
      const usageMetrics = await prisma.usageMetrics.upsert({
        where: {
          userId_date: {
            userId,
            date: startOfDay,
          },
        },
        update: {
          sessionsCount,
          messagesCount,
          toolsUsed: toolsUsed,
          timeSpent,
          featuresUsed: featuresUsed,
        },
        create: {
          userId,
          date: startOfDay,
          sessionsCount,
          messagesCount,
          toolsUsed: toolsUsed,
          timeSpent,
          featuresUsed: featuresUsed,
        },
      });

      return { success: true, data: usageMetrics };
    } catch (error) {
      console.error('Error aggregating usage metrics:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get conversion funnel analysis
   */
  static async getConversionFunnel(funnel: string, dateRange: { start: Date; end: Date }) {
    try {
      const events = await prisma.analyticsEvent.findMany({
        where: {
          eventType: {
            startsWith: `conversion_${funnel}_`,
          },
          timestamp: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      // Group by step and count
      const funnelData = events.reduce((acc, event) => {
        const step = event.eventData.step;
        if (!acc[step]) {
          acc[step] = 0;
        }
        acc[step]++;
        return acc;
      }, {} as Record<string, number>);

      return { success: true, data: funnelData };
    } catch (error) {
      console.error('Error getting conversion funnel:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get user retention metrics
   */
  static async getUserRetention(dateRange: { start: Date; end: Date }) {
    try {
      // Get unique users by date
      const userActivity = await prisma.analyticsEvent.groupBy({
        by: ['userId', 'timestamp'],
        where: {
          timestamp: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        _count: {
          id: true,
        },
      });

      // Calculate retention cohorts
      const cohorts: Record<string, Set<string>> = {};
      for (const activity of userActivity) {
        const dateKey = activity.timestamp.toISOString().split('T')[0];
        if (!cohorts[dateKey]) {
          cohorts[dateKey] = new Set();
        }
        cohorts[dateKey].add(activity.userId);
      }

      // Calculate retention rates
      const retentionData = Object.entries(cohorts).map(([date, users]) => ({
        date,
        totalUsers: users.size,
        retainedUsers: users.size, // Simplified for now
        retentionRate: 1.0, // Simplified for now
      }));

      return { success: true, data: retentionData };
    } catch (error) {
      console.error('Error getting user retention:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get user behavior analytics
   */
  static async getUserBehaviorAnalytics(userId: string, dateRange: { start: Date; end: Date }) {
    try {
      const events = await prisma.analyticsEvent.findMany({
        where: {
          userId,
          timestamp: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      // Analyze user behavior patterns
      const behaviorData = {
        totalEvents: events.length,
        eventTypes: events.reduce((acc, event) => {
          acc[event.eventType] = (acc[event.eventType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        sessionCount: new Set(events.map(e => e.sessionId)).size,
        averageSessionDuration: 0, // Calculate from session events
        mostUsedFeatures: [] as string[],
        conversionSteps: [] as string[],
      };

      // Calculate most used features
      const featureEvents = events.filter(e => e.eventType.includes('feature'));
      const featureCounts = featureEvents.reduce((acc, event) => {
        const feature = event.eventData.feature;
        if (feature) {
          acc[feature] = (acc[feature] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      behaviorData.mostUsedFeatures = Object.entries(featureCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([feature]) => feature);

      // Get conversion steps
      const conversionEvents = events.filter(e => e.eventType.includes('conversion'));
      behaviorData.conversionSteps = conversionEvents.map(e => e.eventData.step);

      return { success: true, data: behaviorData };
    } catch (error) {
      console.error('Error getting user behavior analytics:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Export analytics data
   */
  static async exportAnalyticsData(userId: string, format: 'csv' | 'json', dateRange: { start: Date; end: Date }) {
    try {
      const events = await prisma.analyticsEvent.findMany({
        where: {
          userId,
          timestamp: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      if (format === 'json') {
        return { success: true, data: events, format: 'json' };
      }

      // CSV format
      const csvData = events.map(event => ({
        timestamp: event.timestamp.toISOString(),
        eventType: event.eventType,
        sessionId: event.sessionId,
        eventData: JSON.stringify(event.eventData),
        metadata: event.metadata ? JSON.stringify(event.metadata) : '',
      }));

      return { success: true, data: csvData, format: 'csv' };
    } catch (error) {
      console.error('Error exporting analytics data:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Cleanup old analytics data
   */
  static async cleanupOldData(retentionDays: number = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Delete old analytics events
      const deletedEvents = await prisma.analyticsEvent.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      // Delete old usage metrics
      const deletedMetrics = await prisma.usageMetrics.deleteMany({
        where: {
          date: {
            lt: cutoffDate,
          },
        },
      });

      return {
        success: true,
        deletedEvents: deletedEvents.count,
        deletedMetrics: deletedMetrics.count,
      };
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export default AnalyticsService;
