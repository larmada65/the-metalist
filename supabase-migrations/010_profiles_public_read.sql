-- Allow anyone to view profiles (member directory must be publicly readable)
-- Idempotent: safe to run multiple times

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Profiles are viewable by everyone'
  ) THEN
    CREATE POLICY "Profiles are viewable by everyone"
      ON public.profiles
      FOR SELECT
      TO authenticated, anon
      USING (true);
  END IF;
END $$;
