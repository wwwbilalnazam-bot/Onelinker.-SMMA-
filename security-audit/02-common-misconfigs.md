# 🔴 COMMON SUPABASE MULTI-TENANT ISOLATION BUGS

## 1. **Missing RLS Entirely**
```sql
-- ❌ DANGEROUS: Table has no RLS enabled
CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    workspace_id UUID,
    email TEXT
);
-- Anyone with table access can see all rows!
```

**Impact**: Total data exposure. All users see all records.

**Fix**:
```sql
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
-- Then add explicit policies (see Phase 2)
```

---

## 2. **auth.uid()-Only Policies (Missing Workspace Context)**
```sql
-- ❌ DANGEROUS: Only checks user identity, not workspace membership
CREATE POLICY "users_can_read_own_profiles"
ON user_profiles
FOR SELECT
USING (auth.uid() = user_id);
-- Problem: User 123 in Workspace A can see User 123's profile in Workspace B!
```

**Impact**: Users can access their own data across ALL workspaces they've ever been in.

**Fix**:
```sql
-- ✅ SECURE: Also verify workspace membership
CREATE POLICY "users_read_own_profile_in_workspace"
ON user_profiles
FOR SELECT
USING (
    auth.uid() = user_id
    AND workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid() 
        AND status = 'active'
    )
);
```

---

## 3. **true / USING (true) Clauses**
```sql
-- ❌ CRITICAL: Allows everyone to read
CREATE POLICY "read_workspace_metadata"
ON workspaces
FOR SELECT
USING (true);  -- Anyone can read ANY workspace!

-- OR worse:
CREATE POLICY "read_accounts"
ON accounts
FOR SELECT;  -- Default is true!
```

**Impact**: Complete read access to that table.

**Fix**: Always explicitly qualify with workspace context.

---

## 4. **Missing WITH CHECK on Write Operations**
```sql
-- ❌ DANGEROUS: Can read filtered data, but write anywhere
CREATE POLICY "update_account"
ON accounts
FOR UPDATE
USING (workspace_id = (auth.jwt()->>'workspace_id')::uuid)
-- Missing WITH CHECK means UPDATE can change workspace_id to another tenant's!
ENABLE (user_id = auth.uid());
```

**Impact**: User reads their workspace data, but can UPDATE to change workspace_id → privilege escalation.

**Fix**:
```sql
-- ✅ SECURE: Both USING and WITH CHECK require workspace match
CREATE POLICY "update_account"
ON accounts
FOR UPDATE
USING (workspace_id = (auth.jwt()->>'workspace_id')::uuid)
WITH CHECK (workspace_id = (auth.jwt()->>'workspace_id')::uuid);
```

---

## 5. **JWT Claims Not Set Correctly**
```sql
-- ❌ Your auth token has no workspace context
{
  "sub": "user-123",
  "email": "user@example.com",
  "aud": "authenticated",
  "iat": 1234567890,
  "exp": 1234571490
  // Missing: workspace_id!
}

-- Then policies try to use non-existent claim:
USING (workspace_id = (auth.jwt()->>'workspace_id')::uuid)
-- This becomes NULL, and comparisons with NULL fail silently!
```

**Impact**: Policies fail silently or allow unexpected access.

**Fix**: Ensure workspace_id is in JWT claims (see Phase 3: Backend safeguards).

---

## 6. **Implicit Trust in URL Parameters**
```javascript
// ❌ DANGEROUS: Client sends workspace_id in URL/body, server trusts it
async function getUserData(workspaceId) {
    // Attacker can change workspaceId to "victim-workspace-uuid"
    const { data } = await supabase
        .from('accounts')
        .select('*')
        .eq('workspace_id', workspaceId);  // User controls this!
    return data;
}
```

**Impact**: Client-side control means attacker can see any workspace.

**Fix**: Always derive workspace_id from JWT, never from client parameters (see Phase 3).

---

## 7. **Workspace-ID-Only Policies (Ignoring Role/Status)**
```sql
-- ❌ INCOMPLETE: Only checks workspace, not membership status
CREATE POLICY "read_workspace_members"
ON workspace_members
FOR SELECT
USING (workspace_id = (auth.jwt()->>'workspace_id')::uuid);
-- Problem: Removed/inactive users can still read workspace members!
```

**Impact**: Inactive/removed users retain access; can't be revoked immediately.

