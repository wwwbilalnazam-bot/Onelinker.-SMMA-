-- Google Business Profile Token Storage
create table if not exists public.google_business_tokens (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id   text not null,
  google_account_id text not null,
  access_token text not null,
  refresh_token text,
  expires_at   timestamptz not null,
  updated_at   timestamptz not null default now(),
  primary key (workspace_id, account_id)
);
alter table public.google_business_tokens enable row level security;
create index if not exists idx_google_business_tokens_workspace_account on public.google_business_tokens (workspace_id, account_id);
grant all on public.google_business_tokens to service_role;
