// ════════════════════════════════════════════════════════════
// FILTER BAR COMPONENT
// Provides filtering options for messages
// ════════════════════════════════════════════════════════════

'use client';

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  type: 'all' | 'comments' | 'messages';
  onTypeChange: (type: 'all' | 'comments' | 'messages') => void;

  status: string;
  onStatusChange: (status: string) => void;

  platforms: string[];
  onPlatformsChange: (platforms: string[]) => void;

  search: string;
  onSearchChange: (search: string) => void;
}

const PLATFORM_OPTIONS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'youtube', label: 'YouTube' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
  { value: 'archived', label: 'Archived' },
];

export function FilterBar({
  type,
  onTypeChange,
  status,
  onStatusChange,
  platforms,
  onPlatformsChange,
  search,
  onSearchChange,
}: FilterBarProps) {
  const togglePlatform = (platform: string) => {
    if (platforms.includes(platform)) {
      onPlatformsChange(platforms.filter((p) => p !== platform));
    } else {
      onPlatformsChange([...platforms, platform]);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Type tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {['all', 'comments', 'messages'].map((t) => (
          <button
            key={t}
            onClick={() =>
              onTypeChange(t as 'all' | 'comments' | 'messages')
            }
            className={cn(
              'pb-2 px-3 text-sm font-medium transition-colors border-b-2',
              type === t
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            )}
          >
            {t === 'all' && 'All Messages'}
            {t === 'comments' && 'Comments'}
            {t === 'messages' && 'Direct Messages'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search messages..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {/* Status filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Platform filters */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Platforms
        </label>
        <div className="flex flex-wrap gap-2">
          {PLATFORM_OPTIONS.map((platform) => (
            <button
              key={platform.value}
              onClick={() => togglePlatform(platform.value)}
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium transition-all',
                platforms.includes(platform.value)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              )}
            >
              {platform.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear filters button */}
      {(search ||
        status ||
        platforms.length > 0 ||
        type !== 'all') && (
        <button
          onClick={() => {
            onTypeChange('all');
            onStatusChange('');
            onPlatformsChange([]);
            onSearchChange('');
          }}
          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          <X className="h-3 w-3" />
          Clear Filters
        </button>
      )}
    </div>
  );
}
