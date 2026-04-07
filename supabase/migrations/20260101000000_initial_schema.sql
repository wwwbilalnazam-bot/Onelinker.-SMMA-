-- ════════════════════════════════════════════════════════════
-- ONELINKER — COMPLETE DATABASE MIGRATION
-- Run this against your Supabase project via:
--   supabase db push  OR  Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Helper: updated_at trigger function ─────────────────────
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Helper: generate short referral code ────────────────────
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
BEGIN
  -- Using pure postgres built-ins to avoid extension search_path issues
  RETURN UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════
-- TABLES
-- ════════════════════════════════════════════════════════════

-- ── PLAN LIMITS (seed data, no RLS needed — public read) ────
CREATE TABLE public.plan_limits (
  plan                    TEXT PRIMARY KEY,
  max_channels            INTEGER,
  max_posts_per_month     INTEGER,
  max_ai_generations      INTEGER,
  max_team_members        INTEGER,
  max_workspaces          INTEGER,
  max_queues              INTEGER,
  analytics_days          INTEGER,
  storage_mb              BIGINT,
  has_inbox               BOOLEAN DEFAULT false,
  has_approval_workflow   BOOLEAN DEFAULT false,
  has_white_label         BOOLEAN DEFAULT false,
  has_api_access          BOOLEAN DEFAULT false,
  has_csv_export          BOOLEAN DEFAULT false,
  overage_price_per_100   DECIMAL(10,2)
);

INSERT INTO public.plan_limits VALUES
  ('free',       3,    20,    3,   1,  1,    1,   7,    52428800,  false, false, false, false, false, NULL),
  ('creator',    NULL, 500,   200, 3,  1,    5,   90,   5368709120, true, false, false, false, false, 2.00),
  ('agency',     NULL, 2000,  NULL,10, 3,    NULL,365,  53687091200,true, true,  true,  true,  true,  1.50),
  ('enterprise', NULL, NULL,  NULL,NULL,NULL,NULL,NULL,  NULL,       true, true,  true,  true,  true,  NULL)
ON CONFLICT (plan) DO NOTHING;

-- ── PROFILES ─────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id              UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name       TEXT,
  avatar_url      TEXT,
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  plan            TEXT NOT NULL DEFAULT 'free' REFERENCES public.plan_limits(plan),
  onboarded       BOOLEAN NOT NULL DEFAULT false,
  phone_verified  BOOLEAN NOT NULL DEFAULT false,
  referred_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  referral_code   TEXT UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── WORKSPACES ───────────────────────────────────────────────
CREATE TABLE public.workspaces (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  owner_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  logo_url         TEXT,
  plan             TEXT NOT NULL DEFAULT 'free' REFERENCES public.plan_limits(plan),
  outstand_api_key TEXT, -- encrypted at rest via Supabase vault (enterprise feature)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── WORKSPACE MEMBERS ────────────────────────────────────────
CREATE TABLE public.workspace_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'editor', 'viewer')),
  invited_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at  TIMESTAMPTZ,
  UNIQUE(workspace_id, user_id)
);

-- ── SUBSCRIPTIONS ────────────────────────────────────────────
CREATE TABLE public.subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id             UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan                     TEXT NOT NULL DEFAULT 'free',
  status                   TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','past_due','cancelled','trialing','paused','incomplete')),
  stripe_customer_id       TEXT,
  stripe_subscription_id   TEXT UNIQUE,
  billing_interval         TEXT CHECK (billing_interval IN ('monthly','yearly')),
  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  cancel_at_period_end     BOOLEAN NOT NULL DEFAULT false,
  trial_end                TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── POST USAGE TRACKING (critical for plan limit enforcement)
CREATE TABLE public.post_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  month         TEXT NOT NULL, -- format: "2026-03"
  post_count    INTEGER NOT NULL DEFAULT 0,
  ai_count      INTEGER NOT NULL DEFAULT 0, -- track AI usage here too
  overage_count INTEGER NOT NULL DEFAULT 0,
  last_updated  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, month)
);

