-- ════════════════════════════════════════════════════════════
-- UNIFIED INBOX SCHEMA MIGRATION
-- Adds support for direct messages, sync logs, and enhanced
-- message/comment storage with RLS policies
-- ════════════════════════════════════════════════════════════

-- ── 1. Enhance social_accounts table ────────────────────────
-- Add columns for token encryption and sync tracking

ALTER TABLE social_accounts
ADD COLUMN IF NOT EXISTS encrypted_access_token TEXT,
ADD COLUMN IF NOT EXISTS encrypted_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_comment_sync_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_dm_sync_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_error TEXT,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending'; -- pending, syncing, success, error

-- ── 2. Create messages table (for DMs) ──────────────────────

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'tiktok', 'youtube', 'linkedin', 'threads', 'bluesky')),
  account_id TEXT NOT NULL, -- outstand_account_id (e.g., "meta_ig_123456789")
  external_message_id TEXT NOT NULL, -- platform's unique ID for the message
  conversation_id TEXT, -- platform's conversation/thread ID (for grouping)

  -- Sender info
  sender_id TEXT, -- platform's user ID
  sender_name TEXT NOT NULL,
  sender_avatar TEXT,

  -- Recipient info (only if message was sent by logged-in user)
  recipient_id TEXT,
  recipient_name TEXT,
  recipient_avatar TEXT,

  -- Message content
  content TEXT,
  message_type TEXT DEFAULT 'text', -- text, image, video, etc.
  media_urls TEXT[], -- array of URLs

  -- Status & timestamps
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived')),
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE, -- when user sent a reply (if applicable)

  -- Metadata
  is_sent_by_user BOOLEAN DEFAULT FALSE, -- whether message was sent by account owner
  parent_message_id TEXT, -- if this is a reply, reference parent
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(workspace_id, external_message_id)
);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_workspace_id ON messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_messages_account_id ON messages(account_id);
CREATE INDEX IF NOT EXISTS idx_messages_platform ON messages(platform);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_received_at ON messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_workspace_platform_status ON messages(workspace_id, platform, status);
CREATE INDEX IF NOT EXISTS idx_messages_sender_name ON messages USING GIN (to_tsvector('english', sender_name || ' ' || COALESCE(content, '')));

-- ── 3. Create sync_logs table ──────────────────────────────

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL, -- outstand_account_id
  platform TEXT NOT NULL,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('comments', 'messages', 'both')),

  -- Results
  synced_count INT DEFAULT 0,
  skipped_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  total_processed INT DEFAULT 0,

  -- Status & errors
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'success', 'partial_success', 'failed')),
  error_message TEXT,
  error_details JSONB, -- detailed error info for debugging

  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INT, -- milliseconds taken

  -- Pagination/cursor info (for next sync)
  next_cursor TEXT,
  last_message_id TEXT, -- for deduplication

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_workspace_id ON sync_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_account_id ON sync_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_platform ON sync_logs(platform);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_workspace_created_at ON sync_logs(workspace_id, created_at DESC);

-- ── 4. Update inbox_messages table ────────────────────────

-- Add missing fields for consistency with messages table
ALTER TABLE inbox_messages
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS sync_log_id UUID REFERENCES sync_logs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reply_count INT DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_inbox_messages_workspace_created ON inbox_messages(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_status ON inbox_messages(status);

-- ── 5. Row Level Security (RLS) ────────────────────────────

-- Disable RLS initially for migration, enable after
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs DISABLE ROW LEVEL SECURITY;

-- RLS on messages table
CREATE POLICY "Users can view messages from their workspace"
ON messages
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = messages.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.accepted_at IS NOT NULL
  )
);

CREATE POLICY "Service role can insert messages"
ON messages
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update message status (read, archived, replied)"
ON messages
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = messages.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.accepted_at IS NOT NULL
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = messages.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.accepted_at IS NOT NULL
  )
);

CREATE POLICY "Service role can delete messages"
ON messages
FOR DELETE
WITH CHECK (true);

-- RLS on sync_logs table (view only, not editable by users)
CREATE POLICY "Users can view sync logs from their workspace"
ON sync_logs
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = sync_logs.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.accepted_at IS NOT NULL
  )
);

CREATE POLICY "Service role can insert sync logs"
ON sync_logs
FOR INSERT
WITH CHECK (true);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- ── 6. RLS on inbox_messages (existing table) ──────────────

-- Check if RLS policies exist; if not, create them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inbox_messages'
      AND policyname = 'Users can view inbox_messages from their workspace'
  ) THEN
    CREATE POLICY "Users can view inbox_messages from their workspace"
    ON inbox_messages
    FOR SELECT
    USING (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = inbox_messages.workspace_id
          AND workspace_members.user_id = auth.uid()
          AND workspace_members.accepted_at IS NOT NULL
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inbox_messages'
      AND policyname = 'Service role can manage inbox_messages'
  ) THEN
    CREATE POLICY "Service role can manage inbox_messages"
    ON inbox_messages
    FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- ── 7. Enable Realtime ────────────────────────────────────

-- Run these in Supabase Dashboard > Database > Replication
-- Or via Supabase CLI: supabase realtime enable messages sync_logs
-- These allow clients to subscribe to changes

-- ── 8. Grant permissions for service role ──────────────────

GRANT ALL ON messages TO service_role;
GRANT ALL ON sync_logs TO service_role;
GRANT ALL ON inbox_messages TO service_role;
GRANT ALL ON social_accounts TO service_role;

-- ════════════════════════════════════════════════════════════
-- Migration complete. Run these commands in your Supabase Dashboard:
--
-- 1. Enable Replication for real-time updates:
--    supabase realtime enable messages
--    supabase realtime enable sync_logs
--
-- 2. Run `ANALYZE messages; ANALYZE sync_logs;` to update stats
--
-- ════════════════════════════════════════════════════════════
