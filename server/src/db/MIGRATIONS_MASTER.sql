-- ==============================================================================
-- StylistAI V2 - Master Database Migration & Store Setup
-- Run this script in the Supabase SQL Editor (or PostgreSQL client)
-- ==============================================================================

-- ── 1. EXTENSIONS ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 2. SERVICES TABLE ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL UNIQUE,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  price            NUMERIC(10, 2) NOT NULL DEFAULT 35.00,
  description      TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- If the table already existed without price or is_active:
ALTER TABLE services ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 35.00;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ── 3. EMPLOYEES (STAFF) TABLE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  role         TEXT NOT NULL,
  bio          TEXT,
  hours        TEXT DEFAULT '09:00 AM - 05:00 PM',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  calendar_id  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE employees ADD COLUMN IF NOT EXISTS hours TEXT DEFAULT '09:00 AM - 05:00 PM';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ── 4. EMPLOYEE SERVICES JUNCTION TABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_services (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  service_id  UUID NOT NULL REFERENCES services(id)  ON DELETE CASCADE,
  PRIMARY KEY (employee_id, service_id)
);

-- ── 5. APPOINTMENTS TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name      TEXT NOT NULL,
  customer_email     TEXT NOT NULL,
  customer_phone     TEXT,
  service_id         UUID REFERENCES services(id) ON DELETE RESTRICT,
  employee_id        UUID REFERENCES employees(id) ON DELETE SET NULL,
  appointment_date   DATE NOT NULL,
  appointment_time   TIME NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes              TEXT,
  calendar_event_id  TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure an employee cannot have two non-cancelled appointments at the exact same date & time
CREATE UNIQUE INDEX IF NOT EXISTS appointments_employee_slot_unique
  ON appointments (employee_id, appointment_date, appointment_time)
  WHERE status != 'cancelled';

