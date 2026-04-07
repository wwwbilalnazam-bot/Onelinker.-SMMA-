-- ════════════════════════════════════════════════════════════
-- MEMBER DEACTIVATION
-- Adds a deactivated_at column so owners can deactivate
-- members without removing them entirely.
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ DEFAULT NULL;
