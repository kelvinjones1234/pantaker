-- Pantaker — Bachs payments, buyer protection, payouts, refunds and disputes
-- ---------------------------------------------------------------------------
-- Bachs has no native escrow product. Pantaker therefore collects into the
-- platform Bachs balance, holds the seller share, and sends a standalone
-- transfer only after buyer handover confirmation (or the 72h release window).
-- This is buyer protection, not regulated escrow.

create table if not exists public.seller_payment_accounts (
  user_id               uuid primary key references public.users (id) on delete cascade,
  bachs_account_id      text not null unique,
  onboarding_status     text not null default 'pending'
                          check (onboarding_status in ('pending', 'active', 'restricted', 'rejected')),
  transfers_status      text not null default 'unrequested'
                          check (transfers_status in ('unrequested', 'restricted', 'pending', 'active', 'unsupported')),
  payouts_status        text not null default 'unrequested'
                          check (payouts_status in ('unrequested', 'restricted', 'pending', 'active', 'unsupported')),
  destination_usable    boolean not null default false,
  requirements          jsonb,
  available_balance_kobo bigint,
  pending_balance_kobo  bigint,
  balance_synced_at     timestamptz,
  last_error            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.orders (
  id                    uuid primary key default gen_random_uuid(),
  order_number          text not null unique,
  listing_id            uuid references public.listings (id) on delete set null,
  seller_id             uuid references public.users (id) on delete set null,
  buyer_id              uuid references public.users (id) on delete set null,
  buyer_name            text,
  buyer_email           text,
  seller_name           text,
  item_title            text not null,
  item_amount_kobo      bigint not null check (item_amount_kobo > 0),
  commission_kobo       bigint not null check (commission_kobo >= 0),
  seller_share_kobo     bigint not null check (seller_share_kobo >= 0),
  currency              text not null default 'NGN' check (currency = 'NGN'),
  status                text not null default 'pending_payment'
                          check (status in (
                            'pending_payment',
                            'held',
                            'ready_for_handover',
                            'handed_over',
                            'released',
                            'refund_pending',
                            'refunded',
                            'disputed',
                            'release_blocked',
                            'expired',
                            'payment_failed',
                            'cancelled'
                          )),
  pickup_code_hash      text,
  pickup_code_attempts  integer not null default 0,
  expires_at            timestamptz,
  paid_at               timestamptz,
  ready_at              timestamptz,
  handover_at           timestamptz,
  buyer_confirmed_at    timestamptz,
  release_due_at        timestamptz,
  released_at           timestamptz,
  cancelled_at          timestamptz,
  refunded_at           timestamptz,
  release_attempts      integer not null default 0,
  last_release_error    text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (commission_kobo + seller_share_kobo = item_amount_kobo)
);

create index if not exists orders_buyer_created_idx on public.orders (buyer_id, created_at desc);
create index if not exists orders_seller_created_idx on public.orders (seller_id, created_at desc);
create index if not exists orders_status_release_idx on public.orders (status, release_due_at);
create index if not exists orders_listing_idx on public.orders (listing_id);

-- One active purchase per listing. Expired/failed/released/refunded/cancelled
-- rows no longer participate, so a listing can be sold again over time.
create unique index if not exists orders_one_active_per_listing
  on public.orders (listing_id)
  where listing_id is not null
    and status in (
      'pending_payment',
      'held',
      'ready_for_handover',
      'handed_over',
      'release_blocked',
      'disputed',
      'refund_pending'
    );

create table if not exists public.order_payments (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null unique references public.orders (id) on delete cascade,
  provider          text not null default 'bachs' check (provider = 'bachs'),
  checkout_id       text unique,
  charge_id         text unique,
  checkout_url      text,
  reference         text not null unique,
  idempotency_key   text not null unique,
  amount_kobo       bigint not null check (amount_kobo > 0),
  currency          text not null default 'NGN' check (currency = 'NGN'),
  status            text not null default 'pending'
                      check (status in ('pending', 'paid', 'failed', 'expired', 'refunded', 'partially_refunded')),
  provider_fee_kobo bigint,
  failure_reason    text,
  paid_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  actor_id    uuid references public.users (id) on delete set null,
  type        text not null,
  message     text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists order_events_order_created_idx on public.order_events (order_id, created_at);

create table if not exists public.order_transfers (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  type              text not null check (type in ('release', 'recovery')),
  bachs_transfer_id text unique,
  idempotency_key   text not null unique,
  amount_kobo       bigint not null check (amount_kobo > 0),
  currency          text not null default 'NGN' check (currency = 'NGN'),
  status            text not null default 'pending'
                      check (status in ('pending', 'paid', 'failed')),
  error             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists order_transfers_order_idx on public.order_transfers (order_id, created_at desc);

create table if not exists public.order_refunds (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  bachs_refund_id text unique,
  idempotency_key text not null unique,
  amount_kobo     bigint not null check (amount_kobo > 0),
  status          text not null default 'pending'
                    check (status in ('pending', 'paid', 'failed', 'cancelled')),
  reason          text,
  requested_by    uuid references public.users (id) on delete set null,
  failure_reason  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists order_refunds_order_idx on public.order_refunds (order_id, created_at desc);

create table if not exists public.order_disputes (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  bachs_dispute_id text not null unique,
  status           text not null default 'open',
  amount_kobo      bigint,
  evidence_due_at  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists order_disputes_order_idx on public.order_disputes (order_id, created_at desc);

create table if not exists public.bachs_webhook_events (
  id            text primary key,
  type          text not null,
  account_id    text,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  error         text,
  attempts      integer not null default 1
);

create index if not exists bachs_webhook_events_received_idx on public.bachs_webhook_events (received_at desc);
create index if not exists bachs_webhook_events_unprocessed_idx on public.bachs_webhook_events (received_at)
  where processed_at is null;

create table if not exists public.seller_payouts (
  id                 uuid primary key default gen_random_uuid(),
  seller_id          uuid references public.users (id) on delete set null,
  bachs_payout_id    text unique,
  destination_id     text,
  reference          text not null unique,
  idempotency_key    text not null unique,
  amount_kobo        bigint not null check (amount_kobo > 0),
  fee_kobo           bigint,
  total_debited_kobo bigint,
  currency           text not null default 'NGN' check (currency = 'NGN'),
  status             text not null default 'pending'
                       check (status in ('pending', 'processing', 'completed', 'failed')),
  failure_reason     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists seller_payouts_seller_idx on public.seller_payouts (seller_id, created_at desc);

alter table public.seller_payment_accounts enable row level security;
alter table public.orders enable row level security;
alter table public.order_payments enable row level security;
alter table public.order_events enable row level security;
alter table public.order_transfers enable row level security;
alter table public.order_refunds enable row level security;
alter table public.order_disputes enable row level security;
alter table public.bachs_webhook_events enable row level security;
alter table public.seller_payouts enable row level security;

revoke all on public.seller_payment_accounts, public.orders, public.order_payments,
  public.order_events, public.order_transfers, public.order_refunds,
  public.order_disputes, public.bachs_webhook_events, public.seller_payouts
  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Account deletion must not strand money or erase an in-flight order.
-- Settled order history is retained with buyer/seller PII removed.
-- ---------------------------------------------------------------------------
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

  if exists (
    select 1 from public.orders
    where (buyer_id = p_user_id or seller_id = p_user_id)
      and status in (
        'pending_payment', 'held', 'ready_for_handover', 'handed_over',
        'release_blocked', 'disputed', 'refund_pending'
      )
  ) then
    raise exception 'account_has_open_orders' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.seller_payment_accounts
    where user_id = p_user_id
      and (coalesce(available_balance_kobo, 0) > 0
        or coalesce(pending_balance_kobo, 0) > 0)
  ) then
    raise exception 'account_has_remaining_balance' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.seller_payouts
    where seller_id = p_user_id
      and status in ('pending', 'processing')
  ) then
    raise exception 'account_has_payout_in_flight' using errcode = '23514';
  end if;

  -- Keep the financial record, drop the personal details.
  update public.orders
  set buyer_name = null, buyer_email = null
  where buyer_id = p_user_id;
  update public.orders
  set seller_name = null
  where seller_id = p_user_id;

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
