# Configuring payments (Stripe + Supabase)

To enable “Pay for hosted tracks” and pay-per-release MP3 billing:

1. **Copy env template and set variables**
   - Copy `.env.example` to `.env.local`.
   - Fill in the values below. You need at least `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_APP_URL` for checkout to work; webhook vars are needed for payments to be marked **paid** after checkout.

2. **Stripe**
   - Go to [Stripe Dashboard → API keys](https://dashboard.stripe.com/apikey).
   - Copy the **Secret key** (starts with `sk_test_` in test mode, `sk_live_` in live) into `STRIPE_SECRET_KEY` in `.env.local`.
   - Set `NEXT_PUBLIC_APP_URL` to your app’s base URL (e.g. `http://localhost:3000` in dev or `https://yourdomain.com` in prod). No trailing slash.

2b. **Pro subscription (optional — for “Upgrade to Pro” on /plans)**
   - In [Stripe Dashboard → Products](https://dashboard.stripe.com/products), click **Add product**.
   - Name e.g. “Pro” or “Metalist Pro”, add a description if you like.
   - Under **Pricing**, add a **Recurring** price: $3 (or your currency) per **Month**.
   - Save; copy the **Price ID** (starts with `price_`) into `STRIPE_PRO_MONTHLY_PRICE_ID` in `.env.local`.
   - If this is not set, the plans page shows “Current plan” / “Get Pro” but the upgrade button will not start checkout until the price ID is set.

3. **Stripe webhook (so payments are marked paid after checkout)**
   - Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**.
   - **Endpoint URL**:  
     - Local: use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward:  
       `stripe listen --forward-to localhost:3000/api/stripe/webhook`  
       and put the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`.  
     - Production: `https://yourdomain.com/api/stripe/webhook`.
   - **Events to send**: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`.
   - After creating the endpoint, open it and copy the **Signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

4. **Supabase service role (for webhook)**
   - In [Supabase](https://supabase.com/dashboard): your project → **Project Settings** → **API**.
   - Copy the **service_role** key (not the anon key) into `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.  
   - Keep this key secret; it bypasses RLS and is only used server-side (e.g. in the Stripe webhook).

5. **Optional: disable payments during beta**
   - If you want to let bands upload hosted MP3s for free during an early beta, set:

   ```bash
   NEXT_PUBLIC_DISABLE_PAYMENTS=true
   ```

   - With this flag, the payments API will short-circuit and treat all hosted tracks as already paid (no Stripe checkout is started).
   - Remove this flag when you are ready to charge per track.

6. **Restart**
   - Restart the Next.js dev server so it picks up `.env.local`.
   - Try adding/editing a release with MP3s; you should see the payment flow and no “Payments are not configured.” when Stripe and `NEXT_PUBLIC_APP_URL` are set.
