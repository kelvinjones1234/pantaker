-- Pantaker — In-app seller notifications
-- ---------------------------------------------------------------------------
-- AUDIT RESULT: before this migration Pantaker had NO notifications table, no
-- notification code, and no delivery channel. The only thing resembling a
-- notification was the "Buyer enquiries" count on the seller Overview, and the
-- Notifications settings page could only say that no channel existed.
--
-- SCOPE. This migration adds in-app notifications only. No email and no browser
-- push is introduced, because neither channel exists in Pantaker today (there is
-- no mail service, no mobile app, and no push subscription store). The UI never
-- requests browser notification permission, and there is no code path that ever
-- will without a real product decision.
--
-- EVENT SOURCES (only events the product actually produces):
--   * `new_message`          — a participant sends a message (messaging actions).
--   * `sale_status_changed`  — the seller moves a sale through its lifecycle; the
--                              buyer (when the sale is tied to a real account) is
--                              told.
--   * `listing_published` /  — listing moderation outcomes. Moderation is an
--     `listing_rejected`       out-of-app, service-role operation (see
--                              src/features/listings/lifecycle.ts), so these are
--                              captured by a trigger on `listings`, which fires
--                              no matter who performs the review.
--   * `account_email_change` — the account owner requests an email change and
--                              stays signed in, so the pending confirmation is
--                              surfaced in-app.
--
-- SECURITY MODEL. Notifications are written for a *different* user than the one
-- calling the app, so they can never be inserted by an ordinary session. There
-- is deliberately NO insert policy on `notifications`: rows are created only by
-- SECURITY DEFINER functions (and the moderation trigger), which derive the
-- recipient from trusted rows and ignore any client-supplied recipient. Users
-- may read only their own rows and may only flip `read_at`; a freeze trigger
-- makes every other column immutable.
--
-- DEDUPE. `dedupe_key` is unique per user where present, so a retried action
-- cannot produce a second copy. Message notifications key on the message id;
-- sale notifications key on (sale, status); moderation decisions are distinct
-- events and carry no key.
--
-- USER PREFERENCES. `notification_preferences` holds one row per user. A missing
-- row means "everything on", so a user who never opens settings still gets
-- notifications. Account/security events are always delivered and are not
-- switchable.

-- 1. notifications -----------------------------------------------------------
create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null,
  type            text not null,
  title           text not null,
  body            text,
  href            text not null,
  listing_id      uuid,
  conversation_id uuid,
  sale_id         uuid,
  actor_id        uuid,
  read_at         timestamptz,
  created_at      timestamptz not null default now(),
  dedupe_key      text,
  constraint notifications_type_check check (type in (
    'listing_published',
    'listing_rejected',
    'new_message',
    'sale_status_changed',
    'account_email_change'
  )),
  constraint notifications_title_check check (char_length(btrim(title)) between 1 and 120),
  constraint notifications_href_check check (char_length(href) between 1 and 300)
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null;
create unique index if not exists notifications_dedupe_idx
  on public.notifications (user_id, dedupe_key) where dedupe_key is not null;

alter table public.notifications enable row level security;

drop policy if exists "users read their own notifications" on public.notifications;
create policy "users read their own notifications"
  on public.notifications for select using (auth.uid() = user_id);

-- Users may only advance read_at; the freeze trigger below enforces that.
drop policy if exists "users update their own notifications" on public.notifications;
create policy "users update their own notifications"
  on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users delete their own notifications" on public.notifications;
create policy "users delete their own notifications"
  on public.notifications for delete using (auth.uid() = user_id);

-- No insert policy: rows are created only by the SECURITY DEFINER functions
-- below. Without this, a session could forge a notice to another user.

-- Only `read_at` may ever change after insert.
create or replace function public.notifications_freeze()
returns trigger
language plpgsql
as $$
begin
  new.id              := old.id;
  new.user_id         := old.user_id;
  new.type            := old.type;
  new.title           := old.title;
  new.body            := old.body;
  new.href            := old.href;
  new.listing_id      := old.listing_id;
  new.conversation_id := old.conversation_id;
  new.sale_id         := old.sale_id;
  new.actor_id        := old.actor_id;
  new.created_at      := old.created_at;
  new.dedupe_key      := old.dedupe_key;
  return new;
end $$;

drop trigger if exists notifications_freeze_trg on public.notifications;
create trigger notifications_freeze_trg
  before update on public.notifications
  for each row execute function public.notifications_freeze();

