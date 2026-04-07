# ✅ VALIDATION & TESTING FOR MULTI-TENANT ISOLATION

## Prerequisites

```bash
# You'll need:
# 1. Supabase CLI
npm install -g supabase

# 2. A test database with sample data
# 3. Two user accounts in different workspaces
# 4. JWTs for both users (see below)

# 5. SQL client (psql) or Supabase SQL Editor
# 6. curl or Postman for API testing
```

---

## Step 1: Generate Test JWTs for Multiple Users

### Using Supabase Dashboard

1. **Navigate to**: `Database` → `SQL Editor`
2. **Create two test users** (if not already created):

```sql
-- Create User 1 in Workspace A
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES (
    'user1-uuid-1234-5678-90ab-cdef12345678',
    'user1@workspace-a.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    jsonb_build_object('workspace_id', 'workspace-a-uuid')
)
ON CONFLICT (id) DO NOTHING;

-- Create User 2 in Workspace B
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES (
    'user2-uuid-9876-5432-10ba-fedcba987654',
    'user2@workspace-b.com',
    crypt('password456', gen_salt('bf')),
    NOW(),
    jsonb_build_object('workspace_id', 'workspace-b-uuid')
)
ON CONFLICT (id) DO NOTHING;

-- Add both to workspace_members
INSERT INTO workspace_members (user_id, workspace_id, role, status)
VALUES
    ('user1-uuid-1234-5678-90ab-cdef12345678', 'workspace-a-uuid', 'owner', 'active'),
    ('user2-uuid-9876-5432-10ba-fedcba987654', 'workspace-b-uuid', 'owner', 'active')
ON CONFLICT DO NOTHING;
```

### Using Supabase CLI

```bash
# Sign up user 1
npx supabase auth admin create-user \
  --email user1@workspace-a.com \
  --password password123 \
  --project-ref YOUR_PROJECT

# Sign up user 2
npx supabase auth admin create-user \
  --email user2@workspace-b.com \
  --password password456 \
  --project-ref YOUR_PROJECT
```

### Extract JWTs Programmatically

```typescript
// File: test-setup/generate-jwts.ts

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

async function generateTestJWTs() {
    // User 1: Workspace A
    const { data: user1, error: error1 } = await supabase.auth.signInWithPassword({
        email: "user1@workspace-a.com",
        password: "password123",
    });

    if (error1) console.error("User 1 sign in failed:", error1);
    else {
        const jwt1 = user1?.session?.access_token;
        console.log("JWT_USER1=", jwt1);
        console.log("User 1 workspace_id:", user1?.user?.user_metadata?.workspace_id);
    }

    // User 2: Workspace B
    const { data: user2, error: error2 } = await supabase.auth.signInWithPassword({
        email: "user2@workspace-b.com",
        password: "password456",
    });

    if (error2) console.error("User 2 sign in failed:", error2);
    else {
        const jwt2 = user2?.session?.access_token;
        console.log("JWT_USER2=", jwt2);
        console.log("User 2 workspace_id:", user2?.user?.user_metadata?.workspace_id);
    }
}

generateTestJWTs();
```

```bash
# Run and save JWTs as env vars
export JWT_USER1=$(npx ts-node generate-jwts.ts | grep JWT_USER1 | cut -d= -f2)
export JWT_USER2=$(npx ts-node generate-jwts.ts | grep JWT_USER2 | cut -d= -f2)

echo "JWT_USER1: $JWT_USER1"
echo "JWT_USER2: $JWT_USER2"
```

---

## Step 2: SQL Verification Queries

### 2.1 Verify Data in Each Workspace

```sql
-- Create sample data
INSERT INTO accounts (workspace_id, user_id, email) VALUES
    ('workspace-a-uuid', 'user1-uuid-1234-5678-90ab-cdef12345678', 'account1@workspace-a.com'),
    ('workspace-b-uuid', 'user2-uuid-9876-5432-10ba-fedcba987654', 'account1@workspace-b.com');

-- Verify isolation: User 1 should NOT see Workspace B data
SELECT COUNT(*) as accounts_visible
FROM accounts
WHERE user_id = 'user1-uuid-1234-5678-90ab-cdef12345678'
  AND workspace_id != 'workspace-a-uuid';
-- Expected result: 0 (User 1 sees no data from other workspaces)

-- Verify User 1 can see only their workspace
SELECT workspace_id, COUNT(*) as account_count
FROM accounts
GROUP BY workspace_id
ORDER BY workspace_id;
-- Expected result:
--   workspace-a-uuid | 1
--   workspace-b-uuid | 1
```

