-- Add media support to inbox_messages (comments)
ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS media_urls TEXT[];
ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS attachments JSONB;

COMMENT ON COLUMN inbox_messages.media_urls IS 'Array of media URLs (images, videos, etc.) from platform comments';
COMMENT ON COLUMN inbox_messages.attachments IS 'Structured attachment data: { url, type, title, description }';
