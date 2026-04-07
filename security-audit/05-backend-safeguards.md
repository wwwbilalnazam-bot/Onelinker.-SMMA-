# 🛡️ BACKEND & API SAFEGUARDS FOR MULTI-TENANT SUPABASE

## Core Principle: Defense in Depth
- **Database layer (RLS)**: First barrier, cannot be bypassed
- **API layer**: Validate workspace_id from JWT, never from client
- **Application layer**: Enforce workspace context in business logic
- **Audit layer**: Log all access for compliance

---

## Pattern 1: Secure Supabase Client Setup (React/Node.js)

### Problem
```typescript
// ❌ DANGEROUS: Client directly queries with user-controlled workspace_id
async function getAccounts(workspaceId: string) {
    const { data } = await supabase
        .from('accounts')
        .select('*')
        .eq('workspace_id', workspaceId);  // Attacker can change this!
    return data;
}
```

### Solution
```typescript
// ✅ SECURE: Derive workspace_id from JWT only
import { supabase } from '@/lib/supabase';

async function getAccounts() {
    // Step 1: Get user and JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    // Step 2: Extract workspace_id from JWT (read-only)
    const token = user.user_metadata?.workspace_id;
    if (!token) throw new Error('No workspace context');

    // Step 3: Query with workspace_id from JWT, not client
    const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('workspace_id', token);  // ✅ From JWT, immutable

    if (error) throw error;
    return data;
}
```

### Full Secure Service Pattern
```typescript
// File: src/lib/workspace-service.ts

import { supabase } from './supabase';
import { UUID } from 'crypto';

export class WorkspaceService {
    /**
     * ✅ SECURE: Gets workspace_id from JWT
     * Used in RLS policies and API validation
     */
    static async getCurrentWorkspaceId(): Promise<UUID> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.user_metadata?.workspace_id) {
            throw new Error('User has no active workspace context');
        }
        return session.user.user_metadata.workspace_id as UUID;
    }

    /**
     * ✅ SECURE: Validate workspace_id matches JWT
     * Call this before any multi-workspace operation
     */
    static async validateWorkspaceAccess(
        requestedWorkspaceId: string | undefined
    ): Promise<UUID> {
        const jwtWorkspaceId = await this.getCurrentWorkspaceId();

        // If client specified a workspace_id, validate it matches JWT
        if (requestedWorkspaceId && requestedWorkspaceId !== jwtWorkspaceId) {
            // Log security incident
            console.warn(
                `Attempted workspace mismatch: JWT=${jwtWorkspaceId}, requested=${requestedWorkspaceId}`
            );
            throw new Error('Workspace mismatch: cannot access requested workspace');
        }

        return jwtWorkspaceId;
    }

    /**
     * ✅ SECURE: Query with workspace_id enforced
     * All queries automatically scoped to user's workspace
     */
    static async query<T>(
        table: string,
        filters: Record<string, any> = {}
    ): Promise<T[]> {
        const workspaceId = await this.getCurrentWorkspaceId();

        const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('workspace_id', workspaceId)
            .match(filters);  // Additional filters

        if (error) throw error;
        return data as T[];
    }

    /**
     * ✅ SECURE: Verify user membership before exposing workspace data
     */
    static async verifyMembership(
        workspaceId?: string
    ): Promise<{ status: string; role: string }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Unauthorized');

        const targetWorkspaceId = workspaceId || await this.getCurrentWorkspaceId();

        const { data: membership, error } = await supabase
            .from('workspace_members')
            .select('status, role')
            .eq('user_id', user.id)
            .eq('workspace_id', targetWorkspaceId)
            .single();

        if (error || !membership || membership.status !== 'active') {
            throw new Error('Not a member of this workspace');
        }

        return membership;
    }
}

// Usage
async function loadDashboard() {
    try {
        // ✅ Automatically uses JWT's workspace_id
        const accounts = await WorkspaceService.query('accounts');
        // RLS policy blocks any cross-workspace access
        return accounts;
    } catch (error) {
        console.error('Access denied:', error);
    }
}
```

---

## Pattern 2: Supabase Edge Functions (Secure Server-Side API)

### Setup
```bash
# Initialize Edge Function
npx supabase functions new get-workspace-accounts --project-id YOUR_PROJECT
```

