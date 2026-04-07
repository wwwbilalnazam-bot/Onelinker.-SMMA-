-- ════════════════════════════════════════════════════════════
-- ONELINKER — WORKSPACE ISOLATION & RLS HARDENING
-- Ensures every workspace's data is fully isolated:
--   1. workspace_members: allow owner to self-insert on new workspace
--   2. social_accounts: add missing UPDATE policy
--   3. media_files: add missing UPDATE policy
--   4. notifications: scope read/update to workspace membership
--   5. inbox_messages: add INSERT policy for service role completeness
--   6. Storage: scope workspace-media/logos to workspace members
--   7. subscriptions: read via get_my_workspace_ids() for consistency
-- ════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════
-- 1. WORKSPACE_MEMBERS — Allow owner to bootstrap first member
-- The existing policy requires user to already be owner/manager,
-- which creates a chicken-and-egg problem on workspace creation.
-- Fix: Allow inserting yourself as owner if you own the workspace.
-- ════════════════════════════════════════════════════════════

-- Add policy: workspace owner can insert themselves as the first member
CREATE POLICY "workspace_members_owner_self_insert"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    -- The user being inserted is the current user
    user_id = auth.uid()
    -- AND they own the workspace
    AND workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
    -- AND the role is 'owner'
    AND role = 'owner'
  );


-- ════════════════════════════════════════════════════════════
-- 2. SUBSCRIPTIONS — Allow workspace owner to create subscription
-- Currently only service_role can insert. The owner needs to be
-- able to create the free subscription when creating a workspace.
-- ════════════════════════════════════════════════════════════

CREATE POLICY "subscriptions_owner_insert"
  ON public.subscriptions FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
    AND plan = 'free'
    AND status = 'active'
  );

-- Tighten subscriptions read to use the helper function (consistency)
DROP POLICY IF EXISTS "subscriptions_member_read" ON public.subscriptions;
CREATE POLICY "subscriptions_member_read"
  ON public.subscriptions FOR SELECT
  USING (
    workspace_id IN (SELECT public.get_my_workspace_ids())
  );


-- ════════════════════════════════════════════════════════════
-- 3. SOCIAL_ACCOUNTS — Add missing UPDATE policy
-- Members can read, editors+ can insert, but nobody can update
-- (e.g. marking as disconnected, updating health_status).
-- ════════════════════════════════════════════════════════════

CREATE POLICY "social_accounts_editor_update"
  ON public.social_accounts FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
  );


-- ════════════════════════════════════════════════════════════
-- 4. MEDIA_FILES — Add missing UPDATE policy
-- Editors+ should be able to update alt_text etc.
-- ════════════════════════════════════════════════════════════

CREATE POLICY "media_files_editor_update"
  ON public.media_files FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
  );


-- ════════════════════════════════════════════════════════════
-- 5. NOTIFICATIONS — Scope to workspace membership
-- Currently only checks user_id = auth.uid(), which is correct
-- for user-level isolation but doesn't prevent a user from
-- seeing notifications for workspaces they've been removed from.
-- Add workspace-scoped policies.
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "notifications_own_read" ON public.notifications;
CREATE POLICY "notifications_own_read"
  ON public.notifications FOR SELECT
  USING (
    user_id = auth.uid()
    AND (
      workspace_id IS NULL -- system-level notifications
      OR workspace_id IN (SELECT public.get_my_workspace_ids())
    )
  );

DROP POLICY IF EXISTS "notifications_own_update" ON public.notifications;
CREATE POLICY "notifications_own_update"
  ON public.notifications FOR UPDATE
  USING (
    user_id = auth.uid()
    AND (
      workspace_id IS NULL
      OR workspace_id IN (SELECT public.get_my_workspace_ids())
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (
      workspace_id IS NULL
      OR workspace_id IN (SELECT public.get_my_workspace_ids())
    )
  );

-- Allow users to delete their own notifications
CREATE POLICY "notifications_own_delete"
  ON public.notifications FOR DELETE
  USING (
    user_id = auth.uid()
    AND (
      workspace_id IS NULL
      OR workspace_id IN (SELECT public.get_my_workspace_ids())
    )
  );


-- ════════════════════════════════════════════════════════════
-- 6. INBOX_MESSAGES — Add INSERT policy for completeness
-- Messages are inserted by service role (webhooks), but
-- having an explicit INSERT policy prevents accidental
-- client-side inserts from other workspaces.
-- ════════════════════════════════════════════════════════════

CREATE POLICY "inbox_editor_insert"
  ON public.inbox_messages FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
  );

-- Add DELETE policy so managers can clean up inbox
CREATE POLICY "inbox_manager_delete"
  ON public.inbox_messages FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );


-- ════════════════════════════════════════════════════════════
-- 7. STORAGE — Tighten workspace-media and workspace-logos
-- Currently any authenticated user can upload/delete to these
-- buckets. Scope to workspace members.
-- ════════════════════════════════════════════════════════════

-- workspace-media: path pattern is {workspace_id}/{filename}
DROP POLICY IF EXISTS "workspace_media_upload" ON storage.objects;
CREATE POLICY "workspace_media_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'workspace-media'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_my_workspace_ids())
  );

DROP POLICY IF EXISTS "workspace_media_delete_own" ON storage.objects;
CREATE POLICY "workspace_media_delete_member"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'workspace-media'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_my_workspace_ids())
  );

-- workspace-logos: path pattern is {workspace_id}/{filename}
DROP POLICY IF EXISTS "logos_upload_workspace_owner" ON storage.objects;
CREATE POLICY "logos_upload_workspace_member"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'workspace-logos'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "logos_update_own" ON storage.objects;
CREATE POLICY "logos_update_workspace_owner"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'workspace-logos'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'workspace-logos'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "logos_delete_own" ON storage.objects;
CREATE POLICY "logos_delete_workspace_owner"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'workspace-logos'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );


-- ════════════════════════════════════════════════════════════
-- 8. POST_USAGE — Add missing INSERT/UPDATE for editors
-- The increment functions use SECURITY DEFINER, but direct
-- client access should also be scoped.
-- ════════════════════════════════════════════════════════════

CREATE POLICY "post_usage_editor_insert"
  ON public.post_usage FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
  );

CREATE POLICY "post_usage_editor_update"
  ON public.post_usage FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'editor')
    )
  );


-- ════════════════════════════════════════════════════════════
-- 9. INVITATIONS — Tighten UPDATE to manager+ only
-- Currently no UPDATE policy exists for invitations.
-- ════════════════════════════════════════════════════════════

CREATE POLICY "invitations_update"
  ON public.invitations FOR UPDATE
  USING (
    -- Managers can update (e.g. mark accepted)
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
    -- OR the invited user can accept
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
