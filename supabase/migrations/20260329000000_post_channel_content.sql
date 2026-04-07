-- Add channel_content JSONB to posts table to store per-platform overrides
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS channel_content JSONB;

-- Add comment explaining usage
COMMENT ON COLUMN public.posts.channel_content IS 'Per-platform content overrides: { "instagram": "IG specific caption", ... }';
