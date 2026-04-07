-- Add title and options to posts table
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '{}'::jsonb;

-- Comment for clarity
COMMENT ON COLUMN public.posts.title IS 'Used for YouTube video title or Pinterest pin title';
COMMENT ON COLUMN public.posts.options IS 'Flexible storage for platform-specific settings like YouTube category, privacy, tags, etc.';
