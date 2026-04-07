"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageSquare, Send, Archive, Search, Heart, Reply,
  MoreHorizontal, MessageCircle, ChevronRight, Loader2,
  Twitter, Instagram, Linkedin, Facebook, Youtube, Globe,
  CheckCircle2, X, Filter, Clock, Eye, Trash2, RefreshCw,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { InboxMessageStatus } from "@/types";

// ─── Types ────────────────────────────────────────────────────

type ItemStatus = "unread" | "read" | "replied" | "archived";

interface ThreadEntry {
  id: string;
  author: string;
  avatar: string;
  text: string;
  isMe: boolean;
  time: string;
}

interface CommentItem {
  id: string;
  platform: string;
  author_name: string;
  author_avatar: string;
  content: string;
  status: ItemStatus;
  received_at: string;
  received_at_raw: string;
  post_id: string | null;
  post_preview?: string;
  likes?: number;
  thread?: ThreadEntry[];
}

// ─── Platform config ──────────────────────────────────────────

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  twitter: Twitter, linkedin: Linkedin, instagram: Instagram,
  facebook: Facebook, youtube: Youtube, threads: Globe,
  bluesky: Globe, tiktok: Globe, pinterest: Globe, google_business: Globe,
};

const PLATFORM_COLORS: Record<string, { text: string; bg: string; dot: string }> = {
  twitter:   { text: "text-sky-600 dark:text-sky-400",   bg: "bg-sky-500/10",   dot: "bg-sky-500" },
  linkedin:  { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10",  dot: "bg-blue-500" },
  instagram: { text: "text-pink-600 dark:text-pink-400", bg: "bg-pink-500/10",  dot: "bg-pink-500" },
  facebook:  { text: "text-blue-700 dark:text-blue-500", bg: "bg-blue-600/10",  dot: "bg-blue-500" },
  youtube:   { text: "text-red-600 dark:text-red-400",   bg: "bg-red-500/10",   dot: "bg-red-500" },
  threads:   { text: "text-zinc-600 dark:text-zinc-400", bg: "bg-zinc-500/10",  dot: "bg-zinc-400" },
  bluesky:   { text: "text-sky-500 dark:text-sky-300",   bg: "bg-sky-400/10",   dot: "bg-sky-400" },
  tiktok:    { text: "text-zinc-600 dark:text-zinc-300", bg: "bg-zinc-500/10",  dot: "bg-zinc-400" },
};

const PLATFORM_LABELS: Record<string, string> = {
  twitter: "X", linkedin: "LinkedIn", instagram: "Instagram",
  facebook: "Facebook", youtube: "YouTube", tiktok: "TikTok",
  threads: "Threads", bluesky: "Bluesky",
};

// ─── Helpers ──────────────────────────────────────────────────

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

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

// ─── Platform badge ───────────────────────────────────────────

function PlatformBadge({ platform, size = "sm" }: { platform: string; size?: "sm" | "md" }) {
  const Icon = PLATFORM_ICONS[platform] ?? MessageSquare;
  const pc = PLATFORM_COLORS[platform];
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full font-medium capitalize",
      pc?.bg ?? "bg-muted/40", pc?.text ?? "text-muted-foreground",
      size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
    )}>
      <Icon className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {PLATFORM_LABELS[platform] ?? platform}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────

function StatusDot({ status }: { status: ItemStatus }) {
  const config: Record<ItemStatus, { color: string; label: string }> = {
    unread:   { color: "bg-blue-500",    label: "Unread" },
    read:     { color: "bg-muted-foreground/40", label: "Read" },
    replied:  { color: "bg-emerald-500", label: "Replied" },
    archived: { color: "bg-muted-foreground/30", label: "Archived" },
  };
  const c = config[status];
  return (
    <span className="flex items-center gap-1.5" title={c.label}>
      <span className={cn("h-1.5 w-1.5 rounded-full", c.color)} />
      <span className="text-[10px] text-muted-foreground font-medium">{c.label}</span>
    </span>
  );
}

// ─── Comment list item ────────────────────────────────────────

