# 🔐 SUPABASE JWT & AUTH CONTEXT SECURITY GUIDE

## Understanding JWT Claims & Session Context

### Supabase Default JWT Structure
```json
{
  "sub": "123e4567-e89b-12d3-a456-426614174000",  // auth.uid() - user UUID
  "email": "user@example.com",
  "email_verified": false,
  "phone_verified": false,
  "app_metadata": {
    "provider": "email",
    "providers": ["email"]
  },
  "user_metadata": {},                              // Custom data you set
  "iss": "https://YOUR-PROJECT.supabase.co/auth/v1",
  "aud": "authenticated",
  "iat": 1234567890,
  "exp": 1234571490,
  "urn:zitadel:iam:org:project:roles": {}
}
```

**The Problem**: No `workspace_id` claim by default!

---

## Solution 1: Store Workspace Context in JWT user_metadata

### Step 1: When User Logs In, Add Workspace Context

**Backend Function** (Supabase Edge Function, Auth Trigger, or your API):
```typescript
// File: supabase/functions/verify-workspace-and-set-jwt/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { 
    auth: { autoRefreshToken: false, persistSession: false } 
  }
);

export default async (req: Request) => {
  try {
    const { user } = await req.json();
    const userId = user.id;

    // Find the first active workspace for this user
    const { data: workspaceMember } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!workspaceMember) {
      throw new Error("User not a member of any workspace");
    }

    // Update auth.users user_metadata with workspace context
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        workspace_id: workspaceMember.workspace_id,
      },
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, workspace_id: workspaceMember.workspace_id }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
};
```

### Step 2: Configure JWT with Custom Claims

**Supabase Dashboard Settings** → Authentication → JWT:
```json
{
  "sub": "uid",
  "email": "email",
  "workspace_id": "user_metadata.workspace_id"
}
```

Now your JWT will include:
```json
{
  "sub": "user-123",
  "email": "user@example.com",
  "workspace_id": "workspace-uuid-abc123",  // ✅ Custom claim!
  "iat": 1234567890,
  "exp": 1234571490
}
```

**Retrieve in SQL**:
```sql
-- Access the custom claim in RLS policies
SELECT auth.jwt()->>'workspace_id'::uuid AS workspace_id;

-- Or use auth.uid() to get user_id
SELECT auth.uid() AS user_id;
```

---

## Solution 2: Fetch Workspace Dynamically (Fallback Pattern)

If you cannot or don't want to embed workspace_id in the JWT, fetch it at query time:

```sql
-- Helper function: Get current user's active workspace
CREATE FUNCTION current_workspace_id()
RETURNS UUID AS $$
  SELECT workspace_id
  FROM workspace_members
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Use in policies:
CREATE POLICY "read_accounts"
ON accounts
FOR SELECT
USING (workspace_id = current_workspace_id());
```

**Pros**: Dynamic, handles workspace switching.
**Cons**: Slower (extra DB lookups in every RLS check); use with caching.

---

## Solution 3: Store Workspace in request.headers (Edge Functions Only)

For **Supabase Edge Functions**, you can validate workspace server-side:

```typescript
// File: supabase/functions/get-accounts/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  const workspaceIdHeader = req.headers.get("X-Workspace-ID");

  // Create client with auth token
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // ⚠️ CRITICAL: Validate workspace_id from header against JWT
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Verify user is a member of the workspace they're requesting
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceIdHeader)
    .eq("status", "active")
    .single();

  if (!membership) {
    return new Response("Workspace not accessible", { status: 403 });
  }

  // ✅ Now safe to query workspace data
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("workspace_id", workspaceIdHeader);  // Derived from validated header

  return new Response(JSON.stringify(accounts), { status: 200 });
};
```

---

## Best Practices: JWT vs. Dynamic Lookup

| Approach | Pros | Cons | Use When |
|----------|------|------|----------|
| **JWT user_metadata** | Fast (no extra DB call), explicit context | Stale if workspace changes mid-session | Single workspace per user OR acceptable delay for switching |
| **Dynamic lookup (function)** | Real-time, handles workspace switching | Slower (extra query per RLS check) | User needs to switch workspaces mid-session |
| **Header validation** | Explicit, testable, audit-friendly | Requires custom server-side validation | Edge Functions / API layer only |
| **Hybrid** | Best of both | More complex | JWT for read performance, validate on writes |

---

## Implementation: Add workspace_id to auth.users

### Option A: Use Supabase Admin API (One-time or on signup)

```bash
curl -X PUT "https://YOUR-PROJECT.supabase.co/auth/v1/admin/users/USER-UUID" \
  -H "Authorization: Bearer YOUR-SERVICE-ROLE-KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_metadata": {
      "workspace_id": "WORKSPACE-UUID"
    }
  }'
```

### Option B: SQL Trigger (Automatic on signup)

```sql
-- Create trigger that sets workspace_id on user creation
CREATE OR REPLACE FUNCTION set_default_workspace()
RETURNS TRIGGER AS $$
BEGIN
  -- Find the user's first workspace
  DECLARE
    v_workspace_id UUID;
  BEGIN
    SELECT workspace_id INTO v_workspace_id
    FROM workspace_members
    WHERE user_id = NEW.id
      AND status = 'active'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_workspace_id IS NOT NULL THEN
      NEW.raw_user_meta_data := jsonb_set(
        COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
        '{workspace_id}',
        to_jsonb(v_workspace_id::text)
      );
    END IF;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION set_default_workspace();
```

### Option C: Auth Hook (Supabase OAuth/Post-signup)

In **Supabase Dashboard** → Functions → Create a new function:

```typescript
// File: supabase/functions/custom-access-token-hook/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async (req: Request) => {
  const { user } = await req.json();

  // Fetch user's primary workspace
  const { data: workspace } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  return new Response(
    JSON.stringify({
      claims: {
        workspace_id: workspace?.workspace_id || null,
      },
    }),
    { status: 200 }
  );
};
```

Then in **Supabase Dashboard** → Database → Webhooks, set Custom Access Token Hook to call this function.

---

## Validation: Check Your JWT Claims

### In Browser (Client-side)
```typescript
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function CheckJWT() {
  useEffect(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Full JWT:', session?.access_token);

    // Decode manually (don't trust client-side, just for debugging)
    const payload = JSON.parse(
      atob(session?.access_token.split('.')[1])
    );
    console.log('Claims:', payload);
    console.log('Workspace ID:', payload.workspace_id);
  }, []);

  return null;
}
```

### In PostgreSQL (Server-side)
```sql
-- Run this query to verify your JWT has workspace_id
SELECT
  auth.jwt()->>'sub' as user_id,
  auth.jwt()->>'email' as email,
  auth.jwt()->>'workspace_id' as workspace_id,
  auth.jwt() as full_jwt;
```

### In Edge Function (Server-side)
```typescript
// Decode JWT manually
function decodeJWT(token: string) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload;
}

const authHeader = req.headers.get("Authorization");
const token = authHeader?.split(" ")[1];
const claims = decodeJWT(token);
console.log("Workspace ID:", claims.workspace_id);
```

---

## Summary

1. **Add workspace_id to JWT claims** via auth.users user_metadata or custom auth hooks
2. **Use auth.jwt()->>'workspace_id'** in RLS policies to reference it
3. **Always validate on the server** before trusting client-provided workspace context
4. **Test with multiple JWTs** to ensure isolation (see Phase 4)

This ensures every database query is scoped to the correct workspace at the PostgreSQL level.
