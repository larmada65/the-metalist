-- Primary profile: the role the user chose first at signup (one and only one at signup)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_profile text
  CHECK (primary_profile IS NULL OR primary_profile IN ('musician', 'producer', 'engineer', 'fan'));
