# 🚀 QUICK-START: FIX YOUR DATA ISOLATION LEAK IN 4 HOURS

**Severity**: 🚨 CRITICAL - Multi-tenant data exposure  
**Time to fix**: 4 hours (dev) → 24 hours (testing) → deploy  
**Cost**: Free (no infrastructure changes)

---

## What's Broken

Users from Workspace A can see accounts, profiles, and settings from Workspace B.

**Root cause**: Missing or misconfigured RLS policies on your tables.

---

## 4-Hour Remediation Plan

### Hour 1: Audit & Diagnosis (15 minutes)

```bash
# 1. Connect to your Supabase database
# Dashboard → SQL Editor, or
# psql -h db.YOUR-PROJECT.supabase.co -U postgres

# 2. Run the RLS audit (01-rls-audit.sql)
-- Copy the entire file into SQL Editor and execute
-- Review the output, especially:
--   - Which tables have RLS disabled? (🚨 CRITICAL)
--   - Which policies have "true" clauses? (⚠️ WARNING)
--   - Which tables missing WITH CHECK? (❌ DANGEROUS)

# 3. Check your JWT claims
SELECT auth.jwt() as full_jwt;
-- Does it include workspace_id? If NULL, go to Phase 3 first.

# 4. Create test data for both workspaces
INSERT INTO workspaces (id, name, created_by) VALUES
    ('workspace-test-a', 'Workspace A', 'user-test-1'),
    ('workspace-test-b', 'Workspace B', 'user-test-2');

INSERT INTO workspace_members (workspace_id, user_id, role, status) VALUES
    ('workspace-test-a', 'user-test-1', 'owner', 'active'),
    ('workspace-test-b', 'user-test-2', 'owner', 'active');

INSERT INTO accounts (workspace_id, user_id, email) VALUES
    ('workspace-test-a', 'user-test-1', 'user1@workspace-a.com'),
    ('workspace-test-b', 'user-test-2', 'user2@workspace-b.com');
```

**Estimated time**: 10-15 minutes

---

### Hour 2: Enable RLS & Add Policies (1 hour)

**DO THESE IN ORDER. Test after each step.**

#### Step 2.1: Enable RLS on All Tables

```sql
-- List all public tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- For EACH table, run:
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;
-- ... repeat for any other tenant-related tables

-- Verify
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- All should show "t" (true)
```

#### Step 2.2: Drop Bad Policies (if any)

```sql
-- If you have policies with "true" or missing workspace_id:
DROP POLICY IF EXISTS policy_name ON table_name;

-- Example:
DROP POLICY IF EXISTS "read_all_accounts" ON accounts;
DROP POLICY IF EXISTS "select_true" ON workspace_members;
```

#### Step 2.3: Add Production Policies

**For each table**, copy the corresponding policy from `04-production-rls-policies.sql`:

```sql
-- Example: workspaces table
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
);

CREATE POLICY "workspace_delete_owner_only"
ON workspaces
FOR DELETE
USING (
    created_by = auth.uid()
    AND id = (auth.jwt()->>'workspace_id')::uuid
);

CREATE POLICY "workspace_create_authenticated"
ON workspaces
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
```

**Repeat for**: `workspace_members`, `accounts`, `user_profiles`, `workspace_settings`, and any other tables.

#### Step 2.4: Create Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON workspaces(created_by);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_status ON workspace_members(status);
CREATE INDEX IF NOT EXISTS idx_accounts_workspace_id ON accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_workspace_id ON user_profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_settings_workspace_id ON workspace_settings(workspace_id);
```

**Time**: 20-30 minutes (copy-paste policies)

---

### Hour 3: Fix JWT & Backend (1 hour)

#### Step 3.1: Add workspace_id to JWT

In **Supabase Dashboard** → `Authentication` → `JWT`:

Set the following JWT mapping:
```json
{
  "sub": "uid",
  "email": "email",
  "workspace_id": "user_metadata.workspace_id"
}
```

#### Step 3.2: Populate workspace_id in auth.users

```bash
# Option A: One-time SQL update
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{workspace_id}',
    to_jsonb((
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.users.id
        AND status = 'active'
        ORDER BY created_at ASC
        LIMIT 1
    )::text)
)
WHERE id IN (SELECT user_id FROM workspace_members WHERE status = 'active');
```

Or:

```bash
# Option B: Use Supabase CLI for each user
npx supabase auth admin update-user --user-id USER_UUID \
  --user-metadata '{"workspace_id":"WORKSPACE_UUID"}' \
  --project-ref YOUR_PROJECT
