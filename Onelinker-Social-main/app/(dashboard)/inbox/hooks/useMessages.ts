// ════════════════════════════════════════════════════════════
// useMessages Hook
// Fetches messages and comments with filtering and pagination
// ════════════════════════════════════════════════════════════

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Message {
  id: string;
  platform: string;
  author_name?: string;
  sender_name?: string;
  content: string;
  status: string;
  received_at: string;
  message_type: 'comment' | 'message';
  author_avatar?: string;
  sender_avatar?: string;
}

interface UseMessagesParams {
  workspaceId: string;
  type?: 'all' | 'comments' | 'messages';
  status?: string;
  platforms?: string[];
  search?: string;
  limit?: number;
}

interface UseMessagesResult {
  messages: Message[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  refetch: () => void;
}

export function useMessages({
  workspaceId,
  type = 'all',
  status,
  platforms,
  search,
  limit = 20,
}: UseMessagesParams): UseMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!workspaceId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        workspace_id: workspaceId,
        type,
        limit: limit.toString(),
        offset: '0',
      });

      // Add optional parameters
      if (status) {
        params.append('status', status);
      }

      if (search) {
        params.append('search', search);
      }

      if (platforms && platforms.length > 0) {
        platforms.forEach((p) => params.append('platform', p));
      }

      // Fetch from API endpoint
      const response = await fetch(`/api/inbox/messages?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch messages');
      }

      const result = await response.json();
      setMessages(result.data || []);
      setTotal(result.total || 0);
      setHasMore(result.has_more || false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch messages');
      setError(error);
      console.error('[useMessages] Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, type, status, platforms, search, limit]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    total,
    isLoading,
    error,
    hasMore,
    refetch: fetchMessages,
  };
}