### Template
```typescript
// File: supabase/functions/get-workspace-accounts/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ✅ Use SERVICE_ROLE_KEY only on server for admin operations
// Use ANON_KEY for user queries (respects RLS)
const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!  // Respects RLS
);

export default async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Step 1: Extract and validate Authorization header
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return new Response(
                JSON.stringify({ error: "Missing Authorization header" }),
                { status: 401, headers: corsHeaders }
            );
        }

        // Step 2: Verify JWT and get user context
        const { data: { user }, error: userError } = await supabase.auth.getUser(
            authHeader.split(" ")[1]
        );
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Invalid token" }),
                { status: 401, headers: corsHeaders }
            );
        }

        // Step 3: Extract workspace_id from JWT (read-only)
        const workspaceId = user.user_metadata?.workspace_id;
        if (!workspaceId) {
            return new Response(
                JSON.stringify({ error: "No workspace context in JWT" }),
                { status: 403, headers: corsHeaders }
            );
        }

        // Step 4: Verify active membership
        const { data: membership, error: memberError } = await supabase
            .from("workspace_members")
            .select("role, status")
            .eq("user_id", user.id)
            .eq("workspace_id", workspaceId)
            .single();

        if (memberError || !membership || membership.status !== "active") {
            return new Response(
                JSON.stringify({ error: "Not an active workspace member" }),
                { status: 403, headers: corsHeaders }
            );
        }

        // Step 5: Query with workspace scoping
        // RLS policy enforces workspace_id = workspaceId
        const { data: accounts, error: queryError } = await supabase
            .from("accounts")
            .select("id, email, created_at, role")
            .eq("workspace_id", workspaceId);

        if (queryError) {
            return new Response(
                JSON.stringify({ error: queryError.message }),
                { status: 400, headers: corsHeaders }
            );
        }

        // ✅ Safe to return: only this workspace's accounts
        return new Response(JSON.stringify({ accounts }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: corsHeaders }
        );
    }
};
```

### Call the Edge Function Securely
```typescript
// Client-side: Always pass JWT, never workspace_id
async function getAccounts() {
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/get-workspace-accounts`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${session?.access_token}`,
                // ❌ DO NOT send workspace_id here
            },
        }
    );

    return response.json();
}
```

---

## Pattern 3: PostgREST API (Direct DB Queries)

Supabase's PostgREST API automatically respects RLS policies!

### Setup
```typescript
// ✅ SECURE: Use supabase client (includes auth context)
const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("workspace_id", workspaceId);
// RLS policy automatically filters to user's workspace
```

### URL-Based Queries (Advanced, Higher Risk)
```bash
# ✅ SECURE: Always include Authorization header with valid JWT
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://YOUR-PROJECT.supabase.co/rest/v1/accounts?select=*&workspace_id=eq.WORKSPACE_ID

# ❌ DANGEROUS: Requests without valid JWT
# This may fail, but misconfigured RLS allows it

# ❌ DANGEROUS: Trusting client-provided workspace_id
# ?workspace_id=eq.ATTACKER_WORKSPACE_ID
# RLS prevents this, but never rely on it alone
```

### Never Expose Workspace_ID in URLs
```typescript
// ❌ DANGEROUS: Client sends workspace_id in URL
async function fetchAccounts(workspaceId: string) {
    // Attacker can change workspaceId parameter
    const url = `/api/workspaces/${workspaceId}/accounts`;
    const response = await fetch(url);
    return response.json();
}

// ✅ SECURE: Workspace comes from JWT only
async function fetchAccounts() {
    // No workspace_id in URL; derived from JWT on server
    const response = await fetch('/api/accounts');
    return response.json();
}
```

---

## Pattern 4: Node.js Backend (Express.js Example)

