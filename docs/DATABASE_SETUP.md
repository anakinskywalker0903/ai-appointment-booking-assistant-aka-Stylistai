# Database Schema & Migration Guide (StylistAI V2)

This document contains instructions for setting up the relational database and store in Supabase PostgreSQL for StylistAI V2.

The complete, idempotent SQL script is stored at:
[`server/src/db/MIGRATIONS_MASTER.sql`](file:///d:/Dev/stlistaiv2/server/src/db/MIGRATIONS_MASTER.sql)

---

## Quick Setup Instructions

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project $\rightarrow$ navigate to **SQL Editor** in the left sidebar.
3. Open [`server/src/db/MIGRATIONS_MASTER.sql`](file:///d:/Dev/stlistaiv2/server/src/db/MIGRATIONS_MASTER.sql), copy its contents, and paste them into the SQL Editor.
4. Click **Run**.
5. All tables, constraints, diverse staff, expanded services, and operational defaults will be configured automatically.

---

## Schema Overview

### 1. `services`
| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Auto-generated UUID |
| `name` | `TEXT` (Unique) | Service name (e.g. "Hair Coloring (Balayage)") |
| `duration_minutes` | `INTEGER` | Duration in minutes (e.g. 45, 60, 120) |
| `price` | `NUMERIC(10,2)` | Treatment price in USD |
| `description` | `TEXT` | Customer-facing treatment description |
| `is_active` | `BOOLEAN` | Active toggle for catalog availability |

### 2. `employees`
| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Auto-generated UUID |
| `name` | `TEXT` (Unique) | Stylist full name |
| `role` | `TEXT` | Title (e.g. "Senior Hair Stylist", "Master Barber") |
| `bio` | `TEXT` | Experience and specialties description |
| `hours` | `TEXT` | Working shift (e.g. "09:00 AM - 05:00 PM") |
| `is_active` | `BOOLEAN` | Active / Leave status |
| `calendar_id` | `TEXT` | Google Calendar ID for direct sync |

### 3. `employee_services` (Junction Table)
| Column | Type | Description |
|---|---|---|
| `employee_id` | `UUID` (FK) | Reference to `employees.id` |
| `service_id` | `UUID` (FK) | Reference to `services.id` |

### 4. `appointments`
| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Auto-generated UUID |
| `customer_name` | `TEXT` | Customer's full name |
| `customer_email` | `TEXT` | Email for confirmation dispatch |
| `customer_phone` | `TEXT` | Optional phone number |
| `service_id` | `UUID` (FK) | Reference to `services.id` |
| `employee_id` | `UUID` (FK) | Reference to `employees.id` |
| `appointment_date` | `DATE` | Scheduled date (`YYYY-MM-DD`) |
| `appointment_time` | `TIME` | Scheduled time (`HH:MM`) |
| `status` | `TEXT` | `'pending'`, `'confirmed'`, `'cancelled'`, `'completed'` |
| `notes` | `TEXT` | Haircut notes / customer requests |
| `calendar_event_id`| `TEXT` | Google Calendar event ID |

*Constraint:* An employee cannot have two non-cancelled appointments at the exact same date and time (`appointments_employee_slot_unique`).

### 5. `salon_integrations` (Persistent OAuth Tokens)
Stores Google Calendar OAuth credentials to ensure tokens survive serverless or container restarts:
* `provider` (`google_calendar`)
* `access_token`
* `refresh_token`
* `expiry_date`

---

## Live Analytics Queries

### Realized Revenue (Confirmed Bookings)
```sql
SELECT COALESCE(SUM(s.price), 0) AS realized_revenue
FROM appointments a
JOIN services s ON a.service_id = s.id
WHERE a.status = 'confirmed';
```

### Pipeline Revenue (Pending Bookings)
```sql
SELECT COALESCE(SUM(s.price), 0) AS pending_revenue
FROM appointments a
JOIN services s ON a.service_id = s.id
WHERE a.status = 'pending';
```

### Real-Time Cancellation Rate
```sql
SELECT
  COUNT(*) AS total_bookings,
  ROUND((COUNT(*) FILTER (WHERE status = 'cancelled')::numeric / NULLIF(COUNT(*), 0)) * 100, 1) AS cancel_rate_pct
FROM appointments;
```
