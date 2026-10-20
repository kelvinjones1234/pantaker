-- Replace Supabase Auth context with application-owned transaction settings.
--
-- The server sets these with transaction-local set_config() calls from Prisma:
--   app.user_id   uuid of the signed-in user
--   app.user_role text role used for audit/display decisions
--   app.is_service true for trusted system operations
--
-- Only the database owner (the Prisma connection) can reach these functions;
-- anon/authenticated grants are revoked in 0012.

create schema if not exists app;

create or replace function app.user_id()
returns uuid
language sql
stable
as $function$
  select nullif(current_setting('app.user_id', true), '')::uuid
$function$;

create or replace function app.user_role()
returns text
language sql
stable
as $function$
  select nullif(current_setting('app.user_role', true), '')
$function$;

create or replace function app.is_service()
returns boolean
language sql
stable
as $function$
  select coalesce(current_setting('app.is_service', true), '') = 'true'
$function$;

create or replace function public.admin_role()
returns text
language sql
stable
set search_path to 'public'
as $function$
  select case u.admin_role
    when 'super_admin' then 'super_admin'
    when 'moderator' then 'moderator'
    else null
  end
  from public.users u
  where u.id = app.user_id()
$function$;

create or replace function public.account_access_state()
returns table(status text, ends_at timestamp with time zone)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := app.user_id();
  v_restriction public.account_restrictions%rowtype;
begin
  if v_user is null then
    return query select 'active'::text, null::timestamptz;
    return;
  end if;

  select * into v_restriction
  from public.account_restrictions r
  where r.user_id = v_user;

  if v_restriction.status = 'suspended' then
    return query select 'suspended'::text, v_restriction.ends_at;
  elsif v_restriction.status = 'restricted' then
    return query select 'restricted'::text, v_restriction.ends_at;
  else
    return query select 'active'::text, null::timestamptz;
  end if;
end $function$;

