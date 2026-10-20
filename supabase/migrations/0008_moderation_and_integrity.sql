-- Pantaker moderation, integrity, and operational hardening.
-- Depends on 0000-0007.

-- ---------------------------------------------------------------------------
-- Backfill columns for databases bootstrapped before 0000
-- ---------------------------------------------------------------------------

alter table public.listings add column if not exists published_at timestamptz;
update public.listings
set published_at = coalesce(published_at, created_at)
where item_status = 'published' and published_at is null;

alter table public.reports add column if not exists status text;
alter table public.reports add column if not exists resolution_note text;
alter table public.reports add column if not exists resolved_by uuid references auth.users (id) on delete set null;
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists updated_at timestamptz not null default now();

update public.reports
set status = case
  when status = 'under_review' then 'reviewing'
  when status in ('open', 'reviewing', 'resolved', 'dismissed') then status
  else 'open'
end;

alter table public.reports alter column status set default 'open';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reports_status'
  ) then
    alter table public.reports
      add constraint reports_status check (status in ('open', 'reviewing', 'resolved', 'dismissed'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Search and marketplace freshness
-- ---------------------------------------------------------------------------

alter table public.listings
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(area, '')
    )
  ) stored;

create index if not exists listings_search_vector_idx
  on public.listings using gin (search_vector);

-- ---------------------------------------------------------------------------
-- Listing write integrity and moderation boundary
-- ---------------------------------------------------------------------------

create or replace function public.enforce_listing_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean := public.has_admin_permission('listings.review');
  v_is_service boolean := coalesce(auth.role() = 'service_role', false);
  v_is_seller boolean := auth.uid() is not null and auth.uid() = new.seller_id;
  v_content_changed boolean;
begin
  if tg_op = 'INSERT' then
    if v_is_service or v_is_admin then
      if new.item_status = 'published' then
        new.published_at := coalesce(new.published_at, now());
      end if;
      return new;
    end if;

    if not v_is_seller then
      raise exception 'Only the seller may create this listing.'
        using errcode = '42501';
    end if;

    if new.item_status not in ('draft', 'pending_review') then
      raise exception 'New listings must start as draft or pending review.'
        using errcode = '42501';
    end if;

    new.published_at := null;
    return new;
  end if;

  if v_is_service or v_is_admin then
    if new.item_status = 'published' and old.item_status is distinct from 'published' then
      new.published_at := coalesce(new.published_at, now());
    end if;
    return new;
  end if;

  if not v_is_seller or old.seller_id <> auth.uid() then
    raise exception 'Only the seller may update this listing.'
      using errcode = '42501';
  end if;

  if new.item_status is distinct from old.item_status then
    if not (
      (old.item_status = 'draft' and new.item_status = 'pending_review')
      or (old.item_status = 'pending_review' and new.item_status = 'draft')
      or (old.item_status = 'rejected' and new.item_status = 'pending_review')
      or (old.item_status = 'published' and new.item_status in ('sold', 'archived'))
      or (old.item_status in ('sold', 'archived') and new.item_status = 'published')
    ) then
      raise exception 'That listing status change requires moderation.'
        using errcode = '42501';
    end if;

    if new.item_status = 'published' then
      if new.expires_at is not null and new.expires_at <= now() then
        raise exception 'An expired listing cannot be published.'
          using errcode = '22000';
      end if;
      new.published_at := now();
    end if;
  end if;

  v_content_changed := (
    new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.category_id is distinct from old.category_id
    or new.condition is distinct from old.condition
    or new.pricing_type is distinct from old.pricing_type
    or new.price is distinct from old.price
    or new.negotiable is distinct from old.negotiable
    or new.quantity is distinct from old.quantity
    or new.quantity_unit is distinct from old.quantity_unit
    or new.city is distinct from old.city
    or new.area is distinct from old.area
    or new.pickup_notes is distinct from old.pickup_notes
  );

  if old.item_status = 'published' and v_content_changed then
    new.item_status := 'pending_review';
    new.published_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_listing_write on public.listings;
create trigger enforce_listing_write
before insert or update on public.listings
for each row execute function public.enforce_listing_write();

-- Notify the seller for every moderation outcome, including rejecting a listing
-- that was already live. Seller-driven reactivation (sold/archived -> published)
-- is excluded because the seller performed it themselves.
create or replace function public.notifications_on_listing_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type  text;
  v_title text;
  v_body  text;
  v_href  text;
