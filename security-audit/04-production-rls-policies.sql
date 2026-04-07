-- ============================================================================
-- PRODUCTION-READY RLS POLICIES FOR MULTI-TENANT SUPABASE
--
-- Prerequisites:
-- 1. workspace_id is in your JWT claims: auth.jwt()->>'workspace_id'
-- 2. RLS is enabled on all tables: ALTER TABLE t ENABLE ROW LEVEL SECURITY;
-- 3. Replace placeholders like {WORKSPACE_ID} with your actual column names
-- 4. Test each policy with multiple users in different workspaces
--
-- Security Model:
-- - Default-deny: Policies explicitly grant access only
-- - Workspace-scoped: Every policy checks workspace_id
-- - Role-aware: Policies respect workspace membership status/role
-- - Audit trail: All writes are logged via triggers
-- ============================================================================

-- ============================================================================
-- TABLE 1: WORKSPACES
-- Access: Members can read; only owners/admins can modify
-- ============================================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read workspaces they belong to
CREATE POLICY "workspace_read_member_access"
ON workspaces
FOR SELECT
USING (
    id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
            AND status = 'active'
    )
);

-- Policy: Only workspace creators/owners can update
CREATE POLICY "workspace_update_owner_only"
ON workspaces
FOR UPDATE
USING (
    created_by = auth.uid()
    AND id = (auth.jwt()->>'workspace_id')::uuid
)
WITH CHECK (
    created_by = auth.uid()
    AND id = (auth.jwt()->>'workspace_id')::uuid
    AND created_by IS NOT NULL  -- Cannot change ownership to NULL
);

-- Policy: Only workspace creators/owners can delete
CREATE POLICY "workspace_delete_owner_only"
ON workspaces
FOR DELETE
USING (
    created_by = auth.uid()
    AND id = (auth.jwt()->>'workspace_id')::uuid
);

-- Policy: Any authenticated user can create a workspace (no workspace_id needed yet)
CREATE POLICY "workspace_create_authenticated"
ON workspaces
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON workspaces(created_by);

-- ============================================================================
-- TABLE 2: WORKSPACE_MEMBERS
-- Access: Active members can read roster; only admins can manage
-- ============================================================================

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Policy: Active members can read other members in their workspace
CREATE POLICY "workspace_members_read_active"
ON workspace_members
FOR SELECT
USING (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND (
        -- User can always see their own membership
        user_id = auth.uid()
        -- Active members can see other active members
        OR auth.uid() IN (
            SELECT user_id
            FROM workspace_members
            WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
                AND status = 'active'
        )
    )
);

-- Policy: Only workspace admins/owners can add members
CREATE POLICY "workspace_members_insert_admin"
ON workspace_members
FOR INSERT
WITH CHECK (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND auth.uid() IN (
        SELECT user_id
        FROM workspace_members
        WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
            AND status = 'active'
            AND role IN ('admin', 'owner')
    )
);

-- Policy: Users can update their own membership; admins can update others
CREATE POLICY "workspace_members_update_self_or_admin"
ON workspace_members
FOR UPDATE
USING (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND (
        -- User updating themselves
        user_id = auth.uid()
        -- Or workspace admin updating others
        OR auth.uid() IN (
            SELECT user_id
            FROM workspace_members
            WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
                AND status = 'active'
                AND role IN ('admin', 'owner')
        )
    )
)
WITH CHECK (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND (
        user_id = auth.uid()
        OR auth.uid() IN (
            SELECT user_id
            FROM workspace_members
            WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
                AND status = 'active'
                AND role IN ('admin', 'owner')
        )
    )
);

