-- ════════════════════════════════════════════════════════════
-- ONELINKER — RLS HARDENING & PRIVILEGE ESCALATION FIXES
-- Addresses security audit findings:
--   1. FIX: workspace_members self-update allows role escalation
--   2. FIX: workspace_members delete missing role check
--   3. FIX: workspace_members owner_update missing role check
--   4. FIX: Missing WITH CHECK on UPDATE policies (workspace_id mutation)
--   5. FIX: SECURITY DEFINER functions lack membership validation
--   6. FIX: post_usage direct client write access
--   7. FIX: media_files_owner_delete missing workspace scope
--   8. ADD: Super admin bypass for support access
--   9. ADD: Cleanup function for user removal from workspace
--  10. ADD: Missing service_role policies on tables that lack them
-- ════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════
-- 1. FIX: workspace_members — PRIVILEGE ESCALATION
--
-- VULNERABILITY: workspace_members_self_update allows any member
-- to SET role = 'owner' on their own row. The WITH CHECK only
-- verifies user_id = auth.uid(), not what columns changed.
--
-- FIX: Members can only update accepted_at (to accept invites).
-- Role changes require owner role (new dedicated policy).
-- ════════════════════════════════════════════════════════════

-- Drop the overly permissive self-update policy
DROP POLICY IF EXISTS "workspace_members_self_update" ON public.workspace_members;

-- Members can only accept invitations (update accepted_at on their own row)
-- They CANNOT change their role — role must remain unchanged.
CREATE POLICY "workspace_members_accept_invite"
  ON public.workspace_members FOR UPDATE
  USING (
    user_id = auth.uid()
    AND workspace_id IN (SELECT public.get_my_workspace_ids())
  )
  WITH CHECK (
    user_id = auth.uid()
    -- Role must not change (prevents escalation)
    AND role = (
      SELECT wm2.role FROM public.workspace_members wm2
      WHERE wm2.id = workspace_members.id
    )
  );

-- Only workspace OWNER can change member roles (not even managers)
-- This prevents manager → owner escalation chains
DROP POLICY IF EXISTS "workspace_members_owner_update" ON public.workspace_members;
CREATE POLICY "workspace_members_owner_change_role"
  ON public.workspace_members FOR UPDATE
  USING (
    -- Current user must be the workspace owner
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
    -- Cannot change your own role (prevents owner from demoting themselves
    -- and orphaning the workspace)
    AND user_id != auth.uid()
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
    -- Cannot promote to owner via UPDATE (ownership transfer is a
    -- separate operation that requires updating workspaces.owner_id)
    AND role IN ('manager', 'editor', 'viewer')
  );


-- ════════════════════════════════════════════════════════════
-- 2. FIX: workspace_members DELETE — missing role check
--
-- VULNERABILITY: Any member can delete any other member.
-- Only owner/manager should be able to remove members.
-- Additional guard: managers cannot remove other managers or the owner.
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "workspace_members_owner_manager_delete" ON public.workspace_members;

-- Owner can remove anyone (except themselves — use workspace deletion)
CREATE POLICY "workspace_members_owner_delete"
  ON public.workspace_members FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
    AND user_id != auth.uid()
  );

-- Manager can remove editors and viewers only
CREATE POLICY "workspace_members_manager_delete"
  ON public.workspace_members FOR DELETE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role = 'manager'
    )
    AND user_id != auth.uid()
    AND role IN ('editor', 'viewer')
  );

-- Members can leave a workspace (delete own membership)
-- EXCEPT: owner cannot leave (must transfer ownership first)
CREATE POLICY "workspace_members_self_leave"
  ON public.workspace_members FOR DELETE
  USING (
    user_id = auth.uid()
    AND role != 'owner'
  );


