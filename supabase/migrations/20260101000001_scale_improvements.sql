-- ════════════════════════════════════════════════════════════
-- ONELINKER — SCALE IMPROVEMENTS MIGRATION
-- Addresses million-user readiness:
--   1. workspace-media storage bucket (critical bug fix)
--   2. updated_at columns on all tables that were missing them
--   3. Additional performance indexes
--   4. pg_trgm full-text search on post content
--   5. Unique constraint on post_metrics to prevent duplicates
--   6. Consistent use of get_my_workspace_ids() in all RLS policies
--   7. BRIN index for time-series post_metrics
--   8. Storage usage tracking in get_workspace_usage()
-- ════════════════════════════════════════════════════════════

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ════════════════════════════════════════════════════════════
-- 1. STORAGE BUCKET — workspace-media (critical fix)
-- The app uploads media to 'workspace-media' but the schema
-- only defined a 'media' bucket — uploads would silently fail.
-- ════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-media',
  'workspace-media',
  true,
  209715200, -- 200MB per file
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
    'video/mp4','video/quicktime','video/webm'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for workspace-media
-- Path pattern: {workspace_id}/{filename}
-- Upload: authenticated, any workspace member (enforced in app layer)
CREATE POLICY "workspace_media_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'workspace-media');

CREATE POLICY "workspace_media_read_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'workspace-media');

CREATE POLICY "workspace_media_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'workspace-media');

-- ════════════════════════════════════════════════════════════
-- 2. updated_at COLUMNS
-- Several tables were missing updated_at, making it impossible
-- to efficiently sync changes and debug issues at scale.
-- ════════════════════════════════════════════════════════════

-- profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- workspaces
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- social_accounts
ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE TRIGGER social_accounts_updated_at
  BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- media_files
ALTER TABLE public.media_files
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE TRIGGER media_files_updated_at
  BEFORE UPDATE ON public.media_files
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- inbox_messages
ALTER TABLE public.inbox_messages
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE TRIGGER inbox_messages_updated_at
  BEFORE UPDATE ON public.inbox_messages
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- queues
ALTER TABLE public.queues
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE TRIGGER queues_updated_at
  BEFORE UPDATE ON public.queues
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ════════════════════════════════════════════════════════════
-- 3. PERFORMANCE INDEXES
-- ════════════════════════════════════════════════════════════

-- Posts — default sort is created_at DESC; this composite avoids a
-- heap fetch for workspace-scoped list views (index-only scan possible)
CREATE INDEX IF NOT EXISTS idx_posts_workspace_created
  ON public.posts(workspace_id, created_at DESC);

-- Posts — calendar/scheduler queries filter by scheduled_at range
CREATE INDEX IF NOT EXISTS idx_posts_workspace_scheduled
  ON public.posts(workspace_id, scheduled_at)
  WHERE scheduled_at IS NOT NULL;

-- Posts — published timeline for analytics
CREATE INDEX IF NOT EXISTS idx_posts_workspace_published
  ON public.posts(workspace_id, published_at)
  WHERE published_at IS NOT NULL;

-- Post metrics — analytics aggregations always join on post_id then
-- filter/sort by recorded_at
CREATE INDEX IF NOT EXISTS idx_metrics_post_recorded
  ON public.post_metrics(post_id, recorded_at DESC);

-- Post metrics — workspace-wide analytics (join through posts)
-- A covering index lets Postgres skip the join for common aggregations
CREATE INDEX IF NOT EXISTS idx_metrics_recorded_platform
  ON public.post_metrics(recorded_at DESC, platform);

-- BRIN index for time-series range scans on post_metrics
-- BRIN is tiny (~handful of pages) vs a btree (~100x larger) and works
-- well when rows are inserted in roughly chronological order.
CREATE INDEX IF NOT EXISTS idx_metrics_recorded_brin
  ON public.post_metrics USING BRIN (recorded_at);

-- Media — default sort is created_at DESC
CREATE INDEX IF NOT EXISTS idx_media_workspace_created
  ON public.media_files(workspace_id, created_at DESC);

