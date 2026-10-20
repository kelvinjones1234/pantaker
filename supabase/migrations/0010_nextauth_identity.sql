-- NextAuth identity cutover.
--
-- Pantaker no longer uses Supabase Auth. `public.users` is the canonical
-- identity row; `profiles` remains the editable public profile. Existing
-- auth.users rows (there are none at cutover) are copied so the FK changes are
-- safe on a populated project as well.

do $$
begin
  create type public.admin_role as enum ('super_admin', 'moderator');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_verified timestamptz,
  name text,
  image text,
  admin_role public.admin_role,
  session_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_key unique (email),
  constraint users_email_lowercase_check check (email = lower(email))
);

create table if not exists public.login_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempts integer not null default 0,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists login_otps_email_created_at_idx
  on public.login_otps (email, created_at desc);
create index if not exists login_otps_ip_created_at_idx
  on public.login_otps (ip, created_at desc);
create index if not exists login_otps_expires_at_idx
  on public.login_otps (expires_at);

create table if not exists public.email_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  new_email text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint email_change_requests_token_hash_key unique (token_hash),
  constraint email_change_requests_new_email_lowercase_check check (new_email = lower(new_email))
);

create index if not exists email_change_requests_user_id_idx
  on public.email_change_requests (user_id, created_at desc);

drop trigger if exists users_touch_updated_at on public.users;
create trigger users_touch_updated_at
  before update on public.users
  for each row execute function public.touch_updated_at();

insert into public.users (
  id,
  email,
  email_verified,
  name,
  image,
  admin_role,
  created_at,
  updated_at
)
select
  u.id,
  lower(u.email),
  u.email_confirmed_at,
  nullif(
    coalesce(
      u.raw_user_meta_data ->> 'display_name',
      u.raw_user_meta_data ->> 'full_name',
      u.raw_user_meta_data ->> 'name'
    ),
    ''
  ),
  nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
  case lower(coalesce(u.raw_app_meta_data ->> 'role', ''))
    when 'admin' then 'super_admin'::public.admin_role
    when 'super_admin' then 'super_admin'::public.admin_role
    when 'moderator' then 'moderator'::public.admin_role
    else null
  end,
  coalesce(u.created_at, now()),
  coalesce(u.updated_at, u.created_at, now())
from auth.users u
where u.email is not null
on conflict (id) do nothing;

alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references public.users(id) on delete cascade;

alter table public.listings drop constraint if exists listings_seller_id_fkey;
alter table public.listings
  add constraint listings_seller_id_fkey
  foreign key (seller_id) references public.users(id) on delete cascade;

alter table public.inquiries drop constraint if exists inquiries_buyer_id_fkey;
alter table public.inquiries
  add constraint inquiries_buyer_id_fkey
  foreign key (buyer_id) references public.users(id) on delete cascade;

alter table public.inquiries drop constraint if exists inquiries_seller_id_fkey;
alter table public.inquiries
  add constraint inquiries_seller_id_fkey
  foreign key (seller_id) references public.users(id) on delete cascade;

alter table public.reports drop constraint if exists reports_reporter_id_fkey;
alter table public.reports
  add constraint reports_reporter_id_fkey
  foreign key (reporter_id) references public.users(id) on delete cascade;

alter table public.reports drop constraint if exists reports_reported_user_id_fkey;
alter table public.reports
  add constraint reports_reported_user_id_fkey
  foreign key (reported_user_id) references public.users(id) on delete set null;

alter table public.reports drop constraint if exists reports_resolved_by_fkey;
alter table public.reports
  add constraint reports_resolved_by_fkey
  foreign key (resolved_by) references public.users(id) on delete set null;

alter table public.account_restrictions drop constraint if exists account_restrictions_user_id_fkey;
alter table public.account_restrictions
  add constraint account_restrictions_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

alter table public.upload_requests drop constraint if exists upload_requests_user_id_fkey;
alter table public.upload_requests
  add constraint upload_requests_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

alter table public.users enable row level security;
alter table public.login_otps enable row level security;
alter table public.email_change_requests enable row level security;