create or replace function public.admin_delete_account_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := app.user_id();
begin
  if not (
    app.user_id() = p_user_id
    or public.has_admin_permission('users.manage')
    or app.is_service()
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
  delete from public.users where id = p_user_id;

  if v_actor is not null then
    insert into public.admin_audit_events (actor_id, action, target_type, target_id, reason, before, after)
    values (v_actor, 'account.deleted', 'user', p_user_id::text, null, null, null);
  end if;
end;
$function$;

create or replace function public.admin_set_account_status(p_user_id uuid, p_status text, p_reason text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := app.user_id();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_target_role public.admin_role;
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

  if not exists (select 1 from public.users u where u.id = p_user_id) then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;

  if p_status <> 'active' and p_user_id = v_actor then
    raise exception 'self_restriction' using errcode = '42501';
  end if;

  select u.admin_role into v_target_role
  from public.users u
  where u.id = p_user_id;

  if p_status <> 'active' and v_target_role = 'super_admin' then
    select count(*) into v_other_super_admins
    from public.users u
    where u.id <> p_user_id
      and u.admin_role = 'super_admin';

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
end $function$;

create or replace function public.admin_set_listing_status(p_listing_id uuid, p_status text, p_reason text default null)
returns public.listings
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := app.user_id();
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
$function$;

create or replace function public.admin_set_report_status(p_report_id uuid, p_status text, p_note text default null)
returns public.reports
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := app.user_id();
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
$function$;

create or replace function public.audit_category_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    (v_category_id, app.user_id(), v_action, v_before, v_after);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $function$;

create or replace function public.enforce_listing_write()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_is_admin boolean := public.has_admin_permission('listings.review');
  v_is_service boolean := app.is_service();
  v_is_seller boolean := app.user_id() is not null and app.user_id() = new.seller_id;
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

  if not v_is_seller or old.seller_id <> app.user_id() then
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
$function$;

create or replace function public.notifications_on_listing_moderation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_type  text;
  v_title text;
  v_body  text;
  v_href  text;
begin
  if new.item_status not in ('published', 'rejected') then return new; end if;
  if old.item_status is not distinct from new.item_status then return new; end if;

  -- The seller's own transitions are not moderation outcomes.
  if app.user_id() is not distinct from new.seller_id then return new; end if;

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
end $function$;

create or replace function public.notify_account_event(p_type text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := app.user_id();
begin
  if v_user is null then return; end if;
  if p_type <> 'account_email_change' then return; end if;

  insert into public.notifications (user_id, type, title, body, href)
  values (
    v_user,
    'account_email_change',
    'Confirm your new email',
    'We sent a confirmation link to your new address. Your current email stays active until you confirm.',
    '/seller/settings/account'
  );
exception
  when others then return;
end $function$;

create or replace function public.notify_new_message(p_inquiry_id uuid, p_message_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor    uuid := app.user_id();
  v_buyer    uuid;
  v_seller   uuid;
  v_listing  uuid;
  v_title    text;
  v_href     text;
  v_recipient uuid;
  v_listing_title text;
begin
  if v_actor is null then return; end if;

  select i.buyer_id, i.seller_id, i.listing_id
    into v_buyer, v_seller, v_listing
  from public.inquiries i
  where i.id = p_inquiry_id;
  if not found then return; end if;

  -- The caller must be a party to the conversation...
  if v_actor <> v_buyer and v_actor <> v_seller then return; end if;

  -- ...and must actually be the sender of the referenced message.
  perform 1 from public.messages m
   where m.id = p_message_id
     and m.inquiry_id = p_inquiry_id
     and m.sender_id = v_actor;
  if not found then return; end if;

  v_recipient := case when v_actor = v_buyer then v_seller else v_buyer end;
  if not public.notification_enabled(v_recipient, 'messages') then return; end if;

  if v_recipient = v_seller then
    v_title := 'New buyer message';
    v_href  := '/seller/messages/' || p_inquiry_id::text;
  else
    v_title := 'New message from a seller';
    v_href  := '/messages/' || p_inquiry_id::text;
  end if;

  select l.title into v_listing_title from public.listings l where l.id = v_listing;

  insert into public.notifications
    (user_id, type, title, body, href, conversation_id, listing_id, actor_id, dedupe_key)
  values
    (v_recipient, 'new_message', v_title,
     case when v_listing_title is not null then 'About: ' || v_listing_title else 'You have a new message.' end,
     v_href, p_inquiry_id, v_listing, v_actor, 'message:' || p_message_id::text)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
exception
  when others then return;  -- a notification failure must never break messaging
end $function$;

create or replace function public.notify_sale_status(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor    uuid := app.user_id();
  v_seller   uuid;
  v_buyer    uuid;
  v_listing  uuid;
  v_inquiry  uuid;
  v_status   text;
  v_title    text;
  v_body     text;
  v_href     text;
begin
  if v_actor is null then return; end if;

  select s.seller_id, s.buyer_id, s.listing_id, s.source_inquiry_id, s.status
    into v_seller, v_buyer, v_listing, v_inquiry, v_status
  from public.sales s
  where s.id = p_sale_id;
  if not found then return; end if;

  -- Only the seller who owns the sale may emit its status notices.
  if v_actor <> v_seller then return; end if;

  -- A buyer who never signed in has no inbox to notify.
  if v_buyer is null then return; end if;
  if not public.notification_enabled(v_buyer, 'sale_updates') then return; end if;

  v_title := case v_status
    when 'awaiting_confirmation' then 'Sale awaiting confirmation'
    when 'reserved'              then 'An item is reserved for you'
    when 'collection_arranged'   then 'Collection arranged'
    when 'completed'             then 'Sale completed'
    when 'cancelled'             then 'Sale cancelled'
    else 'Sale updated'
  end;
  v_body := 'The seller updated a sale you are part of to: ' || replace(v_status, '_', ' ') || '.';

  v_href := case
    when v_inquiry is not null then '/messages/' || v_inquiry::text
    else '/marketplace/listing/' || v_listing::text
  end;

  insert into public.notifications
    (user_id, type, title, body, href, sale_id, conversation_id, listing_id, actor_id, dedupe_key)
  values
    (v_buyer, 'sale_status_changed', v_title, v_body, v_href, p_sale_id, v_inquiry, v_listing, v_actor,
     'sale:' || p_sale_id::text || ':' || v_status)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
exception
  when others then return;
end $function$;

create or replace function public.protect_inquiry_identity()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if app.is_service() then
    return new;
  end if;

  if app.user_id() is null then
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
$function$;
