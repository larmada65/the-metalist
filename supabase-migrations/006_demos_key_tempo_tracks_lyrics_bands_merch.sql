-- Demos: optional key and tempo
ALTER TABLE public.demos ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE public.demos ADD COLUMN IF NOT EXISTS tempo integer;

-- Tracks: lyrics content (Pro+ only in app)
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS lyrics text;

-- Bands: merchandise link (Pro+ only in app)
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS merch_url text;