```

#### Step 3.3: Update Backend Queries

In your **Next.js/React/Node.js code**, update all database queries:

**Before** (❌ DANGEROUS):
```typescript
const { data } = await supabase
    .from('accounts')
    .select('*')
    .eq('workspace_id', workspaceId);  // Client controls this!
```

**After** (✅ SECURE):
```typescript
// Step 1: Get workspace_id from JWT
const { data: { user } } = await supabase.auth.getUser();
const workspaceId = user?.user_metadata?.workspace_id;

if (!workspaceId) throw new Error('No workspace context');

// Step 2: Query with JWT's workspace_id
const { data } = await supabase
    .from('accounts')
    .select('*')
    .eq('workspace_id', workspaceId);  // From JWT, immutable
```

**Time**: 15-20 minutes (update 5-10 queries in your codebase)

---

### Hour 4: Test & Verify (30 minutes)

#### Test 1: Same-Workspace Access (Should Succeed)

```bash
# Get JWT for User 1 in Workspace A
export JWT_USER1="eyJhbGc..."

# Query User 1's workspace
curl -X GET "https://YOUR-PROJECT.supabase.co/rest/v1/accounts?select=*" \
  -H "Authorization: Bearer $JWT_USER1"

# Expected: Returns User 1's accounts ✅
```

#### Test 2: Cross-Workspace Access (Should Fail)

```bash
# Try to query with different workspace_id in URL
curl -X GET "https://YOUR-PROJECT.supabase.co/rest/v1/accounts?workspace_id=eq.workspace-test-b&select=*" \
  -H "Authorization: Bearer $JWT_USER1"

# Expected: Empty result [] or 403 Forbidden ✅
```

#### Test 3: Verify Audit Log

```sql
SELECT * FROM audit_log
WHERE workspace_id = 'workspace-test-a'
ORDER BY timestamp DESC
LIMIT 10;

-- Should show all access by User 1 in Workspace A
-- Should NOT show any cross-workspace attempts
```

---

## Success Criteria (Verify All)

- [ ] RLS enabled on all tables: `SELECT * FROM pg_tables WHERE rowsecurity = false;` returns NO rows
- [ ] All tables have policies: `SELECT COUNT(*) FROM pg_policies;` > 0
- [ ] User 1 can read their workspace: Query returns data ✅
- [ ] User 1 cannot read User 2's workspace: Query returns empty [] or error ✅
- [ ] User 1 cannot insert into User 2's workspace: Insert fails ✅
- [ ] User 1 cannot update User 2's workspace: Update fails ✅
- [ ] User 1 cannot delete User 2's data: Delete fails ✅

---

## Deployment Timeline

### Day 1: Deploy to Development
1. Apply RLS policies to dev database
2. Run validation tests (Phase 4)
3. Update development API code
4. Smoke test with test accounts

### Day 2: Deploy to Staging
1. Apply RLS policies to staging database
2. Run full test suite (Phase 4)
3. Deploy API code
4. Load test with realistic data
5. Verify performance (queries should stay < 100ms)

### Day 3: Deploy to Production
1. **Backup production database first**:
   ```bash
   npx supabase db push --remote --project-ref YOUR_PROJECT  # Backup
   ```

2. Deploy RLS policies in transaction:
   ```sql
   BEGIN;
   -- All ALTER TABLE ENABLE RLS + CREATE POLICY commands
   COMMIT;
   ```

3. Deploy API code (no downtime)

4. Monitor audit_log for errors:
   ```sql
   SELECT * FROM audit_log
   WHERE is_permitted = false
   AND timestamp > NOW() - INTERVAL '1 hour'
   ORDER BY timestamp DESC;
   ```

---

## If Tests Fail: Debugging

### Problem: User 1 can still see User 2's workspace

1. **Check RLS is actually enabled**:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'accounts';
   -- Must show "t" (true)
   ```

