-- Pantaker — webhook ordering and transfer reconciliation
-- ---------------------------------------------------------------------------
-- Bachs may deliver webhooks out of order. Disputes carry the provider event
-- timestamp so an older delivery cannot overwrite a newer resolution. Transfers
-- can settle after the initial API call returned `pending`, so the cron
-- reconciles their status directly with Bachs.

alter table public.order_disputes
  add column if not exists last_event_at timestamptz;

alter table public.bachs_webhook_events
  add column if not exists event_created_at timestamptz;

create index if not exists order_transfers_pending_updated_idx
  on public.order_transfers (updated_at)
  where status = 'pending';

create index if not exists orders_recovery_idx
  on public.orders (refunded_at)
  where refunded_at is not null and released_at is not null;
