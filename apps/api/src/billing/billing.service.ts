import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

/**
 * $5/month per business via Stripe Checkout (subscribe) + the Billing
 * Portal (manage/cancel) - both hosted by Stripe, so this module never
 * touches card data itself. Webhooks are the source of truth for
 * subscription state (see handleWebhookEvent) - the Checkout redirect just
 * means "the customer came back," not "they're actually subscribed."
 */
@Injectable()
export class BillingService {
  private logger = new Logger(BillingService.name);
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    // Constructed even without a key so the app still boots in an
    // environment that hasn't configured Stripe yet - calls just fail
    // clearly instead of the whole process crashing on startup.
    this.stripe = new Stripe(secretKey || 'sk_test_missing');
  }

  private frontendUrl(): string {
    return (this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173').replace(/\/$/, '');
  }

  async createCheckoutSession(businessId: string): Promise<string> {
    const priceId = this.config.get<string>('STRIPE_PRICE_ID');
    if (!priceId) throw new BadRequestException('Billing is not configured on the server yet.');

    const business = await this.prisma.business.findUniqueOrThrow({ where: { id: businessId } });

    let customerId = business.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        name: business.name,
        email: business.replyToEmail ?? undefined,
        metadata: { businessId },
      });
      customerId = customer.id;
      await this.prisma.business.update({ where: { id: businessId }, data: { stripeCustomerId: customerId } });
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      // How the webhook maps a completed session back to this Business,
      // without needing an extra lookup.
      client_reference_id: businessId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.frontendUrl()}/billing?checkout=success`,
      cancel_url: `${this.frontendUrl()}/billing?checkout=canceled`,
    });

    if (!session.url) throw new BadRequestException('Stripe did not return a Checkout URL.');
    return session.url;
  }

  async createPortalSession(businessId: string): Promise<string> {
    const business = await this.prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    if (!business.stripeCustomerId) {
      throw new BadRequestException('No subscription on file yet - subscribe first.');
    }
    const session = await this.stripe.billingPortal.sessions.create({
      customer: business.stripeCustomerId,
      return_url: `${this.frontendUrl()}/billing`,
    });
    return session.url;
  }

  /** Verifies the signature, then updates the matching Business from the event. */
  async handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.warn('Received a Stripe webhook but STRIPE_WEBHOOK_SECRET is not set - ignoring.');
      return;
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Invalid Stripe webhook signature: ${(err as Error).message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const businessId = session.client_reference_id;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        if (!businessId || !subscriptionId) break;
        await this.prisma.business.update({
          where: { id: businessId },
          data: { stripeSubscriptionId: subscriptionId },
        });
        this.logger.log(`Checkout completed for business ${businessId} -> subscription ${subscriptionId}`);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const status = subscription.status; // Stripe's own vocabulary - stored as-is, see schema comment
        const periodEnd = (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000)
          : null;

        const business = await this.prisma.business.findFirst({
          where: {
            OR: [{ stripeSubscriptionId: subscription.id }, { stripeCustomerId: subscription.customer as string }],
          },
        });
        if (!business) {
          this.logger.warn(`No Business found for Stripe subscription ${subscription.id} - ignoring event.`);
          break;
        }

        await this.prisma.business.update({
          where: { id: business.id },
          data: {
            subscriptionStatus: event.type === 'customer.subscription.deleted' ? 'canceled' : status,
            stripeSubscriptionId: subscription.id,
            currentPeriodEnd: periodEnd,
          },
        });
        this.logger.log(`Business ${business.id} subscription -> ${event.type === 'customer.subscription.deleted' ? 'canceled' : status}`);
        break;
      }

      default:
        // Not every event type needs handling - Stripe sends many more than these.
        break;
    }
  }
}
