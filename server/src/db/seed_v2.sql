-- =====================================================================
-- StylistAI V2 — Phase 1 Seed Fixtures
-- Seeds: Business, Admin, Staff, Customers, Services, Weekly Shifts
-- =====================================================================

-- 1. Insert Salon Business
INSERT INTO businesses (id, name, slug, phone, email, address, timezone)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'Luxe & Style Studio',
  'luxe-style',
  '+1-555-0100',
  'hello@luxestyle.com',
  '124 Fifth Avenue, New York, NY 10011',
  'America/New_York'
) ON CONFLICT (slug) DO NOTHING;

-- 2. Insert Users (Password: "password123" for all initial accounts)
-- bcrypt hash for "password123": $2b$10$epRswT6A4Ea7fM1kYfDZu.eUo6rW8O/7GqG5N3b7G0sXgC6zRsq4K
INSERT INTO users (id, business_id, email, password_hash, full_name, phone, role)
VALUES
  -- Admin
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'admin@luxestyle.com', '$2b$10$epRswT6A4Ea7fM1kYfDZu.eUo6rW8O/7GqG5N3b7G0sXgC6zRsq4K', 'Alex Vance', '+1-555-0101', 'ADMIN'),
  -- Staff 1 (Sarah)
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'sarah@luxestyle.com', '$2b$10$epRswT6A4Ea7fM1kYfDZu.eUo6rW8O/7GqG5N3b7G0sXgC6zRsq4K', 'Sarah Miller', '+1-555-0102', 'STAFF'),
  -- Staff 2 (Emma)
  ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'emma@luxestyle.com', '$2b$10$epRswT6A4Ea7fM1kYfDZu.eUo6rW8O/7GqG5N3b7G0sXgC6zRsq4K', 'Emma Watson', '+1-555-0103', 'STAFF'),
  -- Staff 3 (David)
  ('a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'david@luxestyle.com', '$2b$10$epRswT6A4Ea7fM1kYfDZu.eUo6rW8O/7GqG5N3b7G0sXgC6zRsq4K', 'David Rossi', '+1-555-0104', 'STAFF'),
  -- Sample Customer
  ('a0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'customer@example.com', '$2b$10$epRswT6A4Ea7fM1kYfDZu.eUo6rW8O/7GqG5N3b7G0sXgC6zRsq4K', 'Jane Customer', '+1-555-0199', 'CUSTOMER')
ON CONFLICT (email) DO NOTHING;

-- 3. Insert Staff Records
INSERT INTO staff (id, user_id, business_id, title, bio, is_active)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Senior Hair Stylist', 'Specializes in cuts and coloring. 8 years experience.', true),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Hair & Beauty Expert', 'Expert in hair spa and facials. 5 years experience.', true),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Master Barber', 'Specializes in cuts and beard grooming. 6 years experience.', true)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Insert Services
INSERT INTO services (id, business_id, name, description, duration_minutes, price, is_active)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Haircut', 'Classic haircut, wash, and blow-dry styling', 45, 45.00, true),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Hair Coloring', 'Full hair coloring or balayage highlights', 120, 120.00, true),
  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Hair Spa', 'Deep conditioning scalp and hair therapy', 60, 65.00, true),
  ('e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Beard Trim', 'Beard contouring, trim, and luxury hot towel', 20, 25.00, true),
  ('e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Facial', 'Deep cleansing and botanical rejuvenation facial', 60, 75.00, true)
ON CONFLICT (id) DO NOTHING;

-- 5. Staff-Services Junction
INSERT INTO staff_services (staff_id, service_id)
VALUES
  -- Sarah: Haircut, Hair Coloring, Hair Spa
  ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003'),
  -- Emma: Haircut, Hair Spa, Facial
  ('c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005'),
  -- David: Haircut, Beard Trim
  ('c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000004')
ON CONFLICT (staff_id, service_id) DO NOTHING;

-- 6. Recurring Weekly Availability (Monday through Friday 9:00 - 17:00)
INSERT INTO staff_availability (staff_id, day_of_week, start_time, end_time)
SELECT s.id, d.day, '09:00'::time, '17:00'::time
FROM staff s
CROSS JOIN (VALUES (1), (2), (3), (4), (5)) AS d(day)
ON CONFLICT DO NOTHING;
