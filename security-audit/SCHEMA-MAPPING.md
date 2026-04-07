# 📋 SCHEMA MAPPING GUIDE

Use this file to adapt the production policies to your actual database schema.

---

## Step 1: Identify Your Tables

Run this query to list all your tables:

```sql
SELECT
    tablename,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = t.tablename) as column_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## Step 2: Map Standard Tables to Your Schema

### Find Your Workspace Table

**Standard names**: `workspaces`, `tenants`, `organizations`, `orgs`, `teams`

```bash
# Search your schema
psql -h YOUR_HOST -U postgres -d YOUR_DB -c "
  SELECT tablename FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename ~ '^(workspace|tenant|org|organization|team)s?$';"
```

**Your workspace table**: `________________`

---

### Find Your Workspace Members Table

**Standard names**: `workspace_members`, `workspace_users`, `organization_members`, `team_members`, `user_teams`

```sql
-- Find it by looking for foreign keys to both users and workspace/org tables
SELECT
    table_name,
    column_name
FROM information_schema.columns
WHERE table_schema = 'public'
    AND (column_name LIKE '%workspace%' OR column_name LIKE '%org%')
    AND (column_name LIKE '%member%' OR column_name LIKE '%user%');
```

**Your workspace members table**: `________________`

---

### Find Your User Profiles Table

**Standard names**: `user_profiles`, `users`, `accounts`, `profiles`, `user_accounts`

```sql
-- Find the table with user_id and workspace_id
SELECT
    t.table_name,
    STRING_AGG(c.column_name, ', ')
FROM information_schema.tables t
JOIN information_schema.columns c
    ON t.table_schema = c.table_schema
    AND t.table_name = c.table_name
WHERE t.table_schema = 'public'
    AND c.column_name IN ('user_id', 'workspace_id', 'email')
GROUP BY t.table_name
HAVING COUNT(*) >= 2;
```

**Your user profiles table**: `________________`

---

### Find Child Tables (Posts, Documents, etc.)

**Standard names**: `posts`, `documents`, `tasks`, `projects`, `items`, `entries`

```sql
-- Find tables that reference workspace_id
SELECT
    table_name
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name = 'workspace_id'
    AND table_name NOT IN ('workspaces', 'workspace_members')
ORDER BY table_name;
```

**Your child tables**:
- `________________`
- `________________`
- `________________`

---

## Step 3: Column Mapping

For each table, identify the key columns:

### Workspaces Table

| Column | Your Schema | Example |
|--------|-------------|---------|
| **Primary Key** | `________________` | `id` |
| **Name** | `________________` | `name` |
| **Created By** | `________________` | `created_by` |
| **Created At** | `________________` | `created_at` |

```sql
-- Check your table structure
\d workspaces
```

---

### Workspace Members Table

| Column | Your Schema | Example |
|--------|-------------|---------|
| **Primary Key** | `________________` | `id` |
| **Workspace ID** | `________________` | `workspace_id` |
| **User ID** | `________________` | `user_id` |
| **Role** | `________________` | `role` |
| **Status** | `________________` | `status` |
| **Created At** | `________________` | `created_at` |

```sql
-- Check your table structure
\d workspace_members
```

---

### User Profiles Table

| Column | Your Schema | Example |
|--------|-------------|---------|
| **Primary Key** | `________________` | `id` |
| **User ID** | `________________` | `user_id` |
| **Workspace ID** | `________________` | `workspace_id` |
| **Email** | `________________` | `email` |
| **Display Name** | `________________` | `name` or `display_name` |
| **Settings** | `________________` | `settings` (JSONB) |

---

### Your Child Table Example 1

| Column | Your Schema | Example |
|--------|-------------|---------|
| **Primary Key** | `________________` | `id` |
| **Workspace ID** | `________________` | `workspace_id` |
| **Created By** | `________________` | `created_by` |
| **Title/Content** | `________________` | `title`, `content` |

---

## Step 4: Template Replacement

When copying policies from `04-production-rls-policies.sql`:

### Replace These Placeholders

| Placeholder | Replace With |
|-------------|--------------|
| `workspaces` | **Your workspace table name** |
| `workspace_members` | **Your workspace members table** |
| `user_profiles` | **Your user profiles table** |
| `accounts` | **Your billing/accounts table** |
| `posts` | **Your child table name** |
| `workspace_id` | **Your workspace FK column** |
| `user_id` | **Your user FK column** |
| `created_by` | **Your "created by" column** |
| `role` | **Your role column (if exists)** |
| `status` | **Your status column** |

---

### Example: Converting a Policy to Your Schema

**Original**:
```sql
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
```

**If your tables are named differently** (e.g., `tenants` instead of `workspaces`):
```sql
CREATE POLICY "tenant_read_member_access"
ON tenants                              -- Changed
FOR SELECT
USING (
    id IN (
        SELECT tenant_id                 -- Changed
        FROM tenant_users                -- Changed
        WHERE user_id = auth.uid()
            AND status = 'active'
    )
);
```

---

## Step 5: Test Your Mappings

Before applying policies, verify your table structure matches:

```sql
-- Verify workspace table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'workspaces';
-- Should include: id, name, created_by

