-- Producer specialization (e.g. "Raw black metal", "Modern death metal")
-- Producer availability (open / limited / booked)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS producer_specialization text,
  ADD COLUMN IF NOT EXISTS producer_availability text
    CHECK (producer_availability IS NULL OR producer_availability IN ('open', 'limited', 'booked'));
