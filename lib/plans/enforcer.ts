import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PlanFeatureName } from "@/types";
import {
  checkPostLimit,
  checkAILimit,
  checkChannelLimit,
  checkFeatureAccess,
  checkDailyPostLimit,
} from "./checker";

// ════════════════════════════════════════════════════════════
// PLAN ENFORCER
// Middleware wrappers for API route handlers.
// Checks plan limits BEFORE executing the handler.
// Returns standard 403 JSON with upgrade info if blocked.
// ════════════════════════════════════════════════════════════

type RouteHandler = (
  req: NextRequest,
  context: { params: Record<string, string> }
) => Promise<NextResponse | Response>;

// ── Standard 403 response ─────────────────────────────────────

function limitExceededResponse(message: string, upgradeUrl: string, extra?: object) {
  return NextResponse.json(
    {
      data: null,
      error: "plan_limit_exceeded",
      message,
      upgrade_url: upgradeUrl,
      ...extra,
    },
    { status: 403 }
  );
}

// ── Get workspaceId from request ──────────────────────────────
// Looks in: body JSON, query param, or header

async function extractWorkspaceId(req: NextRequest): Promise<string | null> {
  // 1. Try header (fastest, no body parse)
  const fromHeader = req.headers.get("x-workspace-id");
  if (fromHeader) return fromHeader;

  // 2. Try query param
  const fromQuery = req.nextUrl.searchParams.get("workspaceId");
  if (fromQuery) return fromQuery;

  // 3. Try body (clones stream so original body remains readable)
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await req.clone().json() as Record<string, unknown>;
      if (typeof body.workspaceId === "string") return body.workspaceId;
      if (typeof body.workspace_id === "string") return body.workspace_id;
    }
  } catch {
    // body parse failed — skip
  }

  return null;
}

// ── enforcePostLimit ──────────────────────────────────────────
// Wraps a route handler that creates posts.
// Checks both monthly and daily limits.

export function enforcePostLimit(handler: RouteHandler): RouteHandler {
  return async (req, context) => {
    const workspaceId = await extractWorkspaceId(req);

    if (!workspaceId) {
      return NextResponse.json(
        { data: null, error: "missing_workspace", message: "workspace_id is required" },
        { status: 400 }
      );
    }

    // Monthly limit
    const monthlyCheck = await checkPostLimit(workspaceId);
    if (!monthlyCheck.allowed) {
      return limitExceededResponse(
        monthlyCheck.error?.message ?? "Monthly post limit reached",
        "/billing",
        {
          limit_type: "post_limit",
          current: monthlyCheck.current,
          limit: monthlyCheck.limit,
          plan: monthlyCheck.plan,
        }
      );
    }

    // Daily limit (free plan only)
    const dailyCheck = await checkDailyPostLimit(workspaceId);
    if (!dailyCheck.allowed) {
      return limitExceededResponse(
        dailyCheck.error?.message ?? "Daily post limit reached",
        "/billing",
        {
          limit_type: "daily_post_limit",
          current: dailyCheck.current,
          limit: dailyCheck.limit,
          plan: dailyCheck.plan,
        }
      );
    }

    return handler(req, context);
  };
}

// ── enforceAILimit ────────────────────────────────────────────

export function enforceAILimit(handler: RouteHandler): RouteHandler {
  return async (req, context) => {
    const workspaceId = await extractWorkspaceId(req);

    if (!workspaceId) {
      return NextResponse.json(
        { data: null, error: "missing_workspace", message: "workspace_id is required" },
        { status: 400 }
      );
    }

    const check = await checkAILimit(workspaceId);
    if (!check.allowed) {
      return limitExceededResponse(
        check.error?.message ?? "AI generation limit reached",
        "/billing",
        {
          limit_type: "ai_limit",
          current: check.current,
          limit: check.limit,
          plan: check.plan,
        }
      );
    }

    return handler(req, context);
  };
}

// ── enforceChannelLimit ───────────────────────────────────────

