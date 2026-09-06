# StylistAI V2 — API & Data Contracts

This document defines the strict REST API contract between **Workstream A (Backend)** and **Workstream B (Frontend)**. 
Both frontend mocks and backend implementations must adhere strictly to these schemas.

---

## Standard Response Wrappers

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable status"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Short error message",
  "details": { ... } // Optional field-level validation errors
}
```

---

## 1. Authentication & Users (`/api/auth`)

### `POST /api/auth/register`
Creates a new customer account.
- **Request:**
  ```json
  {
    "name": "Alex Johnson",
    "email": "alex@example.com",
    "password": "Password123!",
    "phone": "+1234567890"
  }
  ```
- **Response (201):**
  ```json
  {
    "token": "jwt-token-string",
    "user": {
      "id": "uuid-1",
      "name": "Alex Johnson",
      "email": "alex@example.com",
      "role": "CUSTOMER"
    }
  }
  ```

### `POST /api/auth/login`
Authenticates user (Customer, Staff, or Admin).
- **Request:**
  ```json
  {
    "email": "alex@example.com",
    "password": "Password123!"
  }
  ```
- **Response (200):**
  ```json
  {
    "token": "jwt-token-string",
    "user": {
      "id": "uuid-1",
      "name": "Alex Johnson",
      "email": "alex@example.com",
      "role": "CUSTOMER" // "CUSTOMER" | "STAFF" | "ADMIN"
    }
  }
  ```

### `GET /api/auth/me`
Fetches the current authenticated user profile.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
  ```json
  {
    "user": {
      "id": "uuid-1",
      "name": "Alex Johnson",
      "email": "alex@example.com",
      "role": "CUSTOMER"
    }
  }
  ```

---

## 2. Services & Staff (`/api/services`, `/api/employees`)

### `GET /api/services`
Lists all active services.
- **Response (200):**
  ```json
  {
    "services": [
      {
        "id": "srv-1",
        "name": "Haircut",
        "duration_minutes": 45,
        "price": 35.00,
        "description": "Classic haircut, wash, and style",
        "is_active": true
      }
    ]
  }
  ```

### `GET /api/employees`
Lists active stylists and the services they can perform.
- **Response (200):**
  ```json
  {
    "employees": [
      {
        "id": "emp-1",
        "name": "Sarah Jenkins",
        "role": "Senior Hair Stylist",
        "bio": "Specializes in modern cuts & styling",
        "is_active": true,
        "services": [
          { "id": "srv-1", "name": "Haircut" }
        ]
      }
    ]
  }
  ```

---

## 3. Availability Engine (`/api/availability`)

### `GET /api/availability`
Calculates real-time slot availability factoring in business hours, staff shifts, booked slots, and Google Calendar.
- **Query Parameters:**
  - `date` (string, required): `YYYY-MM-DD`
  - `serviceId` (uuid, required)
  - `employeeId` (uuid, optional)
- **Response (200):**
  ```json
  {
    "date": "2026-09-15",
    "slots": ["09:00", "09:45", "10:30", "14:00", "15:00"],
    "staffOptions": [
      {
        "employeeId": "emp-1",
        "employeeName": "Sarah Jenkins",
        "slots": ["09:00", "09:45", "14:00"]
      }
    ]
  }
  ```

---

## 4. Appointments (`/api/appointments`)

### `GET /api/appointments`
Returns appointments based on caller's role:
- `CUSTOMER`: Returns customer's own upcoming and past bookings.
- `STAFF`: Returns bookings assigned to this staff member.
- `ADMIN`: Returns all business appointments (filterable by `?status=pending|confirmed|cancelled`).
- **Response (200):**
  ```json
  {
    "appointments": [
      {
        "id": "apt-1",
        "customer_name": "Alex Johnson",
        "customer_email": "alex@example.com",
        "appointment_date": "2026-09-15",
        "appointment_time": "14:00",
        "status": "confirmed", // "pending" | "confirmed" | "cancelled"
        "notes": "Prefers layered cut",
        "created_at": "2026-09-06T12:00:00Z",
        "services": {
          "id": "srv-1",
          "name": "Haircut",
          "duration_minutes": 45,
          "price": 35.00
        },
        "employees": {
          "id": "emp-1",
          "name": "Sarah Jenkins",
          "role": "Senior Hair Stylist"
        }
      }
    ]
  }
  ```

### `POST /api/appointments`
Books an appointment.
- **Request:**
  ```json
  {
    "serviceId": "srv-1",
    "employeeId": "emp-1",
    "appointmentDate": "2026-09-15",
    "appointmentTime": "14:00",
    "customerName": "Alex Johnson",
    "customerEmail": "alex@example.com",
    "notes": "First time client"
  }
  ```
- **Response (201):**
  ```json
  {
    "appointment": {
      "id": "apt-1",
      "status": "confirmed",
      "appointmentDate": "2026-09-15",
      "appointmentTime": "14:00",
      "customerName": "Alex Johnson"
    }
  }
  ```
- **Response (409 Conflict):**
  ```json
  {
    "error": "Time slot is already booked for this stylist. Please select another slot.",
    "alternatives": ["14:45", "15:30"]
  }
  ```

### `PATCH /api/appointments/:id`
Reschedule or cancel an appointment.
- **Request (Cancel):**
  ```json
  {
    "status": "cancelled",
    "reason": "Schedule conflict"
  }
  ```
- **Request (Reschedule):**
  ```json
  {
    "appointmentDate": "2026-09-16",
    "appointmentTime": "10:00"
  }
  ```

---

## 5. AI Assistant (`/api/chat`)

### `POST /api/chat`
Handles conversational appointment management and tool execution.
- **Request:**
  ```json
  {
    "message": "Can I move my haircut tomorrow to 3 PM with Sarah?",
    "history": [],
    "pendingBooking": null
  }
  ```
- **Response (200):**
  ```json
  {
    "message": "I checked Sarah's schedule for tomorrow at 3:00 PM and she has an opening! Would you like me to reschedule your haircut?",
    "intent": {
      "intent": "RESCHEDULE",
      "service": "Haircut",
      "employeePreference": "Sarah",
      "date": "2026-09-07",
      "time": "15:00"
    },
    "pendingBooking": { ... }
  }
  ```