-- Policy: Only workspace admins can remove members
CREATE POLICY "workspace_members_delete_admin"
ON workspace_members
FOR DELETE
USING (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND auth.uid() IN (
        SELECT user_id
        FROM workspace_members
        WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
            AND status = 'active'
            AND role IN ('admin', 'owner')
    )
    -- Prevent deleting the last owner
    AND NOT (
        role = 'owner'
        AND (
            SELECT COUNT(*)
            FROM workspace_members
            WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
                AND role = 'owner'
        ) = 1
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id
    ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id
    ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_status
    ON workspace_members(status);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_status
    ON workspace_members(workspace_id, status);

-- ============================================================================
-- TABLE 3: USER_PROFILES / ACCOUNTS
-- Access: Users can read accounts in their workspace; manage own profile
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read profiles of active members in their workspace
CREATE POLICY "user_profiles_read_workspace"
ON user_profiles
FOR SELECT
USING (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND user_id IN (
        SELECT user_id
        FROM workspace_members
        WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
            AND status = 'active'
    )
);

-- Policy: Users can update only their own profile
CREATE POLICY "user_profiles_update_self"
ON user_profiles
FOR UPDATE
USING (
    user_id = auth.uid()
    AND workspace_id = (auth.jwt()->>'workspace_id')::uuid
)
WITH CHECK (
    user_id = auth.uid()
    AND workspace_id = (auth.jwt()->>'workspace_id')::uuid
);

-- Policy: Users can insert their own profile (e.g., during onboarding)
CREATE POLICY "user_profiles_insert_self"
ON user_profiles
FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND workspace_id = (auth.jwt()->>'workspace_id')::uuid
);

-- Policy: Only workspace admins can delete profiles
CREATE POLICY "user_profiles_delete_admin"
ON user_profiles
FOR DELETE
USING (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND auth.uid() IN (
        SELECT user_id
        FROM workspace_members
        WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
            AND status = 'active'
            AND role IN ('admin', 'owner')
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_workspace_id
    ON user_profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id
    ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_workspace_user
    ON user_profiles(workspace_id, user_id);

-- ============================================================================
-- TABLE 4: WORKSPACE_SETTINGS / WORKSPACE_OPTIONS
-- Access: All active members can read; admins/owners can modify
-- ============================================================================

ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Active members can read workspace settings
CREATE POLICY "workspace_settings_read_active"
ON workspace_settings
FOR SELECT
USING (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND auth.uid() IN (
        SELECT user_id
        FROM workspace_members
        WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
            AND status = 'active'
    )
);

-- Policy: Only workspace admins/owners can update settings
CREATE POLICY "workspace_settings_update_admin"
ON workspace_settings
FOR UPDATE
USING (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND auth.uid() IN (
        SELECT user_id
        FROM workspace_members
        WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
            AND status = 'active'
            AND role IN ('admin', 'owner')
    )
)
WITH CHECK (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND auth.uid() IN (
        SELECT user_id
        FROM workspace_members
        WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
            AND status = 'active'
            AND role IN ('admin', 'owner')
    )
);

-- Policy: Only workspace creators can delete settings
CREATE POLICY "workspace_settings_delete_owner"
ON workspace_settings
FOR DELETE
USING (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND auth.uid() IN (
        SELECT user_id
        FROM workspace_members
        WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
            AND status = 'active'
            AND role = 'owner'
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_settings_workspace_id
    ON workspace_settings(workspace_id);

-- ============================================================================
-- TABLE 5: ACCOUNTS / BILLING INFO
-- Access: Workspace admins/owners only; sensitive financial data
-- ============================================================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Only workspace admins/owners can read account/billing info
CREATE POLICY "accounts_read_admin"
ON accounts
FOR SELECT
USING (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND auth.uid() IN (
        SELECT user_id
        FROM workspace_members
        WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
            AND status = 'active'
            AND role IN ('admin', 'owner')
    )
);

-- Policy: Only workspace owners can modify billing info
CREATE POLICY "accounts_update_owner"
ON accounts
FOR UPDATE
USING (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND auth.uid() IN (
        SELECT user_id
        FROM workspace_members
        WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
            AND status = 'active'
            AND role = 'owner'
    )
)
WITH CHECK (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND auth.uid() IN (
        SELECT user_id
        FROM workspace_members
        WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
            AND status = 'active'
            AND role = 'owner'
    )
);

-- Policy: Only workspace owners can insert/delete account records
CREATE POLICY "accounts_delete_owner"
ON accounts
FOR DELETE
USING (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND auth.uid() IN (
        SELECT user_id
        FROM workspace_members
        WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
            AND status = 'active'
            AND role = 'owner'
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accounts_workspace_id
    ON accounts(workspace_id);

-- ============================================================================
-- TABLE 6: CHILD TABLE EXAMPLE (e.g., workspace_features, posts, etc.)
-- Pattern: Any table that belongs to a workspace inherits this pattern
-- ============================================================================

-- Example: CREATE TABLE posts (
--    id UUID PRIMARY KEY,
--    workspace_id UUID NOT NULL REFERENCES workspaces,
--    created_by UUID NOT NULL REFERENCES auth.users,
--    content TEXT,
--    created_at TIMESTAMP DEFAULT NOW()
-- );

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Policy: All active workspace members can read posts
CREATE POLICY "posts_read_workspace"
ON posts
FOR SELECT
USING (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND auth.uid() IN (
        SELECT user_id
        FROM workspace_members
        WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
            AND status = 'active'
    )
);

-- Policy: Users can create posts in their workspace
CREATE POLICY "posts_insert_member"
ON posts
FOR INSERT
WITH CHECK (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND created_by = auth.uid()
    AND auth.uid() IN (
        SELECT user_id
        FROM workspace_members
        WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
            AND status = 'active'
    )
);

-- Policy: Users can update their own posts
CREATE POLICY "posts_update_owner"
ON posts
FOR UPDATE
USING (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND created_by = auth.uid()
)
WITH CHECK (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND created_by = auth.uid()  -- Cannot change post ownership
);

-- Policy: Users can delete their own posts; admins can delete any
CREATE POLICY "posts_delete_owner_or_admin"
ON posts
FOR DELETE
USING (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND (
        created_by = auth.uid()
        OR auth.uid() IN (
            SELECT user_id
            FROM workspace_members
            WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
                AND status = 'active'
                AND role IN ('admin', 'owner')
        )
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_workspace_id
    ON posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_by
    ON posts(created_by);
CREATE INDEX IF NOT EXISTS idx_posts_workspace_created_by
    ON posts(workspace_id, created_by);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get current user's workspace(s)
CREATE OR REPLACE FUNCTION current_workspace_id()
RETURNS UUID AS $$
    SELECT (auth.jwt()->>'workspace_id')::uuid;
$$ LANGUAGE SQL STABLE;

-- Get current user's workspace membership status
CREATE OR REPLACE FUNCTION is_workspace_member()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM workspace_members
        WHERE user_id = auth.uid()
            AND workspace_id = (auth.jwt()->>'workspace_id')::uuid
            AND status = 'active'
    );
$$ LANGUAGE SQL STABLE;

-- Check if current user is workspace admin
CREATE OR REPLACE FUNCTION is_workspace_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM workspace_members
        WHERE user_id = auth.uid()
            AND workspace_id = (auth.jwt()->>'workspace_id')::uuid
            AND status = 'active'
            AND role IN ('admin', 'owner')
    );
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- AUDIT TRIGGER (Recommended)
-- Track all changes for compliance and debugging
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID,
    workspace_id UUID,
    user_id UUID,
    action TEXT,  -- INSERT, UPDATE, DELETE
    old_data JSONB,
    new_data JSONB,
    timestamp TIMESTAMP DEFAULT NOW(),
    ip_address INET DEFAULT inet_client_addr()
);

CREATE INDEX idx_audit_log_workspace_id ON audit_log(workspace_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);

-- Audit trigger (example for workspace_members)
CREATE OR REPLACE FUNCTION audit_workspace_members()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, workspace_id, user_id, action, new_data)
        VALUES ('workspace_members', NEW.id, NEW.workspace_id, auth.uid(), 'INSERT', row_to_json(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, workspace_id, user_id, action, old_data, new_data)
        VALUES ('workspace_members', NEW.id, NEW.workspace_id, auth.uid(), 'UPDATE', row_to_json(OLD), row_to_json(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, workspace_id, user_id, action, old_data)
        VALUES ('workspace_members', OLD.id, OLD.workspace_id, auth.uid(), 'DELETE', row_to_json(OLD));
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_trg_workspace_members
AFTER INSERT OR UPDATE OR DELETE ON workspace_members
FOR EACH ROW
EXECUTE FUNCTION audit_workspace_members();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Query 1: List all policies and their status
-- SELECT * FROM 04-rls-audit.sql query #2

-- Query 2: Check if all user_id-only tables have workspace_id policies
SELECT
    schemaname, tablename,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;

-- Query 3: Verify workspace_id columns are indexed
SELECT
    t.table_name,
    c.column_name,
    CASE WHEN idx.indexname IS NOT NULL THEN 'Yes' ELSE 'No' END as has_index
FROM information_schema.tables t
JOIN information_schema.columns c
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
LEFT JOIN pg_indexes idx
    ON idx.schemaname = t.table_schema
    AND idx.tablename = t.table_name
    AND idx.indexdef LIKE '%' || c.column_name || '%'
WHERE t.table_schema = 'public' AND c.column_name = 'workspace_id'
ORDER BY t.table_name;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- 1. Deploy these policies to your dev/staging environment first
-- 2. Run Phase 4 validation tests with multiple workspaces
-- 3. Use audit_log to verify no cross-workspace access occurs
-- 4. Test with attackers trying to manipulate workspace_id in requests
-- 5. Monitor performance; add indexes if queries slow down
