import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { clerkClient } from '@clerk/clerk-sdk-node';

const prisma = new PrismaClient();

// Initialize Razorpay only if credentials are available
let razorpay: Razorpay | null = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

export class RazorpayService {
  // Create a subscription session
  async createSubscriptionSession({
    userId,
    planId,
    successUrl,
    cancelUrl,
  }: {
    userId: string;
    planId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<string> {
    if (!razorpay) {
      throw new Error('Razorpay service not configured');
    }
    
    try {
      // Get user info from Clerk
      const user = await clerkClient.users.getUser(userId);
      const email = user.emailAddresses[0]?.emailAddress;
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();

      // Create or get customer
      const customer = await this.findOrCreateCustomer(userId, { email, name });

      // Create subscription
      const subscription = await razorpay.subscriptions.create({
        plan_id: planId,
        customer_id: customer.id,
        total_count: 12, // 12 months by default
        notes: {
          userId,
          successUrl,
          cancelUrl,
        },
      });

      // Create a checkout URL (Razorpay doesn't provide hosted checkout like Stripe)
      // You would typically redirect to a custom checkout page with the subscription ID
      const checkoutUrl = `${process.env.FRONTEND_URL}/checkout/razorpay?subscription_id=${subscription.id}`;
      
      return checkoutUrl;
    } catch (error) {
      console.error('Razorpay subscription creation error:', error);
      throw new Error('Failed to create subscription session');
    }
  }

  // Create or find customer
  async findOrCreateCustomer(userId: string, customerData: { email?: string; name?: string }): Promise<any> {
    if (!razorpay) {
      throw new Error('Razorpay service not configured');
    }
    
    try {
      // Check if customer already exists in our database
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (subscription && subscription.provider === 'RAZORPAY') {
        try {
          // Get customer from Razorpay
          const customer = await razorpay.customers.fetch(subscription.providerCustomerId);
          return customer;
        } catch (error) {
          console.warn('Customer not found in Razorpay, creating new one:', error);
        }
      }

      // Create new customer
      const customer = await razorpay.customers.create({
        name: customerData.name || 'Customer',
        email: customerData.email || `user-${userId}@example.com`,
        notes: {
          userId,
        },
      });

      return customer;
    } catch (error) {
      console.error('Customer creation error:', error);
      throw new Error('Failed to create or retrieve customer');
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string): Promise<void> {
    if (!razorpay) {
      throw new Error('Razorpay service not configured');
    }
    
    try {
      await razorpay.subscriptions.cancel(subscriptionId, {
        cancel_at_cycle_end: true,
      });
    } catch (error) {
      console.error('Razorpay cancel subscription error:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(body: any, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
        .update(JSON.stringify(body))
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  // Handle subscription activated
  async handleSubscriptionActivated(subscription: any): Promise<void> {
    try {
      const customerId = subscription.customer_id;
      const userId = subscription.notes?.userId;

      if (!userId) {
        console.error('No userId found in subscription notes');
        return;
      }

      // Create or update subscription in database
      await prisma.subscription.upsert({
        where: { userId },
        update: {
          providerSubscriptionId: subscription.id,
          status: this.mapRazorpayStatus(subscription.status),
          currentPeriodStart: new Date(subscription.start_at * 1000),
          currentPeriodEnd: new Date(subscription.end_at * 1000),
          cancelAtPeriodEnd: false,
        },
        create: {
          userId,
          provider: 'RAZORPAY',
          providerCustomerId: customerId,
          providerSubscriptionId: subscription.id,
          status: this.mapRazorpayStatus(subscription.status),
          currentPeriodStart: new Date(subscription.start_at * 1000),
          currentPeriodEnd: new Date(subscription.end_at * 1000),
          cancelAtPeriodEnd: false,
        },
      });

      // Update user metadata in Clerk
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          subscription: {
            status: subscription.status,
            plan: 'premium',
          },
        },
      });

      console.log(`Razorpay subscription activated for user ${userId}`);
    } catch (error) {
      console.error('Subscription activated handler error:', error);
    }
  }

  // Handle subscription charged
  async handleSubscriptionCharged(subscription: any, payment: any): Promise<void> {
    try {
      const userId = subscription.notes?.userId;

      if (!userId) {
        console.error('No userId found in subscription notes');
        return;
      }

      // Find subscription by user ID
      const dbSubscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (!dbSubscription) {
        console.error('No subscription found for user:', userId);
        return;
      }

      // Update subscription status
      await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: new Date(subscription.start_at * 1000),
          currentPeriodEnd: new Date(subscription.end_at * 1000),
        },
      });

      console.log(`Razorpay payment succeeded for subscription ${subscription.id}`);
    } catch (error) {
      console.error('Subscription charged handler error:', error);
    }
  }

