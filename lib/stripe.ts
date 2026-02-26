import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  // We intentionally don't throw here to avoid breaking builds in environments
  // where Stripe isn't configured yet. Callers should check for a defined client.
  console.warn('[stripe] STRIPE_SECRET_KEY is not set; Stripe payments are disabled.');
}

export const stripe =
  secretKey != null && secretKey !== ''
    ? new Stripe(secretKey, {
        // Use the default API version configured in the Stripe dashboard.
      })
    : null;

