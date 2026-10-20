-- Pantaker — In-app buyer ↔ seller messaging
-- ---------------------------------------------------------------------------
-- AUDIT RESULT: before this migration Pantaker had NO messaging, inbox, or
-- real-time layer. The only contact primitive was `public.inquiries`: a single
-- row holding one buyer message with a `status` (open/replied/closed), written
-- by `sendInquiryAction` but never surfaced in any UI. `reports` existed for
-- listing reports (also unwired).
--
-- Rather than add a parallel "conversations" system, this migration REPURPOSES
-- `inquiries` as the conversation header and adds `messages` for the history.
-- A conversation IS an inquiry thread:
--   * `inquiries` keeps listing_id / buyer_id / seller_id and gains
--     last_message_at + per-role read markers.
--   * `messages` holds the immutable ordered history.
--   * the existing `sales.source_inquiry_id` continues to point at the thread,
--     so nothing is duplicated or broken.
--
-- Guest participation is NOT part of Pantaker's current product: contacting a
-- seller already required an authenticated buyer (`inquiries` insert policy is
-- `auth.uid() = buyer_id`, and `resolveInquirySeller` needs a buyer id). There
-- is therefore no anonymous/guest identity here — it would be a second, unsafe
-- account system. Guests browse freely; to message, they sign in with the
-- existing magic-link flow and the thread belongs to that authenticated id. No
-- message history is kept in the browser.

-- 1. inquiries becomes the conversation header ---------------------------------
alter table public.inquiries add column if not exists last_message_at timestamptz;
update public.inquiries set last_message_at = created_at where last_message_at is null;
alter table public.inquiries alter column last_message_at set default now();
alter table public.inquiries alter column last_message_at set not null;

alter table public.inquiries
  add column if not exists buyer_last_read_at timestamptz,
  add column if not exists seller_last_read_at timestamptz;

create index if not exists inquiries_buyer_activity_idx
  on public.inquiries (buyer_id, last_message_at desc);
create index if not exists inquiries_seller_activity_idx
  on public.inquiries (seller_id, last_message_at desc);

-- 2. messages -------------------------------------------------------------------
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  sender_id  uuid not null,
  body       text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_inquiry_created_idx
  on public.messages (inquiry_id, created_at);

-- Preserve existing single-message inquiries as the first message of the thread.
insert into public.messages (inquiry_id, sender_id, body, created_at)
select i.id, i.buyer_id, i.message, i.created_at
from public.inquiries i
where i.message is not null
  and btrim(i.message) <> ''
  and not exists (select 1 from public.messages m where m.inquiry_id = i.id);

-- Messages are immutable: select + insert only, never update/delete.
alter table public.messages enable row level security;

drop policy if exists "participants read their messages" on public.messages;
create policy "participants read their messages"
  on public.messages for select using (
    exists (
      select 1 from public.inquiries i
      where i.id = messages.inquiry_id
        and (auth.uid() = i.buyer_id or auth.uid() = i.seller_id)
    )
  );

drop policy if exists "participants send messages" on public.messages;
create policy "participants send messages"
  on public.messages for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.inquiries i
      where i.id = messages.inquiry_id
        and (auth.uid() = i.buyer_id or auth.uid() = i.seller_id)
    )
  );

-- 3. Conversation parties may read the listing they are discussing even after it
--    is no longer published (sold / archived), so the conversation can keep
--    showing the correct availability instead of losing its context.
drop policy if exists "conversation parties read the listing" on public.listings;
create policy "conversation parties read the listing"
  on public.listings for select using (
    exists (
      select 1 from public.inquiries i
      where i.listing_id = listings.id
        and (auth.uid() = i.buyer_id or auth.uid() = i.seller_id)
    )
  );

-- 4. blocks — abuse control -----------------------------------------------------
create table if not exists public.blocks (
  id         uuid primary key default gen_random_uuid(),
  blocker_id uuid not null,
  blocked_id uuid not null,
  created_at timestamptz not null default now(),
  constraint blocks_no_self check (blocker_id <> blocked_id),
  constraint blocks_unique unique (blocker_id, blocked_id)
);

create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

drop policy if exists "users see blocks involving them" on public.blocks;
create policy "users see blocks involving them"
  on public.blocks for select using (auth.uid() = blocker_id or auth.uid() = blocked_id);

drop policy if exists "users create their own blocks" on public.blocks;
create policy "users create their own blocks"
  on public.blocks for insert with check (auth.uid() = blocker_id);

drop policy if exists "users remove their own blocks" on public.blocks;
create policy "users remove their own blocks"
  on public.blocks for delete using (auth.uid() = blocker_id);

-- 5. reports — allow reporting a conversation / participant --------------------
alter table public.reports add column if not exists reported_user_id uuid;
alter table public.reports add column if not exists conversation_id uuid;
alter table public.reports alter column listing_id drop not null;

drop policy if exists "users read their own reports" on public.reports;
create policy "users read their own reports"
  on public.reports for select using (auth.uid() = reporter_id);

-- 6. Realtime — messages are delivered over Supabase Realtime -------------------
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;   -- already added
  when undefined_object then null;   -- publication not present in this project
end $$;

-- Replication identity full so realtime change payloads carry the row contents.
alter table public.messages replica identity full;