-- Inbox — messages sorted by received_at per workspace
CREATE INDEX IF NOT EXISTS idx_inbox_workspace_received
  ON public.inbox_messages(workspace_id, received_at DESC);

-- Inbox — unread count badge (partial index)
CREATE INDEX IF NOT EXISTS idx_inbox_workspace_unread
  ON public.inbox_messages(workspace_id)
  WHERE status = 'unread';

-- ════════════════════════════════════════════════════════════
-- 4. FULL-TEXT SEARCH ON POST CONTENT (pg_trgm)
-- GIN trigram index enables fast ILIKE / similarity searches
-- on post content without a sequential scan.
-- ════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_posts_content_trgm
  ON public.posts USING GIN (content gin_trgm_ops);

-- ════════════════════════════════════════════════════════════
-- 5. post_metrics UNIQUE CONSTRAINT
-- Without this, a runaway sync job could insert duplicate rows
-- causing inflated analytics.  Use ON CONFLICT DO UPDATE instead.
-- One snapshot per post+platform per day is the natural granularity.
--
-- TIMESTAMPTZ → DATE cast is STABLE (timezone-dependent), so we
-- cannot use it in a generated column or plain expression index.
-- Wrap it in an IMMUTABLE function that hard-codes UTC — correct
-- for our use case and accepted by Postgres.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.timestamptz_to_utc_date(ts TIMESTAMPTZ)
RETURNS DATE AS $$
  SELECT (ts AT TIME ZONE 'UTC')::DATE;
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_metrics_unique_per_day
  ON public.post_metrics(post_id, platform, public.timestamptz_to_utc_date(recorded_at));

-- ════════════════════════════════════════════════════════════
-- 6. RLS POLICY CONSOLIDATION
-- Many policies repeated raw subqueries on workspace_members
-- instead of calling get_my_workspace_ids().  At scale, each
-- policy evaluation would re-execute the subquery; using the
-- STABLE SECURITY DEFINER function lets Postgres cache the
-- result within a single statement.
-- ════════════════════════════════════════════════════════════

-- ── subscriptions ────────────────────────────────────────────
DROP POLICY IF EXISTS "subscriptions_member_read" ON public.subscriptions;
CREATE POLICY "subscriptions_member_read"
  ON public.subscriptions FOR SELECT
  USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

-- ── post_usage ───────────────────────────────────────────────
DROP POLICY IF EXISTS "post_usage_member_read" ON public.post_usage;
CREATE POLICY "post_usage_member_read"
  ON public.post_usage FOR SELECT
  USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

-- ── social_accounts ──────────────────────────────────────────
DROP POLICY IF EXISTS "social_accounts_member_read" ON public.social_accounts;
CREATE POLICY "social_accounts_member_read"
  ON public.social_accounts FOR SELECT
  USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

DROP POLICY IF EXISTS "social_accounts_editor_write" ON public.social_accounts;
CREATE POLICY "social_accounts_editor_write"
  ON public.social_accounts FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager', 'editor')
    )
  );

DROP POLICY IF EXISTS "social_accounts_owner_manager_delete" ON public.social_accounts;
CREATE POLICY "social_accounts_owner_manager_delete"
  ON public.social_accounts FOR DELETE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager')
    )
  );

-- ── posts ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "posts_member_read" ON public.posts;
CREATE POLICY "posts_member_read"
  ON public.posts FOR SELECT
  USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

DROP POLICY IF EXISTS "posts_editor_insert" ON public.posts;
CREATE POLICY "posts_editor_insert"
  ON public.posts FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager', 'editor')
    )
    AND author_id = auth.uid()
  );

DROP POLICY IF EXISTS "posts_editor_update_own" ON public.posts;
CREATE POLICY "posts_editor_update_own"
  ON public.posts FOR UPDATE
  USING (
    author_id = auth.uid()
    AND workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager', 'editor')
    )
  );

DROP POLICY IF EXISTS "posts_manager_update_any" ON public.posts;
CREATE POLICY "posts_manager_update_any"
  ON public.posts FOR UPDATE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "posts_editor_delete_own" ON public.posts;
