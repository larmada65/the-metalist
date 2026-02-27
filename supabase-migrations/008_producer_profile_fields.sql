-- Producer-specific profile fields: software, plugins, genres open to work on, portfolio links

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS producer_software text,
  ADD COLUMN IF NOT EXISTS producer_guitar_plugins text,
  ADD COLUMN IF NOT EXISTS producer_drum_plugins text,
  ADD COLUMN IF NOT EXISTS producer_bass_plugins text,
  ADD COLUMN IF NOT EXISTS producer_genre_ids integer[],
  ADD COLUMN IF NOT EXISTS producer_portfolio_links jsonb;

-- producer_portfolio_links: array of {url, label}, e.g. [{"url":"https://youtube.com/...","label":"Album XYZ"}]
