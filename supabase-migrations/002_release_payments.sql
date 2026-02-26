-- Track pay-per-release payments for hosted MP3s.
-- Each row represents a Stripe charge (or attempted charge) for a given release.

CREATE TABLE IF NOT EXISTS public.release_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The release this payment is associated with.
  release_id uuid NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,

  -- Owning band and user (for querying and basic access control).
  band_id uuid NOT NULL REFERENCES public.bands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- How many hosted tracks this payment covers (for this release).
  hosted_tracks_paid integer NOT NULL CHECK (hosted_tracks_paid >= 0),

  -- Total amount charged for this payment, in the smallest currency unit (e.g. cents).
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',

  -- Payment lifecycle status.
  -- pending  = checkout session created, awaiting completion
  -- paid     = successfully charged
  -- failed   = failed or expired payment
  -- canceled = explicitly canceled / abandoned
  status text NOT NULL DEFAULT 'pending',

  -- Stripe identifiers for debugging and reconciliation.
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_release_payments_release_id
  ON public.release_payments (release_id);

CREATE INDEX IF NOT EXISTS idx_release_payments_user_id
  ON public.release_payments (user_id);

CREATE INDEX IF NOT EXISTS idx_release_payments_stripe_checkout_session_id
  ON public.release_payments (stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_release_payments_stripe_payment_intent_id
  ON public.release_payments (stripe_payment_intent_id);

-- Enable RLS so normal users only see their own payments.
ALTER TABLE public.release_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own release_payments"
  ON public.release_payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own release_payments"
  ON public.release_payments
  FOR SELECT
  USING (auth.uid() = user_id);

