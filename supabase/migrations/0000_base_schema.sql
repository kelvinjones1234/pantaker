-- Pantaker base marketplace schema.
-- This migration is intentionally idempotent so it can also be applied to a
-- database that was previously bootstrapped with `prisma db push`.
-- Apply before 0001_rls_policies.sql.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  username text,
  avatar_path text,
  city text,
  area text,
  account_type text not null default 'individual',
  bio text,
  default_area text,
  default_pickup_notes text,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  constraint profiles_display_name_length check (
    display_name is null or char_length(btrim(display_name)) between 1 and 80
  ),
  constraint profiles_username_length check (
    username is null or char_length(btrim(username)) between 1 and 40
  ),
  constraint profiles_account_type check (
    account_type in ('individual', 'business')
  )
);

create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username))
  where username is not null;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  parent_id uuid references public.categories (id) on delete restrict,
  icon_key text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index if not exists categories_parent_id_idx
  on public.categories (parent_id);
create index if not exists categories_active_sort_idx
  on public.categories (is_active, sort_order, name);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  title text not null,
  slug text not null unique,
  description text not null default '',
  condition text not null default 'used',
  item_status text not null default 'draft',
  pricing_type text not null default 'fixed',
  price integer,
  negotiable boolean not null default false,
  quantity numeric(12, 3) not null default 1,
  quantity_unit text not null default 'item',
  city text not null default 'Abuja',
  area text,
  pickup_notes text,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_title_length check (char_length(btrim(title)) between 3 and 140),
  constraint listings_description_length check (char_length(description) <= 4000),
  constraint listings_condition check (
    condition in ('new', 'like_new', 'used', 'refurbished', 'for_parts')
  ),
  constraint listings_item_status check (
    item_status in ('draft', 'pending_review', 'published', 'rejected', 'sold', 'archived')
  ),
  constraint listings_pricing_type check (
    pricing_type in ('fixed', 'negotiable', 'contact')
  ),
  constraint listings_price_non_negative check (price is null or price >= 0),
  constraint listings_quantity_positive check (quantity > 0),
  constraint listings_quantity_unit_length check (char_length(btrim(quantity_unit)) between 1 and 24)
);

create index if not exists listings_seller_status_idx
  on public.listings (seller_id, item_status, updated_at desc);
create index if not exists listings_published_feed_idx
  on public.listings (item_status, published_at desc)
  where item_status = 'published';
create index if not exists listings_category_status_idx
  on public.listings (category_id, item_status);

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint listing_images_storage_path_length check (
    char_length(btrim(storage_path)) between 1 and 512
  ),
  constraint listing_images_sort_order_non_negative check (sort_order >= 0)
);

create index if not exists listing_images_listing_sort_idx
  on public.listing_images (listing_id, sort_order);
create index if not exists listing_images_storage_path_idx
  on public.listing_images (storage_path);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references auth.users (id) on delete cascade,
  seller_id uuid not null references auth.users (id) on delete cascade,
  message text not null default '',
  status text not null default 'open',
  last_message_at timestamptz not null default now(),
  buyer_last_read_at timestamptz,
  seller_last_read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint inquiries_status check (status in ('open', 'archived', 'closed')),
  constraint inquiries_message_length check (char_length(message) <= 2000),
  constraint inquiries_distinct_participants check (buyer_id <> seller_id)
);

create index if not exists inquiries_buyer_recent_idx
  on public.inquiries (buyer_id, last_message_at desc);
create index if not exists inquiries_seller_recent_idx
  on public.inquiries (seller_id, last_message_at desc);
create index if not exists inquiries_listing_idx
  on public.inquiries (listing_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  reported_user_id uuid references auth.users (id) on delete set null,
  conversation_id uuid references public.inquiries (id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  resolution_note text,
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_status check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  constraint reports_reason_length check (char_length(btrim(reason)) between 1 and 120),
  constraint reports_details_length check (details is null or char_length(details) <= 4000),
  constraint reports_target_present check (
    listing_id is not null or reported_user_id is not null or conversation_id is not null
  )
);

create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);
create index if not exists reports_reporter_idx
  on public.reports (reporter_id, created_at desc);
create index if not exists reports_listing_idx
  on public.reports (listing_id);
