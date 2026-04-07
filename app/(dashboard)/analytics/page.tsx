"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, TrendingDown, Heart, MessageCircle,
  Eye, MousePointerClick, Users, RefreshCcw, Loader2,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { PostStatus } from "@/types";

type DateRangeKey = "7d" | "30d" | "90d";

const DATE_RANGE_LABELS: Record<DateRangeKey, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };
const DATE_RANGE_DAYS:  Record<DateRangeKey, number>  = { "7d": 7,  "30d": 30, "90d": 90 };

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

interface MetricPoint {
  date: string;
  reach: number;
  likes: number;
  comments: number;
}

interface PlatformStat {
  platform: string;
  posts: number;
  reach: number;
  engagement: number;
}

interface TopPost {
  id: string;
  content: string;
  platform: string;
  likes: number;
  comments: number;
  reach: number;
  engagement: number;
}

interface Stats {
  totalReach: number;
  totalEngagement: number;
  postsPublished: number;
  linkClicks: number;
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="group rounded-xl border border-border/60 bg-card/60 p-4 hover:shadow-md hover:border-border/80 transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110", color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const supabase = createClient();
  const { workspace } = useWorkspace();
  const [range, setRange]                 = useState<DateRangeKey>("30d");
  const [loading, setLoading]             = useState(true);
  const [engagementData, setEngagementData] = useState<MetricPoint[]>([]);
  const [platformData, setPlatformData]   = useState<PlatformStat[]>([]);
  const [topPosts, setTopPosts]           = useState<TopPost[]>([]);
  const [stats, setStats]                 = useState<Stats>({ totalReach: 0, totalEngagement: 0, postsPublished: 0, linkClicks: 0 });

  const fetchAnalytics = useCallback(async () => {
    if (!workspace?.id) return;
    setLoading(true);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - DATE_RANGE_DAYS[range]);

    const { data: postsData } = await supabase
      .from("posts")
      .select(`
        id, content, platforms, status, published_at,
        post_metrics(likes, comments, shares, reach, clicks, platform, recorded_at)
      `)
      .eq("workspace_id", workspace.id)
      .eq("status", PostStatus.Published)
      .gte("published_at", startDate.toISOString())
      .order("published_at", { ascending: true });

    if (!postsData) { setLoading(false); return; }

    // Aggregate by date
    const dateMap: Record<string, MetricPoint> = {};
    // Aggregate by platform
    const platformMap: Record<string, { postIds: Set<string>; reach: number; engagement: number }> = {};

    let totalReach = 0, totalEngagement = 0, totalClicks = 0;
    const topPostsRaw: TopPost[] = [];

    for (const post of postsData) {
      const metrics = (post.post_metrics as Array<{
        likes: number; comments: number; shares: number; reach: number;
        clicks: number; platform: string; recorded_at: string;
      }>) ?? [];

      let postReach = 0, postLikes = 0, postComments = 0;

      for (const m of metrics) {
        const dateKey = new Date(m.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (!dateMap[dateKey]) dateMap[dateKey] = { date: dateKey, reach: 0, likes: 0, comments: 0 };
        dateMap[dateKey].reach    += m.reach;
        dateMap[dateKey].likes    += m.likes;
        dateMap[dateKey].comments += m.comments;

        const plt = m.platform || ((post.platforms as string[])?.[0]) || "unknown";
        if (!platformMap[plt]) platformMap[plt] = { postIds: new Set(), reach: 0, engagement: 0 };
        platformMap[plt].postIds.add(post.id);
        platformMap[plt].reach      += m.reach;
        platformMap[plt].engagement += m.likes + m.comments + m.shares;

        totalReach      += m.reach;
        totalEngagement += m.likes + m.comments + m.shares;
        totalClicks     += m.clicks;
        postReach    += m.reach;
        postLikes    += m.likes;
        postComments += m.comments;
      }

      if (metrics.length > 0) {
        topPostsRaw.push({
          id: post.id,
          content: post.content,
          platform: ((post.platforms as string[])?.[0]) ?? "unknown",
          likes: postLikes, comments: postComments,
          reach: postReach, engagement: postLikes + postComments,
        });
      }
    }

    setEngagementData(Object.values(dateMap));
    setPlatformData(
      Object.entries(platformMap).map(([platform, d]) => ({
        platform: platform.charAt(0).toUpperCase() + platform.slice(1).replace(/_/g, " "),
        posts: d.postIds.size, reach: d.reach, engagement: d.engagement,
      }))
    );
    setTopPosts(topPostsRaw.sort((a, b) => b.engagement - a.engagement).slice(0, 3));
    setStats({ totalReach, totalEngagement, postsPublished: postsData.length, linkClicks: totalClicks });
    setLoading(false);
  }, [workspace?.id, range]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2.5">
            <TrendingUp className="h-6 w-6 text-primary hidden sm:block" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track your content performance across all platforms.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card/60 p-1">
            {(["7d", "30d", "90d"] as DateRangeKey[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  range === r ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {DATE_RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Reach"     value={formatNumber(stats.totalReach)}     icon={Eye}             color="bg-purple-500/15 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400" />
        <StatCard label="Engagements"     value={formatNumber(stats.totalEngagement)} icon={Heart}           color="bg-pink-500/15 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400" />
        <StatCard label="Posts Published" value={stats.postsPublished.toString()}    icon={Users}           color="bg-blue-500/15 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" />
        <StatCard label="Link Clicks"     value={formatNumber(stats.linkClicks)}     icon={MousePointerClick} color="bg-teal-500/15 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400" />
      </div>

      {/* Engagement chart */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-3 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-5">
          <p className="text-sm font-semibold text-foreground">Engagement over time</p>
          <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-purple-500 inline-block" />Reach</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-pink-500 inline-block" />Likes</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" />Comments</span>
          </div>
        </div>
        {engagementData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[220px] gap-2">
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading analytics…</p>
              </>
            ) : (
              <>
                <TrendingUp className="h-6 w-6 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No published posts in this period.</p>
                <p className="text-xs text-muted-foreground/60">Publish content to see your engagement trends.</p>
              </>
            )}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={engagementData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="reach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="likes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#EC4899" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="date"     tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="reach"    stroke="#7C3AED" fill="url(#reach)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="likes"    stroke="#EC4899" fill="url(#likes)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="comments" stroke="#3B82F6" fill="none"         strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform breakdown */}
        <div className="rounded-xl border border-border/60 bg-card/60 p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Platform breakdown</p>
          {platformData.length === 0 ? (
            <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
              {loading ? "Loading…" : "No data yet."}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={platformData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="platform" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                <Bar dataKey="reach"      name="Reach"       fill="#7C3AED" radius={[4,4,0,0]} />
                <Bar dataKey="engagement" name="Engagements" fill="#EC4899" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top posts */}
        <div className="rounded-xl border border-border/60 bg-card/60 p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Top performing posts</p>
          {topPosts.length === 0 ? (
            <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
              {loading ? "Loading…" : "No published posts yet."}
            </div>
          ) : (
            <div className="space-y-3">
              {topPosts.map((post, i) => (
                <div key={post.id} className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted/60 text-xs font-bold text-foreground">{i + 1}</div>
                  <div className="min-w-0">
                    <p className="text-xs text-foreground line-clamp-1 font-medium">{post.content}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="capitalize">{post.platform.replace(/_/g, " ")}</span>
                      <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{post.likes}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{post.comments}</span>
                      <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{formatNumber(post.reach)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
