-- Pinterest Token Storage
create table if not exists public.pinterest_tokens (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id   text not null,
  pinterest_user_id text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at   timestamptz not null,
  updated_at   timestamptz not null default now(),
  primary key (workspace_id, account_id)
);
alter table public.pinterest_tokens enable row level security;
create index if not exists idx_pinterest_tokens_workspace_account on public.pinterest_tokens (workspace_id, account_id);
grant all on public.pinterest_tokens to service_role;
