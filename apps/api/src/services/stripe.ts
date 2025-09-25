import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { clerkClient } from '@clerk/clerk-sdk-node';

const prisma = new PrismaClient();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export class StripeService {
  // Create a checkout session for subscription
  async createCheckoutSession({
    userId,
    priceId,
    successUrl,
    cancelUrl,
  }: {
    userId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<string> {
    try {
      // Get user info from Clerk
      const user = await clerkClient.users.getUser(userId);
      
      // Check if customer already exists
      let customer = await this.findOrCreateCustomer(userId, {
        email: user.emailAddresses[0]?.emailAddress,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
      });

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        metadata: {
          userId,
        },
      });

      return session.url!;
    } catch (error) {
      console.error('Stripe checkout session error:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  // Create customer portal session
  async createCustomerPortalSession(customerId: string): Promise<string> {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.FRONTEND_URL}/billing`,
      });

      return session.url;
    } catch (error) {
      console.error('Stripe portal session error:', error);
      throw new Error('Failed to create customer portal session');
    }
  }

  // Find or create a Stripe customer
  async findOrCreateCustomer(userId: string, customerData: { email?: string; name?: string }): Promise<Stripe.Customer> {
    try {
      // Check if customer already exists in our database
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (subscription && subscription.provider === 'STRIPE') {
        // Retrieve existing customer from Stripe
        try {
          const customer = await stripe.customers.retrieve(subscription.providerCustomerId);
          if (customer && !customer.deleted) {
            return customer as Stripe.Customer;
          }
        } catch (error) {
          console.warn('Customer not found in Stripe, creating new one:', error);
        }
      }

      // Create new customer
      const customer = await stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
        metadata: {
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
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } catch (error) {
      console.error('Stripe cancel subscription error:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  // Construct webhook event
  async constructWebhookEvent(body: Buffer, signature: string): Promise<Stripe.Event> {
    try {
      return stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  // Handle checkout completed
  async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const userId = session.metadata?.userId;
      if (!userId) {
        console.error('No userId found in checkout session metadata');
        return;
      }

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const customer = await stripe.customers.retrieve(session.customer as string) as Stripe.Customer;

      // Create or update subscription in database
      await prisma.subscription.upsert({
        where: { userId },
        update: {
          providerSubscriptionId: subscription.id,
          status: this.mapStripeStatus(subscription.status),
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
        create: {
          userId,
          provider: 'STRIPE',
          providerCustomerId: customer.id,
          providerSubscriptionId: subscription.id,
          status: this.mapStripeStatus(subscription.status),
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
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

      console.log(`Subscription created for user ${userId}`);
    } catch (error) {
      console.error('Checkout completed handler error:', error);
    }
  }

  // Handle payment succeeded
  async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      const customerId = invoice.customer as string;
      const subscriptionId = invoice.subscription as string;

      if (!subscriptionId) return;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      // Find user by customer ID
      const dbSubscription = await prisma.subscription.findFirst({
        where: { providerCustomerId: customerId },
      });

      if (!dbSubscription) {
        console.error('No subscription found for customer:', customerId);
        return;
      }

      // Update subscription status
      await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          status: this.mapStripeStatus(subscription.status),
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      });

      console.log(`Payment succeeded for subscription ${subscriptionId}`);
    } catch (error) {
      console.error('Payment succeeded handler error:', error);
    }
  }

  // Handle payment failed
  async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      const customerId = invoice.customer as string;
      
      // Find user by customer ID
      const dbSubscription = await prisma.subscription.findFirst({
        where: { providerCustomerId: customerId },
      });

      if (!dbSubscription) {
        console.error('No subscription found for customer:', customerId);
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

      console.log(`Payment failed for subscription ${invoice.subscription}`);
    } catch (error) {
      console.error('Payment failed handler error:', error);
    }
  }

  // Handle subscription updated
  async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = subscription.customer as string;
      
      // Find user by customer ID
      const dbSubscription = await prisma.subscription.findFirst({
        where: { providerCustomerId: customerId },
      });

      if (!dbSubscription) {
        console.error('No subscription found for customer:', customerId);
        return;
      }

      // Update subscription
      await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          status: this.mapStripeStatus(subscription.status),
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });

      // Update user metadata in Clerk
      await clerkClient.users.updateUserMetadata(dbSubscription.userId, {
        publicMetadata: {
          subscription: {
            status: subscription.status,
            plan: subscription.status === 'active' ? 'premium' : 'free',
          },
        },
      });

      console.log(`Subscription updated: ${subscription.id}`);
    } catch (error) {
      console.error('Subscription updated handler error:', error);
    }
  }

  // Handle subscription deleted
  async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = subscription.customer as string;
      
      // Find user by customer ID
      const dbSubscription = await prisma.subscription.findFirst({
        where: { providerCustomerId: customerId },
      });

      if (!dbSubscription) {
        console.error('No subscription found for customer:', customerId);
        return;
      }

      // Update subscription status to canceled
      await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          status: 'CANCELED',
        },
      });

      // Update user metadata in Clerk
      await clerkClient.users.updateUserMetadata(dbSubscription.userId, {
        publicMetadata: {
          subscription: {
            status: 'canceled',
            plan: 'free',
          },
        },
      });

      console.log(`Subscription deleted: ${subscription.id}`);
    } catch (error) {
      console.error('Subscription deleted handler error:', error);
    }
  }

  // Map Stripe subscription status to our enum
  private mapStripeStatus(stripeStatus: string): 'ACTIVE' | 'CANCELED' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'PAST_DUE' | 'UNPAID' | 'TRIALING' {
    switch (stripeStatus) {
      case 'active':
        return 'ACTIVE';
      case 'canceled':
        return 'CANCELED';
      case 'incomplete':
        return 'INCOMPLETE';
      case 'incomplete_expired':
        return 'INCOMPLETE_EXPIRED';
      case 'past_due':
        return 'PAST_DUE';
      case 'unpaid':
        return 'UNPAID';
      case 'trialing':
        return 'TRIALING';
      default:
        console.warn(`Unknown Stripe status: ${stripeStatus}`);
        return 'INCOMPLETE';
    }
  }
}

// Export singleton instance
export const stripeService = new StripeService();