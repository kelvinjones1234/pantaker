-- Pantaker — account restrictions, suspensions, and admin audit
-- ---------------------------------------------------------------------------
-- AUDIT RESULT: before this migration Pantaker had no account status model.
-- `profiles` is user-writable and therefore cannot hold moderation state.
-- Supabase Auth can ban an identity (`ban_duration`) but records no reason,
-- actor, or "restricted while signed in" state, and an existing access token
-- can outlive the ban until it expires.
--
-- SCOPE. This migration adds:
--   * `account_restrictions` — the current restriction per account,
--   * `admin_audit_events` — an append-only audit spine for account actions
--     (and later moderation actions),
--   * a narrow RPC that writes both atomically and records the reason/actor,
--   * a read-only access-state RPC used by server guards,
--   * write-side RLS checks so restricted accounts cannot bypass server actions
--     with a direct Supabase request.
--
-- The table is additive: a user with no row is active. Nothing is backfilled.
-- Auth bans remain the identity half of a suspension; the application guard and
-- RLS are the immediate half for sessions that were already signed in.

create table if not exists public.account_restrictions (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  status      text not null check (status in ('restricted', 'suspended')),
  reason      text not null check (char_length(btrim(reason)) between 5 and 500),
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,
  created_by  uuid not null,
  updated_by  uuid not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create index if not exists account_restrictions_status_idx
  on public.account_restrictions (status, updated_at desc);

alter table public.account_restrictions enable row level security;

drop policy if exists "admins read account restrictions" on public.account_restrictions;
create policy "admins read account restrictions"
  on public.account_restrictions for select
  using (public.has_admin_permission('users.view'));

-- There are deliberately no insert/update/delete policies. State changes go
-- through public.admin_set_account_status() so the reason, actor, and audit row
-- are written together and ordinary admins cannot bypass the audit trail.

create table if not exists public.admin_audit_events (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid,
  action      text not null,
  target_type text not null,
  target_id   text not null,
  reason      text,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists admin_audit_events_created_idx
  on public.admin_audit_events (created_at desc);
create index if not exists admin_audit_events_target_idx
  on public.admin_audit_events (target_type, target_id, created_at desc);
create index if not exists admin_audit_events_actor_idx
  on public.admin_audit_events (actor_id, created_at desc);

alter table public.admin_audit_events enable row level security;

drop policy if exists "admins read admin audit" on public.admin_audit_events;
create policy "admins read admin audit"
  on public.admin_audit_events for select
  using (public.has_admin_permission('users.view'));

-- No insert/update/delete policies. The SECURITY DEFINER function below is the
-- only writer; the trigger makes the trail immutable through the API.
create or replace function public.admin_audit_events_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'admin audit events are immutable' using errcode = '42501';
end $$;

drop trigger if exists admin_audit_events_immutable_trg on public.admin_audit_events;
create trigger admin_audit_events_immutable_trg
  before update or delete on public.admin_audit_events
  for each row execute function public.admin_audit_events_immutable();

create or replace function public.account_access_state()
returns table (status text, ends_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_restriction public.account_restrictions%rowtype;
  v_banned_until timestamptz;
begin
  if v_user is null then
    return query select 'active'::text, null::timestamptz;
    return;
  end if;

  select * into v_restriction
  from public.account_restrictions r
  where r.user_id = v_user;

  select u.banned_until into v_banned_until
  from auth.users u
  where u.id = v_user;

  if v_restriction.status = 'suspended'
     or (v_banned_until is not null and v_banned_until > now()) then
    return query
      select 'suspended'::text, coalesce(v_restriction.ends_at, v_banned_until);
  elsif v_restriction.status = 'restricted' then
    return query select 'restricted'::text, v_restriction.ends_at;
  else
    return query select 'active'::text, null::timestamptz;
  end if;
end $$;

create or replace function public.account_can_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select s.status = 'active' from public.account_access_state() s limit 1),
    false
  );
$$;

create or replace function public.admin_set_account_status(
  p_user_id uuid,
  p_status text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_target_role text;
  v_other_super_admins integer;
  v_before jsonb;
  v_after jsonb;
  v_action text;
begin
  if v_actor is null or not public.has_admin_permission('users.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_status not in ('active', 'restricted', 'suspended') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  if char_length(v_reason) < 5 or char_length(v_reason) > 500 then
    raise exception 'invalid_reason' using errcode = '22023';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;

  if p_status <> 'active' and p_user_id = v_actor then
    raise exception 'self_restriction' using errcode = '42501';
  end if;

  select lower(coalesce(u.raw_app_meta_data ->> 'role', ''))
    into v_target_role
  from auth.users u
  where u.id = p_user_id;

  if p_status <> 'active' and v_target_role in ('super_admin', 'admin') then
    select count(*) into v_other_super_admins
    from auth.users u
    where u.id <> p_user_id
      and lower(coalesce(u.raw_app_meta_data ->> 'role', '')) in ('super_admin', 'admin');

    if v_other_super_admins = 0 then
      raise exception 'last_super_admin' using errcode = '42501';
    end if;
  end if;

  select to_jsonb(r) into v_before
  from public.account_restrictions r
  where r.user_id = p_user_id;

  if p_status = 'active' then
    delete from public.account_restrictions where user_id = p_user_id;
    v_action := 'account.restored';
  else
    insert into public.account_restrictions
      (user_id, status, reason, starts_at, ends_at, created_by, updated_by)
    values
      (p_user_id, p_status, v_reason, now(), null, v_actor, v_actor)
    on conflict (user_id) do update
      set status = excluded.status,
          reason = excluded.reason,
          ends_at = null,
          updated_by = v_actor,
          updated_at = now();

    v_action := case p_status
      when 'suspended' then 'account.suspended'
      else 'account.restricted'
    end;
  end if;

  select to_jsonb(r) into v_after
  from public.account_restrictions r
  where r.user_id = p_user_id;

  insert into public.admin_audit_events
    (actor_id, action, target_type, target_id, reason, before, after)
  values
    (v_actor, v_action, 'user', p_user_id::text, v_reason, v_before, v_after);
end $$;

revoke all on function public.account_access_state() from public;
grant execute on function public.account_access_state() to authenticated;

revoke all on function public.account_can_write() from public;
grant execute on function public.account_can_write() to anon, authenticated;

revoke all on function public.admin_set_account_status(uuid, text, text) from public;
grant execute on function public.admin_set_account_status(uuid, text, text) to authenticated;

-- Restrict sensitive seller writes at the database as well as in server actions.
-- Reads, reports, blocks, notifications, and notification preferences stay
-- available so a restricted account can still browse, read, report abuse, and
-- manage its account.

drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile"
  on public.profiles for update
  using (auth.uid() = id and public.account_can_write())
  with check (auth.uid() = id and public.account_can_write());

drop policy if exists "sellers insert their own listings" on public.listings;
create policy "sellers insert their own listings"
  on public.listings for insert
  with check (auth.uid() = seller_id and public.account_can_write());

drop policy if exists "sellers update their own listings" on public.listings;
create policy "sellers update their own listings"
  on public.listings for update
  using (auth.uid() = seller_id and public.account_can_write())
  with check (auth.uid() = seller_id and public.account_can_write());

drop policy if exists "sellers delete their own listings" on public.listings;
create policy "sellers delete their own listings"
  on public.listings for delete
  using (auth.uid() = seller_id and public.account_can_write());

drop policy if exists "sellers manage their listing images" on public.listing_images;
create policy "sellers manage their listing images"
  on public.listing_images for all
  using (
    public.account_can_write()
    and exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id and l.seller_id = auth.uid()
    )
  )
  with check (
    public.account_can_write()
    and exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id and l.seller_id = auth.uid()
    )
  );

drop policy if exists "buyers insert inquiries" on public.inquiries;
create policy "buyers insert inquiries"
  on public.inquiries for insert
  with check (auth.uid() = buyer_id and public.account_can_write());

drop policy if exists "participants send messages" on public.messages;
create policy "participants send messages"
  on public.messages for insert
  with check (
    public.account_can_write()
    and auth.uid() = sender_id
    and exists (
      select 1 from public.inquiries i
      where i.id = messages.inquiry_id
        and (auth.uid() = i.buyer_id or auth.uid() = i.seller_id)
    )
  );

drop policy if exists "sellers create their sales" on public.sales;
create policy "sellers create their sales"
  on public.sales for insert
  with check (auth.uid() = seller_id and public.account_can_write());

drop policy if exists "sellers update their sales" on public.sales;
create policy "sellers update their sales"
  on public.sales for update
  using (auth.uid() = seller_id and public.account_can_write())
  with check (auth.uid() = seller_id and public.account_can_write());