-- 2. notification_preferences -------------------------------------------------
create table if not exists public.notification_preferences (
  user_id         uuid primary key,
  messages        boolean not null default true,
  sale_updates    boolean not null default true,
  listing_updates boolean not null default true,
  updated_at      timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "users read their own notification preferences" on public.notification_preferences;
create policy "users read their own notification preferences"
  on public.notification_preferences for select using (auth.uid() = user_id);

drop policy if exists "users insert their own notification preferences" on public.notification_preferences;
create policy "users insert their own notification preferences"
  on public.notification_preferences for insert with check (auth.uid() = user_id);

drop policy if exists "users update their own notification preferences" on public.notification_preferences;
create policy "users update their own notification preferences"
  on public.notification_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- A preference is on unless the user has explicitly stored a row that turns it
-- off. Reads run inside SECURITY DEFINER callers (table owner), so RLS never
-- hides the recipient's own row from the delivery path.
create or replace function public.notification_enabled(p_user uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case p_kind
        when 'messages' then np.messages
        when 'sale_updates' then np.sale_updates
        when 'listing_updates' then np.listing_updates
        else true
      end
      from public.notification_preferences np
      where np.user_id = p_user
    ),
    true
  );
$$;

-- 3. delivery functions -------------------------------------------------------
-- Every function derives the recipient from a trusted row. None of them accept a
-- recipient argument, so a buggy or hostile caller cannot redirect a notice.

create or replace function public.notify_new_message(p_inquiry_id uuid, p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer    uuid;
  v_seller   uuid;
  v_listing  uuid;
  v_title    text;
  v_href     text;
  v_recipient uuid;
  v_listing_title text;
begin
  if auth.uid() is null then return; end if;

  select i.buyer_id, i.seller_id, i.listing_id
    into v_buyer, v_seller, v_listing
  from public.inquiries i
  where i.id = p_inquiry_id;
  if not found then return; end if;

  -- The caller must be a party to the conversation...
  if auth.uid() <> v_buyer and auth.uid() <> v_seller then return; end if;

  -- ...and must actually be the sender of the referenced message.
  perform 1 from public.messages m
   where m.id = p_message_id
     and m.inquiry_id = p_inquiry_id
     and m.sender_id = auth.uid();
  if not found then return; end if;

  v_recipient := case when auth.uid() = v_buyer then v_seller else v_buyer end;
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
     v_href, p_inquiry_id, v_listing, auth.uid(), 'message:' || p_message_id::text)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
exception
  when others then return;  -- a notification failure must never break messaging
end $$;

create or replace function public.notify_sale_status(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller   uuid;
  v_buyer    uuid;
  v_listing  uuid;
  v_inquiry  uuid;
  v_status   text;
  v_title    text;
  v_body     text;
  v_href     text;
begin
  if auth.uid() is null then return; end if;

  select s.seller_id, s.buyer_id, s.listing_id, s.source_inquiry_id, s.status
    into v_seller, v_buyer, v_listing, v_inquiry, v_status
  from public.sales s
  where s.id = p_sale_id;
  if not found then return; end if;

  -- Only the seller who owns the sale may emit its status notices.
  if auth.uid() <> v_seller then return; end if;

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
    (v_buyer, 'sale_status_changed', v_title, v_body, v_href, p_sale_id, v_inquiry, v_listing, auth.uid(),
     'sale:' || p_sale_id::text || ':' || v_status)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
exception
  when others then return;
end $$;

-- Self-notification for a small, fixed set of account events. The client sends
-- only a type string; the title/body/href are decided here, so no user text is
-- ever reflected into a notification.
create or replace function public.notify_account_event(p_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  if p_type <> 'account_email_change' then return; end if;

  insert into public.notifications (user_id, type, title, body, href)
  values (
    auth.uid(),
    'account_email_change',
    'Confirm your new email',
    'We sent a confirmation link to your new address. Your current email stays active until you confirm.',
    '/seller/settings/account'
  );
exception
  when others then return;
end $$;

-- 4. listing moderation outcomes ---------------------------------------------
-- Moderation (pending_review -> published/rejected) is performed outside the app
-- with the service role, so it cannot call a TS emit helper. A trigger on the
-- table catches the outcome no matter who performs it. Seller-driven reactivation
-- (sold/archived -> published) is deliberately excluded: the seller did that
-- themselves, and it is not a moderation result.
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
  if old.item_status <> 'pending_review' then return new; end if;
  if new.item_status not in ('published', 'rejected') then return new; end if;
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
  when others then return new;  -- never block a listing update
end $$;

drop trigger if exists notifications_listing_moderation_trg on public.listings;
create trigger notifications_listing_moderation_trg
  after update of item_status on public.listings
  for each row execute function public.notifications_on_listing_moderation();

-- 5. Realtime -----------------------------------------------------------------
-- The seller rail badge is refreshed on navigation; live push is not required by
-- the product yet, so notifications are intentionally not added to the realtime
-- publication. If a live bell is built later, add the table here.
