// ════════════════════════════════════════════════════════════
// useMessagesRealtime Hook
// Subscribes to real-time message updates via Supabase
// ════════════════════════════════════════════════════════════

'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

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

interface UseMessagesRealtimeParams {
  workspaceId: string;
  enabled?: boolean;
  onNewMessage?: (message: Message) => void;
  onMessageUpdated?: (message: Message) => void;
  onMessageDeleted?: (messageId: string) => void;
  onError?: (error: Error) => void;
}

export function useMessagesRealtime({
  workspaceId,
  enabled = true,
  onNewMessage,
  onMessageUpdated,
  onMessageDeleted,
  onError,
}: UseMessagesRealtimeParams): void {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !workspaceId) {
      return;
    }

    const setupSubscription = async () => {
      try {
        const supabase = createClient();

        // Subscribe to changes in the messages table for this workspace
        const subscription = supabase
          .channel(`messages:${workspaceId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `workspace_id=eq.${workspaceId}`,
            },
            (payload) => {
              if (payload.new) {
                onNewMessage?.(payload.new as Message);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'messages',
              filter: `workspace_id=eq.${workspaceId}`,
            },
            (payload) => {
              if (payload.new) {
                onMessageUpdated?.(payload.new as Message);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'messages',
              filter: `workspace_id=eq.${workspaceId}`,
            },
            (payload) => {
              if (payload.old && payload.old.id) {
                onMessageDeleted?.(payload.old.id);
              }
            }
          )
          .subscribe((status) => {
            if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              const error = new Error(
                `Realtime subscription failed with status: ${status}`
              );
              onError?.(error);
              console.error('[useMessagesRealtime] Subscription error:', error);
            }
          });

        unsubscribeRef.current = () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to setup realtime subscription');
        onError?.(err);
        console.error('[useMessagesRealtime] Setup error:', err);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [enabled, workspaceId, onNewMessage, onMessageUpdated, onMessageDeleted, onError]);
}
