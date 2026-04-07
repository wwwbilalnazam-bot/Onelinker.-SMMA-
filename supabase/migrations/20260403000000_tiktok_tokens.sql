-- ════════════════════════════════════════════════════════════
-- TikTok Token Storage
--
-- Stores TikTok OAuth tokens per workspace + account.
-- Access tokens expire in ~24 hours, refresh tokens in ~365 days.
-- RLS: only service role can read/write (tokens never exposed to client).
-- ════════════════════════════════════════════════════════════

create table if not exists public.tiktok_tokens (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id   text not null,
  tiktok_open_id text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at   timestamptz not null,
  refresh_expires_at timestamptz not null,
  updated_at   timestamptz not null default now(),
  primary key (workspace_id, account_id)
);

-- RLS: deny all client access, only service role can touch tokens
alter table public.tiktok_tokens enable row level security;

-- Index for fast lookups
create index if not exists idx_tiktok_tokens_workspace_account
  on public.tiktok_tokens (workspace_id, account_id);

-- Grant service role full access
grant all on public.tiktok_tokens to service_role;
