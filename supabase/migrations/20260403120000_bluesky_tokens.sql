-- Bluesky Token Storage
create table if not exists public.bluesky_tokens (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id   text not null,
  bluesky_did  text not null,
  access_token text not null,
  refresh_token text,
  expires_at   timestamptz not null,
  updated_at   timestamptz not null default now(),
  primary key (workspace_id, account_id)
);
alter table public.bluesky_tokens enable row level security;
create index if not exists idx_bluesky_tokens_workspace_account on public.bluesky_tokens (workspace_id, account_id);
grant all on public.bluesky_tokens to service_role;
