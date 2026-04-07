"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, CheckCircle2, FileText, XCircle, Loader2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { PostStatus } from "@/types";

interface CalendarPost {
  id: string;
  content: string;
  status: string;
  platforms: string[];
  time: string;
}

const STATUS_CONFIG: Record<string, { color: string; dot: string; icon: React.ElementType }> = {
  [PostStatus.Scheduled]:       { color: "bg-blue-500/15 text-blue-600 dark:text-blue-400",     dot: "bg-blue-500 dark:bg-blue-400",         icon: Clock },
  [PostStatus.Published]:       { color: "bg-green-500/15 text-green-600 dark:text-green-400",   dot: "bg-green-500 dark:bg-green-400",        icon: CheckCircle2 },
  [PostStatus.Draft]:           { color: "bg-muted/60 text-muted-foreground",dot: "bg-muted-foreground", icon: FileText },
  [PostStatus.Failed]:          { color: "bg-red-500/15 text-red-600 dark:text-red-400",       dot: "bg-red-500 dark:bg-red-400",          icon: XCircle },
  [PostStatus.PendingApproval]: { color: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400", dot: "bg-yellow-500 dark:bg-yellow-400",       icon: Clock },
};

const FALLBACK_STATUS = { color: "bg-muted/60 text-muted-foreground", dot: "bg-muted-foreground", icon: FileText };

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function CalendarPage() {
  const supabase = createClient();
  const { workspace } = useWorkspace();
  const today = new Date();

  const [year, setYear]           = useState(today.getFullYear());
  const [month, setMonth]         = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [posts, setPosts]         = useState<Record<number, CalendarPost[]>>({});
  const [loading, setLoading]     = useState(true);

  const fetchPosts = useCallback(async () => {
    if (!workspace?.id) return;
    setLoading(true);

    const startOfMonth = new Date(year, month, 1).toISOString();
    const endOfMonth   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    const { data } = await supabase
      .from("posts")
      .select("id, content, platforms, status, scheduled_at, published_at")
      .eq("workspace_id", workspace.id)
      .neq("status", PostStatus.Cancelled)
      .or(
        `and(scheduled_at.gte.${startOfMonth},scheduled_at.lte.${endOfMonth}),` +
        `and(published_at.gte.${startOfMonth},published_at.lte.${endOfMonth})`
      )
      .order("scheduled_at", { ascending: true, nullsFirst: false });

    const grouped: Record<number, CalendarPost[]> = {};
    for (const post of data ?? []) {
      const dateStr = post.scheduled_at ?? post.published_at;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      const day = d.getDate();
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push({
        id: post.id,
        content: post.content,
        status: post.status,
        platforms: (post.platforms as string[]) ?? [],
        time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      });
    }

    setPosts(grouped);
    setLoading(false);
  }, [workspace?.id, year, month]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const daysInMonth     = getDaysInMonth(year, month);
  const firstDay        = getFirstDayOfMonth(year, month);
  const isCurrentMonth  = year === today.getFullYear() && month === today.getMonth();
  const selectedPosts   = selectedDay ? (posts[selectedDay] ?? []) : [];
  const allPosts        = Object.values(posts).flat();

  const counts = {
    scheduled: allPosts.filter((p) => p.status === PostStatus.Scheduled).length,
    published: allPosts.filter((p) => p.status === PostStatus.Published).length,
    draft:     allPosts.filter((p) => p.status === PostStatus.Draft).length,
    failed:    allPosts.filter((p) => p.status === PostStatus.Failed).length,
  };

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelectedDay(null);
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2.5">
            <CalendarDays className="h-6 w-6 text-primary hidden sm:block" />
            Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Plan and visualize your content schedule.</p>
        </div>
        <Link href="/create?sheet=true">
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-white">
            <Plus className="h-4 w-4" /> New Post
          </Button>
        </Link>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {([
          { key: "scheduled" as const, label: "Scheduled", status: PostStatus.Scheduled },
          { key: "published" as const, label: "Published", status: PostStatus.Published },
          { key: "draft"     as const, label: "Draft", status: PostStatus.Draft },
          { key: "failed"    as const, label: "Failed", status: PostStatus.Failed },
        ]).map(({ key, label, status }) => {
          const cfg = STATUS_CONFIG[status] || FALLBACK_STATUS;
          return (
            <div key={key} className="rounded-xl border border-border/60 bg-card/60 px-4 py-3 flex items-center gap-3">
              <div className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
              <div>
                <p className="text-lg font-bold text-foreground">{counts[key]}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* ── Calendar grid ── */}
        <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card/60 overflow-hidden">
          {/* Nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold text-foreground">{MONTH_NAMES[month]} {year}</p>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
            <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 border-b border-border/40">
            {DAY_LABELS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[60px] sm:min-h-[88px] border-b border-r border-border/20 bg-muted/5" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayPosts  = posts[day] ?? [];
              const isToday   = isCurrentMonth && day === today.getDate();
              const isSelected = day === selectedDay;
              const hasItems   = dayPosts.length > 0;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  className={cn(
                    "min-h-[60px] sm:min-h-[88px] border-b border-r border-border/20 p-1 sm:p-1.5 cursor-pointer transition-all duration-150",
                    isSelected
                      ? "bg-primary/5 ring-1 ring-inset ring-primary/20"
                      : "hover:bg-muted/30",
                    isToday && !isSelected && "bg-primary/[0.03]"
                  )}
                >
                  <div className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium mb-0.5 sm:mb-1 transition-colors",
                    isToday
                      ? "bg-primary text-white"
                      : isSelected
                      ? "bg-foreground text-background"
                      : "text-foreground"
                  )}>
                    {day}
                  </div>

                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 2).map((post) => {
                      const cfg = STATUS_CONFIG[post.status as PostStatus] || FALLBACK_STATUS;
                      return (
                        <div key={post.id} className={cn("rounded px-1 py-0.5 text-[10px] font-medium truncate leading-tight", cfg.color)}>
                          <span className="hidden sm:inline">{post.time} · {post.content.slice(0, 18)}…</span>
                          <span className="sm:hidden">{post.time}</span>
                        </div>
                      );
                    })}
                    {dayPosts.length > 2 && (
                      <div className="text-[10px] text-muted-foreground px-1 font-medium">+{dayPosts.length - 2} more</div>
                    )}
                  </div>

                  {/* Mobile dot indicators */}
                  {hasItems && dayPosts.length <= 2 && (
                    <div className="flex gap-0.5 mt-0.5 sm:hidden">
                      {dayPosts.slice(0, 3).map((post) => {
                        const cfg = STATUS_CONFIG[post.status as PostStatus] || FALLBACK_STATUS;
                        return <span key={post.id} className={cn("h-1 w-1 rounded-full", cfg.dot)} />;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Day detail panel ── */}
        <div className="rounded-xl border border-border/60 bg-card/60 p-4 sm:p-5 h-fit">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">
              {selectedDay ? `${MONTH_NAMES[month]} ${selectedDay}` : "Day Details"}
            </p>
            {selectedDay && (
              <Link href="/create?sheet=true">
                <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/15 transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </Link>
            )}
          </div>

          {!selectedDay && (
            <div className="text-center py-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40 mx-auto mb-3">
                <CalendarDays className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">Click a day to see scheduled posts.</p>
            </div>
          )}

          {selectedDay && selectedPosts.length === 0 && (
            <div className="text-center py-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40 mx-auto mb-3">
                <FileText className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">No posts on this day.</p>
              <Link href="/create?sheet=true" className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                <Plus className="h-3 w-3" /> Schedule a post
              </Link>
            </div>
          )}

          <div className="space-y-3">
            {selectedPosts.map((post) => {
              const cfg  = STATUS_CONFIG[post.status as PostStatus] || FALLBACK_STATUS;
              const Icon = cfg.icon;
              const colorClass = cfg.color.split(" ")[1] || "text-foreground";
              return (
                <div key={post.id} className="rounded-lg border border-border/40 bg-background/40 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Icon className={cn("h-3.5 w-3.5", colorClass)} />
                      <span className={cn("text-xs font-medium capitalize rounded-full px-2 py-0.5", cfg.color)}>
                        {post.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{post.time}</span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2">{post.content}</p>
                  <div className="flex gap-1 mt-2">
                    {post.platforms.map((p) => (
                      <span key={p} className="text-[10px] text-muted-foreground bg-muted/40 rounded px-1.5 py-0.5 capitalize">
                        {p.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
