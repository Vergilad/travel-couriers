-- Seed data for landing page live listings preview (step 5)
-- Applied via Supabase when no open listings exist.

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
SELECT
  (SELECT id FROM auth.instances LIMIT 1),
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'authenticated',
  'authenticated',
  'seed@travel-couriers.local',
  crypt('seedpass123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Seed Courier"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid
);

INSERT INTO public.profiles (id, display_name, city, country)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'Seed Courier', 'Baku', 'Azerbaijan'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid
);

INSERT INTO public.listings (
  owner_id, kind, origin_city, origin_country, dest_city, dest_country,
  depart_date, arrive_date, title, description, price, currency, capacity_kg, status
)
SELECT * FROM (VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'trip', 'Baku', 'Azerbaijan', 'Istanbul', 'Turkey', '2026-07-15'::date, '2026-07-16'::date, 'Flying Baku → Istanbul, can carry small items', 'Small electronics and documents welcome.', 25, 'USD', 3, 'open'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'delivery', 'London', 'United Kingdom', 'Paris', 'France', '2026-07-20'::date, '2026-07-20'::date, 'Need documents delivered to Paris urgently', 'Signed contract, envelope only.', 40, 'EUR', 0.5, 'open'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'trip', 'Dubai', 'UAE', 'Tbilisi', 'Georgia', '2026-08-01'::date, '2026-08-02'::date, 'Dubai to Tbilisi, 5kg available', 'Extra luggage space on direct flight.', 35, 'USD', 5, 'open')
) AS v(owner_id, kind, origin_city, origin_country, dest_city, dest_country, depart_date, arrive_date, title, description, price, currency, capacity_kg, status)
WHERE NOT EXISTS (SELECT 1 FROM public.listings WHERE status = 'open' LIMIT 1);