-- Verify workspace_members table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'workspace_members';
-- Should include: workspace_id, user_id, role, status

-- Verify foreign key relationships
SELECT
    constraint_name,
    table_name,
    column_name,
    foreign_table_name,
    foreign_column_name
FROM information_schema.referential_constraints
JOIN information_schema.key_column_usage
    ON referential_constraints.constraint_name = key_column_usage.constraint_name
WHERE table_name IN ('workspace_members', 'user_profiles');
```

---

## Step 6: Apply Adapted Policies

Once you've filled in your schema mapping:

1. **Edit `04-production-rls-policies.sql`**:
   - Find & Replace all placeholders with your actual table/column names
   - Use a text editor (VS Code, Sublime) for safe replacements

2. **Or create a new file** with your custom policies:
   ```sql
   -- YOUR_SCHEMA_POLICIES.sql
   -- Copy from 04-production-rls-policies.sql and customize

   ALTER TABLE your_workspace_table ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "your_policy_name"
   ON your_workspace_table
   FOR SELECT
   USING (
       id IN (
           SELECT your_workspace_fk
           FROM your_members_table
           WHERE user_id = auth.uid()
               AND status = 'active'
       )
   );
   ```

3. **Test in development** before applying to production

---

## Common Schema Variations

### Variation 1: Flat Schema (No Separate Members Table)

Some schemas have user roles stored directly in the user_profiles table:

```sql
-- Instead of separate workspace_members table:
-- users table has: user_id, workspace_id, role, status

-- Adapt the policy:
CREATE POLICY "workspace_members_read_active"
ON users  -- Changed
FOR SELECT
USING (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND (
        user_id = auth.uid()
        OR status = 'active'  -- Users can see other active members
    )
);
```

---

### Variation 2: Multiple Role Columns

Some schemas have separate fields for role and permissions:

```sql
-- If your table has: role TEXT, is_admin BOOLEAN, can_delete BOOLEAN

-- Adapt the policy:
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
            AND is_admin = true  -- Changed from: role IN ('admin', 'owner')
    )
)
WITH CHECK (...);
```

---

### Variation 3: Using Organization/Team Instead of Workspace

If your schema uses `organizations` or `teams` instead of `workspaces`:

```sql
-- Replace all references:
-- workspaces → organizations
-- workspace_id → organization_id
-- workspace_members → organization_members

