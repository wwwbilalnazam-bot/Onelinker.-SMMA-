"use client";

import { useState, useMemo } from "react";
import {
  Search, Clock, CheckCircle2, AlertCircle, Trash2, Edit2, Eye,
  MoreVertical, Loader2, Plus, Filter, Calendar, TrendingUp,
  Twitter, Linkedin, Instagram, Facebook, Youtube, RefreshCw,
  ChevronLeft, ChevronRight, Globe, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRealtimePosts } from "@/hooks/useRealtimePosts";
import { PostStatus, Platform } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// ─── Icons ────────────────────────────────────────────────────

function TikTokIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/></svg>;
}

// ─── Platform config ──────────────────────────────────────────

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  twitter: Twitter, linkedin: Linkedin, instagram: Instagram,
  facebook: Facebook, youtube: Youtube, tiktok: TikTokIcon,
  threads: Globe,
  bluesky: Globe,
  pinterest: Globe,
  google_business: Globe,
};

const PLATFORM_LABELS: Record<string, string> = {
  twitter: "X", linkedin: "LinkedIn", instagram: "Instagram",
  facebook: "Facebook", youtube: "YouTube", tiktok: "TikTok",
  threads: "Threads", bluesky: "Bluesky", pinterest: "Pinterest",
  google_business: "Google",
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  [PostStatus.Published]:       { label: "Published", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  [PostStatus.Scheduled]:       { label: "Scheduled", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  [PostStatus.Draft]:           { label: "Draft", className: "bg-slate-500/10 text-slate-700 dark:text-slate-400" },
  [PostStatus.Failed]:          { label: "Failed", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
  [PostStatus.PendingApproval]: { label: "Pending", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  [PostStatus.Cancelled]:       { label: "Cancelled", className: "bg-slate-500/10 text-slate-700 dark:text-slate-400" },
};

// ─── Types ────────────────────────────────────────────────────

interface PostRow {
  id: string;
  content: string;
  platforms: Platform[];
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  media_urls: string[];
  thumbnail_url?: string | null;
}

type Tab = "all" | PostStatus.Scheduled | PostStatus.Published | PostStatus.Draft | PostStatus.Failed;

// ─── Helpers ──────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: dateStr.includes(new Date().getFullYear().toString()) ? undefined : "numeric" });
}

function truncateContent(content: string, length: number = 100): string {
  if (content.length <= length) return content;
  return content.slice(0, length).trim() + "…";
}

// ─── Post Menu Component ──────────────────────────────────────

function PostMenu({ postId, onDelete }: { postId: string; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

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
            <Link
              href={`/posts/${postId}`}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors border-b border-border/40"
            >
              <Eye className="h-3.5 w-3.5" />
              View Details
            </Link>
            <Link
              href={`/create?edit=${postId}`}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors border-b border-border/40"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit Post
            </Link>
            <button
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
              className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function PostsPage() {
  const { workspace } = useWorkspace();
  const router = useRouter();
  const { posts: allPosts, loading, counts, refresh, error } = useRealtimePosts(workspace?.id);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);

  const POSTS_PER_PAGE = 20;

  // Show error toast if fetch fails
  if (error) {
    console.error("Posts load error:", error);
  }

  const filteredPosts = useMemo(() => {
    // Filter by status first (using all posts from realtime, not tab-filtered)
    let result = activeTab === "all" ? allPosts : allPosts.filter((p) => p.status === activeTab);

    // Then filter by search query
    if (searchQuery) {
      result = result.filter((p) =>
        p.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  }, [allPosts, activeTab, searchQuery]);

  const paginatedPosts = useMemo(() => {
    const start = (page - 1) * POSTS_PER_PAGE;
    return filteredPosts.slice(start, start + POSTS_PER_PAGE);
  }, [filteredPosts, page]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);

  const handleDelete = async (postId: string) => {
    if (!confirm("Delete this post? Scheduled posts will be cancelled.")) return;

    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      refresh();
      toast.success("Post deleted");
    } catch (err) {
      toast.error("Failed to delete post");
    }
  };

  const tabs: { key: Tab; label: string; count: number }[] = useMemo(() => [
    { key: "all", label: "All", count: counts.all },
    { key: PostStatus.Scheduled, label: "Scheduled", count: counts.scheduled },
    { key: PostStatus.Published, label: "Published", count: counts.published },
    { key: PostStatus.Draft, label: "Draft", count: counts.draft },
    { key: PostStatus.Failed, label: "Failed", count: counts.failed },
  ], [counts]);

  return (
    <div className="min-h-screen bg-background page-enter">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="border-b border-border/40 px-6 sm:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Posts</h1>
              <p className="text-sm text-muted-foreground mt-2">Create, schedule, and manage your social media content</p>
            </div>
            <Link href="/create?sheet=true">
              <Button className="text-sm">
                <Plus className="h-4 w-4" />
                New Post
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="px-6 sm:px-8 py-8">

          {/* ── Search & Filter Bar ── */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border/40 bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* ── Tabs ── */}
          <div className="flex items-center gap-1 mb-8 border-b border-border/40 pb-0 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  activeTab === tab.key
                    ? "text-foreground border-foreground"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {tab.label}
                <span className="ml-2 text-xs font-normal opacity-60">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* ── Posts List ── */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-24">
              <div className="mb-6 flex justify-center">
                <div className="rounded-xl bg-muted/40 p-4">
                  {activeTab === "all" ? (
                    <Plus className="h-8 w-8 text-muted-foreground/40" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
                  )}
                </div>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {activeTab === "all" ? "No posts yet" : `No ${activeTab} posts`}
              </h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
                {activeTab === "all"
                  ? "Create your first post to get started with scheduling across your social accounts."
                  : "No posts in this category."}
              </p>
              {activeTab === "all" && (
                <Link href="/create?sheet=true">
                  <Button>
                    <Plus className="h-4 w-4" />
                    Create Post
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3 mb-8">
              {paginatedPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-lg border border-border/40 bg-card px-6 py-4 hover:border-border/60 hover:shadow-sm transition-all flex items-center justify-between gap-4 cursor-pointer group"
                  onClick={() => router.push(`/posts/${post.id}`)}
                >
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    {post.thumbnail_url ? (
                      <img
                        src={post.thumbnail_url}
                        alt="Post thumbnail"
                        className="h-24 w-24 rounded-lg object-cover border border-border/40"
                        onError={(e) => {
                          // Fallback to first media URL if thumbnail fails
                          if (post.media_urls?.[0]) {
                            (e.target as HTMLImageElement).src = post.media_urls[0];
                          }
                        }}
                      />
                    ) : post.media_urls && post.media_urls.length > 0 ? (
                      <img
                        src={post.media_urls[0]}
                        alt="Post thumbnail"
                        className="h-24 w-24 rounded-lg object-cover border border-border/40"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-lg bg-muted/40 flex items-center justify-center border border-border/40">
                        <FileText className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  {/* Left: Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {truncateContent(post.content, 100)}
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        {post.platforms.slice(0, 3).map((p) => {
                          const Icon = PLATFORM_ICONS[p] as React.ElementType;
                          return (
                            <span key={p} title={PLATFORM_LABELS[p] ?? p}>
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                          );
                        })}
                        {post.platforms.length > 3 && (
                          <span>+{post.platforms.length - 3}</span>
                        )}
                      </div>
                      <span className="text-border/40">·</span>
                      {post.status === PostStatus.Scheduled ? (
                        <>
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(post.scheduled_at)}</span>
                        </>
                      ) : post.status === PostStatus.Published ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{timeAgo(post.published_at)}</span>
                        </>
                      ) : (
                        <span>{timeAgo(post.created_at)}</span>
                      )}
                      {post.media_urls.length > 0 && (
                        <>
                          <span className="text-border/40">·</span>
                          <span>{post.media_urls.length} media</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Status & Menu */}
                  <div className="flex items-center gap-4 flex-shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
                    <span className={cn("text-xs font-medium px-2 py-1 rounded", STATUS_CONFIG[post.status]?.className ?? "bg-slate-500/10 text-slate-700 dark:text-slate-400")}>
                      {STATUS_CONFIG[post.status]?.label ?? post.status}
                    </span>
                    <PostMenu postId={post.id} onDelete={() => handleDelete(post.id)} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-8 border-t border-border/40">
              <p className="text-sm text-muted-foreground">
                Showing {Math.min(page * POSTS_PER_PAGE - POSTS_PER_PAGE + 1, filteredPosts.length)}–{Math.min(page * POSTS_PER_PAGE, filteredPosts.length)} of {filteredPosts.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
