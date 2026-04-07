import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ── Server (Server Component / Route Handler) Supabase Client ─
// Use this in Server Components, Server Actions, and API routes.
// Must be called inside a request context (has access to cookies).

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required."
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll called from a Server Component — cookies are read-only.
          // Session refresh is handled by the middleware instead.
        }
      },
    },
    auth: {
      autoRefreshToken: false, // middleware handles refresh
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

// ── Service Role Client (bypasses RLS) ───────────────────────
// Use ONLY in trusted server contexts (webhooks, cron jobs).
// NEVER expose to client or use in user-facing routes.
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase service role credentials. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
    );
  }

  return createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ── Auth helpers ─────────────────────────────────────────────

/**
 * Get the current authenticated user from the server.
 * Returns null if not authenticated.
 * Uses getUser() (not getSession()) to validate JWT with Supabase Auth server.
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

/**
 * Get the current user's profile from the database.
 * Returns null if not authenticated or profile not found.
 */
export async function getUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) return null;
  return profile;
}

/**
 * Get the user's workspaces with their role.
 */
export async function getUserWorkspaces(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      `
      role,
      accepted_at,
      workspace:workspaces (
        id,
        name,
        slug,
        logo_url,
        plan,
        owner_id,
        created_at
      )
    `
    )
    .eq("user_id", userId)
    .order("invited_at", { ascending: true });

  if (error || !data) return [];

  return data
    .filter((m) => m.accepted_at !== null || m.role === "owner")
    .map((m) => ({
      ...m.workspace,
      role: m.role,
    }));
}

/**
 * Require authentication — redirects are handled by the caller.
 * Returns the user or throws if not authenticated.
 */
export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

/**
 * Require workspace membership with a minimum role.
 * Returns the member record or throws.
 */
export async function requireWorkspaceMember(
  workspaceId: string,
  userId: string,
  minRole: "owner" | "manager" | "editor" | "viewer" = "viewer"
) {
  const supabase = await createClient();

  const roleHierarchy = { owner: 4, manager: 3, editor: 2, viewer: 1 };

  const { data: member, error } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();

  if (error || !member) {
    throw new Error("FORBIDDEN");
  }

  // Block deactivated members
  if (member.deactivated_at) {
    throw new Error("DEACTIVATED");
  }

  const memberLevel = roleHierarchy[member.role as keyof typeof roleHierarchy] ?? 0;
  const requiredLevel = roleHierarchy[minRole];

  if (memberLevel < requiredLevel) {
    throw new Error("FORBIDDEN");
  }

  return member;
}