function CommentListItem({
  item,
  isActive,
  onClick,
}: {
  item: CommentItem;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all duration-150",
        isActive
          ? "bg-primary/5 border-l-2 border-l-primary"
          : "hover:bg-muted/30 border-l-2 border-l-transparent",
        item.status === "unread" && !isActive && "bg-muted/20"
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold",
          item.status === "unread"
            ? "bg-primary/10 text-primary"
            : "bg-muted/60 text-muted-foreground"
        )}>
          {getInitials(item.author_name)}
        </div>
        {/* Platform dot */}
        <span className={cn(
          "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-card",
          PLATFORM_COLORS[item.platform]?.bg ?? "bg-muted/60"
        )}>
          {(() => {
            const Icon = PLATFORM_ICONS[item.platform] ?? MessageCircle;
            return <Icon className={cn("h-2 w-2", PLATFORM_COLORS[item.platform]?.text ?? "text-muted-foreground")} />;
          })()}
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className={cn(
            "text-sm truncate",
            item.status === "unread" ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
          )}>
            {item.author_name}
          </p>
          <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(item.received_at_raw)}</span>
        </div>
        <p className={cn(
          "text-xs line-clamp-2 leading-relaxed",
          item.status === "unread" ? "text-foreground/80" : "text-muted-foreground"
        )}>
          {item.content}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <PlatformBadge platform={item.platform} />
          {item.status === "unread" && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
          {item.status === "replied" && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-2.5 w-2.5" /> Replied
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Detail panel ─────────────────────────────────────────────

function CommentDetail({
  item,
  onClose,
  onArchive,
  onLike,
  onReply,
  onDelete,
}: {
  item: CommentItem;
  onClose: () => void;
  onArchive: () => void;
  onLike: () => void;
  onReply: (text: string) => void;
  onDelete: () => void;
}) {
  const [replyText, setReplyText] = useState("");
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [item.thread?.length]);

  function handleSend() {
    if (!replyText.trim()) return;
    onReply(replyText.trim());
    setReplyText("");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          {/* Mobile back */}
          <button onClick={onClose} className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0">
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>

          {/* Author */}
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold shrink-0",
            "bg-primary/10 text-primary"
          )}>
            {getInitials(item.author_name)}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{item.author_name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <PlatformBadge platform={item.platform} />
              <span className="text-xs text-muted-foreground">{timeAgo(item.received_at_raw)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onLike}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-pink-500 hover:bg-pink-500/10 transition-all"
            title="Like"
          >
            <Heart className={cn("h-3.5 w-3.5", (item.likes ?? 0) > 0 && "fill-pink-500 text-pink-500")} />
            {(item.likes ?? 0) > 0 && <span>{item.likes}</span>}
          </button>
          <button
            onClick={onArchive}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title="Archive"
          >
            <Archive className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Original post context */}
        {item.post_preview && (
          <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Eye className="h-3 w-3 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Original post</p>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{item.post_preview}</p>
          </div>
        )}

        {/* Messages */}
        {item.thread && item.thread.length > 0 ? (
          <div className="space-y-4">
            {item.thread.map((entry) => (
              <div key={entry.id} className={cn("flex gap-3", entry.isMe && "flex-row-reverse")}>
                <div className={cn(
                  "h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold",
                  entry.isMe ? "bg-primary/10 text-primary" : "bg-muted/60 text-muted-foreground"
                )}>
                  {entry.isMe ? "ME" : entry.avatar}
                </div>
                <div className={cn("max-w-[75%]", entry.isMe && "items-end")}>
                  <p className={cn("text-[11px] text-muted-foreground mb-1", entry.isMe && "text-right")}>
                    {entry.isMe ? "You" : entry.author} · {entry.time}
                  </p>
                  <div className={cn(
                    "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    entry.isMe
                      ? "bg-primary text-primary-foreground rounded-tr-md"
                      : "bg-muted/40 text-foreground rounded-tl-md border border-border/30"
                  )}>
                    {entry.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-muted/30 border border-border/30 px-4 py-3.5">
            <p className="text-sm text-foreground leading-relaxed">{item.content}</p>
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Reply box */}
      <div className="border-t border-border/40 p-4">
        <div className="flex items-end gap-2.5">
          <div className="flex-1 relative">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply…"
              rows={2}
              className="w-full resize-none rounded-xl border border-border/50 bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/30 transition-all"
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend(); }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!replyText.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-muted-foreground">
            Replying on <span className="capitalize font-medium">{PLATFORM_LABELS[item.platform] ?? item.platform}</span>
          </p>
          <p className="text-[10px] text-muted-foreground">Ctrl+Enter to send</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

export default function CommentsPage() {
  const supabase = createClient();
  const { workspace } = useWorkspace();

  const [items, setItems]       = useState<CommentItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<CommentItem | null>(null);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ItemStatus>("all");
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!workspace?.id) return;
    setLoading(true);

    const { data } = await supabase
      .from("inbox_messages")
      .select("id, platform, author_name, author_avatar, content, status, received_at, post_id")
      .eq("workspace_id", workspace.id)
      .not("post_id", "is", null)
      .neq("status", InboxMessageStatus.Archived)
      .order("received_at", { ascending: false });

    const mapped: CommentItem[] = (data ?? []).map((row) => ({
      id:             row.id,
      platform:       row.platform ?? "twitter",
      author_name:    row.author_name ?? "Unknown",
      author_avatar:  getInitials(row.author_name),
      content:        row.content ?? "",
      status:         (row.status as ItemStatus) ?? "unread",
      received_at:    new Date(row.received_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      received_at_raw: row.received_at,
      post_id:        row.post_id,
      likes:          undefined,
      thread:         [{
        id: "t0",
        author: row.author_name ?? "Unknown",
        avatar: getInitials(row.author_name),
        text: row.content ?? "",
        isMe: false,
        time: new Date(row.received_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      }],
    }));

    setItems(mapped);
    setLoading(false);
  }, [workspace?.id]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── Computed ──────────────────────────────────────────────────

  const unreadCount = items.filter((i) => i.status === "unread").length;
  const repliedCount = items.filter((i) => i.status === "replied").length;

  const usedPlatforms = Array.from(new Set(items.map((i) => i.platform)));

  const filtered = items.filter((item) => {
    if (item.status === "archived") return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (platformFilter && item.platform !== platformFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.content.toLowerCase().includes(q) || item.author_name.toLowerCase().includes(q);
    }
    return true;
  });

  // ── Handlers ──────────────────────────────────────────────────

  async function handleSelect(item: CommentItem) {
    if (item.status === "unread" && workspace?.id) {
      await supabase
        .from("inbox_messages")
        .update({ status: InboxMessageStatus.Read })
        .eq("id", item.id)
        .eq("workspace_id", workspace.id);
      const updated = { ...item, status: "read" as ItemStatus };
      setItems((prev) => prev.map((i) => i.id === item.id ? updated : i));
      setSelected(updated);
    } else {
      setSelected(item);
    }
  }

  async function handleArchive(id: string) {
    if (!workspace?.id) return;
    await supabase
      .from("inbox_messages")
      .update({ status: InboxMessageStatus.Archived })
      .eq("id", id)
      .eq("workspace_id", workspace.id);
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: "archived" as ItemStatus } : i));
    if (selected?.id === id) setSelected(null);
    toast.success("Comment archived");
  }

  async function handleDelete(id: string) {
    if (!workspace?.id) return;
    const { error } = await supabase
      .from("inbox_messages")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspace.id);
    if (error) { toast.error("Failed to delete"); return; }
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selected?.id === id) setSelected(null);
    toast.success("Comment deleted");
  }

  function handleLike(id: string) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, likes: (i.likes ?? 0) + 1 } : i));
    setSelected((s) => s && s.id === id ? { ...s, likes: (s.likes ?? 0) + 1 } : s);
  }

  async function handleReply(id: string, text: string) {
    const newEntry: ThreadEntry = {
      id: `t${Date.now()}`,
      author: "You",
      avatar: "ME",
      text,
      isMe: true,
      time: "Just now",
    };

    if (workspace?.id) {
      await supabase
        .from("inbox_messages")
        .update({ status: InboxMessageStatus.Replied })
        .eq("id", id)
        .eq("workspace_id", workspace.id);
    }

    const updater = (i: CommentItem) =>
      i.id === id
        ? { ...i, status: "replied" as ItemStatus, thread: [...(i.thread ?? []), newEntry] }
        : i;

    setItems((prev) => prev.map(updater));
    setSelected((s) => s ? updater(s) : s);
    toast.success("Reply sent!");
  }

  // ── Status filter tabs ────────────────────────────────────────

  const STATUS_TABS: { key: "all" | ItemStatus; label: string; count: number }[] = [
    { key: "all",     label: "All",     count: items.filter((i) => i.status !== "archived").length },
    { key: "unread",  label: "Unread",  count: unreadCount },
    { key: "read",    label: "Read",    count: items.filter((i) => i.status === "read").length },
    { key: "replied", label: "Replied", count: repliedCount },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5 page-enter">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2.5">
            <MessageCircle className="h-6 w-6 text-primary" />
            Comments
            {unreadCount > 0 && (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white px-2">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and reply to comments on your posts across all platforms.
          </p>
        </div>
        <button
          onClick={fetchItems}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: items.length, bg: "bg-blue-500/10", color: "text-blue-600 dark:text-blue-400", icon: MessageCircle },
          { label: "Unread", value: unreadCount, bg: "bg-amber-500/10", color: "text-amber-600 dark:text-amber-400", icon: Clock },
          { label: "Replied", value: repliedCount, bg: "bg-emerald-500/10", color: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
        ].map((stat) => (
          <div key={stat.label} className="group rounded-2xl border border-border/50 bg-card p-4 hover:shadow-md hover:border-border/70 transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110", stat.bg)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Split layout */}
      <div
        className="grid grid-cols-1 lg:grid-cols-5 gap-4"
        style={{ minHeight: "420px", height: "calc(100vh - 380px)" }}
      >
        {/* ── Left: comment list ──────────────────────────────── */}
        <div className={cn(
          "lg:col-span-2 flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden",
          selected ? "hidden lg:flex" : "flex"
        )}>
          {/* Search + filters */}
          <div className="p-3 border-b border-border/40 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search comments…"
                className="w-full h-9 rounded-xl border border-border/50 bg-background/50 pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Status tabs */}
            <div className="flex gap-1 bg-muted/20 p-0.5 rounded-lg">
              {STATUS_TABS.map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium transition-all",
                    statusFilter === key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                  {count > 0 && (
                    <span className={cn(
                      "inline-flex h-4 min-w-4 items-center justify-center rounded-full text-[9px] font-bold px-1",
                      statusFilter === key ? "bg-foreground/10 text-foreground" : "bg-transparent text-muted-foreground"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Platform filter */}
            {usedPlatforms.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setPlatformFilter(null)}
                  className={cn(
                    "shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all",
                    !platformFilter ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  All
                </button>
                {usedPlatforms.map((p) => {
                  const pc = PLATFORM_COLORS[p];
                  const Icon = PLATFORM_ICONS[p];
                  const active = platformFilter === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setPlatformFilter(active ? null : p)}
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all",
                        active
                          ? `${pc?.bg} ${pc?.text} ring-1 ring-current/20`
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      )}
                    >
                      {Icon && <Icon className="h-2.5 w-2.5" />}
                      {PLATFORM_LABELS[p] ?? p}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comment list */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/30">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/30">
                  <MessageCircle className="h-6 w-6 text-muted-foreground/30" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">No comments yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {search ? "Try a different search term" : "Comments on your posts will appear here"}
                  </p>
                </div>
              </div>
            ) : filtered.map((item) => (
              <CommentListItem
                key={item.id}
                item={item}
                isActive={selected?.id === item.id}
                onClick={() => handleSelect(item)}
              />
            ))}
          </div>

          {/* Footer count */}
          {!loading && filtered.length > 0 && (
            <div className="border-t border-border/40 px-4 py-2.5">
              <p className="text-[11px] text-muted-foreground">
                {filtered.length} comment{filtered.length !== 1 ? "s" : ""}
                {statusFilter !== "all" && ` (${statusFilter})`}
              </p>
            </div>
          )}
        </div>

        {/* ── Right: detail ──────────────────────────────────── */}
        <div className={cn(
          "lg:col-span-3 flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden",
          selected ? "flex" : "hidden lg:flex"
        )}>
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/20">
                <MessageCircle className="h-8 w-8 text-muted-foreground/20" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Select a comment</p>
                <p className="text-xs text-muted-foreground mt-1">Choose a comment from the list to view and reply</p>
              </div>
            </div>
          ) : (
            <CommentDetail
              item={selected}
              onClose={() => setSelected(null)}
              onArchive={() => handleArchive(selected.id)}
              onLike={() => handleLike(selected.id)}
              onReply={(text) => handleReply(selected.id, text)}
              onDelete={() => handleDelete(selected.id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