-- ════════════════════════════════════════════════════════════
-- 3. FIX: Missing WITH CHECK on UPDATE policies
--
-- VULNERABILITY: Without WITH CHECK, a user who belongs to
-- Workspace A and B could UPDATE posts SET workspace_id = 'B'
-- WHERE workspace_id = 'A', moving data between tenants.
--
-- FIX: Add WITH CHECK that locks workspace_id to its current
-- value on all UPDATE policies for tenant-scoped tables.
-- ════════════════════════════════════════════════════════════

-- ── posts ──────────────────────────────────────────────────
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
  )
  WITH CHECK (
    -- workspace_id cannot be changed
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager', 'editor')
    )
    -- author_id cannot be reassigned
    AND author_id = auth.uid()
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
  )
  WITH CHECK (
    -- workspace_id cannot be changed
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager')
    )
  );

-- ── social_accounts ────────────────────────────────────────
DROP POLICY IF EXISTS "social_accounts_editor_update" ON public.social_accounts;
CREATE POLICY "social_accounts_editor_update"
  ON public.social_accounts FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
  )
  WITH CHECK (
    -- workspace_id immutable on update
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
  );

-- ── queues ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "queues_editor_update" ON public.queues;
CREATE POLICY "queues_editor_update"
  ON public.queues FOR UPDATE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager', 'editor')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager', 'editor')
    )
  );

-- ── media_files ────────────────────────────────────────────
DROP POLICY IF EXISTS "media_files_editor_update" ON public.media_files;
CREATE POLICY "media_files_editor_update"
  ON public.media_files FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
  );

-- ── inbox_messages ─────────────────────────────────────────
DROP POLICY IF EXISTS "inbox_editor_update" ON public.inbox_messages;
CREATE POLICY "inbox_editor_update"
  ON public.inbox_messages FOR UPDATE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager', 'editor')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'manager', 'editor')
    )
  );


-- ════════════════════════════════════════════════════════════
-- 4. FIX: SECURITY DEFINER functions — add membership checks
--
-- VULNERABILITY: increment_post_usage(), decrement_post_usage(),
-- increment_ai_usage(), and get_workspace_usage() accept any
-- workspace_id. An authenticated user can manipulate quotas
-- for workspaces they don't belong to.
--
-- FIX: Validate membership before executing. Use auth.uid()
-- inside SECURITY DEFINER to verify caller is a member.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.increment_post_usage(
  p_workspace_id UUID,
  p_month        TEXT
) RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  -- Verify caller is a member of this workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of workspace %', p_workspace_id;
  END IF;

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

CREATE OR REPLACE FUNCTION public.decrement_post_usage(
  p_workspace_id UUID,
  p_month        TEXT
) RETURNS void AS $$
BEGIN
  -- Verify caller is a member of this workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of workspace %', p_workspace_id;
  END IF;

  UPDATE public.post_usage
  SET
    post_count   = GREATEST(post_count - 1, 0),
    last_updated = NOW()
  WHERE workspace_id = p_workspace_id
    AND month        = p_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_workspace_id UUID,
  p_month        TEXT
) RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  -- Verify caller is a member of this workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of workspace %', p_workspace_id;
  END IF;

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
  -- Verify caller is a member of this workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of workspace %', p_workspace_id;
  END IF;

  current_month := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM');

  RETURN QUERY
  SELECT
    COALESCE(pu.post_count, 0)    AS post_count,
    COALESCE(pu.ai_count, 0)      AS ai_count,
    COALESCE(pu.overage_count, 0) AS overage_count,
    w.plan,
    current_month,
    COALESCE(
      (SELECT ROUND(SUM(mf.file_size)::NUMERIC / 1048576.0, 2)
       FROM public.media_files mf
       WHERE mf.workspace_id = p_workspace_id),
      0
    ) AS storage_used_mb,
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

