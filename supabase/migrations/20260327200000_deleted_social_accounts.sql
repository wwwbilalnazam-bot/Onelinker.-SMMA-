-- ════════════════════════════════════════════════════════════
-- Deleted Social Accounts — tracks deliberately deleted accounts
-- so the Outstand sync doesn't re-create them.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS deleted_social_accounts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  outstand_account_id  text NOT NULL,
  platform             text NOT NULL,
  deleted_at           timestamptz NOT NULL DEFAULT now(),

  UNIQUE (workspace_id, outstand_account_id)
);

CREATE INDEX IF NOT EXISTS idx_deleted_social_ws
  ON deleted_social_accounts(workspace_id);

ALTER TABLE deleted_social_accounts ENABLE ROW LEVEL SECURITY;
