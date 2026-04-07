"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Share2, Plus, RefreshCw, Trash2, CheckCircle2,
  AlertTriangle, XCircle, Loader2, ChevronRight,
  Twitter, Linkedin, Instagram, Facebook, Youtube,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { getCallbackPath } from "@/lib/oauth/platform-routes";

// ─── Custom SVG icons for platforms not in Lucide ─────────────

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z" />
    </svg>
  );
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 1.975-.013 3.138-.4 4.483-1.111 1.63-.836 2.53-2.02 3.08-3.747H17.5c-.88 2.54-2.57 3.97-4.87 4.426-.67.132-1.358.2-2.044.2-.45 0-.9-.034-1.4-.086zm5.081-11.58c-.102-2.696-1.896-4.43-4.81-4.59-1.574-.087-3.007.483-3.987 1.597-.844.963-1.26 2.255-1.26 3.845 0 3.39 1.86 5.33 5.183 5.33 1.08 0 2.006-.253 2.783-.773.78-.52 1.353-1.27 1.72-2.25h-2.12c-.33.85-1.02 1.333-2.16 1.333-.68 0-1.22-.19-1.62-.57-.38-.37-.6-.9-.66-1.6h7.22c.04-.44.06-.88.06-1.32l-.33-.003z" />
    </svg>
  );
}

function BlueSkyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.204-.659-.299-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z" />
    </svg>
  );
}

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  );
}

function GoogleBusinessIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" />
    </svg>
  );
}

// ─── Platform config ─────────────────────────────────────────

const PLATFORM_CONFIG = [
  { id: "twitter", name: "X (Twitter)", icon: Twitter },
  { id: "instagram", name: "Instagram", icon: Instagram },
  { id: "facebook", name: "Facebook", icon: Facebook },
  { id: "linkedin", name: "LinkedIn", icon: Linkedin },
  { id: "tiktok", name: "TikTok", icon: TikTokIcon },
  { id: "youtube", name: "YouTube", icon: Youtube },
  { id: "threads", name: "Threads", icon: ThreadsIcon },
  { id: "bluesky", name: "Bluesky", icon: BlueSkyIcon },
  { id: "pinterest", name: "Pinterest", icon: PinterestIcon },
  { id: "google_business", name: "Google Business", icon: GoogleBusinessIcon },
] as const;

type PlatformId = typeof PLATFORM_CONFIG[number]["id"];
type HealthStatus = "healthy" | "warning" | "error" | "disconnected" | "paused";

interface AccountRow {
  id: string;
  platform: PlatformId;
  username: string;
  display_name: string;
  followers: number;
  health: HealthStatus;
  is_active: boolean;
  last_synced: string;
  profile_picture: string | null;
}

