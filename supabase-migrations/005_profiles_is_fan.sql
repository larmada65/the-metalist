-- Add is_fan to profiles: regular users who want to discover bands
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_fan boolean DEFAULT false;