begin
  if new.item_status not in ('published', 'rejected') then return new; end if;
  if old.item_status is not distinct from new.item_status then return new; end if;

  -- The seller's own transitions are not moderation outcomes.
  if auth.uid() is not distinct from new.seller_id then return new; end if;

  if not public.notification_enabled(new.seller_id, 'listing_updates') then return new; end if;

  if new.item_status = 'published' then
    v_type  := 'listing_published';
    v_title := 'Your listing is live';
    v_body  := new.title || ' was approved and is now live in the marketplace.';
    v_href  := '/seller/listings?status=published';
  else
    v_type  := 'listing_rejected';
    v_title := 'Changes requested on your listing';
    v_body  := new.title || ' needs changes before it can go live. Review it and resubmit.';
    v_href  := '/seller/listings?status=rejected';
  end if;

  insert into public.notifications
    (user_id, type, title, body, href, listing_id, dedupe_key)
  values (new.seller_id, v_type, v_title, v_body, v_href, new.id, null);
  return new;
exception
  when others then return new;
end $$;

-- ---------------------------------------------------------------------------
-- Inquiry identity protection
-- ---------------------------------------------------------------------------

create or replace function public.protect_inquiry_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role() = 'service_role', false) then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if new.listing_id is distinct from old.listing_id
    or new.buyer_id is distinct from old.buyer_id
    or new.seller_id is distinct from old.seller_id
    or new.message is distinct from old.message
    or new.created_at is distinct from old.created_at then
    raise exception 'Inquiry identity and original message are immutable.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_inquiry_identity on public.inquiries;
create trigger protect_inquiry_identity
before update on public.inquiries
for each row execute function public.protect_inquiry_identity();

-- ---------------------------------------------------------------------------
-- Block-aware messaging
-- ---------------------------------------------------------------------------

drop policy if exists "buyers insert inquiries" on public.inquiries;
drop policy if exists "participants create inquiries" on public.inquiries;
create policy "participants create inquiries"
on public.inquiries for insert
to authenticated
with check (
  public.account_can_write()
  and auth.uid() = buyer_id
  and buyer_id <> seller_id
  and exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.seller_id = seller_id
      and l.item_status = 'published'
  )
  and not exists (
    select 1
    from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = seller_id)
       or (b.blocker_id = seller_id and b.blocked_id = auth.uid())
  )
);

drop policy if exists "participants send messages" on public.messages;
create policy "participants send messages"
on public.messages for insert
to authenticated
with check (
  public.account_can_write()
  and auth.uid() = sender_id
  and exists (
    select 1
    from public.inquiries i
    where i.id = inquiry_id
      and auth.uid() in (i.buyer_id, i.seller_id)
  )
  and not exists (
    select 1
    from public.inquiries i
    cross join lateral (
      select case
        when i.buyer_id = auth.uid() then i.seller_id
        else i.buyer_id
      end as other_id
    ) other
    join public.blocks b
      on (b.blocker_id = auth.uid() and b.blocked_id = other.other_id)
      or (b.blocker_id = other.other_id and b.blocked_id = auth.uid())
    where i.id = inquiry_id
  )
);

-- ---------------------------------------------------------------------------
-- Admin read access for moderation surfaces
-- ---------------------------------------------------------------------------

drop policy if exists "admins read all listings" on public.listings;
create policy "admins read all listings"
on public.listings for select
to authenticated
using (public.has_admin_permission('listings.review'));

drop policy if exists "admins read all reports" on public.reports;
create policy "admins read all reports"
on public.reports for select
to authenticated
using (public.has_admin_permission('reports.manage'));

-- ---------------------------------------------------------------------------
-- Upload rate limiting
-- ---------------------------------------------------------------------------

create table if not exists public.upload_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists upload_requests_user_created_idx
  on public.upload_requests (user_id, created_at desc);

alter table public.upload_requests enable row level security;

