"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  PenSquare, CalendarDays, Share2, BarChart3,
  Clock, CheckCircle2, AlertCircle, TrendingUp,
  ArrowRight, Zap, Twitter, Instagram, Facebook,
  Linkedin, Youtube, Globe, FileText, Eye,
  Image as ImageIcon, Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { PostStatus } from "@/types";

const supabase = createClient();

function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return /\.(mp4|mov|webm|avi|mkv)(\?.*)?$/.test(lower);
}

function PostThumbnail({ urls, className }: { urls: string[]; className?: string }) {
  const [error, setError] = useState(false);
  const url = urls[0];
  const isVideo = url ? isVideoUrl(url) : false;
  const count = urls.length;

  if (!url || error) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/40 rounded-xl", className)}>
        <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-muted/30 shrink-0", className)}>
      <Image
        src={url}
        alt="Post media"
        fill
        className="object-cover"
        sizes="72px"
        onError={() => setError(true)}
      />
      {/* Video play icon */}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
            <Play className="h-3 w-3 text-white fill-white ml-0.5" />
          </div>
        </div>
      )}
      {/* Multi-media count */}
      {count > 1 && (
        <div className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-black/60 backdrop-blur-sm px-1.5 py-0.5">
          <ImageIcon className="h-2.5 w-2.5 text-white/80" />
          <span className="text-[9px] font-bold text-white/90">{count}</span>
        </div>
      )}
    </div>
  );
}


const STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  scheduled:        { label: "Scheduled",   className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",   dot: "bg-blue-500" },
  published:        { label: "Published",   className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20", dot: "bg-emerald-500" },
  failed:           { label: "Failed",      className: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",       dot: "bg-red-500" },
  draft:            { label: "Draft",       className: "bg-muted/40 text-muted-foreground border border-border/40",                    dot: "bg-muted-foreground" },
  pending_approval: { label: "Pending",     className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20", dot: "bg-amber-500" },
  cancelled:        { label: "Cancelled",   className: "bg-muted/40 text-muted-foreground border border-border/40",                    dot: "bg-muted-foreground" },
};

const PLATFORM_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  twitter:         { icon: Twitter,   color: "text-sky-500",     bg: "bg-sky-500/10" },
  instagram:       { icon: Instagram, color: "text-pink-500",    bg: "bg-pink-500/10" },
  facebook:        { icon: Facebook,  color: "text-blue-500",    bg: "bg-blue-500/10" },
  linkedin:        { icon: Linkedin,  color: "text-blue-600",    bg: "bg-blue-600/10" },
  youtube:         { icon: Youtube,   color: "text-red-500",     bg: "bg-red-500/10" },
  tiktok:          { icon: Globe,     color: "text-zinc-500",    bg: "bg-zinc-500/10" },
  threads:         { icon: FileText,  color: "text-zinc-600 dark:text-zinc-400", bg: "bg-zinc-500/10" },
  bluesky:         { icon: Globe,     color: "text-sky-400",     bg: "bg-sky-400/10" },
  pinterest:       { icon: Globe,     color: "text-rose-500",    bg: "bg-rose-500/10" },
  google_business: { icon: Globe,     color: "text-emerald-500", bg: "bg-emerald-500/10" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const QUICK_ACTIONS = [
  { label: "New Post",        href: "/create?sheet=true",    icon: PenSquare,   primary: true },
  { label: "View Calendar",   href: "/calendar",  icon: CalendarDays, primary: false },
  { label: "Analytics",       href: "/analytics", icon: BarChart3,   primary: false },
  { label: "Connect Account", href: "/accounts",  icon: Share2,      primary: false },
];

interface RecentPost {
  id: string;
  content: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  platforms: string[];
  created_at: string;
  media_urls: string[] | null;
}

export default function DashboardPage() {
  const { workspace, isLoading: wsLoading } = useWorkspace();

  const [scheduledCount, setScheduledCount]         = useState(0);
  const [publishedTodayCount, setPublishedTodayCount] = useState(0);
  const [failedCount, setFailedCount]               = useState(0);
  const [accountsCount, setAccountsCount]           = useState(0);
  const [recentPosts, setRecentPosts]               = useState<RecentPost[]>([]);
  const [loading, setLoading]                       = useState(true);

  const fetchDashboard = useCallback(async (workspaceId: string) => {
    setLoading(true);

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const [scheduled, publishedToday, failed, recent, accounts] = await Promise.all([
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", PostStatus.Scheduled),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", PostStatus.Published).gte("published_at", startOfToday),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", PostStatus.Failed).gte("created_at", startOfMonth),
      supabase.from("posts").select("id, content, status, scheduled_at, published_at, platforms, created_at, media_urls").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(5),
      supabase.from("social_accounts").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("is_active", true),
    ]);

    setScheduledCount(scheduled.count ?? 0);
    setPublishedTodayCount(publishedToday.count ?? 0);
    setFailedCount(failed.count ?? 0);
    setRecentPosts((recent.data ?? []) as RecentPost[]);
    setAccountsCount(accounts.count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (workspace?.id) fetchDashboard(workspace.id);
  }, [workspace?.id, fetchDashboard]);

  // Subscribe to realtime posts changes to keep dashboard stats fresh
  useEffect(() => {
    if (!workspace?.id) return;

    console.log("[Dashboard] Opening realtime channel for posts");
    const channel = supabase
      .channel(`dashboard-posts:${workspace.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `workspace_id=eq.${workspace.id}`,
        },
        () => {
          console.log("[Dashboard] Posts changed, refreshing stats");
          fetchDashboard(workspace.id);
        }
      )
      .subscribe((status) => {
        console.log(`[Dashboard] Realtime status: ${status}`);
      });

    return () => {
      console.log("[Dashboard] Closing realtime channel");
      supabase.removeChannel(channel);
    };
  }, [workspace?.id]);

  const stats = [
    { label: "Scheduled",          value: scheduledCount,      icon: Clock,        href: "/calendar", bg: "bg-blue-500/15 dark:bg-blue-500/10",   color: "text-blue-600 dark:text-blue-400" },
    { label: "Published Today",    value: publishedTodayCount, icon: CheckCircle2, href: "/calendar", bg: "bg-green-500/15 dark:bg-green-500/10",  color: "text-green-600 dark:text-green-400" },
    { label: "Failed This Month",  value: failedCount,         icon: AlertCircle,  href: "/calendar", bg: failedCount > 0 ? "bg-red-500/15 dark:bg-red-500/10" : "bg-muted/30", color: failedCount > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground" },
    { label: "Connected Accounts", value: accountsCount,       icon: Share2,       href: "/accounts", bg: "bg-purple-500/15 dark:bg-purple-500/10", color: "text-purple-600 dark:text-purple-400" },
  ];

  if (wsLoading || loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted/40 rounded-lg animate-pulse" />
        <div className="flex flex-wrap gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-10 w-28 bg-muted/40 rounded-lg animate-pulse" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-muted/40 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-muted/40 rounded-xl animate-pulse" />
      </div>
    );
  }

  const today = new Date();
  const greeting = today.getHours() < 12 ? "morning" : today.getHours() < 18 ? "afternoon" : "evening";

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-5xl mx-auto page-enter">
      {/* Welcome */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Good {greeting} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {workspace ? `Managing ${workspace.name}` : "Welcome to Onelinker"} · {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        {workspace?.plan === "free" && (
          <Link
            href="/billing"
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            Upgrade plan
          </Link>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150",
              a.primary
                ? "btn-primary shadow-sm"
                : "border border-border/60 bg-card/60 hover:bg-card hover:border-border hover:shadow-sm text-foreground"
            )}
          >
            <a.icon className="h-4 w-4" />
            {a.label}
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group rounded-xl border border-border/60 bg-card/60 p-4 hover:bg-card hover:border-border/80 hover:shadow-md transition-all duration-200"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.bg} mb-3 transition-transform duration-200 group-hover:scale-110`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className="text-2xl font-bold text-foreground tabular-nums">{s.value}</div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        ))}
      </div>

      {/* No accounts CTA */}
      {accountsCount === 0 && (
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Share2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Connect a social account to get started</p>
            <p className="text-xs text-muted-foreground mt-0.5">Connect Twitter, LinkedIn, Instagram and more to start scheduling.</p>
          </div>
          <Link href="/accounts" className="shrink-0 flex items-center gap-1.5 btn btn-primary btn-md rounded-lg w-full sm:w-auto justify-center">
            Connect <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Recent posts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Recent Posts</h2>
          <Link href="/posts" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group">
            View all <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {recentPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-gradient-to-b from-card/80 to-card/40 p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40 mx-auto mb-4">
              <TrendingUp className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-base font-semibold text-foreground">No posts yet</p>
            <p className="text-sm text-muted-foreground mt-1.5 mb-5 max-w-xs mx-auto">Create your first post and start growing your audience.</p>
            <Link href="/create" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 shadow-sm transition-all hover:shadow-md">
              <PenSquare className="h-4 w-4" /> Create Post
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentPosts.map((post) => {
              const platforms = post.platforms ?? [];
              const preview = typeof post.content === "string"
                ? post.content.slice(0, 120) + (post.content.length > 120 ? "…" : "")
                : "";
              const date = post.published_at ?? post.scheduled_at ?? post.created_at;
              const sc = STATUS_CONFIG[post.status] ?? { label: post.status, className: "bg-muted/40 text-muted-foreground border border-border/40", dot: "bg-muted-foreground" };
              const firstPlatform = platforms[0] ? PLATFORM_ICONS[platforms[0]] : null;

              const mediaUrls = (post.media_urls ?? []).filter(Boolean);

              return (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card/60 px-4 py-3.5 hover:bg-card hover:border-border/80 hover:shadow-sm transition-all duration-200"
                >
                  {/* Thumbnail or platform icon */}
                  {mediaUrls.length > 0 ? (
                    <PostThumbnail urls={mediaUrls} className="h-11 w-11 shrink-0" />
                  ) : (
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${firstPlatform?.bg ?? "bg-muted/40"} transition-colors`}>
                      {firstPlatform ? (
                        <firstPlatform.icon className={`h-4.5 w-4.5 ${firstPlatform.color}`} />
                      ) : (
                        <FileText className="h-4.5 w-4.5 text-muted-foreground" />
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-foreground/90">
                      {preview || "(empty)"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {platforms.slice(0, 3).map((p) => {
                        const pi = PLATFORM_ICONS[p];
                        return (
                          <span key={p} className={`inline-flex items-center gap-1 text-xs capitalize ${pi?.color ?? "text-muted-foreground"}`}>
                            {p}
                          </span>
                        );
                      })}
                      {platforms.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{platforms.length - 3}</span>
                      )}
                      {date && (
                        <>
                          <span className="text-muted-foreground/30">·</span>
                          <span className="text-xs text-muted-foreground">{timeAgo(date)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${sc.className}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </span>

                  {/* Hover arrow */}
                  <Eye className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