2. **Check policies exist**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'accounts';
   -- Should have multiple policies (SELECT, INSERT, UPDATE, DELETE)
   ```

3. **Check JWT has workspace_id**:
   ```sql
   SELECT auth.jwt()->>'workspace_id';
   -- Must return a UUID, not NULL
   ```

4. **Check policy syntax** (common mistake: missing cast to ::uuid):
   ```sql
   -- WRONG:
   USING (workspace_id = auth.jwt()->>'workspace_id')
   
   -- CORRECT:
   USING (workspace_id = (auth.jwt()->>'workspace_id')::uuid)
   ```

5. **Force recreate the policy**:
   ```sql
   DROP POLICY IF EXISTS "read_accounts" ON accounts;
   CREATE POLICY "read_accounts"
   ON accounts FOR SELECT
   USING (workspace_id = (auth.jwt()->>'workspace_id')::uuid);
   ```

### Problem: Queries are slow (> 1 second)

```sql
-- Check for missing indexes
EXPLAIN ANALYZE
SELECT * FROM accounts
WHERE workspace_id = 'workspace-test-a';

-- Look for "Seq Scan" (bad) vs "Index Scan" (good)
-- If Seq Scan, add index:
CREATE INDEX idx_accounts_workspace_id ON accounts(workspace_id);

-- Rerun EXPLAIN to verify
```

### Problem: Users can insert/update to other workspaces

```sql
-- Check WITH CHECK clause exists
SELECT tablename, policyname, with_check
FROM pg_policies
WHERE cmd IN ('a', 'w');  -- INSERT, UPDATE

-- If with_check is NULL, recreate:
DROP POLICY "update_accounts" ON accounts;
CREATE POLICY "update_accounts"
ON accounts FOR UPDATE
USING (workspace_id = (auth.jwt()->>'workspace_id')::uuid)
WITH CHECK (workspace_id = (auth.jwt()->>'workspace_id')::uuid);
```

---

## Post-Deployment Monitoring

### Daily (First Week)

```sql
-- Check for policy violations
SELECT * FROM audit_log
WHERE is_permitted = false
AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Check query performance
SELECT * FROM pg_stat_statements
WHERE query LIKE '%accounts%'
ORDER BY mean_exec_time DESC;
```

### Weekly (Ongoing)

```sql
-- Audit access patterns
SELECT user_id, workspace_id, COUNT(*) as query_count
FROM audit_log
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY user_id, workspace_id
ORDER BY query_count DESC;

-- Check for any unintended access
SELECT * FROM audit_log
WHERE user_id NOT IN (
    SELECT user_id FROM workspace_members
    WHERE workspace_id = audit_log.workspace_id
)
AND timestamp > NOW() - INTERVAL '7 days';
-- Expected: 0 rows (all access is by active members)
```

---

## Rollback Plan

If something breaks in production:

```bash
# Restore from backup (before RLS deployment)
npx supabase db pull --remote --project-ref YOUR_PROJECT

# Or disable RLS on affected tables temporarily
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;

# Then investigate the issue before re-enabling
```

---

## Next Steps

1. **Immediate** (Today): Run audit queries, identify broken tables
2. **Short-term** (Week 1): Deploy RLS policies and JWT fixes
3. **Medium-term** (Week 2-4): Full testing and rollout
4. **Long-term** (Monthly): Monitor audit log, security reviews

---

## Questions?

See the full security audit in:
- [Common Misconfigurations](./02-common-misconfigs.md)
- [Production RLS Policies](./04-production-rls-policies.sql)
- [Backend Safeguards](./05-backend-safeguards.md)
- [Validation & Testing](./06-validation-testing.md)
- [Architecture Best Practices](./07-architecture-best-practices.md)

---

**Status**: Ready to deploy ✅
