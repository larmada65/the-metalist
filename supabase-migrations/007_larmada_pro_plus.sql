-- Make larmada a Pro+ member for testing/development.
-- Uses LOWER(username) for case-insensitive match.
-- First: update any existing subscription for larmada.
UPDATE public.subscriptions
SET tier = 'pro_plus', status = 'active', current_period_start = COALESCE(current_period_start, now()), current_period_end = now() + interval '1 month'
WHERE user_id = (SELECT id FROM public.profiles WHERE LOWER(username) = 'larmada' LIMIT 1);

-- Second: insert a new subscription if larmada has none.
INSERT INTO public.subscriptions (user_id, tier, status, current_period_start, current_period_end)
SELECT p.id, 'pro_plus', 'active', now(), now() + interval '1 month'
FROM public.profiles p
WHERE LOWER(p.username) = 'larmada'
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p.id
  );
