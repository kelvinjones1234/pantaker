alter table public.listings drop constraint if exists listings_condition;

update public.listings
set condition = case condition
  when 'new' then 'working'
  when 'like_new' then 'used'
  when 'refurbished' then 'working'
  else condition
end
where condition in ('new', 'like_new', 'refurbished');

alter table public.listings
  add constraint listings_condition check (
    condition in (
      'working',
      'partially_usable',
      'used',
      'damaged',
      'for_parts',
      'scrap',
      'unclassified'
    )
  );

alter table public.listings drop constraint if exists listings_pricing_type;

update public.listings
set pricing_type = 'negotiable'
where pricing_type = 'contact';

alter table public.listings
  add constraint listings_pricing_type check (
    pricing_type in ('fixed', 'negotiable', 'free', 'offer')
  );

alter table public.listings alter column quantity drop not null;
alter table public.listings alter column quantity_unit drop not null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists listings_touch_updated_at on public.listings;
create trigger listings_touch_updated_at
before update on public.listings
for each row execute function public.touch_updated_at();

drop trigger if exists categories_touch_updated_at on public.categories;
create trigger categories_touch_updated_at
before update on public.categories
for each row execute function public.touch_updated_at();