CREATE POLICY "organization_read_member_access"
ON organizations
FOR SELECT
USING (
    id IN (
        SELECT organization_id  -- Changed
        FROM organization_members  -- Changed
        WHERE user_id = auth.uid()
            AND status = 'active'
    )
);
```

---

### Variation 4: Soft Deletes (is_deleted Column)

If your schema uses soft deletes instead of hard deletes:

```sql
-- Adapt the policy to exclude deleted records:
CREATE POLICY "workspace_members_read_active"
ON workspace_members
FOR SELECT
USING (
    workspace_id = (auth.jwt()->>'workspace_id')::uuid
    AND (
        user_id = auth.uid()
        OR (
            auth.uid() IN (
                SELECT user_id
                FROM workspace_members
                WHERE workspace_id = (auth.jwt()->>'workspace_id')::uuid
                    AND status = 'active'
                    AND is_deleted IS FALSE  -- Added
            )
        )
    )
);
```

---

## Step 7: Validation Checklist

After applying your adapted policies:

- [ ] All tables have RLS enabled
- [ ] All policies reference correct table/column names
- [ ] Foreign key constraints still work
- [ ] workspace_id (or equivalent) is indexed
- [ ] auth.uid() works in your auth context
- [ ] auth.jwt()->>'workspace_id' returns a valid UUID
- [ ] Test queries work for same-workspace access
- [ ] Test queries fail for cross-workspace access

---

## Example: Complete Custom Policy Set

Here's a complete example for a custom schema:

```sql
-- YOUR SCHEMA CUSTOMIZATION EXAMPLE
-- Replace these placeholder values:
-- [YOUR_WORKSPACE_TABLE] → actual table name
-- [YOUR_MEMBERS_TABLE] → actual members table
-- [YOUR_WORKSPACE_FK] → your workspace foreign key column name

ALTER TABLE [YOUR_WORKSPACE_TABLE] ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_read"
ON [YOUR_WORKSPACE_TABLE]
FOR SELECT
USING (
    id IN (
        SELECT [YOUR_WORKSPACE_FK]
        FROM [YOUR_MEMBERS_TABLE]
        WHERE user_id = auth.uid()
            AND status = 'active'
    )
);

CREATE POLICY "workspace_update_owner"
ON [YOUR_WORKSPACE_TABLE]
FOR UPDATE
USING (
    owner_id = auth.uid()  -- Adjust based on your column
    AND id = (auth.jwt()->>'workspace_id')::uuid
)
WITH CHECK (
    owner_id = auth.uid()
    AND id = (auth.jwt()->>'workspace_id')::uuid
);

-- Repeat for each table in your schema
```

---

## Need Help?

If your schema doesn't match these patterns:

1. **Check table relationships**:
   ```sql
   -- Find all tables with workspace_id
   SELECT table_name
   FROM information_schema.columns
   WHERE column_name = 'workspace_id'
   ORDER BY table_name;
   ```

2. **Visualize your schema**:
   ```sql
   -- Use pgAdmin or DBeaver to see table relationships
   -- Or export as: pg_dump -s YOUR_DB > schema.sql
   ```

3. **Ask your team**:
   - Who designed the original schema?
   - Are there special tables or naming conventions?
   - Any custom auth flow?

4. **Reach out**:
   - Supabase Discord community
   - Your database team lead
   - Security consultant

---

## Safe Find & Replace Strategy

Using VS Code or similar:

1. **Open `04-production-rls-policies.sql`**
2. **Use Find & Replace** (Ctrl+H):
   - Find: `workspaces`
   - Replace: `your_workspace_table_name`
   - Click "Replace All"
3. **Repeat for each placeholder** (workspace_members, user_profiles, etc.)
4. **Review the changes** before applying
5. **Save as `YOUR_SCHEMA_POLICIES.sql`**

---

## Version Control

Save your custom policies in git:

```bash
# Example structure
git add security-audit/04-production-rls-policies.sql  # Original template
git add security-audit/YOUR_SCHEMA_POLICIES.sql         # Your custom version
git commit -m "Add custom RLS policies for our schema"
```

Then deploy:

```bash
psql -h YOUR_HOST -U postgres -d YOUR_DB \
  -f security-audit/YOUR_SCHEMA_POLICIES.sql
```

---

## Summary

| Step | Action | Result |
|------|--------|--------|
| 1 | Identify your tables | Table name mapping |
| 2 | Map columns | Column reference guide |
| 3 | Verify schema | Confirmed structure |
| 4 | Adapt policies | Custom SQL ready |
| 5 | Test mappings | Verified relationships |
| 6 | Apply policies | RLS deployed |
| 7 | Validate | Policies working |

---

You're ready to deploy once all steps are complete! ✅
