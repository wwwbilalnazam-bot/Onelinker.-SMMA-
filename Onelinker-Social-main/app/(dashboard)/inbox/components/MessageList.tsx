// ════════════════════════════════════════════════════════════
// MESSAGE LIST COMPONENT
// Displays comments and DMs in a clean list view
// ════════════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import {
  MessageSquare,
  Twitter,
  Instagram,
  Facebook,
  Youtube,
  Clock,
  Archive,
  CheckCircle2,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PLATFORM_COLORS: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  facebook: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    text: 'text-blue-600 dark:text-blue-400',
    icon: Facebook,
  },
  instagram: {
    bg: 'bg-pink-50 dark:bg-pink-950',
    text: 'text-pink-600 dark:text-pink-400',
    icon: Instagram,
  },
  twitter: {
    bg: 'bg-sky-50 dark:bg-sky-950',
    text: 'text-sky-600 dark:text-sky-400',
    icon: Twitter,
  },
  youtube: {
    bg: 'bg-red-50 dark:bg-red-950',
    text: 'text-red-600 dark:text-red-400',
    icon: Youtube,
  },
};

interface Message {
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

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  onMessageClick?: (message: Message) => void;
  onMarkAsRead?: (messageId: string) => void;
  onArchive?: (messageId: string) => void;
}

export function MessageList({
  messages,
  isLoading,
  error,
  onRetry,
  onMessageClick,
  onMarkAsRead,
  onArchive,
}: MessageListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="p-4 border rounded-lg animate-pulse bg-gray-50 dark:bg-gray-800"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950 rounded-lg">
        <p className="text-red-800 dark:text-red-200 font-semibold mb-2">
          Error loading messages
        </p>
        <p className="text-red-700 dark:text-red-300 text-sm mb-3">
          {error.message}
        </p>
        <button
          onClick={onRetry}
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-3" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">
          No messages yet
        </p>
        <p className="text-gray-500 dark:text-gray-500 text-sm">
          Click "Sync Now" to fetch messages from your connected accounts
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {messages.map((message) => {
        const platformConfig =
          PLATFORM_COLORS[message.platform] ||
          PLATFORM_COLORS.facebook;
        const PlatformIcon = platformConfig.icon;
        const authorName = message.author_name || message.sender_name || 'Unknown';
        const isUnread = message.status === 'unread';
        const isSelected = selectedId === message.id;

        return (
          <div
            key={message.id}
            onClick={() => {
              setSelectedId(message.id);
              onMessageClick?.(message);
            }}
            className={cn(
              'p-4 border rounded-lg cursor-pointer transition-all',
              isSelected
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-950'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
              isUnread && 'bg-blue-50 dark:bg-blue-950/50'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Left: Author info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {message.author_avatar || message.sender_avatar ? (
                    <img
                      src={
                        message.author_avatar ||
                        message.sender_avatar
                      }
                      alt={authorName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {authorName[0]}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {authorName}
                    </h3>
                  </div>

                  {/* Platform badge */}
                  <div
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap',
                      platformConfig.bg,
                      platformConfig.text
                    )}
                  >
                    <PlatformIcon className="h-3 w-3" />
                    <span>{message.platform}</span>
                  </div>
                </div>

                {/* Message content */}
                <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-2">
                  {message.content}
                </p>

                {/* Metadata */}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(message.received_at).toLocaleString()}
                  </div>

                  {message.message_type === 'message' && (
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">
                      DM
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Status & actions */}
              <div className="flex items-center gap-2">
                {isUnread && (
                  <div className="h-2 w-2 rounded-full bg-blue-600" />
                )}

                {message.status === 'replied' && (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                )}

                {/* Actions dropdown */}
                <div className="relative group">
                  <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                    <MoreHorizontal className="h-4 w-4 text-gray-400" />
                  </button>

                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    {isUnread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead?.(message.id);
                        }}
                        className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg"
                      >
                        Mark as Read
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchive?.(message.id);
                      }}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 last:rounded-b-lg"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
