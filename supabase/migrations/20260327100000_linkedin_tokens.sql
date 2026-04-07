-- ════════════════════════════════════════════════════════════
-- LinkedIn Tokens — stores OAuth tokens for LinkedIn direct
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS linkedin_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id    text NOT NULL,        -- matches social_accounts.outstand_account_id (li_xxx)
  linkedin_urn  text NOT NULL,        -- e.g. "urn:li:person:abc123"
  access_token  text NOT NULL,        -- ~60 day lifetime
  refresh_token text,                 -- may not always be available
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (workspace_id, account_id)
);

-- Index for fast lookup by workspace + account
CREATE INDEX IF NOT EXISTS idx_linkedin_tokens_ws_account
  ON linkedin_tokens(workspace_id, account_id);

-- RLS: service role only (tokens should never be exposed to client)
ALTER TABLE linkedin_tokens ENABLE ROW LEVEL SECURITY;

-- No client policies — only service_role can read/write
