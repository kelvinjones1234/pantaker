insert into public.categories (name, slug, description, icon_key, sort_order, is_active)
values
  ('Metals', 'metals', 'Scrap iron, aluminium, copper', 'metals', 10, true),
  ('Plastics', 'plastics', 'Drums, crates, PET', 'plastics', 20, true),
  ('Electronics', 'electronics', 'Phones, laptops, parts', 'electronics', 30, true),
  ('Appliances', 'appliances', 'Fridges, cookers, ACs', 'appliances', 40, true),
  ('Furniture', 'furniture', 'Chairs, tables, cabinets', 'furniture', 50, true),
  ('Vehicle Parts', 'vehicle-parts', 'Engines, tyres, spares', 'vehicle-parts', 60, true),
  ('Construction', 'construction-materials', 'Cement, blocks, rods', 'construction-materials', 70, true),
  ('Electrical', 'electrical-materials', 'Cables, boards, fittings', 'electrical-materials', 80, true),
  ('Plumbing', 'plumbing-materials', 'Pipes, tanks, fittings', 'plumbing-materials', 90, true),
  ('Industrial', 'industrial-equipment', 'Motors, pumps, machinery', 'industrial-equipment', 100, true),
  ('Household', 'household-items', 'Reusable home goods', 'household-items', 110, true),
  ('Paper & Packaging', 'paper-packaging', 'Cartons, sacks, wrap', 'paper-packaging', 120, true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  icon_key = excluded.icon_key,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
