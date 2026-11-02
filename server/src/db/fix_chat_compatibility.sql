-- =====================================================================
-- StylistAI — Chat & Appointment Compatibility Fix
-- Run this in Supabase SQL Editor to enable live chat booking
-- =====================================================================

-- 0. Drop existing views so real tables with foreign keys can be created
DROP VIEW IF EXISTS employees CASCADE;
DROP VIEW IF EXISTS employee_services CASCADE;

-- 1. Create employees table for stylists
CREATE TABLE IF NOT EXISTS employees (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  role         TEXT NOT NULL,
  bio          TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  calendar_id  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed stylists
INSERT INTO employees (id, name, role, bio) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Sarah', 'Senior Hair Stylist',  'Specializes in cuts and coloring. 8 years experience.'),
  ('c0000000-0000-0000-0000-000000000002', 'Emma',  'Hair & Beauty Expert', 'Expert in hair spa and facials. 5 years experience.'),
  ('c0000000-0000-0000-0000-000000000003', 'David', 'Master Barber',        'Specializes in cuts and beard grooming. 6 years experience.')
ON CONFLICT (name) DO UPDATE SET role = EXCLUDED.role;

-- 2. Create employee_services junction table
CREATE TABLE IF NOT EXISTS employee_services (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  service_id  UUID NOT NULL REFERENCES services(id)  ON DELETE CASCADE,
  PRIMARY KEY (employee_id, service_id)
);

-- Map stylists to services
INSERT INTO employee_services (employee_id, service_id)
SELECT e.id, s.id FROM employees e, services s
WHERE
  (e.name = 'Sarah' AND s.name IN ('Haircut', 'Hair Coloring', 'Hair Spa'))
  OR
  (e.name = 'Emma'  AND s.name IN ('Haircut', 'Hair Spa', 'Facial'))
  OR
  (e.name = 'David' AND s.name IN ('Haircut', 'Beard Trim'))
ON CONFLICT (employee_id, service_id) DO NOTHING;

-- 3. Add chat booking columns to appointments table
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS appointment_time TIME,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Make V2-specific non-null constraints flexible so chat bookings can insert smoothly
ALTER TABLE appointments ALTER COLUMN business_id DROP NOT NULL;
ALTER TABLE appointments ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE appointments ALTER COLUMN staff_id DROP NOT NULL;
ALTER TABLE appointments ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE appointments ALTER COLUMN end_time DROP NOT NULL;
ALTER TABLE appointments ALTER COLUMN start_datetime DROP NOT NULL;
ALTER TABLE appointments ALTER COLUMN end_datetime DROP NOT NULL;

-- 4. Sync trigger to keep appointment times and staff matched
CREATE OR REPLACE FUNCTION sync_appointment_times()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.appointment_time IS NOT NULL AND NEW.start_time IS NULL THEN
    NEW.start_time := NEW.appointment_time;
  END IF;
  IF NEW.employee_id IS NOT NULL AND NEW.staff_id IS NULL THEN
    NEW.staff_id := NEW.employee_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_appointment_times ON appointments;
CREATE TRIGGER trg_sync_appointment_times
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION sync_appointment_times();
