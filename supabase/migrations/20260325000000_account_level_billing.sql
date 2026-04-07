-- ════════════════════════════════════════════════════════════
-- MIGRATION: Account-Level Billing
-- Pivots subscriptions from per-workspace to per-user (account).
-- One Stripe customer per user. One subscription per user.
-- Feature limits still enforced per workspace via owner's plan.
-- ════════════════════════════════════════════════════════════

-- ── 1. Add user_id column to subscriptions ────────────────────
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ── 2. Add billing_interval and extra_workspaces columns ──────
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_interval TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS extra_workspaces INTEGER NOT NULL DEFAULT 0;

-- ── 3. Backfill user_id from workspace owner ──────────────────
UPDATE public.subscriptions s
SET user_id = w.owner_id
FROM public.workspaces w
WHERE s.workspace_id = w.id
  AND s.user_id IS NULL;

-- ── 4. For users with multiple subscription rows, keep only one
-- (the one with the highest-tier plan or the most recent)
WITH ranked AS (
  SELECT id,
         user_id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id
           ORDER BY
             CASE plan
               WHEN 'enterprise' THEN 4
               WHEN 'agency'     THEN 3
               WHEN 'creator'    THEN 2
               ELSE 1
             END DESC,
             created_at DESC
         ) AS rn
  FROM public.subscriptions
  WHERE user_id IS NOT NULL
)
DELETE FROM public.subscriptions
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ── 5. Make user_id NOT NULL after backfill ───────────────────
ALTER TABLE public.subscriptions
  ALTER COLUMN user_id SET NOT NULL;

-- ── 6. Make workspace_id nullable (deprecated) ────────────────
ALTER TABLE public.subscriptions
  ALTER COLUMN workspace_id DROP NOT NULL;

-- ── 7. Unique active subscription per user ────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_active
  ON public.subscriptions (user_id)
  WHERE status IN ('active', 'trialing', 'past_due');

-- ── 8. Index for user lookups ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON public.subscriptions (user_id);

-- ── 9. Update RLS policies ────────────────────────────────────
DROP POLICY IF EXISTS "subscriptions_member_read" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_user_read" ON public.subscriptions;

CREATE POLICY "subscriptions_user_read"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Service role keeps full access (existing policy)
-- DROP + recreate only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subscriptions'
      AND policyname = 'subscriptions_service_role'
  ) THEN
    EXECUTE 'CREATE POLICY "subscriptions_service_role"
      ON public.subscriptions FOR ALL
      USING (auth.jwt()->>''role'' = ''service_role'')';
  END IF;
END $$;

-- ── 10. Helper function: get user's plan from subscriptions ───
CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT plan FROM public.subscriptions
     WHERE user_id = p_user_id
       AND status IN ('active', 'trialing')
     ORDER BY created_at DESC LIMIT 1),
    'free'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── 11. Helper function: aggregate account usage across workspaces
CREATE OR REPLACE FUNCTION public.get_account_usage(p_user_id UUID, p_month TEXT)
RETURNS TABLE(total_posts BIGINT, total_ai BIGINT) AS $$
  SELECT
    COALESCE(SUM(pu.post_count), 0),
    COALESCE(SUM(pu.ai_count), 0)
  FROM public.post_usage pu
  JOIN public.workspaces w ON w.id = pu.workspace_id
  WHERE w.owner_id = p_user_id AND pu.month = p_month;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── 12. Update handle_new_profile trigger to create user-level subscription
-- (if the trigger function exists from scale_improvements migration)
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_email_prefix TEXT;
  v_slug TEXT;
  v_ws_id UUID;
BEGIN
  -- Create default workspace
  v_email_prefix := split_part(NEW.id::text, '-', 1);
  v_slug := lower(regexp_replace(COALESCE(NEW.full_name, v_email_prefix), '[^a-z0-9]', '-', 'gi'));

  INSERT INTO public.workspaces (name, slug, owner_id, plan)
  VALUES (
    COALESCE(NEW.full_name, 'My Workspace') || '''s Workspace',
    v_slug || '-' || substr(gen_random_uuid()::text, 1, 4),
    NEW.id,
    'free'
  )
  RETURNING id INTO v_ws_id;

  -- Add owner as workspace member
  INSERT INTO public.workspace_members (workspace_id, user_id, role, accepted_at)
  VALUES (v_ws_id, NEW.id, 'owner', NOW());

  -- Create user-level subscription (not workspace-level)
  INSERT INTO public.subscriptions (user_id, workspace_id, plan, status)
  VALUES (NEW.id, v_ws_id, 'free', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