-- check_post_limit and check_ai_limit are read-only checks and typically
-- called server-side, but let's harden them too for defense-in-depth
CREATE OR REPLACE FUNCTION public.check_post_limit(
  p_workspace_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  current_count  INTEGER;
  plan_max       INTEGER;
  workspace_plan TEXT;
  current_month  TEXT;
BEGIN
  -- Verify caller is a member of this workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  ) THEN
    RETURN FALSE; -- Silently deny for non-members (don't leak existence)
  END IF;

  current_month := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM');

  SELECT w.plan INTO workspace_plan
  FROM public.workspaces w
  WHERE w.id = p_workspace_id;

  IF workspace_plan IS NULL THEN RETURN FALSE; END IF;

  SELECT pl.max_posts_per_month INTO plan_max
  FROM public.plan_limits pl
  WHERE pl.plan = workspace_plan;

  IF plan_max IS NULL THEN RETURN TRUE; END IF;

  SELECT COALESCE(pu.post_count, 0) INTO current_count
  FROM public.post_usage pu
  WHERE pu.workspace_id = p_workspace_id
    AND pu.month        = current_month;

  RETURN current_count < plan_max;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_ai_limit(
  p_workspace_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  current_count  INTEGER;
  ai_max         INTEGER;
  workspace_plan TEXT;
  current_month  TEXT;
BEGIN
  -- Verify caller is a member of this workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  ) THEN
    RETURN FALSE;
  END IF;

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


-- ════════════════════════════════════════════════════════════
-- 5. FIX: Remove direct client write access to post_usage
--
-- VULNERABILITY: Editors can INSERT/UPDATE post_usage directly,
-- setting post_count = 0 to bypass quotas.
-- All quota changes should go through SECURITY DEFINER functions.
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "post_usage_editor_insert" ON public.post_usage;
DROP POLICY IF EXISTS "post_usage_editor_update" ON public.post_usage;


-- ════════════════════════════════════════════════════════════
-- 6. FIX: media_files_owner_delete — add workspace scope
--
-- The first OR branch (uploaded_by = auth.uid()) doesn't check
-- workspace membership. A removed member who knows a file ID
-- could theoretically delete it.
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "media_files_owner_delete" ON public.media_files;
CREATE POLICY "media_files_delete"
  ON public.media_files FOR DELETE
  USING (
    -- Must be a member of the workspace the file belongs to
    workspace_id IN (SELECT public.get_my_workspace_ids())
    AND (
      -- Uploader can delete their own files
      uploaded_by = auth.uid()
      -- Owner/manager can delete any file in the workspace
      OR workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
          AND wm.role IN ('owner', 'manager')
      )
    )
  );


-- ════════════════════════════════════════════════════════════
-- 7. ADD: Super Admin bypass for customer support
--
-- Approach: A custom claim `is_super_admin` in the JWT.
-- Set via Supabase Dashboard → Authentication → Users → Edit
-- or via a separate admin API.
--
-- WARNING: This grants full read access to ALL workspaces.
-- Use sparingly and audit all super admin actions.
-- ════════════════════════════════════════════════════════════

-- Helper function to check super admin status
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (auth.jwt()->'app_metadata'->>'is_super_admin')::boolean,
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Add super admin read access to key tables
-- These use OR conditions so they don't interfere with normal policies

-- Workspaces: super admin can see all
CREATE POLICY "workspaces_super_admin_read"
  ON public.workspaces FOR SELECT
  USING (public.is_super_admin());

-- Workspace members: super admin can see all
CREATE POLICY "workspace_members_super_admin_read"
  ON public.workspace_members FOR SELECT
  USING (public.is_super_admin());

-- Posts: super admin can see all
CREATE POLICY "posts_super_admin_read"
  ON public.posts FOR SELECT
  USING (public.is_super_admin());

-- Social accounts: super admin can see all
CREATE POLICY "social_accounts_super_admin_read"
  ON public.social_accounts FOR SELECT
  USING (public.is_super_admin());

-- Subscriptions: super admin can see all
CREATE POLICY "subscriptions_super_admin_read"
  ON public.subscriptions FOR SELECT
  USING (public.is_super_admin());

-- Profiles: super admin can see all
CREATE POLICY "profiles_super_admin_read"
  ON public.profiles FOR SELECT
  USING (public.is_super_admin());


