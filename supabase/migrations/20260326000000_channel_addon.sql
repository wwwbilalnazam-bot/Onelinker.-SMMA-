-- Add extra_channels column to subscriptions table
-- Supports the channel add-on for Creator plan ($3/mo per extra channel)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS extra_channels INTEGER NOT NULL DEFAULT 0;