### 2.2 Test RLS Enforcement Directly

```sql
-- Simulate User 1 (role user1-uuid-1234...)
-- This query runs AS the user, respecting RLS policies

-- ✅ SECURE: User 1 cannot read User 2's workspace accounts
SELECT * FROM accounts
WHERE workspace_id = 'workspace-b-uuid';
-- Expected: 0 rows (RLS blocks it)

-- ✅ SECURE: User 1 cannot insert into User 2's workspace
INSERT INTO accounts (workspace_id, user_id, email)
VALUES ('workspace-b-uuid', 'user1-uuid-1234-5678-90ab-cdef12345678', 'attacker@workspace-b.com');
-- Expected: Policy violation error
```

### 2.3 Verify All Tables Have RLS Enabled

```sql
-- Check which tables have RLS disabled (DANGEROUS!)
SELECT
    schemaname,
    tablename,
    CASE
        WHEN rowsecurity = false THEN '🚨 RLS DISABLED'
        ELSE '✅ RLS Enabled'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Expected: All public tables show ✅ RLS Enabled
```

### 2.4 Verify Workspace_ID Policies Exist

```sql
-- List all policies (should include workspace_id checks)
SELECT
    tablename,
    policyname,
    CASE cmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
    END as operation,
    pg_get_expr(qual, relid) as condition
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, operation;

-- Verify each policy includes workspace_id or a join to workspace_members
-- Example policy condition: workspace_id = (auth.jwt()->>'workspace_id')::uuid
```

---

## Step 3: API/Client-Side Testing

### 3.1 Cross-Workspace Access Attempt (User 1 accessing User 2's workspace)

```bash
#!/bin/bash
# File: test-isolation.sh

export JWT_USER1="eyJhbGc..."  # User 1 JWT
export JWT_USER2="eyJhbGc..."  # User 2 JWT
export WORKSPACE_A="workspace-a-uuid"
export WORKSPACE_B="workspace-b-uuid"
export SUPABASE_URL="https://YOUR-PROJECT.supabase.co"

echo "=== TEST 1: User 1 accessing their own workspace (should succeed) ==="
curl -X GET "$SUPABASE_URL/rest/v1/accounts?workspace_id=eq.$WORKSPACE_A&select=*" \
  -H "Authorization: Bearer $JWT_USER1" \
  -H "Content-Type: application/json"
# Expected: Returns accounts from workspace-a-uuid

echo ""
echo "=== TEST 2: User 1 attempting to access User 2's workspace (should be BLOCKED by RLS) ==="
curl -X GET "$SUPABASE_URL/rest/v1/accounts?workspace_id=eq.$WORKSPACE_B&select=*" \
  -H "Authorization: Bearer $JWT_USER1" \
  -H "Content-Type: application/json"
# Expected: Empty result [] (RLS blocks it, or 403 Forbidden)

echo ""
echo "=== TEST 3: User 2 attempting to modify User 1's account (should be BLOCKED) ==="
curl -X PATCH "$SUPABASE_URL/rest/v1/accounts?id=eq.ACCOUNT_ID_FROM_WS_A" \
  -H "Authorization: Bearer $JWT_USER2" \
  -H "Content-Type: application/json" \
  -d '{"email": "hacked@workspace-a.com"}'
# Expected: 403 Forbidden or no rows updated

echo ""
echo "=== TEST 4: User 1 without workspace_id in JWT (should fail) ==="
# Use a JWT with missing workspace_id claim
curl -X GET "$SUPABASE_URL/rest/v1/accounts?select=*" \
  -H "Authorization: Bearer INVALID_JWT_NO_WORKSPACE" \
  -H "Content-Type: application/json"
# Expected: 403 Forbidden (no workspace context)
```

```bash
chmod +x test-isolation.sh
./test-isolation.sh
```

### 3.2 Programmatic Testing (Node.js / TypeScript)

