// ════════════════════════════════════════════════════════════
// SYNC BUTTON COMPONENT
// Triggers inbox sync with loading state and feedback
// ════════════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface SyncButtonProps {
  workspaceId: string;
  onSyncComplete?: (result: any) => void;
  disabled?: boolean;
}

export function SyncButton({
  workspaceId,
  onSyncComplete,
  disabled = false,
}: SyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const handleSync = async () => {
    if (!workspaceId || isLoading || disabled) return;

    try {
      setIsLoading(true);
      const toastId = toast.loading('Syncing messages...');

      const response = await fetch('/api/inbox/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          syncComments: true,
          syncMessages: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Sync failed');
      }

      const result = await response.json();
      setLastSyncTime(new Date());

      const { synced = 0, errors = 0 } = result.data || {};

      toast.dismiss(toastId);

      if (errors > 0) {
        toast.error(
          `Synced ${synced} messages with ${errors} error(s)`,
          { duration: 4000 }
        );
      } else if (synced > 0) {
        toast.success(`Synced ${synced} new messages!`);
      } else {
        toast.success('No new messages');
      }

      onSyncComplete?.(result.data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Sync failed',
        { duration: 4000 }
      );
      console.error('[SyncButton] Sync error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={isLoading || disabled}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
      >
        <RefreshCw
          className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
        />
        {isLoading ? 'Syncing...' : 'Sync Now'}
      </button>

      {lastSyncTime && (
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Check className="h-3 w-3 text-green-600" />
          <span>
            Last synced{' '}
            {new Date().getTime() - lastSyncTime.getTime() < 60000
              ? 'just now'
              : `${Math.floor(
                  (new Date().getTime() - lastSyncTime.getTime()) / 60000
                )}m ago`}
          </span>
        </div>
      )}
    </div>
  );
}
