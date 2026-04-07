# 🏗️ MULTI-TENANT SUPABASE ARCHITECTURE & BEST PRACTICES

---

## Decision: Single Database vs. Schema-Per-Tenant vs. Database-Per-Tenant

### Option 1: Single Database, All Tenants (Recommended for <100k users)

```
Database: onelinker_production
├── public schema
│   ├── workspaces (id, name, ...)
│   ├── workspace_members (workspace_id, user_id, ...)
│   ├── accounts (workspace_id, ...)
│   └── ... (all tenant data, RLS-protected)
```

**Pros**:
- Simplest to operate
- Easy RLS enforcement
- Shared backup/restore
- Cost-effective

**Cons**:
- Single point of failure (all tenants affected by outage)
- All tenants share compute resources
- Slower performance at very large scale

**RLS Pattern**:
```sql
-- All tables add workspace_id column
ALTER TABLE accounts ADD COLUMN workspace_id UUID REFERENCES workspaces;

-- All policies filter by workspace_id
CREATE POLICY "read_workspace_scope"
ON accounts FOR SELECT
USING (workspace_id = (auth.jwt()->>'workspace_id')::uuid);
```

**✅ Use this approach if**:
- < 100k workspace records
- Acceptable single-tenant query latency
- Acceptable risk of shared outage

---

### Option 2: Schema-Per-Tenant (Medium isolation)

```
Database: onelinker_production
├── auth schema (shared)
│   └── users
├── workspace_a schema
│   ├── accounts
│   ├── workspace_settings
│   └── audit_log
├── workspace_b schema
│   ├── accounts
│   ├── workspace_settings
│   └── audit_log
└── ... (one schema per workspace)
```

**Pros**:
- Better isolation (schema boundary)
- Schema-level backups
- Per-tenant customization
- Performance isolation

**Cons**:
- Operational complexity (schema creation per tenant)
- Migration challenges (apply to 1000s of schemas)
- Higher compute cost
- Complex queries across tenants

**Implementation**:
```sql
-- Dynamic schema creation per workspace
CREATE FUNCTION create_workspace_schema(workspace_id UUID)
RETURNS void AS $$
DECLARE
    v_schema_name TEXT := 'ws_' || replace(workspace_id::text, '-', '_');
BEGIN
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', v_schema_name);
    
    EXECUTE format('CREATE TABLE %I.accounts (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        email TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    )', v_schema_name);

    EXECUTE format('ALTER TABLE %I.accounts ENABLE ROW LEVEL SECURITY', v_schema_name);
    
    -- Still need RLS, but simpler (no workspace_id check)
    EXECUTE format('CREATE POLICY read_own ON %I.accounts
        FOR SELECT USING (user_id = auth.uid())', v_schema_name);
END;
$$ LANGUAGE plpgsql;

-- Trigger on workspace creation
CREATE TRIGGER on_workspace_created
AFTER INSERT ON workspaces
FOR EACH ROW
EXECUTE FUNCTION create_workspace_schema(NEW.id);
```

**✅ Use this approach if**:
- 100k - 10M workspace records
- Need performance isolation
- Can handle operational complexity

---

### Option 3: Database-Per-Tenant (Maximum isolation, highest cost)

```
Databases:
├── onelinker_auth (shared, central auth)
├── workspace_a_prod (isolated)
├── workspace_b_prod (isolated)
└── workspace_c_prod (isolated)
```

**Pros**:
- Complete isolation
- Zero blast radius
- Per-tenant backups/restore
- Per-tenant scaling

**Cons**:
- Highest cost (1 database per tenant)
- Operational nightmare (manage 1000s of databases)
- Zero shared queries (must route by tenant)
- Auth must be external (Supabase Auth)

**✅ Use this approach if**:
- Enterprise customers with compliance requirements
- Complete isolation mandatory
- Willing to pay 10x+ infrastructure cost

---

## Decision Matrix