-- ── SOCIAL ACCOUNTS ──────────────────────────────────────────
CREATE TABLE public.social_accounts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  outstand_account_id  TEXT NOT NULL,
  platform             TEXT NOT NULL,
  username             TEXT,
  display_name         TEXT,
  profile_picture      TEXT,
  followers_count      INTEGER NOT NULL DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  health_status        TEXT NOT NULL DEFAULT 'healthy'
                         CHECK (health_status IN ('healthy','warning','error','disconnected')),
  last_synced          TIMESTAMPTZ,
  connected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, outstand_account_id)
);

-- ── POSTS ────────────────────────────────────────────────────
CREATE TABLE public.posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  author_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  content           TEXT NOT NULL,
  media_urls        TEXT[] NOT NULL DEFAULT '{}',
  platforms         TEXT[] NOT NULL DEFAULT '{}',
  account_ids       TEXT[] NOT NULL DEFAULT '{}', -- outstand account IDs
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','pending_approval','scheduled','published','failed','cancelled')),
  scheduled_at      TIMESTAMPTZ,
  published_at      TIMESTAMPTZ,
  outstand_post_id  TEXT,
  error_message     TEXT,
  first_comment     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── POST METRICS ─────────────────────────────────────────────
CREATE TABLE public.post_metrics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  platform     TEXT NOT NULL,
  likes        INTEGER NOT NULL DEFAULT 0,
  comments     INTEGER NOT NULL DEFAULT 0,
  shares       INTEGER NOT NULL DEFAULT 0,
  reach        INTEGER NOT NULL DEFAULT 0,
  clicks       INTEGER NOT NULL DEFAULT 0,
  impressions  INTEGER NOT NULL DEFAULT 0,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── QUEUES ───────────────────────────────────────────────────
CREATE TABLE public.queues (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  platforms    TEXT[] NOT NULL DEFAULT '{}',
  account_ids  TEXT[] NOT NULL DEFAULT '{}',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── QUEUE SLOTS ──────────────────────────────────────────────
CREATE TABLE public.queue_slots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id     UUID NOT NULL REFERENCES public.queues(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  time_of_day  TIME NOT NULL
);

-- ── QUEUE POSTS ──────────────────────────────────────────────
CREATE TABLE public.queue_posts (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id  UUID NOT NULL REFERENCES public.queues(id) ON DELETE CASCADE,
  post_id   UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  position  INTEGER NOT NULL,
  UNIQUE(queue_id, post_id)
);

-- ── MEDIA FILES ──────────────────────────────────────────────
CREATE TABLE public.media_files (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  uploaded_by         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_url            TEXT NOT NULL,
  outstand_media_id   TEXT,
  file_type           TEXT, -- "image/jpeg", "video/mp4", etc.
  file_size           BIGINT, -- bytes
  alt_text            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INBOX MESSAGES ───────────────────────────────────────────
CREATE TABLE public.inbox_messages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  platform              TEXT NOT NULL,
  account_id            TEXT,
  external_message_id   TEXT,
  author_name           TEXT,
  author_avatar         TEXT,
  content               TEXT,
  post_id               UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  status                TEXT NOT NULL DEFAULT 'unread'
                          CHECK (status IN ('unread','read','replied','archived')),
  received_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, external_message_id)
);

-- ── NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE public.notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  title        TEXT NOT NULL,
  message      TEXT,
  read         BOOLEAN NOT NULL DEFAULT false,
  action_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INVITATIONS ──────────────────────────────────────────────
CREATE TABLE public.invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'editor'
                 CHECK (role IN ('manager','editor','viewer')),
  token        TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  accepted_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, email)
);

