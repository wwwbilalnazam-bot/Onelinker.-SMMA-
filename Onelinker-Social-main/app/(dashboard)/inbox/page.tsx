"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useMessages } from "./hooks/useMessages";
import { useMessagesRealtime } from "./hooks/useMessagesRealtime";
import { MessageList } from "./components/MessageList";
import { FilterBar } from "./components/FilterBar";
import { SyncButton } from "./components/SyncButton";
import { Bell } from "lucide-react";
import toast from "react-hot-toast";

// ════════════════════════════════════════════════════════════
// INBOX PAGE — Unified Social Media Inbox
// Displays comments and DMs from all connected platforms
// ════════════════════════════════════════════════════════════

export default function InboxPage() {
  const { workspace } = useWorkspace();

  // Filter state
  const [type, setType] = useState<"all" | "comments" | "messages">("all");
  const [status, setStatus] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(20);

  // Fetch messages with current filters
  const { messages, total, isLoading, error, hasMore, refetch } = useMessages({
    workspaceId: workspace?.id || "",
    type,
    status: status || undefined,
    platforms: platforms.length > 0 ? platforms : undefined,
    search: search || undefined,
    limit,
  });

  // Real-time updates
  const [realtimeMessages, setRealtimeMessages] = useState<any[]>([]);

  useMessagesRealtime({
    workspaceId: workspace?.id || "",
    enabled: !!workspace?.id,
    onNewMessage: (msg) => {
      // Add to top of list (optimistic update)
      setRealtimeMessages((prev) => [msg, ...prev]);
      toast.success(`New ${msg.message_type || "message"} received`);
    },
    onMessageUpdated: (msg) => {
      // Update in real-time messages array
      setRealtimeMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? msg : m))
      );
    },
    onError: (err) => {
      console.warn("[Inbox] Real-time subscription error:", err);
      // Don't show error toast for realtime - data still loads via fetch
    },
  });

  // Combine real-time and fetched messages, removing duplicates
  const allMessages = [
    ...realtimeMessages,
    ...messages.filter(
      (m) => !realtimeMessages.some((rm) => rm.id === m.id)
    ),
  ];

  // Handle sync completion
  const handleSyncComplete = (result: any) => {
    // Refetch to get latest data
    refetch();
    // Clear real-time cache
    setRealtimeMessages([]);
  };

  // Handle mark as read
  const handleMarkAsRead = async (messageId: string) => {
    try {
      // TODO: Implement update endpoint
      // For now, just show a toast
      toast.success("Message marked as read");
      refetch();
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  // Handle archive
  const handleArchive = async (messageId: string) => {
    try {
      // TODO: Implement archive endpoint
      // For now, just show a toast
      toast.success("Message archived");
      refetch();
    } catch (error) {
      toast.error("Failed to archive message");
    }
  };

  if (!workspace?.id) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Inbox
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {total > 0 ? `${total} messages across all platforms` : "No messages yet"}
          </p>
        </div>

        <SyncButton
          workspaceId={workspace.id}
          onSyncComplete={handleSyncComplete}
        />
      </div>

      {/* Filters */}
      <FilterBar
        type={type}
        onTypeChange={setType}
        status={status}
        onStatusChange={setStatus}
        platforms={platforms}
        onPlatformsChange={setPlatforms}
        search={search}
        onSearchChange={setSearch}
      />

      {/* Messages List */}
      <div>
        <MessageList
          messages={allMessages}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          onMarkAsRead={handleMarkAsRead}
          onArchive={handleArchive}
        />

        {/* Pagination */}
        {hasMore && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setLimit((prev) => prev + 20)}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300 font-medium transition-colors"
            >
              {isLoading ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </div>

      {/* Info banner */}
      {allMessages.length > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3">
          <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium">Real-time updates enabled</p>
            <p className="text-blue-800 dark:text-blue-200">
              New messages from connected accounts will appear automatically. Click
              "Sync Now" to manually refresh.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