CREATE POLICY "posts_editor_delete_own"
  ON public.posts FOR DELETE
  USING (
    author_id = auth.uid()
    AND workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager', 'editor')
    )
  );

DROP POLICY IF EXISTS "posts_manager_delete_any" ON public.posts;
CREATE POLICY "posts_manager_delete_any"
  ON public.posts FOR DELETE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager')
    )
  );

-- ── post_metrics ─────────────────────────────────────────────
DROP POLICY IF EXISTS "post_metrics_member_read" ON public.post_metrics;
CREATE POLICY "post_metrics_member_read"
  ON public.post_metrics FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM public.posts
      WHERE workspace_id IN (SELECT public.get_my_workspace_ids())
    )
  );

-- ── queues ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "queues_member_read" ON public.queues;
CREATE POLICY "queues_member_read"
  ON public.queues FOR SELECT
  USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

DROP POLICY IF EXISTS "queues_editor_write" ON public.queues;
CREATE POLICY "queues_editor_write"
  ON public.queues FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager', 'editor')
    )
  );

DROP POLICY IF EXISTS "queues_editor_update" ON public.queues;
CREATE POLICY "queues_editor_update"
  ON public.queues FOR UPDATE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager', 'editor')
    )
  );

DROP POLICY IF EXISTS "queues_manager_delete" ON public.queues;
CREATE POLICY "queues_manager_delete"
  ON public.queues FOR DELETE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager')
    )
  );

-- ── queue_slots ───────────────────────────────────────────────
DROP POLICY IF EXISTS "queue_slots_member_read" ON public.queue_slots;
CREATE POLICY "queue_slots_member_read"
  ON public.queue_slots FOR SELECT
  USING (
    queue_id IN (
      SELECT id FROM public.queues
      WHERE workspace_id IN (SELECT public.get_my_workspace_ids())
    )
  );

DROP POLICY IF EXISTS "queue_slots_editor_write" ON public.queue_slots;
CREATE POLICY "queue_slots_editor_write"
  ON public.queue_slots FOR ALL
  USING (
    queue_id IN (
      SELECT q.id FROM public.queues q
      JOIN public.workspace_members wm ON wm.workspace_id = q.workspace_id
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager', 'editor')
    )
  );

-- ── queue_posts ───────────────────────────────────────────────
DROP POLICY IF EXISTS "queue_posts_member_read" ON public.queue_posts;
CREATE POLICY "queue_posts_member_read"
  ON public.queue_posts FOR SELECT
  USING (
    queue_id IN (
      SELECT id FROM public.queues
      WHERE workspace_id IN (SELECT public.get_my_workspace_ids())
    )
  );

DROP POLICY IF EXISTS "queue_posts_editor_write" ON public.queue_posts;
CREATE POLICY "queue_posts_editor_write"
  ON public.queue_posts FOR ALL
  USING (
    queue_id IN (
      SELECT q.id FROM public.queues q
      JOIN public.workspace_members wm ON wm.workspace_id = q.workspace_id
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager', 'editor')
    )
  );

-- ── media_files ───────────────────────────────────────────────
DROP POLICY IF EXISTS "media_files_member_read" ON public.media_files;
CREATE POLICY "media_files_member_read"
  ON public.media_files FOR SELECT
  USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

DROP POLICY IF EXISTS "media_files_editor_insert" ON public.media_files;
CREATE POLICY "media_files_editor_insert"
  ON public.media_files FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager', 'editor')
    )
    AND uploaded_by = auth.uid()
  );

DROP POLICY IF EXISTS "media_files_owner_delete" ON public.media_files;
CREATE POLICY "media_files_owner_delete"
  ON public.media_files FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager')
    )
  );

-- ── inbox_messages ────────────────────────────────────────────
DROP POLICY IF EXISTS "inbox_member_read" ON public.inbox_messages;
CREATE POLICY "inbox_member_read"
  ON public.inbox_messages FOR SELECT
  USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

DROP POLICY IF EXISTS "inbox_editor_update" ON public.inbox_messages;
CREATE POLICY "inbox_editor_update"
  ON public.inbox_messages FOR UPDATE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager', 'editor')
    )
  );

