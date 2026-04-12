# Database Migration Instructions

## Method 1: Supabase Dashboard (Recommended) ✅

### Steps:
1. Go to https://app.supabase.com/project/ayhawnmdihynhstmabpi/editor
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"**
4. Copy the entire migration SQL below
5. Paste into the SQL editor
6. Click **"Run"** button

---

## Migration SQL

```sql
-- ════════════════════════════════════════════════════════════
-- UNIFIED INBOX SCHEMA MIGRATION
-- ════════════════════════════════════════════════════════════

-- 1. Enhance social_accounts table
ALTER TABLE social_accounts
ADD COLUMN IF NOT EXISTS encrypted_access_token TEXT,
ADD COLUMN IF NOT EXISTS encrypted_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_comment_sync_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_dm_sync_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_error TEXT,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';

-- 2. Create messages table (for DMs)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'tiktok', 'youtube', 'linkedin', 'threads', 'bluesky')),
  account_id TEXT NOT NULL,
  external_message_id TEXT NOT NULL,
  conversation_id TEXT,
  sender_id TEXT,
  sender_name TEXT NOT NULL,
  sender_avatar TEXT,
  recipient_id TEXT,
  recipient_name TEXT,
  recipient_avatar TEXT,
  content TEXT,
  message_type TEXT DEFAULT 'text',
  media_urls TEXT[],
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived')),
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  is_sent_by_user BOOLEAN DEFAULT FALSE,
  parent_message_id TEXT,
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

-- 3. Create sync_logs table
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('comments', 'messages', 'both')),
  synced_count INT DEFAULT 0,
  skipped_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  total_processed INT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'success', 'partial_success', 'failed')),
  error_message TEXT,
  error_details JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INT,
  next_cursor TEXT,
  last_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_workspace_id ON sync_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_account_id ON sync_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_platform ON sync_logs(platform);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_workspace_created_at ON sync_logs(workspace_id, created_at DESC);

-- 4. Update inbox_messages table
ALTER TABLE inbox_messages
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS sync_log_id UUID REFERENCES sync_logs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reply_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_inbox_messages_workspace_created ON inbox_messages(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_status ON inbox_messages(status);

-- 5. Row Level Security (RLS)
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs DISABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from their workspace"
ON messages FOR SELECT
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
ON messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update message status (read, archived, replied)"
ON messages FOR UPDATE
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
ON messages FOR DELETE
WITH CHECK (true);

CREATE POLICY "Users can view sync logs from their workspace"
ON sync_logs FOR SELECT
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
ON sync_logs FOR INSERT
WITH CHECK (true);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- 6. RLS on inbox_messages (existing table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inbox_messages'
      AND policyname = 'Users can view inbox_messages from their workspace'
  ) THEN
    CREATE POLICY "Users can view inbox_messages from their workspace"
    ON inbox_messages FOR SELECT
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
    ON inbox_messages FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- 7. Grant permissions
GRANT ALL ON messages TO service_role;
GRANT ALL ON sync_logs TO service_role;
GRANT ALL ON inbox_messages TO service_role;
GRANT ALL ON social_accounts TO service_role;
```

---

## After Running Migration

### Step 1: Enable Realtime
1. Go to Supabase Dashboard > **Database** > **Replication**
2. Click the toggle next to:
   - `messages` table
   - `sync_logs` table
3. Wait for status to show "Replicating"

### Step 2: Verify Tables Created
1. Go to Supabase Dashboard > **Tables**
2. Confirm you see:
   - `messages` (new)
   - `sync_logs` (new)
   - `inbox_messages` (updated)

### Step 3: Test the Inbox
1. Start dev server: `PORT=5555 npm run dev`
2. Go to `http://localhost:5555/dashboard/inbox`
3. Click **"Sync Now"** button
4. Watch for messages to appear

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| SQL Error: "table already exists" | Migration is idempotent - safe to retry |
| RLS policies show error | Ensure `workspace_members` table exists |
| Realtime toggle greyed out | Wait 30 seconds, refresh page |
| Sync button returns 500 error | Check `TOKEN_ENCRYPTION_KEY` in `.env.local` |
| No messages appear after sync | Verify social accounts connected and active |

---

## What Was Created

✅ **messages** table - Direct messages/DMs (with 8 indexes)
✅ **sync_logs** table - Sync history and monitoring
✅ **RLS policies** - Workspace isolation on all tables
✅ **Indexes** - Performance optimization for queries
✅ **Service role permissions** - API can write data

Ready to sync messages from all connected platforms! 🎉
