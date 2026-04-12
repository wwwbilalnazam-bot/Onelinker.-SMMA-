-- Add per-account content customization to posts table
-- Stores account-specific caption overrides: { "account_uuid": "caption text" }

ALTER TABLE posts ADD COLUMN IF NOT EXISTS account_content JSONB;

COMMENT ON COLUMN posts.account_content IS 'Per-account caption overrides keyed by local social_accounts.id UUID';