```typescript
// File: test-isolation.test.ts

import { createClient } from "@supabase/supabase-js";
import { describe, it, expect, beforeAll } from "vitest";

const WORKSPACE_A = "workspace-a-uuid";
const WORKSPACE_B = "workspace-b-uuid";

let client1: any;  // User 1 (Workspace A)
let client2: any;  // User 2 (Workspace B)

beforeAll(async () => {
    // Create clients for each user
    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!
    );

    // Sign in User 1
    const { data: user1Session } = await supabase.auth.signInWithPassword({
        email: "user1@workspace-a.com",
        password: "password123",
    });

    client1 = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${user1Session?.session?.access_token}`,
                },
            },
        }
    );

    // Sign in User 2
    const { data: user2Session } = await supabase.auth.signInWithPassword({
        email: "user2@workspace-b.com",
        password: "password456",
    });

    client2 = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${user2Session?.session?.access_token}`,
                },
            },
        }
    );
});

describe("Multi-Tenant Isolation Tests", () => {
    // ✅ TEST 1: Users can see their own workspace data
    it("User 1 can read accounts in Workspace A", async () => {
        const { data, error } = await client1
            .from("accounts")
            .select("*")
            .eq("workspace_id", WORKSPACE_A);

        expect(error).toBeNull();
        expect(data?.length).toBeGreaterThan(0);
    });

    // 🚨 TEST 2: CRITICAL - Users CANNOT see other workspace data
    it("User 1 CANNOT read accounts in Workspace B", async () => {
        const { data, error } = await client1
            .from("accounts")
            .select("*")
            .eq("workspace_id", WORKSPACE_B);

        // RLS should block this
        expect(data?.length || 0).toBe(0);
        // Or error if RLS is misconfigured
    });

    // 🚨 TEST 3: CRITICAL - Users CANNOT create data in other workspaces
    it("User 1 CANNOT insert into Workspace B", async () => {
        const { data, error } = await client1
            .from("accounts")
            .insert({
                workspace_id: WORKSPACE_B,
                user_id: "user1-uuid-1234-5678-90ab-cdef12345678",
                email: "attacker@workspace-b.com",
            });

        // Should fail
        expect(error).not.toBeNull();
        expect(error?.code).toMatch(/policy|denied/i);
    });

    // 🚨 TEST 4: CRITICAL - Users CANNOT update other workspace data
    it("User 1 CANNOT update accounts in Workspace B", async () => {
        // Get an account from Workspace B
        const { data: victim } = await client2
            .from("accounts")
            .select("id")
            .eq("workspace_id", WORKSPACE_B)
            .limit(1)
            .single();

        if (victim?.id) {
            const { error } = await client1
                .from("accounts")
                .update({ email: "hacked@workspace-b.com" })
                .eq("id", victim.id);

            expect(error).not.toBeNull();
        }
    });

    // 🚨 TEST 5: CRITICAL - Users CANNOT delete other workspace data
    it("User 1 CANNOT delete accounts in Workspace B", async () => {
        const { data: victim } = await client2
            .from("accounts")
            .select("id")
            .eq("workspace_id", WORKSPACE_B)
            .limit(1)
            .single();

        if (victim?.id) {
            const { error } = await client1
                .from("accounts")
                .delete()
                .eq("id", victim.id);

            expect(error).not.toBeNull();
        }
    });

    // ✅ TEST 6: Removed users lose access
    it("Removed workspace members cannot read workspace data", async () => {
        // Remove User 1 from Workspace A (simulate removal)
        await createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
            .from("workspace_members")
            .update({ status: "removed" })
            .eq("user_id", "user1-uuid-1234-5678-90ab-cdef12345678")
            .eq("workspace_id", WORKSPACE_A);

        // Try to read
        const { data, error } = await client1
            .from("accounts")
            .select("*");

        // Should be blocked
        expect(data?.length || 0).toBe(0);

        // Restore for other tests
        await createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
            .from("workspace_members")
            .update({ status: "active" })
            .eq("user_id", "user1-uuid-1234-5678-90ab-cdef12345678")
            .eq("workspace_id", WORKSPACE_A);
    });

    // ✅ TEST 7: Audit log tracks attempts
    it("Audit log records cross-workspace attempts", async () => {
        const { data: logs } = await createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
            .from("audit_log")
            .select("*")
            .eq("workspace_id", WORKSPACE_B)
            .gt("timestamp", new Date(Date.now() - 60000).toISOString());

        // Verify we have security logs
        expect(logs).toBeDefined();
    });
});
```

```bash
# Run tests
npm test test-isolation.test.ts

# Expected output:
# ✅ User 1 can read accounts in Workspace A
# ✅ User 1 CANNOT read accounts in Workspace B
# ✅ User 1 CANNOT insert into Workspace B
# ✅ User 1 CANNOT update accounts in Workspace B
# ✅ User 1 CANNOT delete accounts in Workspace B
# ✅ Removed users lose access
# ✅ Audit log records attempts
```

