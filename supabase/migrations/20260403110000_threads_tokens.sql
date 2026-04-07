-- Threads Token Storage
create table if not exists public.threads_tokens (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id   text not null,
  threads_user_id text not null,
  access_token text not null,
  expires_at   timestamptz not null,
  updated_at   timestamptz not null default now(),
  primary key (workspace_id, account_id)
);
alter table public.threads_tokens enable row level security;
create index if not exists idx_threads_tokens_workspace_account on public.threads_tokens (workspace_id, account_id);
grant all on public.threads_tokens to service_role;
