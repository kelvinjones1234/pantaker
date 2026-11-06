-- Pantaker — payment completion
-- ---------------------------------------------------------------------------
-- Adds the notification events produced by the buyer-protected order flow and
-- the preference that governs them. No money movement is changed here.

-- 1. Order notification types -------------------------------------------------
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (type in (
    'listing_published',
    'listing_rejected',
    'new_message',
    'sale_status_changed',
    'account_email_change',
    'order_paid',
    'order_ready',
    'order_handover',
    'order_released',
    'order_refunded',
    'order_disputed',
    'order_cancelled',
    'order_issue',
    'order_payment_failed',
    'order_expired'
  ));

-- 2. Order update preference --------------------------------------------------
alter table public.notification_preferences
  add column if not exists order_updates boolean not null default true;

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
        when 'order_updates' then np.order_updates
        else true
      end
      from public.notification_preferences np
      where np.user_id = p_user
    ),
    true
  );
$$;