-- ── invitations ───────────────────────────────────────────────
DROP POLICY IF EXISTS "invitations_manager_read" ON public.invitations;
CREATE POLICY "invitations_manager_read"
  ON public.invitations FOR SELECT
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager')
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "invitations_manager_insert" ON public.invitations;
CREATE POLICY "invitations_manager_insert"
  ON public.invitations FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "invitations_manager_delete" ON public.invitations;
CREATE POLICY "invitations_manager_delete"
  ON public.invitations FOR DELETE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager')
    )
  );

-- ── workspace_members insert — simplify role check ───────────
DROP POLICY IF EXISTS "workspace_members_owner_manager_insert" ON public.workspace_members;
CREATE POLICY "workspace_members_owner_manager_insert"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager')
    )
  );

-- ════════════════════════════════════════════════════════════
-- 7. UPGRADE get_workspace_usage() TO INCLUDE STORAGE
-- The media page reads usage.storage_used_mb and
-- usage.storage_limit_mb from the workspace context.
-- The old function did not return these fields.
-- ════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.get_workspace_usage(UUID);

CREATE OR REPLACE FUNCTION public.get_workspace_usage(
  p_workspace_id UUID
) RETURNS TABLE (
  post_count        INTEGER,
  ai_count          INTEGER,
  overage_count     INTEGER,
  plan              TEXT,
  month             TEXT,
  storage_used_mb   NUMERIC,
  storage_limit_mb  NUMERIC
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
    current_month,
    -- Storage used: sum of all media_files for this workspace (bytes → MB)
    COALESCE(
      (SELECT ROUND(SUM(mf.file_size)::NUMERIC / 1048576.0, 2)
       FROM public.media_files mf
       WHERE mf.workspace_id = p_workspace_id),
      0
    ) AS storage_used_mb,
    -- Storage limit: from plan_limits (bytes → MB), NULL = unlimited
    CASE
      WHEN pl.storage_mb IS NULL THEN NULL
      ELSE ROUND(pl.storage_mb::NUMERIC / 1048576.0, 2)
    END AS storage_limit_mb
  FROM public.workspaces w
  JOIN public.plan_limits pl ON pl.plan = w.plan
  LEFT JOIN public.post_usage pu
    ON pu.workspace_id = w.id
   AND pu.month        = current_month
  WHERE w.id = p_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ════════════════════════════════════════════════════════════
-- 8. SLUG UNIQUENESS — collision-resistant generator
-- The original WHILE loop is fine at low volume but becomes
-- an O(n) lock contender when many users sign up concurrently.
-- Replace with a timestamp+random suffix that makes collisions
-- astronomically unlikely without a retry loop.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
  base_slug        TEXT;
  final_slug       TEXT;
BEGIN
  -- Build slug: <email-prefix>-<6 hex chars> — unique in practice
  base_slug  := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g'));
  final_slug := base_slug || '-' || SUBSTRING(md5(gen_random_uuid()::text) FROM 1 FOR 6);

  -- Fallback: if the rare collision happens, append more entropy
  IF EXISTS (SELECT 1 FROM public.workspaces WHERE slug = final_slug) THEN
    final_slug := final_slug || '-' || SUBSTRING(md5(gen_random_uuid()::text) FROM 1 FOR 4);
  END IF;

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
-- 9. profiles_workspace_members_read — use helper function
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "profiles_workspace_members_read" ON public.profiles;
CREATE POLICY "profiles_workspace_members_read"
  ON public.profiles FOR SELECT
  USING (
    id IN (
      SELECT wm.user_id
      FROM public.workspace_members wm
      WHERE wm.workspace_id IN (SELECT public.get_my_workspace_ids())
    )
  );

-- ════════════════════════════════════════════════════════════
-- VERIFY
-- ════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'workspace-media') THEN
    RAISE EXCEPTION 'workspace-media bucket was not created!';
  END IF;
  RAISE NOTICE 'Scale improvements migration completed successfully.';
END $$;
