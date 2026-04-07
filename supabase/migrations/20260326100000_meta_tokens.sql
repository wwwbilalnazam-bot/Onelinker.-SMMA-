-- ════════════════════════════════════════════════════════════
-- META TOKENS — Stores Facebook/Instagram access tokens
-- for the Meta Direct provider (your own Meta app).
--
-- Page access tokens from Facebook Login are long-lived (~60 days).
-- They're needed for posting to Pages and Instagram Business Accounts.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS meta_tokens (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id      text NOT NULL,            -- matches social_accounts.outstand_account_id (e.g. "meta_fb_123")
  platform        text NOT NULL,            -- "facebook" or "instagram"
  page_id         text NOT NULL,            -- Facebook Page ID
  ig_user_id      text,                     -- Instagram Business Account ID (null for FB pages)
  access_token    text NOT NULL,            -- Page access token (long-lived)
  user_access_token text,                   -- User-level long-lived token (for refreshing)
  meta_user_id    text,                     -- Facebook User ID who authorized
  expires_at      timestamptz,              -- Token expiration
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),

  UNIQUE (workspace_id, account_id)
);

-- Index for quick token lookups during posting
CREATE INDEX IF NOT EXISTS idx_meta_tokens_workspace_account
  ON meta_tokens (workspace_id, account_id);

-- RLS: only service role can access tokens (never expose to client)
ALTER TABLE meta_tokens ENABLE ROW LEVEL SECURITY;

-- No client-side policies — tokens are only accessed server-side via service role.
-- This ensures tokens are never exposed to the browser.

COMMENT ON TABLE meta_tokens IS 'Stores Meta (Facebook/Instagram) access tokens for the direct API provider. Only accessible via service role.';
