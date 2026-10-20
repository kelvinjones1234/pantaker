-- Pantaker — Row Level Security policies
-- ---------------------------------------------------------------------------
-- Apply AFTER the domain tables (profiles, categories, listings,
-- listing_images, inquiries, reports) exist. Run in the Supabase SQL editor or
-- via the Supabase CLI.
--
-- These policies are the database half of the seller authorization model and
-- back up the server-side checks in src/features/auth/authorization.ts and
-- src/features/listings/{actions,ownership}.ts. The application only ever uses
-- the anon key + the user session (see src/lib/supabase/server.ts); the
-- service-role key is never shipped to client code and must only be used by
-- trusted admin/server jobs that intentionally bypass RLS.

-- profiles ------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable"
  on public.profiles for select using (true);

drop policy if exists "users insert their own profile" on public.profiles;
create policy "users insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- categories ----------------------------------------------------------------
alter table public.categories enable row level security;

drop policy if exists "active categories are public" on public.categories;
create policy "active categories are public"
  on public.categories for select using (is_active);

-- listings ------------------------------------------------------------------
alter table public.listings enable row level security;

drop policy if exists "published listings are public" on public.listings;
create policy "published listings are public"
  on public.listings for select using (item_status = 'published');

drop policy if exists "sellers read their own listings" on public.listings;
create policy "sellers read their own listings"
  on public.listings for select using (auth.uid() = seller_id);

drop policy if exists "sellers insert their own listings" on public.listings;
create policy "sellers insert their own listings"
  on public.listings for insert with check (auth.uid() = seller_id);

drop policy if exists "sellers update their own listings" on public.listings;
create policy "sellers update their own listings"
  on public.listings for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

drop policy if exists "sellers delete their own listings" on public.listings;
create policy "sellers delete their own listings"
  on public.listings for delete using (auth.uid() = seller_id);

-- listing_images ------------------------------------------------------------
alter table public.listing_images enable row level security;

drop policy if exists "images of visible listings are readable" on public.listing_images;
create policy "images of visible listings are readable"
  on public.listing_images for select using (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id
        and (l.item_status = 'published' or l.seller_id = auth.uid())
    )
  );

drop policy if exists "sellers manage their listing images" on public.listing_images;
create policy "sellers manage their listing images"
  on public.listing_images for all using (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id and l.seller_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id and l.seller_id = auth.uid()
    )
  );

-- inquiries -----------------------------------------------------------------
alter table public.inquiries enable row level security;

drop policy if exists "buyers insert inquiries" on public.inquiries;
create policy "buyers insert inquiries"
  on public.inquiries for insert with check (auth.uid() = buyer_id);

drop policy if exists "parties read their inquiries" on public.inquiries;
create policy "parties read their inquiries"
  on public.inquiries for select using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "parties update their inquiries" on public.inquiries;
create policy "parties update their inquiries"
  on public.inquiries for update using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- reports -------------------------------------------------------------------
alter table public.reports enable row level security;

drop policy if exists "users file reports" on public.reports;
create policy "users file reports"
  on public.reports for insert with check (auth.uid() = reporter_id);

-- NOTE: moderation (moving listings to published/rejected) is intentionally NOT
-- grantable to sellers. Perform it with a trusted server job using the
-- service-role key, or add an explicit admin role check here.