  // Handle subscription cancelled
  async handleSubscriptionCancelled(subscription: any): Promise<void> {
    try {
      const userId = subscription.notes?.userId;

      if (!userId) {
        console.error('No userId found in subscription notes');
        return;
      }

      // Update subscription status to canceled
      await prisma.subscription.update({
        where: { userId },
        data: {
          status: 'CANCELED',
          cancelAtPeriodEnd: true,
        },
      });

      // Update user metadata in Clerk
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          subscription: {
            status: 'canceled',
            plan: 'free',
          },
        },
      });

      console.log(`Razorpay subscription cancelled: ${subscription.id}`);
    } catch (error) {
      console.error('Subscription cancelled handler error:', error);
    }
  }

  // Handle payment failed
  async handlePaymentFailed(payment: any): Promise<void> {
    try {
      const subscriptionId = payment.subscription_id;
      
      if (!subscriptionId) {
        console.error('No subscription ID found in failed payment');
        return;
      }

      // Find subscription by Razorpay subscription ID
      const dbSubscription = await prisma.subscription.findFirst({
        where: { providerSubscriptionId: subscriptionId },
      });

      if (!dbSubscription) {
        console.error('No subscription found for Razorpay subscription:', subscriptionId);
        return;
      }

      // Update subscription status to past due
      await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          status: 'PAST_DUE',
        },
      });

      // Update user metadata in Clerk
      await clerkClient.users.updateUserMetadata(dbSubscription.userId, {
        publicMetadata: {
          subscription: {
            status: 'past_due',
            plan: 'premium',
          },
        },
      });

      console.log(`Razorpay payment failed for subscription ${subscriptionId}`);
    } catch (error) {
      console.error('Payment failed handler error:', error);
    }
  }

  // Create payment for subscription
  async createPayment({
    subscriptionId,
    amount,
    currency = 'INR',
  }: {
    subscriptionId: string;
    amount: number;
    currency?: string;
  }): Promise<any> {
    if (!razorpay) {
      throw new Error('Razorpay service not configured');
    }
    
    try {
      const payment = await razorpay.orders.create({
        amount: amount * 100, // Convert to paise
        currency,
        notes: {
          subscriptionId,
        },
      });

      return payment;
    } catch (error) {
      console.error('Payment creation error:', error);
      throw new Error('Failed to create payment');
    }
  }

  // Verify payment signature
  verifyPaymentSignature({
    orderId,
    paymentId,
    signature,
  }: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    try {
      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );
    } catch (error) {
      console.error('Payment signature verification failed:', error);
      return false;
    }
  }

  // Create subscription plan (admin function)
  async createPlan({
    id,
    name,
    amount,
    currency = 'INR',
    interval = 'monthly',
    intervalCount = 1,
  }: {
    id: string;
    name: string;
    amount: number;
    currency?: string;
    interval?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    intervalCount?: number;
  }): Promise<any> {
    try {
      const plan = await razorpay.plans.create({
        id,
        name,
        amount: amount * 100, // Convert to paise
        currency,
        interval,
        interval_count: intervalCount,
      });

      return plan;
    } catch (error) {
      console.error('Plan creation error:', error);
      throw new Error('Failed to create plan');
    }
  }

  // Get subscription details
  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      return await razorpay.subscriptions.fetch(subscriptionId);
    } catch (error) {
      console.error('Subscription fetch error:', error);
      throw new Error('Failed to fetch subscription');
    }
  }

  // Map Razorpay subscription status to our enum
  private mapRazorpayStatus(razorpayStatus: string): 'ACTIVE' | 'CANCELED' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'PAST_DUE' | 'UNPAID' | 'TRIALING' {
    switch (razorpayStatus) {
      case 'active':
        return 'ACTIVE';
      case 'cancelled':
        return 'CANCELED';
      case 'pending':
        return 'INCOMPLETE';
      case 'expired':
        return 'INCOMPLETE_EXPIRED';
      case 'paused':
        return 'PAST_DUE';
      case 'created':
        return 'TRIALING';
      default:
        console.warn(`Unknown Razorpay status: ${razorpayStatus}`);
        return 'INCOMPLETE';
    }
  }
}

// Export singleton instance
export const razorpayService = new RazorpayService();