drop policy if exists "users read own upload requests" on public.upload_requests;
create policy "users read own upload requests"
on public.upload_requests for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users create own upload requests" on public.upload_requests;
create policy "users create own upload requests"
on public.upload_requests for insert
to authenticated
with check (public.account_can_write() and auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Moderation RPCs
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_listing_status(
  p_listing_id uuid,
  p_status text,
  p_reason text default null
)
returns public.listings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_listing public.listings;
  v_before text;
begin
  if not public.has_admin_permission('listings.review') then
    raise exception 'You do not have permission to moderate listings.'
      using errcode = '42501';
  end if;

  if p_status is null or p_status not in ('draft', 'pending_review', 'published', 'rejected', 'sold', 'archived') then
    raise exception 'Invalid listing status.' using errcode = '22000';
  end if;

  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found then
    raise exception 'Listing not found.' using errcode = 'P0002';
  end if;

  v_before := v_listing.item_status;

  update public.listings
  set item_status = p_status,
      published_at = case
        when p_status = 'published' then coalesce(published_at, now())
        else null
      end,
      updated_at = now()
  where id = p_listing_id
  returning * into v_listing;

  insert into public.admin_audit_events (actor_id, action, target_type, target_id, reason, before, after)
  values (
    v_actor,
    'listing.moderated',
    'listing',
    p_listing_id::text,
    nullif(btrim(coalesce(p_reason, '')), ''),
    jsonb_build_object('status', v_before),
    jsonb_build_object('status', p_status)
  );

  return v_listing;
end;
$$;

revoke all on function public.admin_set_listing_status(uuid, text, text) from public;
grant execute on function public.admin_set_listing_status(uuid, text, text) to authenticated, service_role;

create or replace function public.admin_set_report_status(
  p_report_id uuid,
  p_status text,
  p_note text default null
)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_report public.reports;
  v_before text;
begin
  if not public.has_admin_permission('reports.manage') then
    raise exception 'You do not have permission to manage reports.'
      using errcode = '42501';
  end if;

  if p_status is null or p_status not in ('open', 'reviewing', 'resolved', 'dismissed') then
    raise exception 'Invalid report status.' using errcode = '22000';
  end if;

  select * into v_report from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'Report not found.' using errcode = 'P0002';
  end if;

  v_before := v_report.status;

  update public.reports
  set status = p_status,
      resolution_note = nullif(btrim(coalesce(p_note, '')), ''),
      resolved_by = case when p_status in ('resolved', 'dismissed') then v_actor else null end,
      resolved_at = case when p_status in ('resolved', 'dismissed') then now() else null end,
      updated_at = now()
  where id = p_report_id
  returning * into v_report;

  insert into public.admin_audit_events (actor_id, action, target_type, target_id, reason, before, after)
  values (
    v_actor,
    'report.moderated',
    'report',
    p_report_id::text,
    nullif(btrim(coalesce(p_note, '')), ''),
    jsonb_build_object('status', v_before),
    jsonb_build_object('status', p_status)
  );

  return v_report;
end;
$$;

revoke all on function public.admin_set_report_status(uuid, text, text) from public;
grant execute on function public.admin_set_report_status(uuid, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Transactional account data deletion
-- Auth deletion still happens through the Supabase Admin API afterwards.
-- ---------------------------------------------------------------------------

create or replace function public.admin_delete_account_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if not (
    auth.uid() = p_user_id
    or public.has_admin_permission('users.manage')
    or coalesce(auth.role() = 'service_role', false)
  ) then
    raise exception 'You do not have permission to delete this account.'
      using errcode = '42501';
  end if;

  delete from public.notifications where user_id = p_user_id;
  delete from public.notification_preferences where user_id = p_user_id;
  delete from public.upload_requests where user_id = p_user_id;
  delete from public.blocks where blocker_id = p_user_id or blocked_id = p_user_id;
  delete from public.reports where reporter_id = p_user_id or reported_user_id = p_user_id;
  delete from public.sales where seller_id = p_user_id or buyer_id = p_user_id;
  delete from public.messages where sender_id = p_user_id;
  delete from public.inquiries where buyer_id = p_user_id or seller_id = p_user_id;
  delete from public.listing_images
  where listing_id in (select id from public.listings where seller_id = p_user_id);
  delete from public.listings where seller_id = p_user_id;
  delete from public.profiles where id = p_user_id;

  if v_actor is not null then
    insert into public.admin_audit_events (actor_id, action, target_type, target_id, reason, before, after)
    values (v_actor, 'account.deleted', 'user', p_user_id::text, null, null, null);
  end if;
end;
$$;

revoke all on function public.admin_delete_account_data(uuid) from public;
grant execute on function public.admin_delete_account_data(uuid) to authenticated, service_role;
