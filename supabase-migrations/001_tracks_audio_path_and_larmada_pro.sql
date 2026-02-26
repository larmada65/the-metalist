-- Add optional hosted MP3 path to tracks (Pro members can upload; others use embed_url only).
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS audio_path text;

-- Create storage bucket for Pro hosted audio (run in Supabase Dashboard > Storage if you prefer):
-- Bucket name: band-audio, Public bucket: ON.
-- Policy: Allow public read; allow authenticated uploads for folder structure.
-- Or store under existing band-logos bucket in path "audio/..." (app uses band-logos/audio/ for now).

-- Make larmada a Pro member for testing (tier 'creator' is shown as Pro in the app).
UPDATE public.subscriptions
SET tier = 'creator', status = 'active', current_period_end = now() + interval '1 month'
WHERE user_id = (SELECT id FROM public.profiles WHERE username = 'larmada');

INSERT INTO public.subscriptions (user_id, tier, status, current_period_start, current_period_end)
SELECT p.id, 'creator', 'active', now(), now() + interval '1 month'
FROM public.profiles p
WHERE p.username = 'larmada'
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p.id AND s.status IN ('trialing', 'active')
  );