export function enforceChannelLimit(handler: RouteHandler): RouteHandler {
  return async (req, context) => {
    const workspaceId = await extractWorkspaceId(req);

    if (!workspaceId) {
      return NextResponse.json(
        { data: null, error: "missing_workspace", message: "workspace_id is required" },
        { status: 400 }
      );
    }

    const check = await checkChannelLimit(workspaceId);
    if (!check.allowed) {
      return limitExceededResponse(
        check.error?.message ?? "Channel limit reached",
        "/billing",
        {
          limit_type: "channel_limit",
          current: check.current,
          limit: check.limit,
          plan: check.plan,
        }
      );
    }

    return handler(req, context);
  };
}

// ── enforceFeatureAccess ──────────────────────────────────────
// General-purpose feature gate for any plan-locked feature.

export function enforceFeatureAccess(
  feature: PlanFeatureName,
  handler: RouteHandler
): RouteHandler {
  return async (req, context) => {
    const workspaceId = await extractWorkspaceId(req);

    if (!workspaceId) {
      return NextResponse.json(
        { data: null, error: "missing_workspace", message: "workspace_id is required" },
        { status: 400 }
      );
    }

    const check = await checkFeatureAccess(workspaceId, feature);
    if (!check.allowed) {
      return limitExceededResponse(
        check.error?.message ?? `Feature '${feature}' requires a higher plan`,
        "/billing",
        {
          limit_type: "feature_locked",
          feature,
          plan: check.plan,
        }
      );
    }

    return handler(req, context);
  };
}

// ── withAuth ──────────────────────────────────────────────────
// Ensures user is authenticated. Returns the user + supabase client.
// Use at the top of every API route.

export async function withAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      supabase,
      response: NextResponse.json(
        { data: null, error: "unauthorized", message: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  return { user, supabase, response: null };
}

// ── withWorkspace ─────────────────────────────────────────────
// Ensures user is authenticated + member of the specified workspace.
// Returns user, workspace, member role, and supabase client.

export async function withWorkspace(workspaceId: string, minRole: "owner" | "manager" | "editor" | "viewer" = "viewer") {
  const { user, supabase, response } = await withAuth();
  if (!user || response) return { user: null, workspace: null, member: null, supabase, response };

  const roleHierarchy = { owner: 4, manager: 3, editor: 2, viewer: 1 };

  const { data: member, error: memberError } = await supabase
    .from("workspace_members")
    .select("role, workspace:workspaces(*)")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (memberError || !member) {
    return {
      user,
      workspace: null,
      member: null,
      supabase,
      response: NextResponse.json(
        { data: null, error: "forbidden", message: "Access denied" },
        { status: 403 }
      ),
    };
  }

  const memberLevel = roleHierarchy[member.role as keyof typeof roleHierarchy] ?? 0;
  const requiredLevel = roleHierarchy[minRole];

  if (memberLevel < requiredLevel) {
    return {
      user,
      workspace: null,
      member: null,
      supabase,
      response: NextResponse.json(
        { data: null, error: "forbidden", message: `Requires ${minRole} role or higher` },
        { status: 403 }
      ),
    };
  }

  return {
    user,
    workspace: member.workspace as unknown as Record<string, unknown>,
    member,
    supabase,
    response: null,
  };
}

// ── Standard error responses ──────────────────────────────────

export function unauthorizedResponse() {
  return NextResponse.json(
    { data: null, error: "unauthorized", message: "Authentication required" },
    { status: 401 }
  );
}

export function forbiddenResponse(message = "Access denied") {
  return NextResponse.json(
    { data: null, error: "forbidden", message },
    { status: 403 }
  );
}

export function badRequestResponse(message: string) {
  return NextResponse.json(
    { data: null, error: "bad_request", message },
    { status: 400 }
  );
}

export function notFoundResponse(resource = "Resource") {
  return NextResponse.json(
    { data: null, error: "not_found", message: `${resource} not found` },
    { status: 404 }
  );
}

export function serverErrorResponse(message = "An unexpected error occurred") {
  return NextResponse.json(
    { data: null, error: "server_error", message },
    { status: 500 }
  );
}
