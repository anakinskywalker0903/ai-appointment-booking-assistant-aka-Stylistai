# 📜 StylistAI V2 — Official REST API Contracts & Interface Specification

> **Status:** FROZEN & APPROVED (Phase 1)  
> **Audience:** Workstream A (Backend) & Workstream B (Frontend)  
> **Base URL:** `/api/v2`

This document defines the strict API contract between the frontend client and the backend server. Workstream B can implement frontend views, mocks, and service layers against these contracts immediately.

---

## 1. Global Conventions

### 1.1 Response Envelope
All endpoints return a uniform JSON envelope:

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

#### Error Response
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | INTERNAL_ERROR",
    "message": "Human-readable description of error",
    "details": [] // Optional array of field-level validation errors
  }
}
```

### 1.2 Authentication Header
Protected endpoints require the `Authorization` header with a Bearer JWT:
```http
Authorization: Bearer <jwt_token>
```

### 1.3 User Roles
* `CUSTOMER`: Self-booking, personal appointment management, personal profile.
* `STAFF`: Personal schedule, availability hours, customer appointment notes.
* `ADMIN`: Business configuration, staff management, catalog, system analytics.

---

## 2. Authentication & User Endpoints (`/api/v2/auth`)

### `POST /api/v2/auth/register`
Create a new user account.
* **Access:** Public
* **Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "SecurePassword123!",
  "fullName": "Jane Doe",
  "phone": "+1-555-0199",
  "role": "CUSTOMER" // Default is CUSTOMER. STAFF/ADMIN can only be created by ADMIN.
}
```
* **Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "u-456",
      "email": "customer@example.com",
      "fullName": "Jane Doe",
      "phone": "+1-555-0199",
      "role": "CUSTOMER"
    }
  },
  "error": null
}
```

### `POST /api/v2/auth/login`
Authenticate an existing user.
* **Access:** Public
* **Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "SecurePassword123!"
}
```
* **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "u-456",
      "email": "customer@example.com",
      "fullName": "Jane Doe",
      "role": "CUSTOMER"
    }
  },
  "error": null
}
```

### `GET /api/v2/auth/me`
Retrieve currently logged-in user profile.
* **Access:** Authenticated (`CUSTOMER`, `STAFF`, `ADMIN`)
* **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "u-456",
    "email": "customer@example.com",
    "fullName": "Jane Doe",
    "role": "CUSTOMER",
    "staffProfile": null // Included if role is STAFF
  },
  "error": null
}
```

---

## 3. Services Catalog (`/api/v2/services`)

### `GET /api/v2/services`
Get all active business services.
* **Access:** Public
* **Query Params:** `category`, `isActive` (default: `true`)
* **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "srv-1",
      "name": "Haircut & Styling",
      "description": "Custom precision haircut with luxury wash and blowout styling.",
      "durationMinutes": 45,
      "price": 45.00,
      "isActive": true
    },
    {
      "id": "srv-2",
      "name": "Hair Coloring",
      "description": "Full highlights or all-over permanent gloss color.",
      "durationMinutes": 120,
      "price": 120.00,
      "isActive": true
    }
  ],
  "error": null
}
```

### `POST /api/v2/services`
Create a new service.
* **Access:** `ADMIN`

---

## 4. Staff Management (`/api/v2/staff`)

### `GET /api/v2/staff`
Get all active staff members with assigned services.
* **Access:** Public
* **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "stf-1",
      "userId": "u-101",
      "name": "Sarah Miller",
      "title": "Senior Hair Stylist",
      "bio": "Specializes in modern precision cuts and creative balayage.",
      "isActive": true,
      "services": [
        { "id": "srv-1", "name": "Haircut & Styling" },
        { "id": "srv-2", "name": "Hair Coloring" }
      ]
    }
  ],
  "error": null
}
```

---

## 5. Availability Engine (`/api/v2/availability`)

### `GET /api/v2/availability`
Calculate valid booking slots considering business hours, staff shifts, service duration, blocked periods, and existing bookings.
* **Access:** Public
* **Query Parameters:**
  * `serviceId` (required UUID)
  * `staffId` (optional UUID; if omitted, checks across all qualified staff)
  * `date` (required ISO `YYYY-MM-DD`)
  * `timezone` (optional, default: `America/New_York`)
