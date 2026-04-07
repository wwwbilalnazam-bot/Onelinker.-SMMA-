-- Add thumbnail_url column to posts table
-- Stores the Supabase public URL of the generated post thumbnail

ALTER TABLE posts ADD COLUMN thumbnail_url TEXT DEFAULT NULL;

-- Create index for faster lookups
CREATE INDEX idx_posts_thumbnail_url ON posts(thumbnail_url) WHERE thumbnail_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN posts.thumbnail_url IS 'Public Supabase Storage URL of the post thumbnail image. Generated automatically from media_urls or manually set by user.';
