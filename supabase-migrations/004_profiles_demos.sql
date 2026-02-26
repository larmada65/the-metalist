-- Demos: MP3 files stored under band-logos bucket path demos/{profile_id}/{demo_id}.mp3
-- Ensure band-logos bucket allows authenticated uploads to demos/ path (same as audio/).

-- Add is_musician to profiles (user type: producer, sound engineer, or musician — multiple choice at signup)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_musician boolean DEFAULT false;

-- Demos: unfinished songs with rough recordings, shared with producers/engineers or public
CREATE TABLE IF NOT EXISTS public.demos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text,
  audio_path text NOT NULL,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'selected_users')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demos_profile_id ON public.demos(profile_id);
CREATE INDEX IF NOT EXISTS idx_demos_created_at ON public.demos(created_at DESC);

-- Junction for visibility = 'selected_users': who can view each demo
CREATE TABLE IF NOT EXISTS public.demo_shares (
  demo_id uuid NOT NULL REFERENCES public.demos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (demo_id, user_id)
);

-- Helper functions to avoid RLS recursion (demos policy reads demo_shares, demo_shares policy reads demos)
CREATE OR REPLACE FUNCTION public.is_demo_shared_with_user(p_demo_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.demo_shares WHERE demo_id = p_demo_id AND user_id = p_user_id); $$;

CREATE OR REPLACE FUNCTION public.is_demo_owned_by(p_demo_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.demos WHERE id = p_demo_id AND profile_id = p_user_id); $$;

-- RLS for demos
ALTER TABLE public.demos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_shares ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own demos
CREATE POLICY "Users can insert own demos"
  ON public.demos FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own demos"
  ON public.demos FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete own demos"
  ON public.demos FOR DELETE
  USING (auth.uid() = profile_id);

-- Read: owner always; public if visibility = 'public'; shared users if visibility = 'selected_users'
CREATE POLICY "Users can read own demos"
  ON public.demos FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Public can read public demos"
  ON public.demos FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Shared users can read shared demos"
  ON public.demos FOR SELECT
  USING (visibility = 'selected_users' AND public.is_demo_shared_with_user(id, auth.uid()));

-- demo_shares: owner of demo can manage shares (uses helper to avoid recursion)
CREATE POLICY "Demo owners can manage shares"
  ON public.demo_shares FOR ALL
  USING (public.is_demo_owned_by(demo_id, auth.uid()));