**Fix**:
```sql
CREATE POLICY "read_workspace_members"
ON workspace_members
FOR SELECT
USING (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND (
        -- Either I'm viewing my own record
        user_id = auth.uid()
        -- Or I'm an active member viewing others
        OR auth.uid() IN (
            SELECT user_id FROM workspace_members
            WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
            AND status = 'active'
        )
    )
);
```

---

## 8. **Missing Indexes on workspace_id**
```sql
-- ❌ SLOW & DANGEROUS: Slow RLS checks can lead to timeouts
CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    workspace_id UUID,  -- No index!
    user_id UUID
);
-- Policy scans the whole table looking for workspace_id!
```

**Impact**: Slow queries, timeouts, poor security enforcement.

**Fix**:
```sql
CREATE INDEX idx_accounts_workspace_id ON accounts(workspace_id);
CREATE INDEX idx_accounts_user_workspace ON accounts(user_id, workspace_id);
```

---

## 9. **SECURITY DEFINER Functions Bypassing RLS**
```sql
-- ❌ DANGEROUS: Function runs as superuser, bypasses RLS
CREATE FUNCTION admin_get_all_accounts()
RETURNS TABLE(...) 
SECURITY DEFINER  -- <- Problem!
AS $$
    SELECT * FROM accounts;
END;
$$ LANGUAGE sql;
-- Anyone calling this sees all accounts in all workspaces!
```

**Impact**: RLS completely bypassed for any function with SECURITY DEFINER.

**Fix**: Use SECURITY INVOKER (default) so functions respect RLS.

---

## 10. **Missing Cascading Deletes or Audit Trail**
```sql
-- ❌ INCOMPLETE: If user removed from workspace_members, orphaned records remain
DELETE FROM workspace_members 
WHERE user_id = 'user-456' AND workspace_id = 'ws-123';
-- But this user still has rows in accounts, workspace_roles, etc.
-- They might regain access through bugs or policy errors.
```

**Impact**: Revocation doesn't fully isolate the tenant.

**Fix**: Use foreign keys with ON DELETE CASCADE, plus audit logging.

---

## 11. **Policies Not Updated When Schema Changes**
```sql
-- ❌ RISK: You add a new table but forget RLS
CREATE TABLE workspace_invites (...);
-- Oops, policies were never added!
-- Plus: Existing policies not updated for new join paths.
```

**Impact**: New tables completely exposed; existing policies may not cover new data flows.

**Fix**: Use deployment checklists; add RLS as part of schema-change review.

---

## 12. **Using auth.uid() Without Verifying Workspace Membership**
```sql
-- ❌ INCOMPLETE: auth.uid() proves user identity, not workspace membership
CREATE POLICY "delete_workspace"
ON workspaces
FOR DELETE
USING (auth.uid() = created_by);
-- Problem: created_by might be a user_id from ANOTHER workspace!
-- If user_id is reused across workspaces, this can delete the wrong workspace.
```

**Impact**: Cross-workspace privilege escalation.

**Fix**: Always scope to both user AND workspace:
```sql
CREATE POLICY "delete_workspace"
ON workspaces
FOR DELETE
USING (
    auth.uid() = created_by
    AND id = (auth.jwt()->>'workspace_id')::uuid
);
```

---

## Quick Checklist: Is Your Policy Secure?

- [ ] RLS enabled on the table? (`ALTER TABLE t ENABLE ROW LEVEL SECURITY`)
- [ ] Default-deny? (No `true` clauses, no missing USING)
- [ ] Workspace-scoped? (References `workspace_id` in every policy)
- [ ] USING + WITH CHECK both present on writes? (INSERT, UPDATE, DELETE)
- [ ] Workspace_id derived from JWT, not client? (Not from URL/body param)
- [ ] Status/role checks included? (Not just workspace membership)
- [ ] Indexes on workspace_id? (`CREATE INDEX idx_ws_id ON table(workspace_id)`)
- [ ] Functions use SECURITY INVOKER? (Not SECURITY DEFINER)
- [ ] Tested with multiple workspaces/users?

---

## Why These Bugs Exist

1. **Supabase makes RLS optional** → Easy to forget
2. **JWT claims are custom** → Auth context not automatic
3. **No built-in multi-tenancy pattern** → Each team invents their own
4. **Default-permit mindset** → Many devs add policies that allow, not block
5. **Testing gaps** → Hard to test cross-workspace access without multiple users
6. **Database migrations** → New tables added without RLS awareness

---

## Next Steps
See Phase 2 for production-ready policies and Phase 3 for backend validation patterns.
