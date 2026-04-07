"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Globe,
  MoreHorizontal,
  Edit2,
  Trash2,
  Share2,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  Heart,
  MessageSquare,
  BarChart3,
  Play,
  FileText,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { PostStatus, Platform } from "@/types";
import toast from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────

const PLATFORM_LABELS: Record<string, string> = {
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  threads: "Threads",
  bluesky: "Bluesky",
  pinterest: "Pinterest",
  google_business: "Google Business",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  [PostStatus.Published]:       { label: "Published", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2 },
  [PostStatus.Scheduled]:       { label: "Scheduled", color: "text-blue-600 dark:text-blue-400",      bg: "bg-blue-500/10",    icon: Calendar },
  [PostStatus.Draft]:           { label: "Draft",     color: "text-muted-foreground",                  bg: "bg-muted/30",       icon: FileText },
  [PostStatus.Failed]:          { label: "Failed",    color: "text-red-600 dark:text-red-400",         bg: "bg-red-500/10",     icon: AlertCircle },
  [PostStatus.PendingApproval]: { label: "Pending",   color: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/10",   icon: Clock },
};

function formatFullDate(iso: string | null): string {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TikTokIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/></svg>;
}

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  twitter: Twitter, linkedin: Linkedin, instagram: Instagram,
  facebook: Facebook, youtube: Youtube, tiktok: TikTokIcon,
};

// ─── Page Component ───────────────────────────────────────────

export default function PostDetailsPage() {
  const { id } = useParams() as { id: string };
  const { workspace } = useWorkspace();
  const router = useRouter();
  const supabase = createClient();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchPost = useCallback(async () => {
    if (!workspace?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select("*, post_metrics(*)")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .single();

    if (error || !data) {
      toast.error("Failed to load post details");
      router.push("/posts");
      return;
    }

    setPost(data);
    setLoading(false);
  }, [id, router, supabase]);

  useEffect(() => {
    if (workspace?.id) fetchPost();
  }, [fetchPost, workspace?.id]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this post?")) return;
    setDeleting(true);
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete post");
      setDeleting(false);
      return;
    }
    toast.success("Post deleted");
    router.push("/posts");
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading post details...</p>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG[PostStatus.Draft];
  const date = post.published_at || post.scheduled_at || post.created_at;
  const metrics = post.post_metrics || [];
  const totalReach = metrics.reduce((sum: number, m: any) => sum + (m.reach || 0), 0);
  const totalLikes = metrics.reduce((sum: number, m: any) => sum + (m.likes || 0), 0);
  const totalComments = metrics.reduce((sum: number, m: any) => sum + (m.comments || 0), 0);
  const totalShares = metrics.reduce((sum: number, m: any) => sum + (m.shares || 0), 0);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => router.back()}
          className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Posts
        </button>
        <div className="flex items-center gap-2">
          {(post.status === PostStatus.Draft || post.status === PostStatus.Scheduled) && (
            <Link href={`/create?edit=${id}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit2 className="h-4 w-4" /> Edit Post
              </Button>
            </Link>
          )}
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Post Content & Media */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="rounded-3xl border border-border/50 bg-card overflow-hidden shadow-sm">
            {/* Post Content */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", cfg.bg, cfg.color)}>
                    <cfg.icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Created on {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {post.title || "Post Content"}
                </h1>
              </div>

              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {post.content || <span className="italic text-muted-foreground">No caption content.</span>}
                </p>
              </div>

              {/* Per-Platform Overrides */}
              {post.channel_content && Object.keys(post.channel_content).length > 0 && (
                <div className="mt-8 space-y-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Platform Overrides</h2>
                  <div className="space-y-4">
                    {Object.entries(post.channel_content as Record<string, string>).map(([platform, content]) => {
                      const Icon = PLATFORM_ICONS[platform] || Globe;
                      return (
                        <div key={platform} className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-foreground/70">
                            <Icon className="h-3.5 w-3.5" />
                            {PLATFORM_LABELS[platform] || platform}
                          </div>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{content}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {post.first_comment && (
                <div className="mt-6 p-4 rounded-2xl bg-muted/30 border border-border/40">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">First Comment</p>
                  <p className="text-sm text-foreground/80">{post.first_comment}</p>
                </div>
              )}
            </div>

            {/* Media Gallery */}
            {post.media_urls && post.media_urls.length > 0 && (
              <div className="border-t border-border/40 bg-muted/10 p-6 sm:p-8">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Attached Media</h2>
                <div className={cn(
                  "grid gap-4",
                  post.media_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"
                )}>
                  {post.media_urls.map((url: string, index: number) => {
                    const isVideo = /\.(mp4|mov|webm)(\?.*)?$/i.test(url) || url.includes("youtube.com") || url.includes("youtu.be");
                    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
                    
                    let thumb = url;
                    if (isYouTube) {
                      const videoId = url.includes("youtu.be") 
                        ? url.split("/").pop()?.split("?")[0] 
                        : new URL(url).searchParams.get("v");
                      thumb = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : url;
                    }

                    return (
                      <div key={index} className="relative group aspect-video rounded-2xl border border-border/40 overflow-hidden bg-black/5">
                        <Image
                          src={thumb}
                          alt={`Post Media ${index + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                              <Play className="h-6 w-6 text-white fill-white ml-0.5" />
                            </div>
                          </div>
                        )}
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ExternalLink className="h-4 w-4 text-white" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Settings & Metrics */}
        <div className="space-y-6">
          
          {/* Post Details Card */}
          <div className="rounded-3xl border border-border/50 bg-card p-6 space-y-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Post Details</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Scheduled Date</p>
                  <p className="text-sm font-semibold">{formatFullDate(post.scheduled_at)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Status</p>
                  <p className="text-sm font-semibold capitalize">{post.status}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium mb-1.5">Platforms</p>
                  <div className="flex flex-wrap gap-1.5">
                    {post.platforms.map((p: string) => {
                      const Icon = PLATFORM_ICONS[p] || Globe;
                      return (
                        <span key={p} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] font-bold text-foreground">
                          <Icon className="h-3 w-3" />
                          {PLATFORM_LABELS[p] || p}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Card */}
          {post.status === PostStatus.Published && (
            <div className="rounded-3xl border border-border/50 bg-card p-6 space-y-6 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <BarChart3 className="h-24 w-24" />
              </div>
              
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Performance</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Reach</span>
                  </div>
                  <p className="text-2xl font-bold">{totalReach.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Heart className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Likes</span>
                  </div>
                  <p className="text-2xl font-bold">{totalLikes.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Comments</span>
                  </div>
                  <p className="text-2xl font-bold">{totalComments.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Share2 className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Shares</span>
                  </div>
                  <p className="text-2xl font-bold">{totalShares.toLocaleString()}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-border/40">
                <Button variant="ghost" className="w-full text-xs gap-2" size="sm">
                  View Full Analytics <BarChart3 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Social Preview Placeholder */}
          <div className="rounded-3xl border border-dashed border-border/60 bg-muted/5 p-8 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center">
              <Share2 className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground/70">Social Preview</p>
              <p className="text-[11px] text-muted-foreground px-4">Interactive previews coming soon for all platforms.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
