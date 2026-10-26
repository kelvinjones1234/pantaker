-- Development-only mock accounts for the admin account directory.
-- Safe to re-run: every insert is idempotent. Do not run in production.

insert into public.users (id, email, email_verified, name, created_at, updated_at)
values
  ('11111111-1111-4111-8111-111111111111', 'amina.bello@example.com', now() - interval '42 days', 'Amina Bello', now() - interval '42 days', now() - interval '42 days'),
  ('22222222-2222-4222-8222-222222222222', 'chidi.okonkwo@example.com', now() - interval '35 days', 'Chidi Okonkwo', now() - interval '35 days', now() - interval '35 days'),
  ('33333333-3333-4333-8333-333333333333', 'fatima.yusuf@example.com', now() - interval '28 days', 'Fatima Yusuf', now() - interval '28 days', now() - interval '28 days'),
  ('44444444-4444-4444-8444-444444444444', 'emeka.nwosu@example.com', now() - interval '21 days', 'Emeka Nwosu', now() - interval '21 days', now() - interval '21 days'),
  ('55555555-5555-4555-8555-555555555555', 'zainab.mohammed@example.com', now() - interval '16 days', 'Zainab Mohammed', now() - interval '16 days', now() - interval '16 days'),
  ('66666666-6666-4666-8666-666666666666', 'tunde.adeyemi@example.com', now() - interval '11 days', 'Tunde Adeyemi', now() - interval '11 days', now() - interval '11 days'),
  ('77777777-7777-4777-8777-777777777777', 'grace.okafor@example.com', now() - interval '6 days', 'Grace Okafor', now() - interval '6 days', now() - interval '6 days')
on conflict (email) do nothing;

insert into public.profiles (
  id, display_name, username, city, area, account_type, bio, default_area
)
select
  v.id,
  v.display_name,
  v.username,
  'Abuja',
  v.area,
  v.account_type,
  v.bio,
  v.area
from (
  values
    ('11111111-1111-4111-8111-111111111111'::uuid, 'Amina Bello', 'aminabello', 'Wuse 2', 'individual', 'Selling gently used home items around Wuse.'),
    ('22222222-2222-4222-8222-222222222222'::uuid, 'Chidi Okonkwo', 'chidiokonkwo', 'Gwarinpa', 'business', 'Small electronics refurbisher in Gwarinpa.'),
    ('33333333-3333-4333-8333-333333333333'::uuid, 'Fatima Yusuf', 'fatimayusuf', 'Maitama', 'individual', 'Decluttering and rehoming furniture.'),
    ('44444444-4444-4444-8444-444444444444'::uuid, 'Emeka Nwosu', 'emekanwosu', 'Kubwa', 'individual', 'Buying and reselling surplus building materials.'),
    ('55555555-5555-4555-8555-555555555555'::uuid, 'Zainab Mohammed', 'zainabmohammed', 'Asokoro', 'business', 'Office clearance and appliance resale.'),
    ('66666666-6666-4666-8666-666666666666'::uuid, 'Tunde Adeyemi', 'tundeadeyemi', 'Lugbe', 'individual', 'Spare parts trader near Lugbe market.'),
    ('77777777-7777-4777-8777-777777777777'::uuid, 'Grace Okafor', 'graceokafor', 'Jabi', 'individual', 'Rehoming household goods and books.')
) as v(id, display_name, username, area, account_type, bio)
join public.users u on u.id = v.id
on conflict (id) do nothing;

with admin as (
  select id
  from public.users
  where admin_role = 'super_admin'
  order by created_at
  limit 1
)
insert into public.account_restrictions (
  user_id, status, reason, starts_at, created_by, updated_by
)
select
  v.user_id,
  v.status,
  v.reason,
  now() - interval '3 days',
  coalesce((select id from admin), v.user_id),
  coalesce((select id from admin), v.user_id)
from (
  values
    ('44444444-4444-4444-8444-444444444444'::uuid, 'restricted', 'Repeated no-shows after agreeing collection times.'),
    ('55555555-5555-4555-8555-555555555555'::uuid, 'suspended', 'Confirmed attempt to list stolen appliances.')
) as v(user_id, status, reason)
where exists (select 1 from public.users u where u.id = v.user_id)
on conflict (user_id) do nothing;