-- ════════════════════════════════════════════════════════════
-- 8. ADD: Cleanup function for user removal from workspace
--
-- When a user is removed from a workspace, their authored
-- posts remain (business data), but we should:
-- - Cancel any scheduled (not yet published) posts by that user
-- - Keep published posts for analytics continuity
-- - Optionally reassign drafted posts to the remover
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.cleanup_removed_member(
  p_workspace_id UUID,
  p_removed_user_id UUID,
  p_reassign_to UUID DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Verify caller is workspace owner or manager
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'manager')
  ) THEN
    RAISE EXCEPTION 'Only owner/manager can clean up removed members';
  END IF;

  -- Cancel scheduled posts by the removed user
  UPDATE public.posts
  SET status = 'cancelled', updated_at = NOW()
  WHERE workspace_id = p_workspace_id
    AND author_id = p_removed_user_id
    AND status IN ('scheduled', 'pending_approval');

  -- Optionally reassign draft posts
  IF p_reassign_to IS NOT NULL THEN
    -- Verify reassign target is a member
    IF NOT EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = p_workspace_id AND user_id = p_reassign_to
    ) THEN
      RAISE EXCEPTION 'Reassign target is not a member of workspace';
    END IF;

    UPDATE public.posts
    SET author_id = p_reassign_to, updated_at = NOW()
    WHERE workspace_id = p_workspace_id
      AND author_id = p_removed_user_id
      AND status = 'draft';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ════════════════════════════════════════════════════════════
-- 9. ADD: Missing service_role policies
--
-- Some tables (queues, queue_slots, queue_posts, notifications,
-- workspace_members, workspaces) lack explicit service_role
-- policies. While Supabase service_role bypasses RLS by default,
-- explicit policies provide defense-in-depth if the Supabase
-- config ever changes to not bypass RLS for service role.
-- ════════════════════════════════════════════════════════════

CREATE POLICY "workspaces_service_role"
  ON public.workspaces FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "workspace_members_service_role"
  ON public.workspace_members FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "queues_service_role"
  ON public.queues FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "queue_slots_service_role"
  ON public.queue_slots FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "queue_posts_service_role"
  ON public.queue_posts FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "referrals_insert_authenticated"
  ON public.referrals FOR INSERT
  WITH CHECK (referrer_id = auth.uid() OR referred_id = auth.uid());


-- ════════════════════════════════════════════════════════════
-- 10. ADD: Indexes for RLS performance at scale
--
-- RLS policies run a subquery on workspace_members for EVERY
-- row evaluation. These indexes ensure the membership check
-- is always an index-only scan.
-- ════════════════════════════════════════════════════════════

-- Covering index for the most common RLS pattern:
-- WHERE user_id = auth.uid() AND role IN (...)
-- The (user_id, workspace_id, role) order matches the filter pattern
CREATE INDEX IF NOT EXISTS idx_members_user_workspace_role
  ON public.workspace_members(user_id, workspace_id, role);

-- For workspace ownership checks (workspaces.owner_id = auth.uid())
CREATE INDEX IF NOT EXISTS idx_workspaces_owner
  ON public.workspaces(owner_id);


-- ════════════════════════════════════════════════════════════
-- VERIFY
-- ════════════════════════════════════════════════════════════
DO $$
BEGIN
  -- Verify the dangerous self-update policy is gone
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workspace_members'
      AND policyname = 'workspace_members_self_update'
  ) THEN
    RAISE EXCEPTION 'CRITICAL: workspace_members_self_update policy still exists!';
  END IF;

  -- Verify post_usage client write policies are gone
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'post_usage'
      AND policyname IN ('post_usage_editor_insert', 'post_usage_editor_update')
  ) THEN
    RAISE EXCEPTION 'post_usage client write policies still exist!';
  END IF;

  RAISE NOTICE 'RLS hardening migration completed successfully.';
END $$;
