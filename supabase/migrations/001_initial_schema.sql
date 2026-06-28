-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Stores (trading points)
create table public.stores (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  iiko_store_id text,
  geo_lat       double precision,
  geo_lng       double precision,
  created_at    timestamptz not null default now()
);

-- User profiles (extends auth.users)
create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text not null,
  role       text not null check (role in ('sender', 'reviewer', 'admin')),
  store_id   uuid references public.stores,
  created_at timestamptz not null default now()
);

-- Write-off requests
create table public.writeoff_requests (
  id                   uuid primary key default uuid_generate_v4(),
  store_id             uuid not null references public.stores,
  author_id            uuid not null references public.profiles,
  type                 text not null check (type in ('with_deduction', 'without_deduction')),
  deducted_employee_id uuid references public.profiles,
  comment              text not null check (char_length(comment) >= 10),
  status               text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  photo_path           text not null,
  amount               numeric(10,2) not null,
  product_name         text not null,
  iiko_doc_number      text,
  iiko_status          text check (iiko_status in ('pending', 'sent', 'failed')),
  geo_lat              double precision,
  geo_lng              double precision,
  reviewed_by          uuid references public.profiles,
  reviewed_at          timestamptz,
  created_at           timestamptz not null default now()
);

-- Push notification subscriptions
create table public.push_subscriptions (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

-- Audit log (immutable)
create table public.audit_log (
  id         uuid primary key default uuid_generate_v4(),
  request_id uuid references public.writeoff_requests,
  actor_id   uuid references public.profiles,
  action     text not null,
  payload    jsonb,
  ts         timestamptz not null default now()
);

-- Indexes
create index on public.writeoff_requests (status, created_at desc);
create index on public.writeoff_requests (author_id);
create index on public.writeoff_requests (store_id);
create index on public.audit_log (request_id);

-- =====================
-- Row Level Security
-- =====================

alter table public.profiles          enable row level security;
alter table public.stores            enable row level security;
alter table public.writeoff_requests enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.audit_log         enable row level security;

-- Profiles
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Stores: all authenticated users can read
create policy "stores_select_all" on public.stores
  for select using (auth.uid() is not null);

-- Requests: senders see own; reviewers/admins see all
create policy "requests_select" on public.writeoff_requests
  for select using (
    author_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('reviewer', 'admin')
    )
  );

create policy "requests_insert" on public.writeoff_requests
  for insert with check (author_id = auth.uid());

create policy "requests_update_reviewer" on public.writeoff_requests
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('reviewer', 'admin')
    )
    and reviewed_by is null
  );

-- Push subscriptions: own only
create policy "push_subs_own" on public.push_subscriptions
  for all using (user_id = auth.uid());

-- Audit log: reviewers/admins read only; writes via service role
create policy "audit_select_reviewer" on public.audit_log
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('reviewer', 'admin')
    )
  );

-- Storage bucket (run separately in Supabase Dashboard > Storage):
-- create bucket "writeoff-photos" with (public = false);