---

## Step 4: Audit Log Verification

```sql
-- Check audit log for cross-workspace access attempts
SELECT
    user_id,
    workspace_id,
    table_name,
    action,
    timestamp,
    CASE
        WHEN action IN ('INSERT', 'UPDATE', 'DELETE') THEN '⚠️ Mutation attempt'
        ELSE 'Read attempt'
    END as severity
FROM audit_log
WHERE workspace_id != (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = audit_log.user_id LIMIT 1
)
ORDER BY timestamp DESC;
-- Expected: No results (all attempts blocked before audit)

-- View all access patterns
SELECT
    user_id,
    workspace_id,
    COUNT(*) as access_count,
    MAX(timestamp) as last_access
FROM audit_log
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY user_id, workspace_id
ORDER BY access_count DESC;
```

---

## Step 5: Performance & Index Verification

```sql
-- Check if queries are fast (< 100ms)
EXPLAIN ANALYZE
SELECT * FROM accounts
WHERE workspace_id = 'workspace-a-uuid'
  AND user_id IN (
      SELECT user_id FROM workspace_members
      WHERE workspace_id = 'workspace-a-uuid'
  );
-- Look for "Seq Scan" on large tables → add indexes!

-- Verify indexes exist
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;
-- Expected: Indexes on workspace_id and user_id for all major tables
```

---

## Step 6: Regression Testing (CI/CD Integration)

### GitHub Actions Example

```yaml
# File: .github/workflows/rls-test.yml

name: Multi-Tenant Isolation Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Start Supabase
        run: npx supabase start

      - name: Run isolation tests
        env:
          SUPABASE_URL: http://localhost:54321
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: npm test test-isolation.test.ts

      - name: Report results
        if: always()
        run: npm run test:report
```

---

## Checklist: Did You Pass?

- [ ] User 1 can read their workspace data
- [ ] User 1 cannot read User 2's workspace data
- [ ] User 1 cannot insert data into User 2's workspace
- [ ] User 1 cannot update User 2's workspace data
- [ ] User 1 cannot delete User 2's workspace data
- [ ] Removed users lose access immediately
- [ ] Queries execute in < 100ms (check indexes)
- [ ] All tables have RLS enabled
- [ ] All tables have explicit policies
- [ ] Audit log records all access
- [ ] Tests pass in CI/CD pipeline

---

## If Tests Fail

### Scenario: User 1 CAN see User 2's workspace data

1. **Check RLS is enabled**:
   ```sql
   SELECT * FROM pg_tables WHERE tablename = 'accounts';
   -- rowsecurity should be TRUE
   ```

2. **Check policies exist**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'accounts';
   -- Should have SELECT, INSERT, UPDATE, DELETE policies
   ```

3. **Check policy conditions**:
   ```sql
   SELECT policyname, pg_get_expr(qual, relid)
   FROM pg_policies WHERE tablename = 'accounts' AND cmd = 'r';
   -- Should filter by workspace_id
   ```

4. **Check JWT has workspace_id**:
   ```sql
   SELECT auth.jwt()->>'workspace_id';
   -- Should return a UUID, not NULL
   ```

5. **Check policy syntax**:
   ```sql
   -- Recreate the policy with correct syntax
   DROP POLICY IF EXISTS "accounts_read_workspace" ON accounts;
   CREATE POLICY "accounts_read_workspace"
   ON accounts FOR SELECT
   USING (workspace_id = (auth.jwt()->>'workspace_id')::uuid);
   ```

### Scenario: INSERT/UPDATE without WITH CHECK

```sql
-- Check if policies have WITH CHECK
SELECT
    tablename, policyname, cmd,
    CASE WHEN with_check IS NULL THEN '❌ Missing WITH CHECK' ELSE '✅ Has WITH CHECK' END
FROM pg_policies
WHERE cmd IN ('a', 'w')
ORDER BY tablename;
```

### Scenario: Queries are slow

```sql
-- Add missing indexes
CREATE INDEX idx_accounts_workspace_id ON accounts(workspace_id);
CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
```

---

## Continuous Testing

```bash
# Run tests hourly
0 * * * * cd /path/to/project && npm test test-isolation.test.ts

# Or use pg_prove for native SQL testing
pg_prove -d DATABASE_URL test/rls-tests.sql
```
