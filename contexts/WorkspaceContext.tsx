"use client";

import { createContext, useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Workspace,
  WorkspaceMember,
  Subscription,
  UsageStats,
  PlanLimits,
  WorkspaceContextValue,
} from "@/types";
import { Plan } from "@/types";
import { PLAN_LIMITS } from "@/lib/plans/limits";

// ════════════════════════════════════════════════════════════
// WORKSPACE CONTEXT
// Provides the active workspace, subscription, usage, and
// plan limits to the entire dashboard. Persists the active
// workspace ID in localStorage.
// ════════════════════════════════════════════════════════════

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

interface WorkspaceProviderProps {
  children: React.ReactNode;
  initialWorkspaces: Workspace[];
  initialWorkspaceId?: string;
  initialMember?: WorkspaceMember | null;
}

// Stable singleton reference — prevents useCallback/useEffect re-runs
const supabase = createClient();

export function WorkspaceProvider({
  children,
  initialWorkspaces,
  initialWorkspaceId,
  initialMember,
}: WorkspaceProviderProps) {

  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  const [workspaceId, setWorkspaceId] = useState<string | null>(
    initialWorkspaceId ?? initialWorkspaces[0]?.id ?? null
  );
  const [workspace, setWorkspace] = useState<Workspace | null>(
    initialWorkspaces.find((w) => w.id === (initialWorkspaceId ?? initialWorkspaces[0]?.id)) ?? null
  );
  const [member, setMember] = useState<WorkspaceMember | null>(initialMember ?? null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [accountPlan, setAccountPlan] = useState<Plan>(Plan.Free);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Load workspace data ─────────────────────────────────

  const loadWorkspaceData = useCallback(
    async (wsId: string) => {
      setIsLoading(true);
      try {
        // getSession() reads from localStorage — no network call needed here
      // since the user is already authenticated (middleware + layout validated them).
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

        const [wsResult, memberResult, usageResult] = await Promise.all([
          supabase.from("workspaces").select("*").eq("id", wsId).single(),
          supabase
            .from("workspace_members")
            .select("*")
            .eq("workspace_id", wsId)
            .eq("user_id", user.id)
            .single(),
          fetch(`/api/usage?workspaceId=${wsId}`).then((r) =>
            r.ok ? r.json() : { data: null }
          ) as Promise<{ data: UsageStats | null }>,
        ]);

        // Account-level: try user_id first, fallback to workspace_id (pre-migration)
        let subData: Subscription | null = null;
        const { data: userSub, error: userSubErr } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .in("status", ["active", "trialing"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!userSubErr && userSub) {
          subData = userSub as Subscription;
        } else {
          // Fallback: workspace-based lookup (old schema)
          const { data: wsSub } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("workspace_id", wsId)
            .eq("status", "active")
            .maybeSingle();
          if (wsSub) subData = wsSub as Subscription;
        }

        // Derive plan from subscription, fallback to workspace plan
        const plan = (subData?.plan as Plan)
          ?? (wsResult.data?.plan as Plan)
          ?? Plan.Free;
        setAccountPlan(plan);
        setPlanLimits(PLAN_LIMITS[plan]);

        if (wsResult.data) {
          setWorkspace(wsResult.data as Workspace);
        }

        if (memberResult.data) {
          setMember(memberResult.data as WorkspaceMember);
        } else if (!member) {
          // Keep initialMember if client-side query failed (RLS/session race)
          console.warn("[WorkspaceContext] Member query returned no data — keeping initial member");
        }
        if (subData) setSubscription(subData);
        if (usageResult.data) setUsage(usageResult.data);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (workspaceId) {
      loadWorkspaceData(workspaceId);
      // Persist selection in both localStorage and cookie (cookie for server components)
      localStorage.setItem("onelinker_workspace_id", workspaceId);
      document.cookie = `onelinker_workspace_id=${workspaceId};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    }
  }, [workspaceId, loadWorkspaceData]);

  // ── Switch workspace ────────────────────────────────────

  const switchWorkspace = useCallback(
    async (newWorkspaceId: string) => {
      setWorkspaceId(newWorkspaceId);
      const ws = workspaces.find((w) => w.id === newWorkspaceId);
      if (ws) setWorkspace(ws);
      // Persist in cookie so server components can read it
      document.cookie = `onelinker_workspace_id=${newWorkspaceId};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    },
    [workspaces]
  );

  // ── Refresh usage stats ─────────────────────────────────

  const refreshUsage = useCallback(async () => {
    if (!workspaceId) return;
    const res = await fetch(`/api/usage?workspaceId=${workspaceId}`);
    if (res.ok) {
      const { data } = await res.json() as { data: UsageStats };
      setUsage(data);
    }
  }, [workspaceId]);

  // ── Refresh workspace (e.g. after logo/name update) ──────

  const refreshWorkspace = useCallback(async () => {
    if (!workspaceId) return;
    const { data } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();
    if (data) {
      setWorkspace(data as Workspace);
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === workspaceId ? (data as Workspace) : w))
      );
    }
  }, [workspaceId]);

  // ── Realtime subscription plan changes ─────────────────

  useEffect(() => {
    if (!workspaceId) return;

    // Get user ID for subscription listener
    let userId: string | null = null;
    supabase.auth.getSession().then(({ data: { session } }) => {
      userId = session?.user?.id ?? null;
    });

    const channel = supabase
      .channel(`workspace:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "workspaces",
          filter: `id=eq.${workspaceId}`,
        },
        (payload) => {
          setWorkspace((prev) =>
            prev ? { ...prev, ...(payload.new as Partial<Workspace>) } : prev
          );
        }
      )
      .subscribe();

    // Separate channel for user-level subscription changes
    const subChannel = supabase
      .channel("account-subscription")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
        },
        (payload) => {
          if (payload.eventType !== "DELETE" && userId) {
            const newRow = payload.new as Subscription;
            if (newRow.user_id === userId) {
              setSubscription(newRow);
              const plan = (newRow.plan as Plan) ?? Plan.Free;
              setAccountPlan(plan);
              setPlanLimits(PLAN_LIMITS[plan]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(subChannel);
    };
  }, [workspaceId]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        workspaces,
        member,
        subscription,
        accountPlan,
        usage,
        plan_limits: planLimits,
        isLoading,
        switchWorkspace,
        refreshUsage,
        refreshWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
