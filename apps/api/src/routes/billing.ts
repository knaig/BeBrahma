import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { stripeService } from '../services/stripe';
import { razorpayService } from '../services/razorpay';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// Input validation schemas
const checkoutSchema = z.object({
  provider: z.enum(['STRIPE', 'RAZORPAY']),
  priceId: z.string(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

const webhookSchema = z.object({
  provider: z.enum(['STRIPE', 'RAZORPAY']),
});

// Create checkout session
router.post('/checkout', requireAuth, rateLimitMiddleware('billing'), async (req, res) => {
  try {
    const { provider, priceId, successUrl, cancelUrl } = checkoutSchema.parse(req.body);
    const userId = req.userId!;

    let checkoutUrl: string;

    if (provider === 'STRIPE') {
      checkoutUrl = await stripeService.createCheckoutSession({
        userId,
        priceId,
        successUrl: successUrl || `${process.env.FRONTEND_URL}/billing?success=true`,
        cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/billing?canceled=true`,
      });
    } else {
      checkoutUrl = await razorpayService.createSubscriptionSession({
        userId,
        planId: priceId,
        successUrl: successUrl || `${process.env.FRONTEND_URL}/billing?success=true`,
        cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/billing?canceled=true`,
      });
    }

    res.json({ url: checkoutUrl });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(400).json({ error: 'Failed to create checkout session' });
  }
});

// Get customer portal URL (Stripe only)
router.post('/portal', requireAuth, rateLimitMiddleware('billing'), async (req, res) => {
  try {
    const userId = req.userId!;

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || subscription.provider !== 'STRIPE') {
      return res.status(404).json({ error: 'Stripe subscription not found' });
    }

    const portalUrl = await stripeService.createCustomerPortalSession(subscription.providerCustomerId);
    res.json({ url: portalUrl });
  } catch (error) {
    console.error('Portal error:', error);
    res.status(400).json({ error: 'Failed to create customer portal session' });
  }
});

// Get subscription status
router.get('/subscription', requireAuth, rateLimitMiddleware('billing'), async (req, res) => {
  try {
    const userId = req.userId!;

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: {
        paymentMethods: true,
      },
    });

    if (!subscription) {
      return res.json({ subscription: null });
    }

    res.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        provider: subscription.provider,
        paymentMethods: subscription.paymentMethods.map(pm => ({
          id: pm.id,
          type: pm.type,
          last4: pm.last4,
          brand: pm.brand,
          isDefault: pm.isDefault,
        })),
      },
    });
  } catch (error) {
    console.error('Subscription fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Cancel subscription
router.post('/cancel', requireAuth, rateLimitMiddleware('billing'), async (req, res) => {
  try {
    const userId = req.userId!;

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (subscription.provider === 'STRIPE') {
      await stripeService.cancelSubscription(subscription.providerSubscriptionId);
    } else {
      await razorpayService.cancelSubscription(subscription.providerSubscriptionId);
    }

    // Update subscription in database
    await prisma.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(400).json({ error: 'Failed to cancel subscription' });
  }
});

// Stripe webhook handler
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = await stripeService.constructWebhookEvent(req.body, req.headers['stripe-signature'] as string);
    
    switch (event.type) {
      case 'checkout.session.completed':
        await stripeService.handleCheckoutCompleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await stripeService.handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await stripeService.handlePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.updated':
        await stripeService.handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await stripeService.handleSubscriptionDeleted(event.data.object);
        break;
      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

// Razorpay webhook handler
router.post('/webhook/razorpay', express.json(), async (req, res) => {
  try {
    const isValid = razorpayService.verifyWebhookSignature(req.body, req.headers['x-razorpay-signature'] as string);
    
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { event, payload } = req.body;

    switch (event) {
      case 'subscription.activated':
        await razorpayService.handleSubscriptionActivated(payload.subscription.entity);
        break;
      case 'subscription.charged':
        await razorpayService.handleSubscriptionCharged(payload.subscription.entity, payload.payment.entity);
        break;
      case 'subscription.cancelled':
        await razorpayService.handleSubscriptionCancelled(payload.subscription.entity);
        break;
      case 'payment.failed':
        await razorpayService.handlePaymentFailed(payload.payment.entity);
        break;
      default:
        console.log(`Unhandled Razorpay event type: ${event}`);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

export default router;