function StatusBadge({ status }: { status: HealthStatus }) {
  const map: Record<HealthStatus, { label: string; className: string }> = {
    healthy:      { label: "Active", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
    warning:      { label: "Attention", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
    error:        { label: "Error", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
    paused:       { label: "Paused", className: "bg-slate-500/10 text-slate-700 dark:text-slate-400" },
    disconnected: { label: "Disconnected", className: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
  };
  const s = map[status];
  return (
    <span className={cn("text-xs font-medium px-2 py-1 rounded", s.className)}>
      {s.label}
    </span>
  );
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function AccountMenu({
  account,
  onSync,
  onToggle,
  onDelete,
  syncing,
}: {
  account: AccountRow;
  onSync: () => void;
  onToggle: () => void;
  onDelete: () => void;
  syncing: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-muted/60 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-44 rounded-lg border border-border/60 bg-card shadow-lg z-40 overflow-hidden">
            <button
              onClick={() => {
                onSync();
                setOpen(false);
              }}
              disabled={syncing}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 disabled:opacity-50 transition-colors border-b border-border/40"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
              Sync
            </button>
            <button
              onClick={() => {
                onToggle();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors border-b border-border/40"
            >
              {account.is_active ? "Pause" : "Activate"}
            </button>
            <button
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Remove
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AccountsPage() {
  const supabase = createClient();
  const { workspace } = useWorkspace();

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!workspace?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("social_accounts")
      .select("id, platform, username, display_name, profile_picture, followers_count, is_active, health_status, connected_at")
      .eq("workspace_id", workspace.id)
      .order("connected_at", { ascending: true });

    const rows: AccountRow[] = (data ?? []).map((row) => ({
      id: row.id,
      platform: row.platform as PlatformId,
      username: row.username ?? "",
      display_name: row.display_name ?? row.username ?? row.platform,
      followers: row.followers_count ?? 0,
      health: (row.health_status === "paused" ? "paused" : row.is_active ? "healthy" : "disconnected") as HealthStatus,
      is_active: row.is_active ?? false,
      profile_picture: row.profile_picture,
      last_synced: new Date(row.connected_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }));

    setAccounts(rows);
    setShowConnect(rows.length === 0);
    setLoading(false);
  }, [workspace?.id]);

  const syncAllAccounts = useCallback(async () => {
    if (!workspace?.id || syncingAll) return;
    setSyncingAll(true);
    try {
      await fetch("/api/accounts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id }),
      });
      await fetchAccounts();
    } finally {
      setSyncingAll(false);
    }
  }, [workspace?.id, syncingAll, fetchAccounts]);

  useEffect(() => {
    if (workspace?.id) syncAllAccounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id]);

  async function handleSync(id: string) {
    setSyncing(id);
    await fetchAccounts();
    setSyncing(null);
    toast.success("Account synced");
  }

  async function handleToggleActive(id: string, currentlyActive: boolean, healthStatus: HealthStatus) {
    const newActive = !currentlyActive;

    if (newActive && (healthStatus === "error" || healthStatus === "disconnected")) {
      toast.error("This account needs to be reconnected first.");
      return;
    }

    const res = await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: newActive }),
    });

    const j = await res.json() as { data?: { is_active: boolean; health_status: string }; error?: string };

    if (res.ok && j.data) {
      setAccounts((prev) => prev.map((a) =>
        a.id === id
          ? { ...a, is_active: j.data!.is_active, health: (j.data!.health_status === "paused" ? "paused" : "healthy") as HealthStatus }
          : a
      ));
      toast.success(newActive ? "Account activated" : "Account paused");
    } else {
      toast.error(j.error ?? "Failed to update account");
    }
  }

  async function handleDelete(id: string, displayName: string) {
    if (!confirm(`Remove "${displayName}"? Scheduled posts will be cancelled.`)) return;

    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    const j = await res.json() as { data?: { success: boolean; cancelledPosts?: number }; error?: string };

    if (res.ok && j.data?.success) {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      toast.success("Account removed");
    } else {
      toast.error(j.error ?? "Failed to remove account");
    }
  }

  async function handleConnect(platformId: string, platformName: string) {
    if (!workspace?.id) return;
    if (connecting) return;
    setConnecting(platformId);

    try {
      const res = await fetch("/api/accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: platformId,
          workspaceId: workspace.id,
          redirect_uri: `${window.location.origin}/auth/${getCallbackPath(platformId)}/callback`,
        }),
      });

      const json = await res.json() as { data?: { oauth_url: string }; error?: string };

      if (!res.ok || !json.data?.oauth_url) {
        if (res.status === 401) {
          const { data: { session } } = await supabase.auth.refreshSession();
          if (session) {
            toast.error("Session refreshed — please try again.");
          } else {
            window.location.href = "/login";
          }
        } else {
          toast.error(json.error ?? "Failed to start OAuth");
        }
        setConnecting(null);
        return;
      }

      const popup = window.open(json.data.oauth_url, `Connect ${platformName}`, "width=600,height=700,scrollbars=yes");

      if (!popup) {
        window.location.href = json.data.oauth_url;
        return;
      }

      setShowConnect(false);

      const closeWatcher = setInterval(async () => {
        if (!popup.closed) return;
        clearInterval(closeWatcher);

        try {
          await fetch("/api/accounts/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workspaceId: workspace.id }),
          });
        } catch {
          // non-fatal
        }

        await fetchAccounts();
        setConnecting(null);
      }, 800);

      setTimeout(() => {
        clearInterval(closeWatcher);
        setConnecting(null);
      }, 300_000);

    } catch {
      toast.error("Failed to connect. Please try again.");
      setConnecting(null);
    }
  }

  const connectedCounts = accounts.reduce<Record<string, number>>((acc, a) => {
    acc[a.platform] = (acc[a.platform] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background page-enter">
      <div className="max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="border-b border-border/40 px-6 sm:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Accounts</h1>
              <p className="text-sm text-muted-foreground mt-2">Manage your connected social media accounts</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={syncAllAccounts}
                disabled={syncingAll}
                className="text-sm"
              >
                <RefreshCw className={cn("h-4 w-4", syncingAll && "animate-spin")} />
                {syncingAll ? "Syncing" : "Sync"}
              </Button>
              <Button onClick={() => setShowConnect(true)} className="text-sm">
                <Plus className="h-4 w-4" />
                Add Account
              </Button>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="px-6 sm:px-8 py-8">

          {/* ── Connect Dialog ── */}
          {showConnect && (
            <>
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-fade-in" onClick={() => setShowConnect(false)} />
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-card rounded-xl border border-border/60 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
                  <div className="sticky top-0 border-b border-border/40 px-6 py-4 bg-card/95 backdrop-blur-sm flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Connect a platform</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">Choose a platform to connect via OAuth</p>
                    </div>
                    <button
                      onClick={() => setShowConnect(false)}
                      className="text-muted-foreground hover:text-foreground p-2 hover:bg-muted/60 rounded-lg transition-colors"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {PLATFORM_CONFIG.map((p) => {
                      const count = connectedCounts[p.id] ?? 0;
                      return (
                        <button
                          key={p.id}
                          disabled={!!connecting}
                          onClick={() => handleConnect(p.id, p.name)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-lg border border-border/40 transition-all",
                            connecting === p.id
                              ? "bg-muted/30 opacity-60 cursor-wait"
                              : "hover:border-border hover:bg-muted/40 hover:shadow-md cursor-pointer"
                          )}
                        >
                          {connecting === p.id
                            ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            : <p.icon className="h-5 w-5 text-foreground" />
                          }
                          <p className="text-xs font-medium text-foreground text-center leading-tight">{p.name}</p>
                          {count > 0 && <span className="text-[10px] text-emerald-600 dark:text-emerald-400">+{count}</span>}
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-border/40 px-6 py-4 bg-muted/20">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Connections are secured via OAuth. Your passwords are never stored. Some platforms require additional permissions for posting.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Loading ── */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-24">
              <div className="mb-6 flex justify-center">
                <div className="rounded-xl bg-muted/40 p-4">
                  <Share2 className="h-8 w-8 text-muted-foreground/40" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">No accounts connected</h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
                Connect your first social media account to start scheduling posts across {PLATFORM_CONFIG.length} platforms.
              </p>
              <Button onClick={() => setShowConnect(true)} size="lg">
                <Plus className="h-4 w-4" />
                Connect Account
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* ── Account Rows ── */}
              {accounts.map((account) => {
                const platform = PLATFORM_CONFIG.find((p) => p.id === account.platform)!;
                return (
                  <div
                    key={account.id}
                    className="rounded-lg border border-border/40 bg-card px-6 py-4 hover:border-border/60 hover:shadow-sm transition-all flex items-center justify-between gap-4"
                  >
                    {/* Left: Profile */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex-shrink-0">
                        {account.profile_picture ? (
                          <img
                            src={account.profile_picture}
                            alt={account.display_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center">
                            <platform.icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{account.display_name}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{platform.name}</span>
                          <span className="text-border/40">·</span>
                          <span>@{account.username}</span>
                          <span className="text-border/40">·</span>
                          <span>{formatFollowers(account.followers)} followers</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status + Menu */}
                    <div className="flex items-center gap-4 flex-shrink-0 ml-auto">
                      <StatusBadge status={account.health} />
                      <AccountMenu
                        account={account}
                        onSync={() => handleSync(account.id)}
                        onToggle={() => handleToggleActive(account.id, account.is_active, account.health)}
                        onDelete={() => handleDelete(account.id, account.display_name)}
                        syncing={syncing === account.id}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
