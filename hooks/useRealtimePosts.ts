/**
 * useRealtimePosts — Real-time posts synchronization hook
 *
 * Fetches ALL posts for a workspace and subscribes to real-time changes.
 * Automatically updates when posts are created, updated, or deleted.
 *
 * Returns: { posts, loading, refresh, counts }
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { PostStatus } from "@/types";

export interface PostRow {
  id: string;
  content: string;
  platforms: string[];
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  media_urls: string[];
  thumbnail_url?: string | null;
}

export interface PostCounts {
  all: number;
  scheduled: number;
  published: number;
  draft: number;
  failed: number;
}

/**
 * Hook that fetches all posts for a workspace and subscribes to realtime changes.
 * Keeps posts synchronized across browser tabs and multiple users.
 */
export function useRealtimePosts(workspaceId: string | undefined) {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Fetch all posts for workspace (no server-side status filter)
  const fetchPosts = useCallback(async () => {
    if (!workspaceId) {
      setPosts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("posts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("[useRealtimePosts] Fetch error:", fetchError);
        setError(fetchError.message);
        return;
      }

      console.log(`[useRealtimePosts] Fetched ${data?.length ?? 0} posts`);
      setPosts((data as PostRow[]) ?? []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[useRealtimePosts] Error fetching posts:", errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, supabase]);

  // Initial fetch on mount or workspace change
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!workspaceId) {
      console.log("[useRealtimePosts] No workspace ID, skipping realtime subscription");
      return;
    }

    console.log(`[useRealtimePosts] Opening realtime channel for workspace ${workspaceId}`);

    const channel = supabase
      .channel(`posts:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload: any) => {
          console.log("[useRealtimePosts] Realtime event:", payload.eventType, payload.new?.id || payload.old?.id);

          if (payload.eventType === "INSERT") {
            // Add new post at the top
            const newPost = payload.new as PostRow;
            setPosts((prev) => [newPost, ...prev]);
            console.log(`[useRealtimePosts] ✓ Post inserted: ${newPost.id}`);
          } else if (payload.eventType === "UPDATE") {
            // Update existing post
            const updatedPost = payload.new as PostRow;
            setPosts((prev) =>
              prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
            );
            console.log(`[useRealtimePosts] ✓ Post updated: ${updatedPost.id}`);
          } else if (payload.eventType === "DELETE") {
            // Remove deleted post
            const deletedId = payload.old.id;
            setPosts((prev) => prev.filter((p) => p.id !== deletedId));
            console.log(`[useRealtimePosts] ✓ Post deleted: ${deletedId}`);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[useRealtimePosts] Channel status: ${status}`);
      });

    return () => {
      console.log(`[useRealtimePosts] Closing realtime channel`);
      supabase.removeChannel(channel);
    };
  }, [workspaceId, supabase]);

  // Compute counts from posts array
  const counts: PostCounts = useMemo(() => {
    return {
      all: posts.length,
      scheduled: posts.filter((p) => p.status === PostStatus.Scheduled).length,
      published: posts.filter((p) => p.status === PostStatus.Published).length,
      draft: posts.filter((p) => p.status === PostStatus.Draft).length,
      failed: posts.filter((p) => p.status === PostStatus.Failed).length,
    };
  }, [posts]);

  return {
    posts,
    loading,
    error,
    refresh: fetchPosts,
    counts,
  };
}
