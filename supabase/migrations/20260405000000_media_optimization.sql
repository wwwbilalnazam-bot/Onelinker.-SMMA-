-- Media Optimization System Schema
-- NOTE: public.media_files is already defined in the initial schema (20260101000000_initial_schema.sql).
-- This migration adds optimization-related support tables.
-- Do not create a duplicate media_files table.

-- Media Variants Table
CREATE TABLE IF NOT EXISTS public.media_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_file_id UUID NOT NULL REFERENCES public.media_files(id) ON DELETE CASCADE,
  aspect_ratio TEXT NOT NULL,
  resolution JSONB NOT NULL, -- {width, height}
  file_size BIGINT NOT NULL,
  url TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('webp', 'jpg', 'mp4', 'mov')),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Media Processing Queue Table
CREATE TABLE IF NOT EXISTS public.media_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_file_id UUID NOT NULL REFERENCES public.media_files(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Platform Assignments Table (mapping media to platforms with selected variants)
CREATE TABLE IF NOT EXISTS public.media_platform_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_file_id UUID NOT NULL REFERENCES public.media_files(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  selected_variant_id UUID REFERENCES public.media_variants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_variants_media_file_id ON public.media_variants(media_file_id);
CREATE INDEX IF NOT EXISTS idx_media_processing_queue_status ON public.media_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_media_platform_assignments_media_file_id ON public.media_platform_assignments(media_file_id);

-- Policies for Row Level Security
ALTER TABLE public.media_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_platform_assignments ENABLE ROW LEVEL SECURITY;

-- Variants inherit workspace permissions
CREATE POLICY "Users can view variants from their workspace"
  ON public.media_variants FOR SELECT
  USING (media_file_id IN (
    SELECT id FROM public.media_files WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ));

-- Media Processing Queue policies
CREATE POLICY "Users can view processing queue from their workspace"
  ON public.media_processing_queue FOR SELECT
  USING (media_file_id IN (
    SELECT id FROM public.media_files WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ));

-- Platform Assignments policies
CREATE POLICY "Users can view platform assignments from their workspace"
  ON public.media_platform_assignments FOR SELECT
  USING (media_file_id IN (
    SELECT id FROM public.media_files WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert platform assignments in their workspace"
  ON public.media_platform_assignments FOR INSERT
  WITH CHECK (media_file_id IN (
    SELECT id FROM public.media_files WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update platform assignments in their workspace"
  ON public.media_platform_assignments FOR UPDATE
  USING (media_file_id IN (
    SELECT id FROM public.media_files WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete platform assignments in their workspace"
  ON public.media_platform_assignments FOR DELETE
  USING (media_file_id IN (
    SELECT id FROM public.media_files WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ));

-- Update triggers for updated_at columns
-- Note: media_files trigger already created in 20260101000001_scale_improvements.sql
CREATE TRIGGER IF NOT EXISTS update_media_platform_assignments_updated_at
  BEFORE UPDATE ON public.media_platform_assignments
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER IF NOT EXISTS update_media_processing_queue_updated_at
  BEFORE UPDATE ON public.media_processing_queue
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
