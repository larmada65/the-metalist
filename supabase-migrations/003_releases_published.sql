-- Releases with hosted MP3s are created as draft until payment completes.
-- Only published releases appear on the public band page and in discovery.
ALTER TABLE public.releases
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.releases.published IS 'False = draft (e.g. awaiting payment for hosted tracks). Only published releases are shown publicly.';