| Requirement | Single DB | Schema-Per-Tenant | DB-Per-Tenant |
|-------------|-----------|-------------------|---------------|
| **Isolation** | RLS policy | Schema boundary | Database boundary |
| **Scalability** | Good (RLS is fast) | Very good | Perfect |
| **Cost** | Lowest | Medium | Highest |
| **Operational** | Simplest | Complex | Very complex |
| **Data Leaks** | High risk (single RLS bug) | Medium risk | Very low risk |
| **Backups** | 1 backup | Per-schema backups | Per-database backups |
| **Recommended** | Most projects | Large SaaS | Enterprise only |

---

## JWT Claims Security

### Safe: Static Workspace ID (Single Workspace Per User)

```json
{
  "sub": "user-123",
  "email": "user@example.com",
  "workspace_id": "workspace-abc",  // ✅ Single workspace
  "iat": 1234567890,
  "exp": 1234571490
}
```

**Good for**: Single-workspace-per-user products (Slack, Figma workspaces)

```sql
-- RLS can safely reference workspace_id claim
CREATE POLICY "read_accounts"
ON accounts FOR SELECT
USING (workspace_id = (auth.jwt()->>'workspace_id')::uuid);
```

### Risky: Multiple Workspaces in JWT

```json
{
  "sub": "user-123",
  "email": "user@example.com",
  "workspace_ids": ["workspace-abc", "workspace-def"],  // ⚠️ Multiple workspaces
  "iat": 1234567890,
  "exp": 1234571490
}
```

**Problem**: How does RLS know which workspace the user is accessing?

**Solution**: Use a session-switching mechanism:

```typescript
// Client-side: Switch workspace context
async function switchWorkspace(workspaceId: string) {
    // 1. Verify user is member of workspace
    const { data: membership } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .single();

    if (!membership) throw new Error("Not a member");

    // 2. Store active workspace (client-side only)
    localStorage.setItem("active_workspace_id", workspaceId);

    // 3. Send in every request header
    // API validates: header workspace_id must match JWT's allowed workspaces
}
```

### Defensive: Validate JWT on Server

```typescript
// Express middleware: Validate JWT claims
function validateJWT(req: express.Request, res: express.Response, next: express.NextFunction) {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.decode(token) as any;

    // ✅ Verify workspace_id is not NULL
    if (!decoded?.workspace_id) {
        return res.status(403).json({ error: "No workspace context" });
    }

    // ✅ Verify workspace_id is a valid UUID (not attacker-controlled string)
    if (!/^[0-9a-f-]{36}$/i.test(decoded.workspace_id)) {
        return res.status(403).json({ error: "Invalid workspace_id format" });
    }

    // ✅ Verify user is active member
    // (done in backend safeguards, Phase 3)

    req.user = decoded;
    next();
}
```

---

## Row-Level vs. Application-Level Filtering

### ❌ DANGEROUS: Application-Level Only
```typescript
// Client fetches all data, filters in app
async function getAccounts() {
    const { data: allAccounts } = await supabase
        .from("accounts")
        .select("*");  // ❌ No workspace filter!

    // Filter in JavaScript
    const myAccounts = allAccounts.filter(
        (a) => a.workspace_id === currentWorkspace
    );

    return myAccounts;
}
// Problem: If filter is removed or bypassed, all accounts are exposed!
```

### ✅ CORRECT: RLS + Application Validation

```typescript
// 1. Database enforces RLS (primary)
// accounts_read_workspace policy filters at DB level

// 2. API validates workspace context
async function getAccounts() {
    const workspaceId = await validateWorkspaceAccess();
    
    const { data } = await supabase
        .from("accounts")
        .select("*")
        .eq("workspace_id", workspaceId);  // ✅ Double-check
    
    return data;
}

// 3. Application uses the data safely
// (no additional filtering needed; RLS already enforced)
```

**Defense-in-Depth**:
1. RLS blocks at database
2. API validates before query
3. Application assumes data is safe

---

## Audit Logging Strategy