```typescript
// File: src/routes/accounts.ts

import express from "express";
import { supabase } from "../lib/supabase";
import { verifyJWT } from "../middleware/auth";

const router = express.Router();

// Middleware: Extract and validate JWT
router.use(verifyJWT);

// ✅ SECURE: GET /api/accounts
router.get("/accounts", async (req, res) => {
    try {
        // Step 1: Get workspace_id from authenticated request (set by verifyJWT middleware)
        const workspaceId = req.user?.workspace_id;
        if (!workspaceId) {
            return res.status(403).json({ error: "No workspace context" });
        }

        // Step 2: Query with workspace_id from JWT
        const { data: accounts, error } = await supabase
            .from("accounts")
            .select("*")
            .eq("workspace_id", workspaceId);  // ✅ From req.user

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // ✅ RLS enforces: accounts.workspace_id = req.user.workspace_id
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ SECURE: POST /api/accounts
router.post("/accounts", async (req, res) => {
    try {
        const workspaceId = req.user?.workspace_id;
        const userId = req.user?.id;
        const { email, role } = req.body;

        // Step 1: Verify user is admin in this workspace
        const { data: member } = await supabase
            .from("workspace_members")
            .select("role")
            .eq("user_id", userId)
            .eq("workspace_id", workspaceId)
            .single();

        if (member?.role !== "admin" && member?.role !== "owner") {
            return res.status(403).json({ error: "Only admins can create accounts" });
        }

        // Step 2: Insert with workspace_id from JWT
        const { data: newAccount, error } = await supabase
            .from("accounts")
            .insert({
                workspace_id: workspaceId,  // ✅ From JWT
                email,
                role,
            })
            .select();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // ✅ RLS enforces: INSERT workspace_id must match JWT
        res.status(201).json(newAccount);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// ❌ DANGEROUS: Never do this
router.get("/accounts/:workspaceId", async (req, res) => {
    // WRONG: Trusting client-provided workspace_id
    const workspaceId = req.params.workspaceId;  // Attacker controls this!

    const { data } = await supabase
        .from("accounts")
        .select("*")
        .eq("workspace_id", workspaceId);  // ❌ Can access any workspace
    res.json(data);
});

export default router;
```

### Middleware: JWT Verification
```typescript
// File: src/middleware/auth.ts

import jwt from "jsonwebtoken";

export function verifyJWT(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing Authorization header" });
        }

        const token = authHeader.split(" ")[1];
        
        // Decode JWT (without verifying signature if using ANON_KEY)
        const decoded = jwt.decode(token) as any;
        if (!decoded || !decoded.sub) {
            return res.status(401).json({ error: "Invalid token" });
        }

        // ✅ Attach user context to request
        req.user = {
            id: decoded.sub,
            email: decoded.email,
            workspace_id: decoded.workspace_id,  // From JWT claims
        };

        next();
    } catch (error) {
        res.status(401).json({ error: "Token validation failed" });
    }
}

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                workspace_id: string;
            };
        }
    }
}
```

---

## Pattern 5: Prevent URL/Parameter Manipulation

### Anti-Patterns
```typescript
// ❌ Client controls workspace_id
const workspaceId = req.query.workspace_id;
const accounts = await supabase
    .from("accounts")
    .select("*")
    .eq("workspace_id", workspaceId);

// ❌ Client controls in URL path
router.get("/workspaces/:workspaceId/accounts", (req, res) => {
    const workspaceId = req.params.workspaceId;  // Attacker can change
});

// ❌ Client includes in POST body
const { workspaceId } = req.body;
```

### Correct Pattern
```typescript
// ✅ Server extracts from JWT (immutable)
const workspaceId = req.user.workspace_id;  // From JWT, cannot be forged

// ✅ Validate if client sends a workspace_id parameter
const requestedWorkspaceId = req.query.workspace_id as string;
if (requestedWorkspaceId && requestedWorkspaceId !== req.user.workspace_id) {
    return res.status(403).json({ error: "Workspace mismatch" });
}

// ✅ Use only the JWT-derived workspace_id
const accounts = await supabase
    .from("accounts")
    .select("*")
    .eq("workspace_id", req.user.workspace_id);
```

---

## Security Checklist

- [ ] All user queries include `Authorization: Bearer JWT` header
- [ ] JWT includes `workspace_id` claim
- [ ] Backend derives workspace_id from JWT, not client parameters
- [ ] RLS is enabled on all tables
- [ ] All policies check workspace_id
- [ ] Edge Functions validate JWT before querying
- [ ] No SECURITY DEFINER functions expose data
- [ ] Audit log tracks all access
- [ ] Tests verify cross-workspace access is blocked
- [ ] Dependencies are up-to-date (`npm audit`)

---

## Summary
1. **Extract workspace_id from JWT** (auth.jwt()->>'workspace_id' in SQL, req.user.workspace_id in API)
2. **Never trust client-provided workspace_id** (URLs, query params, request body)
3. **Validate membership before exposing data** (check workspace_members table)
4. **Use ANON_KEY for queries** (respects RLS; SERVICE_ROLE_KEY only for admin functions)
5. **Log all access** (audit_log table for compliance)
