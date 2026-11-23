-- Run this script in Supabase Dashboard → SQL Editor → New query.
-- Each authenticated user can read/write only their own workspace row.
create table if not exists public.user_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  projects jsonb not null default '[]'::jsonb check (jsonb_typeof(projects) = 'array'),
  variants jsonb not null default '[]'::jsonb check (jsonb_typeof(variants) = 'array'),
  updated_at timestamptz not null default now()
);

alter table public.user_workspaces enable row level security;

create policy "Users can read their own workspace"
  on public.user_workspaces for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own workspace"
  on public.user_workspaces for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own workspace"
  on public.user_workspaces for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own workspace"
  on public.user_workspaces for delete to authenticated
  using (auth.uid() = user_id);