### What to Log

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event metadata
    event_type TEXT,  -- SELECT, INSERT, UPDATE, DELETE, AUTH, PERMISSION_DENIED
    timestamp TIMESTAMP DEFAULT NOW(),
    
    -- Context
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    user_email TEXT,  -- For accountability
    
    -- Database changes
    table_name TEXT,
    record_id UUID,
    action TEXT,  -- INSERT, UPDATE, DELETE
    old_values JSONB,  -- Before update
    new_values JSONB,  -- After update
    
    -- Security
    ip_address INET DEFAULT inet_client_addr(),
    user_agent TEXT,
    
    -- Compliance
    is_permitted BOOLEAN,  -- Did RLS allow or block?
    policy_violation TEXT  -- If blocked, which policy?
);

-- Index for fast compliance queries
CREATE INDEX idx_audit_workspace_time ON audit_log(workspace_id, timestamp DESC);
CREATE INDEX idx_audit_user_time ON audit_log(user_id, timestamp DESC);
```

### Log Permission Denials

```sql
-- Create trigger to log RLS denials
CREATE FUNCTION log_policy_violation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        workspace_id, user_id, table_name, record_id, 
        action, is_permitted, policy_violation
    ) VALUES (
        NEW.workspace_id,
        auth.uid(),
        TG_TABLE_NAME,
        NEW.id,
        TG_OP,
        false,
        'RLS policy denied access'
    );
    RAISE EXCEPTION 'RLS policy violation';
END;
$$ LANGUAGE plpgsql;

-- This won't work directly (RLS denials happen at PostgreSQL level)
-- Instead, log in application layer (see Phase 3: Backend Safeguards)
```

### Log at Application Layer (Better)

```typescript
// Express middleware: Log all database access
async function logDatabaseAccess(req, res, next) {
    const startTime = Date.now();
    
    // Wrap supabase calls
    const originalFrom = supabase.from;
    supabase.from = function(table) {
        const query = originalFrom.call(this, table);
        const originalSelect = query.select;
        
        query.select = async function(...args) {
            try {
                const result = await originalSelect.apply(this, args);
                
                // Log successful access
                await supabase.from("audit_log").insert({
                    workspace_id: req.user?.workspace_id,
                    user_id: req.user?.id,
                    table_name: table,
                    action: "SELECT",
                    is_permitted: true,
                    timestamp: new Date(),
                });
                
                return result;
            } catch (error) {
                // Log denied access
                await supabase.from("audit_log").insert({
                    workspace_id: req.user?.workspace_id,
                    user_id: req.user?.id,
                    table_name: table,
                    action: "SELECT",
                    is_permitted: false,
                    policy_violation: error.message,
                    timestamp: new Date(),
                });
                throw error;
            }
        };
        
        return query;
    };
    
    next();
}
```

### Compliance Queries

```sql
-- Who accessed workspace X in the last 30 days?
SELECT DISTINCT user_email, COUNT(*) as access_count
FROM audit_log
WHERE workspace_id = 'workspace-abc'
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY user_email
ORDER BY access_count DESC;

-- Were there any permission denials?
SELECT * FROM audit_log
WHERE is_permitted = false
AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- What did user X modify?
SELECT * FROM audit_log
WHERE user_id = 'user-123'
  AND action IN ('INSERT', 'UPDATE', 'DELETE')
  AND timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
```

---

## Critical Supabase Configuration Flags

### Database Settings

```sql
-- ENABLE RLS (non-negotiable)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Set statement timeout to prevent slow queries blocking isolation
ALTER DATABASE onelinker_production SET statement_timeout = '30s';

-- Enable query logging (audit trail)
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries > 1 second

-- Restrict DDL to schema owner (prevent accidental schema changes)
REVOKE ALL ON SCHEMA public FROM public;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Restrict table creation
ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA public
GRANT SELECT ON TABLES TO authenticated;
```

### Supabase Auth Configuration

```bash
# In supabase/config.toml or Dashboard → Authentication

# CRITICAL: Enable JWT verification
jwt_secret = "YOUR-JWT-SECRET"

# Expire JWTs regularly (force re-auth)
jwt_exp = 3600  # 1 hour

