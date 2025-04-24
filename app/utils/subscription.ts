import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

interface StripeSubscription extends Stripe.Subscription {
  current_period_end: number;
}

export async function getSubscriptionStatus(email: string) {
  try {
    // First, try to find existing customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Create new customer if not found
      const newCustomer = await stripe.customers.create({
        email: email
      });
      customerId = newCustomer.id;
    }

    // Now check subscriptions with valid customer ID
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0] as StripeSubscription;
      const billingCycleAnchor = new Date(subscription.billing_cycle_anchor * 1000);
      
      // Calculate next billing date
      const nextBillingDate = new Date(billingCycleAnchor);
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      return {
        isActive: true,
        expiresAt: nextBillingDate,
        subscriptionId: subscription.id,
        planId: subscription.items.data[0]?.price.id,
        customerId: customerId,
        billingCycleAnchor: billingCycleAnchor
      };
    }

    return {
      isActive: false,
      expiresAt: null,
      subscriptionId: null,
      planId: null,
      customerId: customerId
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return {
      isActive: false,
      expiresAt: null,
      subscriptionId: null,
      planId: null,
      customerId: null
    };
  }
} 