-- ── REFERRALS ────────────────────────────────────────────────
CREATE TABLE public.referrals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','converted','paid')),
  commission_amount DECIMAL(10,2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- ════════════════════════════════════════════════════════════
-- INDEXES
-- ════════════════════════════════════════════════════════════

-- Posts
CREATE INDEX idx_posts_workspace       ON public.posts(workspace_id);
CREATE INDEX idx_posts_author          ON public.posts(author_id);
CREATE INDEX idx_posts_scheduled       ON public.posts(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_posts_status          ON public.posts(status);
CREATE INDEX idx_posts_workspace_status ON public.posts(workspace_id, status);
CREATE INDEX idx_posts_outstand_id     ON public.posts(outstand_post_id) WHERE outstand_post_id IS NOT NULL;

-- Post usage (hot path — checked on every post creation)
CREATE INDEX idx_post_usage_workspace  ON public.post_usage(workspace_id, month);

-- Post metrics
CREATE INDEX idx_metrics_post          ON public.post_metrics(post_id);
CREATE INDEX idx_metrics_platform      ON public.post_metrics(platform);
CREATE INDEX idx_metrics_recorded      ON public.post_metrics(recorded_at);

-- Social accounts
CREATE INDEX idx_accounts_workspace    ON public.social_accounts(workspace_id);
CREATE INDEX idx_accounts_platform     ON public.social_accounts(workspace_id, platform);
CREATE INDEX idx_accounts_active       ON public.social_accounts(workspace_id, is_active);

-- Inbox
CREATE INDEX idx_inbox_workspace       ON public.inbox_messages(workspace_id);
CREATE INDEX idx_inbox_status          ON public.inbox_messages(workspace_id, status);
CREATE INDEX idx_inbox_received        ON public.inbox_messages(received_at DESC);
CREATE INDEX idx_inbox_platform        ON public.inbox_messages(workspace_id, platform);

-- Notifications
CREATE INDEX idx_notifications_user    ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread  ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- Workspace members
CREATE INDEX idx_members_workspace     ON public.workspace_members(workspace_id);
CREATE INDEX idx_members_user          ON public.workspace_members(user_id);

-- Queues
CREATE INDEX idx_queues_workspace      ON public.queues(workspace_id);
CREATE INDEX idx_queue_slots           ON public.queue_slots(queue_id);
CREATE INDEX idx_queue_posts_queue     ON public.queue_posts(queue_id, position);
CREATE INDEX idx_queue_posts_post      ON public.queue_posts(post_id);

-- Media
CREATE INDEX idx_media_workspace       ON public.media_files(workspace_id);
CREATE INDEX idx_media_uploaded_by     ON public.media_files(uploaded_by);

-- Subscriptions
CREATE INDEX idx_subscriptions_workspace   ON public.subscriptions(workspace_id);
CREATE INDEX idx_subscriptions_stripe_sub  ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_stripe_cust ON public.subscriptions(stripe_customer_id);

-- Invitations
CREATE INDEX idx_invitations_workspace ON public.invitations(workspace_id);
CREATE INDEX idx_invitations_email     ON public.invitations(email);
CREATE INDEX idx_invitations_token     ON public.invitations(token);

-- Referrals
CREATE INDEX idx_referrals_referrer    ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred    ON public.referrals(referred_id);

-- ════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ════════════════════════════════════════════════════════════

-- Atomically increment post usage counter
CREATE OR REPLACE FUNCTION public.increment_post_usage(
  p_workspace_id UUID,
  p_month        TEXT
) RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO public.post_usage (workspace_id, month, post_count)
  VALUES (p_workspace_id, p_month, 1)
  ON CONFLICT (workspace_id, month)
  DO UPDATE SET
    post_count   = public.post_usage.post_count + 1,
    last_updated = NOW()
  RETURNING post_count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Rollback counter if Outstand API call fails
CREATE OR REPLACE FUNCTION public.decrement_post_usage(
  p_workspace_id UUID,
  p_month        TEXT
) RETURNS void AS $$
BEGIN
  UPDATE public.post_usage
  SET
    post_count   = GREATEST(post_count - 1, 0),
    last_updated = NOW()
  WHERE workspace_id = p_workspace_id
    AND month        = p_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Atomically increment AI usage counter
CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_workspace_id UUID,
  p_month        TEXT
) RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO public.post_usage (workspace_id, month, ai_count)
  VALUES (p_workspace_id, p_month, 1)
  ON CONFLICT (workspace_id, month)
  DO UPDATE SET
    ai_count     = public.post_usage.ai_count + 1,
    last_updated = NOW()
  RETURNING ai_count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check whether workspace is allowed to create another post
-- Returns TRUE if allowed, FALSE if limit reached
CREATE OR REPLACE FUNCTION public.check_post_limit(
  p_workspace_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  current_count  INTEGER;
  plan_max       INTEGER;
  workspace_plan TEXT;
  current_month  TEXT;
BEGIN
  current_month := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM');

  SELECT w.plan INTO workspace_plan
  FROM public.workspaces w
  WHERE w.id = p_workspace_id;

  IF workspace_plan IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT pl.max_posts_per_month INTO plan_max
  FROM public.plan_limits pl
  WHERE pl.plan = workspace_plan;

  -- NULL max = unlimited (enterprise)
  IF plan_max IS NULL THEN
    RETURN TRUE;
  END IF;

  SELECT COALESCE(pu.post_count, 0) INTO current_count
  FROM public.post_usage pu
  WHERE pu.workspace_id = p_workspace_id
    AND pu.month        = current_month;

  RETURN current_count < plan_max;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check whether workspace is allowed to use AI generation
CREATE OR REPLACE FUNCTION public.check_ai_limit(
  p_workspace_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  current_count  INTEGER;
  ai_max         INTEGER;
  workspace_plan TEXT;
  current_month  TEXT;
BEGIN
  current_month := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM');

  SELECT w.plan INTO workspace_plan
  FROM public.workspaces w
  WHERE w.id = p_workspace_id;

  IF workspace_plan IS NULL THEN RETURN FALSE; END IF;

  SELECT pl.max_ai_generations INTO ai_max
  FROM public.plan_limits pl
  WHERE pl.plan = workspace_plan;

  IF ai_max IS NULL THEN RETURN TRUE; END IF;

  SELECT COALESCE(pu.ai_count, 0) INTO current_count
  FROM public.post_usage pu
  WHERE pu.workspace_id = p_workspace_id
    AND pu.month        = current_month;

  RETURN current_count < ai_max;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get current month usage stats for a workspace
CREATE OR REPLACE FUNCTION public.get_workspace_usage(
  p_workspace_id UUID
) RETURNS TABLE (
  post_count    INTEGER,
  ai_count      INTEGER,
  overage_count INTEGER,
  plan          TEXT,
  month         TEXT
) AS $$
DECLARE
  current_month TEXT;
BEGIN
  current_month := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM');

  RETURN QUERY
  SELECT
    COALESCE(pu.post_count, 0)    AS post_count,
    COALESCE(pu.ai_count, 0)      AS ai_count,
    COALESCE(pu.overage_count, 0) AS overage_count,
    w.plan,
    current_month
  FROM public.workspaces w
  LEFT JOIN public.post_usage pu
    ON pu.workspace_id = w.id
   AND pu.month        = current_month
  WHERE w.id = p_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Auto-generate referral code on profile create
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  NEW.referral_code := generate_referral_code();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Auto-create default workspace when profile is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
  base_slug        TEXT;
  final_slug       TEXT;
  counter          INTEGER := 0;
BEGIN
  -- Generate slug from email prefix
  base_slug  := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g'));
  final_slug := base_slug;

  -- Ensure slug is unique
  WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = final_slug) LOOP
    counter    := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  -- Create profile
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create default workspace
  INSERT INTO public.workspaces (name, slug, owner_id, plan)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)) || '''s Workspace',
    final_slug,
    NEW.id,
    'free'
  )
  RETURNING id INTO new_workspace_id;

  -- Add owner as workspace member
  INSERT INTO public.workspace_members (workspace_id, user_id, role, accepted_at)
  VALUES (new_workspace_id, NEW.id, 'owner', NOW());

  -- Create free subscription record
  INSERT INTO public.subscriptions (workspace_id, plan, status)
  VALUES (new_workspace_id, 'free', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ════════════════════════════════════════════════════════════
-- TRIGGERS
-- ════════════════════════════════════════════════════════════

-- Auto-create profile + workspace when auth.users row is inserted
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-generate referral code before profile insert
CREATE OR REPLACE TRIGGER on_profile_before_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION public.handle_new_profile();

-- Auto-update posts.updated_at on row change
CREATE OR REPLACE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Auto-update subscriptions.updated_at on row change
CREATE OR REPLACE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════

-- Enable RLS on every table
ALTER TABLE public.plan_limits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_usage           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_metrics         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queues               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_slots          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals            ENABLE ROW LEVEL SECURITY;

-- ── plan_limits: public read, service role write ─────────────
CREATE POLICY "plan_limits_public_read"
  ON public.plan_limits FOR SELECT
  USING (true);

-- ── profiles ─────────────────────────────────────────────────
-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role can do anything (for triggers/functions)
CREATE POLICY "profiles_service_role"
  ON public.profiles FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Workspace members can see each other's profiles
CREATE POLICY "profiles_workspace_members_read"
  ON public.profiles FOR SELECT
  USING (
    id IN (
      SELECT wm.user_id
      FROM public.workspace_members wm
      WHERE wm.workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
          AND accepted_at IS NOT NULL
      )
    )
  );

-- ── workspaces ───────────────────────────────────────────────
-- Members can read their workspace
CREATE POLICY "workspaces_member_read"
  ON public.workspaces FOR SELECT
  USING (id IN (SELECT public.get_my_workspace_ids()));

-- Owner can update workspace
CREATE POLICY "workspaces_owner_update"
  ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Owner can delete workspace
CREATE POLICY "workspaces_owner_delete"
  ON public.workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- Any authenticated user can create a workspace (checked against plan limits in app layer)
CREATE POLICY "workspaces_auth_insert"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- ── Helper: get workspace IDs for current user (avoids RLS recursion) ──
-- SECURITY DEFINER means it runs as the function owner (bypasses RLS
-- on workspace_members), breaking the self-referential policy cycle.
CREATE OR REPLACE FUNCTION public.get_my_workspace_ids()
RETURNS SETOF UUID AS $$
  SELECT workspace_id
  FROM public.workspace_members
  WHERE user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ── workspace_members ────────────────────────────────────────
-- Members can see all members of their workspaces
CREATE POLICY "workspace_members_read"
  ON public.workspace_members FOR SELECT
  USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

-- Owners and managers can invite/remove members
CREATE POLICY "workspace_members_owner_manager_insert"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.get_my_workspace_ids()
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
      )
    )
  );

CREATE POLICY "workspace_members_owner_manager_delete"
  ON public.workspace_members FOR DELETE
  USING (
    workspace_id IN (SELECT public.get_my_workspace_ids())
    AND user_id != auth.uid()
  );

-- Members can update their own role acceptance
CREATE POLICY "workspace_members_self_update"
  ON public.workspace_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Owners can update any member role
CREATE POLICY "workspace_members_owner_update"
  ON public.workspace_members FOR UPDATE
  USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

-- ── subscriptions ────────────────────────────────────────────
CREATE POLICY "subscriptions_member_read"
  ON public.subscriptions FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "subscriptions_service_role"
  ON public.subscriptions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ── post_usage ───────────────────────────────────────────────
CREATE POLICY "post_usage_member_read"
  ON public.post_usage FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "post_usage_service_role"
  ON public.post_usage FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ── social_accounts ──────────────────────────────────────────
CREATE POLICY "social_accounts_member_read"
  ON public.social_accounts FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "social_accounts_editor_write"
  ON public.social_accounts FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
  );

CREATE POLICY "social_accounts_owner_manager_delete"
  ON public.social_accounts FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "social_accounts_service_role"
  ON public.social_accounts FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ── posts ────────────────────────────────────────────────────
-- All members can read posts
CREATE POLICY "posts_member_read"
  ON public.posts FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Editors+ can create posts
CREATE POLICY "posts_editor_insert"
  ON public.posts FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
    AND author_id = auth.uid()
  );

-- Editors+ can update posts (owners/managers can update any, editors only their own)
CREATE POLICY "posts_editor_update_own"
  ON public.posts FOR UPDATE
  USING (
    author_id = auth.uid()
    AND workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
  );

CREATE POLICY "posts_manager_update_any"
  ON public.posts FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

-- Owners/managers can delete any post; editors their own
CREATE POLICY "posts_editor_delete_own"
  ON public.posts FOR DELETE
  USING (
    author_id = auth.uid()
    AND workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
  );

CREATE POLICY "posts_manager_delete_any"
  ON public.posts FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "posts_service_role"
  ON public.posts FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ── post_metrics ─────────────────────────────────────────────
CREATE POLICY "post_metrics_member_read"
  ON public.post_metrics FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM public.posts
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "post_metrics_service_role"
  ON public.post_metrics FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ── queues ───────────────────────────────────────────────────
CREATE POLICY "queues_member_read"
  ON public.queues FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "queues_editor_write"
  ON public.queues FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
  );

CREATE POLICY "queues_editor_update"
  ON public.queues FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
  );

CREATE POLICY "queues_manager_delete"
  ON public.queues FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

-- ── queue_slots ──────────────────────────────────────────────
CREATE POLICY "queue_slots_member_read"
  ON public.queue_slots FOR SELECT
  USING (
    queue_id IN (
      SELECT id FROM public.queues
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "queue_slots_editor_write"
  ON public.queue_slots FOR ALL
  USING (
    queue_id IN (
      SELECT id FROM public.queues
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'manager', 'editor')
      )
    )
  );

-- ── queue_posts ──────────────────────────────────────────────
CREATE POLICY "queue_posts_member_read"
  ON public.queue_posts FOR SELECT
  USING (
    queue_id IN (
      SELECT id FROM public.queues
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "queue_posts_editor_write"
  ON public.queue_posts FOR ALL
  USING (
    queue_id IN (
      SELECT id FROM public.queues
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'manager', 'editor')
      )
    )
  );

-- ── media_files ──────────────────────────────────────────────
CREATE POLICY "media_files_member_read"
  ON public.media_files FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "media_files_editor_insert"
  ON public.media_files FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "media_files_owner_delete"
  ON public.media_files FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "media_files_service_role"
  ON public.media_files FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ── inbox_messages ───────────────────────────────────────────
CREATE POLICY "inbox_member_read"
  ON public.inbox_messages FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "inbox_editor_update"
  ON public.inbox_messages FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
  );

CREATE POLICY "inbox_service_role"
  ON public.inbox_messages FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ── notifications ────────────────────────────────────────────
-- Users only see their own notifications
CREATE POLICY "notifications_own_read"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_own_update"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_service_role"
  ON public.notifications FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ── invitations ──────────────────────────────────────────────
-- Workspace owners/managers can manage invitations
CREATE POLICY "invitations_manager_read"
  ON public.invitations FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "invitations_manager_insert"
  ON public.invitations FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "invitations_manager_delete"
  ON public.invitations FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "invitations_service_role"
  ON public.invitations FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ── referrals ────────────────────────────────────────────────
CREATE POLICY "referrals_own_read"
  ON public.referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "referrals_service_role"
  ON public.referrals FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ════════════════════════════════════════════════════════════
-- SUPABASE STORAGE BUCKETS
-- Run these in Supabase Dashboard → Storage
-- or via supabase CLI
-- ════════════════════════════════════════════════════════════

-- Create media bucket for user uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true, -- public so CDN URLs work
  209715200, -- 200MB max per file
  ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/quicktime','video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create workspace-logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-logos',
  'workspace-logos',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload to their own folder
CREATE POLICY "media_upload_authenticated"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "media_read_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

CREATE POLICY "media_delete_own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_upload_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_read_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "logos_upload_workspace_owner"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'workspace-logos');

CREATE POLICY "logos_read_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'workspace-logos');

CREATE POLICY "logos_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'workspace-logos')
  WITH CHECK (bucket_id = 'workspace-logos');

CREATE POLICY "logos_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'workspace-logos');

-- ════════════════════════════════════════════════════════════
-- REALTIME
-- Enable realtime for tables that need live updates
-- ════════════════════════════════════════════════════════════

-- Enable replication for realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_usage;

-- ════════════════════════════════════════════════════════════
-- SEED: Verify plan limits inserted correctly
-- ════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.plan_limits WHERE plan = 'free') THEN
    RAISE EXCEPTION 'Plan limits seed data missing!';
  END IF;
  RAISE NOTICE 'Schema migration completed successfully.';
END $$;