# Enable MFA (optional but recommended)
mfa_enabled = true

# Set secure password policies
password_min_length = 12
password_require_numbers = true
password_require_symbols = true
password_require_uppercase = true
```

### PostgREST Settings

```
# supabase/config.toml
[postgrest]
db_anon_role = "anon"  # Restricted role for public access
db_pre_request = "auth"  # Run auth functions first
max_rows = 1000  # Prevent bulk data extraction
```

---

## Security Hardening Checklist

- [ ] **Database**
  - [ ] All tables have RLS enabled
  - [ ] All tables have explicit policies (no true clauses)
  - [ ] All policies include workspace_id checks
  - [ ] workspace_id columns are indexed
  - [ ] Audit logging enabled
  - [ ] Read-only replicas for analytics (separate access control)

- [ ] **Auth**
  - [ ] JWT includes workspace_id claim
  - [ ] JWT verified on every API call
  - [ ] JWT expires regularly (< 1 hour)
  - [ ] Refresh tokens stored securely (HttpOnly cookies)
  - [ ] MFA enabled for sensitive operations

- [ ] **API**
  - [ ] Workspace_id derived from JWT, never client parameters
  - [ ] Membership validated before data access
  - [ ] Rate limiting per workspace (prevent DoS)
  - [ ] All requests logged to audit_log
  - [ ] Errors don't leak workspace names or IDs

- [ ] **Application**
  - [ ] No database credentials in client code
  - [ ] No SERVICE_ROLE_KEY exposed to browser
  - [ ] Workspace context passed in request, not global state
  - [ ] Tests verify cross-workspace access is blocked
  - [ ] Monitoring alerts on RLS policy violations

- [ ] **Operations**
  - [ ] Regular backup/restore tests (verify isolation in backups)
  - [ ] Disaster recovery plan (restore single workspace without others)
  - [ ] Penetration testing against RLS policies
  - [ ] Quarterly security audit of audit_log
  - [ ] Incident response plan for data breach

---

## Monitoring & Alerts

### Supabase Metrics to Monitor

```bash
# Monitor in Supabase Dashboard → Monitoring

1. RLS Policy Violations
   - Alert if 403 Forbidden errors spike
   - Could indicate attack or misconfiguration

2. Slow Queries
   - RLS checks on unindexed columns slow down
   - Alert if avg query time > 1s

3. Disk Usage
   - Audit log grows; prune old entries
   - Monitor per-workspace data growth

4. Auth Failures
   - Spike in failed logins = possible attack
   - Monitor from same IP

5. Failed INSERT/UPDATE/DELETE
   - Could indicate users hitting RLS policies
   - Check audit_log for details
```

### Example Alert (Prometheus/Datadog)

```yaml
# Alert: RLS policy violation spike
alert: RLSPolicyViolations
expr: |
  rate(audit_log_policy_violations_total[5m]) > 10
for: 5m
annotations:
  summary: "High number of RLS violations in {{ $labels.workspace_id }}"
  description: "{{ $value }} violations per second"
```

---

## Summary: Choose Your Architecture

| Aspect | Single DB | Schema-Per-Tenant | DB-Per-Tenant |
|--------|-----------|-------------------|---------------|
| **Recommended** | 90% of projects | Large scale | Enterprise only |
| **Primary Security** | RLS policies | RLS + schema | Database isolation |
| **Cost per tenant** | Lowest | Low-medium | Highest |
| **Time to breach** | Via single RLS bug | Via schema permissions | Via DB credentials |
| **Recoverability** | Whole-DB restore | Per-schema restore | Per-DB restore |

**Most teams should use: Single Database + Strong RLS + Audit Logging**

This provides:
- ✅ Strong isolation (RLS enforced by PostgreSQL)
- ✅ Reasonable cost
- ✅ Simple operations
- ✅ Good performance (no cross-schema queries)

Add schema-per-tenant only when you:
- Have 1M+ workspace records
- Need performance isolation
- Have ops team ready for complexity