* **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "date": "2026-09-09",
    "service": {
      "id": "srv-1",
      "name": "Haircut & Styling",
      "durationMinutes": 45
    },
    "slots": [
      {
        "time": "09:00",
        "available": true,
        "staff": [{ "id": "stf-1", "name": "Sarah Miller" }]
      },
      {
        "time": "09:45",
        "available": false,
        "reason": "BOOKED"
      },
      {
        "time": "10:30",
        "available": true,
        "staff": [{ "id": "stf-1", "name": "Sarah Miller" }]
      }
    ]
  },
  "error": null
}
```

---

## 6. Appointment Management (`/api/v2/appointments`)

### `POST /api/v2/appointments`
Create a new appointment with transaction-safe double-booking protection.
* **Access:** Authenticated (`CUSTOMER`, `ADMIN`)
* **Request Body:**
```json
{
  "serviceId": "srv-1",
  "staffId": "stf-1",
  "date": "2026-09-09",
  "time": "10:30",
  "notes": "Prefers warm water rinse"
}
```
* **Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "apt-9901",
    "status": "confirmed",
    "service": { "id": "srv-1", "name": "Haircut & Styling" },
    "staff": { "id": "stf-1", "name": "Sarah Miller" },
    "date": "2026-09-09",
    "time": "10:30",
    "durationMinutes": 45,
    "endTime": "11:15",
    "totalPrice": 45.00,
    "createdAt": "2026-09-08T23:30:00Z"
  },
  "error": null
}
```
* **Conflict Response (409 Conflict):**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "SLOT_ALREADY_BOOKED",
    "message": "This slot was just claimed by another booking. Please select another time."
  }
}
```

### `GET /api/v2/appointments`
List appointments according to role:
* `CUSTOMER`: Returns customer's own upcoming and past bookings.
* `STAFF`: Returns bookings assigned to the staff member.
* `ADMIN`: Returns all bookings with filtering (`startDate`, `endDate`, `status`, `staffId`).

### `PATCH /api/v2/appointments/:id/reschedule`
Reschedule an existing appointment to a new date/time with concurrency check.
* **Access:** Customer owner, assigned Staff, or Admin.
* **Request Body:**
```json
{
  "date": "2026-09-10",
  "time": "14:00"
}
```

### `PATCH /api/v2/appointments/:id/cancel`
Cancel an appointment.
* **Access:** Customer owner, assigned Staff, or Admin.
* **Request Body:**
```json
{
  "reason": "Schedule conflict"
}
```

---

## 7. Admin Analytics (`/api/v2/admin/analytics`)

### `GET /api/v2/admin/analytics`
Retrieve business performance metrics.
* **Access:** `ADMIN`
* **Query Params:** `period` (`day` | `week` | `month` | `year`)
* **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "totalAppointments": 142,
    "cancellationRate": 4.2,
    "estimatedRevenue": 8640.00,
    "mostBookedServices": [
      { "name": "Haircut & Styling", "bookings": 88 },
      { "name": "Hair Coloring", "bookings": 32 }
    ],
    "staffUtilization": [
      { "staffId": "stf-1", "name": "Sarah Miller", "utilizationPercentage": 82.5 }
    ]
  },
  "error": null
}
```

---

## 8. Controlled AI Assistant (`/api/v2/ai/chat`)

### `POST /api/v2/ai/chat`
Conversational endpoint using strictly controlled backend tool calls.
* **Access:** Authenticated or Guest session
* **Request Body:**
```json
{
  "message": "Can I get a haircut with Sarah tomorrow around 4 PM?",
  "conversationId": "conv-123"
}
```
* **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reply": "Sarah is available tomorrow (Wednesday) at 4:00 PM for a Haircut & Styling ($45, 45 mins). Would you like me to book this for you?",
    "toolExecuted": "CHECK_AVAILABILITY",
    "suggestedAction": {
      "type": "CONFIRM_BOOKING_CARD",
      "payload": {
        "serviceId": "srv-1",
        "staffId": "stf-1",
        "date": "2026-09-09",
        "time": "16:00"
      }
    }
  },
  "error": null
}
```
