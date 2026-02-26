# Subscriptions (Stripe + Supabase)

This guide covers how to configure Stripe and your app so subscription links (upgrade, downgrade, manage plan) work correctly.

## Overview

- **Free** — $0, 1 demo/month
- **Bedroom Musician** — $3/month, 1 demo/week
- **Pro** — $5/month, hosted MP3s, unlimited demos
- **Pro+** — $10/month, Pro + lyrics, merchandise link

## In Stripe Dashboard

### 1. Create Products & Prices

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Create **three products** (or one product with three prices):

| Product            | Price | Billing | Price ID env var                    |
|--------------------|-------|---------|-------------------------------------|
| Bedroom Musician   | $3    | Monthly recurring | STRIPE_BEDROOM_MONTHLY_PRICE_ID   |
| Pro                | $5    | Monthly recurring | STRIPE_PRO_MONTHLY_PRICE_ID       |
| Pro+               | $10   | Monthly recurring | STRIPE_PRO_PLUS_MONTHLY_PRICE_ID  |

3. For each product: **Add product** → name it → **Pricing** → **Add another price** → Recurring → Monthly → amount → Save
4. Copy each **Price ID** (starts with `price_`)

### 2. Customer Portal (for downgrade / cancel)

1. Go to [Stripe Dashboard → Settings → Billing → Customer portal](https://dashboard.stripe.com/settings/billing/portal)
2. Enable **Subscription cancellation** so users can cancel or downgrade
3. (Optional) Configure **Subscription updates** so users can switch plans from the portal
4. Set your business name and support email
5. Save

### 3. Webhook (for subscription sync)

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**
2. **Endpoint URL**:
   - Local: use [Stripe CLI](https://stripe.com/docs/stripe-cli): `stripe listen --forward-to localhost:3000/api/stripe/webhook` and put the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`
   - Production: `https://yourdomain.com/api/stripe/webhook`
3. **Events to send**: at minimum:
   - `checkout.session.completed` (for subscription creation)
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.expired`
   - `payment_intent.payment_failed` (for release payments)
4. Copy the **Signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`

### 4. Webhook handler updates

The app’s webhook (`app/api/stripe/webhook/route.ts`) currently handles **release payments** only. To sync subscriptions when users upgrade/downgrade, you need to add handling for:

- `checkout.session.completed` when `mode === 'subscription'` — create/update row in `subscriptions` (map Stripe price ID to tier: bedroom/pro/pro_plus)
- `customer.subscription.updated` — update tier/status/current_period_end in `subscriptions`
- `customer.subscription.deleted` — mark subscription as canceled (or remove)

Until the webhook handles these events, subscription status is **manual** (e.g. via Supabase migrations or dashboard). Users can still:
- Start checkout and pay via Stripe
- Open the Customer Portal to cancel/downgrade

but your `subscriptions` table will not auto-update from Stripe. You can manually insert/update rows, or extend the webhook as above.

## In Your App (.env.local)

```bash
# Required
STRIPE_SECRET_KEY=sk_test_...           # or sk_live_...
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or https://yourdomain.com

# Subscription prices (one per tier)
STRIPE_BEDROOM_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_PLUS_MONTHLY_PRICE_ID=price_...

# Webhook
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase (for webhook)
SUPABASE_SERVICE_ROLE_KEY=...
```

## Flow

1. **Upgrade** — User clicks “Upgrade to Pro” → `/api/subscribe/create-checkout-session` → Stripe Checkout → user pays → redirect to `/plans?upgraded=success`
2. **Downgrade / Cancel** — User clicks “Manage subscription” or “Downgrade or cancel” → `/api/subscribe/create-portal-session` → Stripe Customer Portal → user cancels or changes plan
3. **Sync** — (When webhook is extended) Stripe sends `customer.subscription.*` events → webhook updates `subscriptions` table
