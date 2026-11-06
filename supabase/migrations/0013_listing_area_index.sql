create index if not exists listings_area_published_idx
  on public.listings (area, published_at desc)
  where item_status = 'published';