-- ── 6. SALON SETTINGS & INTEGRATIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS salon_settings (
  id                      TEXT PRIMARY KEY DEFAULT 'primary',
  business_name           TEXT NOT NULL DEFAULT 'StylistAI Salon & Spa',
  open_time               TIME NOT NULL DEFAULT '09:00',
  close_time              TIME NOT NULL DEFAULT '18:00',
  slot_duration_minutes   INTEGER NOT NULL DEFAULT 45,
  cancellation_notice_hrs INTEGER NOT NULL DEFAULT 2,
  currency                TEXT NOT NULL DEFAULT '$',
  closed_days             TEXT[] DEFAULT ARRAY['Sunday'],
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Persistent OAuth tokens table (survives serverless/cloud container restarts)
CREATE TABLE IF NOT EXISTS salon_integrations (
  provider      TEXT PRIMARY KEY, -- e.g. 'google_calendar'
  access_token  TEXT,
  refresh_token TEXT,
  token_type    TEXT DEFAULT 'Bearer',
  expiry_date   BIGINT,
  calendar_id   TEXT DEFAULT 'primary',
  connected_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 7. SEED DATA: SERVICES ────────────────────────────────────────────────────
INSERT INTO services (name, duration_minutes, price, description, is_active)
VALUES
  ('Haircut & Styling', 45, 45.00, 'Classic precision haircut, luxury wash, and blow dry finish.', true),
  ('Hair Coloring (Balayage)', 120, 120.00, 'Full custom hair coloring, multi-dimensional balayage, or highlights.', true),
  ('Hair Spa & Scalp Therapy', 60, 65.00, 'Deep conditioning scalp massage & organic restorative botanical mask.', true),
  ('Classic Beard Grooming', 30, 30.00, 'Precision beard shaping, edge razor detailing, and aromatic hot towel.', true),
  ('Deep Cleansing Facial', 60, 75.00, 'Exfoliation, steam pore purification, and rejuvenating collagen infusion.', true),
  ('Precision Skin Fade & Taper', 45, 40.00, 'Surgical zero-fade, razor neckline taper, and textured top styling.', true),
  ('Silk Press & Keratin Smoothing', 90, 110.00, 'Thermal straightening, keratin infusion treatment, and high-shine blowout.', true),
  ('Express Beard Sculpting', 20, 20.00, 'Quick lineup, contour edge sculpting, and organic beard oil treatment.', true)
ON CONFLICT (name) DO UPDATE SET
  price = EXCLUDED.price,
  duration_minutes = EXCLUDED.duration_minutes,
  description = EXCLUDED.description;

-- ── 8. SEED DATA: EMPLOYEES ───────────────────────────────────────────────────
INSERT INTO employees (name, role, bio, hours, is_active)
VALUES
  ('Sarah Jenkins', 'Senior Hair Stylist', 'Master colorist and modern cut specialist with 8 years of salon artistry.', '09:00 AM - 05:00 PM', true),
  ('Emma Watson', 'Hair & Beauty Expert', 'Renowned expert in botanical hair spa treatments, facials, and bridal styling.', '10:00 AM - 06:00 PM', true),
  ('David Miller', 'Master Barber', 'Artisan barber dedicated to precision skin fades, beard sculpting, and hot towel care.', '09:00 AM - 06:00 PM', true),
  ('Aria Chen', 'Creative Color Director', 'Celebrity colorist specializing in vivid pastel balayage, dimensional foils, and textured styling.', '11:00 AM - 07:00 PM', true),
  ('Marcus Rivera', 'Grooming & Fade Specialist', 'Razor specialist certified in straight-edge shaving, afro-textured fading, and bespoke beard trims.', '09:00 AM - 05:00 PM', true),
  ('Chloe Dubois', 'Senior Holistic Esthetician', 'Licensed dermatological esthetician with expertise in organic peels, lymphatic drainage, and scalp health.', '10:00 AM - 06:00 PM', true)
ON CONFLICT (name) DO UPDATE SET
  role = EXCLUDED.role,
  bio = EXCLUDED.bio,
  hours = EXCLUDED.hours;

-- ── 9. SEED DATA: EMPLOYEE SERVICE CERTIFICATIONS ─────────────────────────────
-- Clear old relations to prevent duplicates
DELETE FROM employee_services;

-- Sarah: Haircut, Color, Spa, Silk Press
INSERT INTO employee_services (employee_id, service_id)
SELECT e.id, s.id FROM employees e, services s
WHERE e.name = 'Sarah Jenkins' AND s.name IN (
  'Haircut & Styling',
  'Hair Coloring (Balayage)',
  'Hair Spa & Scalp Therapy',
  'Silk Press & Keratin Smoothing'
);

-- Emma: Haircut, Spa, Facial
INSERT INTO employee_services (employee_id, service_id)
SELECT e.id, s.id FROM employees e, services s
WHERE e.name = 'Emma Watson' AND s.name IN (
  'Haircut & Styling',
  'Hair Spa & Scalp Therapy',
  'Deep Cleansing Facial'
);

-- David: Haircut, Beard Grooming, Skin Fade, Express Beard
INSERT INTO employee_services (employee_id, service_id)
SELECT e.id, s.id FROM employees e, services s
WHERE e.name = 'David Miller' AND s.name IN (
  'Haircut & Styling',
  'Classic Beard Grooming',
  'Precision Skin Fade & Taper',
  'Express Beard Sculpting'
);

-- Aria: Haircut, Color, Spa, Silk Press
INSERT INTO employee_services (employee_id, service_id)
SELECT e.id, s.id FROM employees e, services s
WHERE e.name = 'Aria Chen' AND s.name IN (
  'Haircut & Styling',
  'Hair Coloring (Balayage)',
  'Hair Spa & Scalp Therapy',
  'Silk Press & Keratin Smoothing'
);

-- Marcus: Haircut, Beard Grooming, Skin Fade, Express Beard
INSERT INTO employee_services (employee_id, service_id)
SELECT e.id, s.id FROM employees e, services s
WHERE e.name = 'Marcus Rivera' AND s.name IN (
  'Haircut & Styling',
  'Classic Beard Grooming',
  'Precision Skin Fade & Taper',
  'Express Beard Sculpting'
);

-- Chloe: Spa, Facial
INSERT INTO employee_services (employee_id, service_id)
SELECT e.id, s.id FROM employees e, services s
WHERE e.name = 'Chloe Dubois' AND s.name IN (
  'Hair Spa & Scalp Therapy',
  'Deep Cleansing Facial'
);

-- ── 10. SEED DATA: BUSINESS SETTINGS ──────────────────────────────────────────
INSERT INTO salon_settings (id, business_name, open_time, close_time, slot_duration_minutes, currency)
VALUES ('primary', 'StylistAI Salon & Spa', '09:00', '18:00', 45, '$')
ON CONFLICT (id) DO NOTHING;

-- ── 11. HELPFUL ANALYTICAL QUERIES (FOR ADMIN / BACKEND) ──────────────────────
-- Realized Revenue:
-- SELECT COALESCE(SUM(s.price), 0) AS realized_revenue
-- FROM appointments a
-- JOIN services s ON a.service_id = s.id
-- WHERE a.status = 'confirmed';

-- Pipeline (Pending) Revenue:
-- SELECT COALESCE(SUM(s.price), 0) AS pending_revenue
-- FROM appointments a
-- JOIN services s ON a.service_id = s.id
-- WHERE a.status = 'pending';

-- Cancellation Rate:
-- SELECT
--   COUNT(*) AS total_bookings,
--   ROUND((COUNT(*) FILTER (WHERE status = 'cancelled')::numeric / NULLIF(COUNT(*), 0)) * 100, 1) AS cancel_rate_pct
-- FROM appointments;
