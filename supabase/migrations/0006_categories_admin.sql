-- Pantaker — Category management foundation
-- ---------------------------------------------------------------------------
-- AUDIT RESULT: Pantaker already has a real `public.categories` table with a
-- parent/child model (`parent_id`), `sort_order`, and `is_active`. The public
-- app reads it through `getCategories()` and the sell form submits a real
-- `category_id`; no category values are hardcoded in the admin UI.
--
-- SCOPE. This migration makes that existing model safely manageable by admins:
--   * idempotently ensures the hierarchy/status columns exist,
--   * enforces a parent reference, no self-parent, and a case-insensitive unique
--     slug at the database level,
--   * lets admins with `listings.review` read/write the whole tree while the
--     public can still read only active categories,
--   * records every create/update/enable/disable/reorder/delete in an append-only
--     audit table,
--   * exposes listing-usage counts through a narrow function so the admin UI can
--     refuse to delete a category that listings still reference without granting
--     broad access to listing rows.
--
-- NO domain column is dropped or renamed and no category data is rewritten by
-- this migration. Existing listings keep their category_id, so disabling is
-- always a safe alternative to deletion.

-- 1. Existing hierarchy/status columns ----------------------------------------
alter table public.categories
  add column if not exists parent_id uuid,
  add column if not exists icon_key text,
  add column if not exists description text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_active boolean not null default true;

create index if not exists categories_parent_idx on public.categories (parent_id);

-- Parent reference. NOT VALID keeps migration deployable if legacy data has an
-- orphan; new writes are still checked, and the admin tree surfaces orphans.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'categories_parent_id_fkey'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories
      add constraint categories_parent_id_fkey
      foreign key (parent_id) references public.categories (id) on delete restrict not valid;
  end if;
end $$;

-- A row may never be its own parent. NOT VALID for the same legacy-data reason.
alter table public.categories drop constraint if exists categories_no_self_parent;
alter table public.categories
  add constraint categories_no_self_parent
  check (parent_id is null or parent_id <> id) not valid;

-- Slugs are the public URL key. Uniqueness is case-insensitive so two categories
-- cannot differ only by "Metals" vs "metals".
create unique index if not exists categories_slug_lower_uidx
  on public.categories (lower(slug));

-- 2. Row Level Security --------------------------------------------------------
-- The existing "active categories are public" SELECT policy remains. These
-- policies add the admin half, using the same permission vocabulary as the app.
drop policy if exists "admins read all categories" on public.categories;
create policy "admins read all categories"
  on public.categories for select
  using (public.has_admin_permission('listings.review'));

drop policy if exists "admins create categories" on public.categories;
create policy "admins create categories"
  on public.categories for insert
  with check (public.has_admin_permission('listings.review'));

drop policy if exists "admins update categories" on public.categories;
create policy "admins update categories"
  on public.categories for update
  using (public.has_admin_permission('listings.review'))
  with check (public.has_admin_permission('listings.review'));

drop policy if exists "admins delete categories" on public.categories;
create policy "admins delete categories"
  on public.categories for delete
  using (public.has_admin_permission('listings.review'));

-- 3. Append-only audit trail ---------------------------------------------------
create table if not exists public.category_audit_events (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid,
  actor_id    uuid,
  action      text not null check (action in (
    'created',
    'updated',
    'enabled',
    'disabled',
    'reordered',
    'deleted'
  )),
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists category_audit_events_created_idx
  on public.category_audit_events (created_at desc);
create index if not exists category_audit_events_category_idx
  on public.category_audit_events (category_id, created_at desc);

alter table public.category_audit_events enable row level security;

drop policy if exists "admins read category audit" on public.category_audit_events;
create policy "admins read category audit"
  on public.category_audit_events for select
  using (public.has_admin_permission('listings.review'));

-- No insert/update/delete policy: rows are written only by the trigger below,
-- and the trail is immutable through the API.

create or replace function public.audit_category_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_category_id uuid;
  v_before jsonb;
  v_after jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'created';
    v_category_id := new.id;
    v_after := to_jsonb(new);
  elsif tg_op = 'DELETE' then
    v_action := 'deleted';
    v_category_id := old.id;
    v_before := to_jsonb(old);
  else
    v_category_id := new.id;
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    if old.is_active is distinct from new.is_active then
      v_action := case when new.is_active then 'enabled' else 'disabled' end;
    elsif old.parent_id is distinct from new.parent_id
       or old.sort_order is distinct from new.sort_order then
      v_action := 'reordered';
    else
      v_action := 'updated';
    end if;
  end if;

  insert into public.category_audit_events
    (category_id, actor_id, action, before, after)
  values
    (v_category_id, auth.uid(), v_action, v_before, v_after);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

drop trigger if exists category_audit_change_trg on public.categories;
create trigger category_audit_change_trg
  after insert or update or delete on public.categories
  for each row execute function public.audit_category_change();

-- 4. Listing usage counts ------------------------------------------------------
-- Category deletion must never break a listing reference. This function returns
-- only aggregate counts (never listing details) and refuses non-admins, so the
-- admin UI never needs a broad SELECT policy on `listings` just to show usage.
create or replace function public.category_listing_counts()
returns table (category_id uuid, listing_count bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_admin_permission('listings.review') then
    return;
  end if;

  return query
    select l.category_id, count(*)::bigint
    from public.listings l
    where l.category_id is not null
    group by l.category_id;
end $$;

revoke all on function public.category_listing_counts() from public;
grant execute on function public.category_listing_counts() to authenticated;
