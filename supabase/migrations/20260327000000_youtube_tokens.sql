-- ════════════════════════════════════════════════════════════
-- YOUTUBE TOKENS — Stores Google/YouTube OAuth tokens
-- for the YouTube Direct provider.
--
-- Google access tokens expire after ~1 hour.
-- Refresh tokens are indefinite (until user revokes).
-- The app auto-refreshes access tokens using the refresh token.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS youtube_tokens (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id      text NOT NULL,            -- matches social_accounts.outstand_account_id (e.g. "yt_UC...")
  channel_id      text NOT NULL,            -- YouTube Channel ID (e.g. "UC...")
  access_token    text NOT NULL,            -- Short-lived (~1hr), auto-refreshed
  refresh_token   text NOT NULL,            -- Long-lived, used to get new access tokens
  expires_at      timestamptz,              -- Access token expiration
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),

  UNIQUE (workspace_id, account_id)
);

-- Index for quick token lookups during posting
CREATE INDEX IF NOT EXISTS idx_youtube_tokens_workspace_account
  ON youtube_tokens (workspace_id, account_id);

-- RLS: only service role can access tokens (never expose to client)
ALTER TABLE youtube_tokens ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE youtube_tokens IS 'Stores YouTube/Google OAuth tokens for the direct API provider. Only accessible via service role.';
