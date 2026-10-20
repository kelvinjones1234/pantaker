-- Pantaker — Seller-managed sales
-- ---------------------------------------------------------------------------
-- NO transaction/order/reservation model existed before this migration. The
-- only sale signals were `listings.item_status = 'sold'` (a status the seller
-- sets by hand) and the `inquiries` table (a buyer first-contact message).
-- Neither records who bought what, the agreed price, collection, or completion.
--
-- This migration adds the smallest model that supports a seller-managed sale:
-- the seller records a sale against one of their own listings, optionally links
-- the enquiry it came from, and tracks it through the statuses the workflow
-- actually has. There is deliberately no payment or messaging here.
--
-- Model: public.sales
--   id                 uuid  pk
--   listing_id         uuid  -> listings(id)        (the item being sold)
--   seller_id          uuid  -> auth.users(id)      (owner; always the listing owner)
--   buyer_id           uuid  -> auth.users(id) NULL (set when the buyer is a signed-in user)
--   buyer_label        text  NULL                   (off-platform buyer name the seller types)
--   source_inquiry_id  uuid  -> inquiries(id) NULL  (the enquiry this sale came from)
--   agreed_price       integer NULL                 (seller-recorded, NOT verified revenue)
--   status             text                          (see check constraint below)
--   collection_notes   text  NULL                   (where/when the buyer collects)
--   completed_at       timestamptz NULL
--   cancelled_at       timestamptz NULL
--   created_at         timestamptz NOT NULL default now()
--   updated_at         timestamptz NOT NULL default now()
--
-- Statuses (all five are reachable by the seller workflow):
--   awaiting_confirmation -> reserved | cancelled
--   reserved              -> collection_arranged | completed | cancelled
--   collection_arranged   -> completed | cancelled
--   completed             -> (terminal)
--   cancelled             -> (terminal)
-- There is intentionally no "paid" status: Pantaker does not process payments
-- and does not verify them, so a sale is never labelled paid.
--
-- Consistency with listing availability:
--   * At most ONE active sale (awaiting_confirmation/reserved/collection_arranged)
--     may exist per listing — enforced by a partial unique index so a listing
--     can never be double-booked, even under concurrent writes.
--   * A sale can only be created for a listing the seller owns and that is not
--     archived.
--   * Statuses are NOT pushed back onto `listings.item_status`. Marking a
--     listing sold is a separate, explicit seller action, so a listing being
--     sold never implies a sale was completed (and vice-versa).

create table if not exists public.sales (
  id                uuid primary key default gen_random_uuid(),
  listing_id        uuid not null references public.listings (id) on delete cascade,
  seller_id         uuid not null,
  buyer_id          uuid,
  buyer_label       text,
  source_inquiry_id uuid references public.inquiries (id) on delete set null,
  agreed_price      integer check (agreed_price is null or agreed_price >= 0),
  status            text not null default 'awaiting_confirmation'
                      check (status in (
                        'awaiting_confirmation',
                        'reserved',
                        'collection_arranged',
                        'completed',
                        'cancelled'
                      )),
  collection_notes  text,
  completed_at      timestamptz,
  cancelled_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists sales_seller_created_idx on public.sales (seller_id, created_at desc);
create index if not exists sales_listing_idx on public.sales (listing_id);

-- One active sale per listing. Completed/cancelled rows do not participate, so a
-- listing with quantity > 1 can be sold repeatedly over time.
create unique index if not exists sales_one_active_per_listing
  on public.sales (listing_id)
  where status in ('awaiting_confirmation', 'reserved', 'collection_arranged');

-- Row Level Security ---------------------------------------------------------
-- Only the two participants may touch a row: the seller (owner) in full, and the
-- buyer (when they are a signed-in user) read-only. Anonymous access is denied.
alter table public.sales enable row level security;

drop policy if exists "participants read their sales" on public.sales;
create policy "participants read their sales"
  on public.sales for select using (auth.uid() = seller_id or auth.uid() = buyer_id);

drop policy if exists "sellers create their sales" on public.sales;
create policy "sellers create their sales"
  on public.sales for insert with check (auth.uid() = seller_id);

drop policy if exists "sellers update their sales" on public.sales;
create policy "sellers update their sales"
  on public.sales for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

-- Deletion is intentionally not granted: a mistaken sale is cancelled, which
-- keeps the audit trail instead of destroying a record.
