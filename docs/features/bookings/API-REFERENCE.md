# Booking API - Quick Reference

## Discovery & Availability Endpoints

### 1. Get Shop Employees
```http
GET /api/v1/shops/:shopId/employees
```

**Purpose:** Get list of active employees for a shop

**Response:**
```json
{
  "success": true,
  "data": {
    "employees": [
      {
        "id": "emp1",
        "firstName": "John",
        "lastName": "Doe",
        "photoUrl": "https://...",
        "gender": "male",
        "workingHours": {
          "start": "09:00",
          "end": "18:00"
        },
        "isActive": true
      }
    ]
  }
}
```

---

### 2. Get Employee Available Slots
```http
GET /api/v1/employees/:employeeId/available-slots?date=2026-04-28&serviceId=service1
Authorization: Bearer <token>
```

**Purpose:** Get available time slots for specific employee and service

**Query Parameters:**
- `date` (required): YYYY-MM-DD format
- `serviceId` (required): Service ID

**Response:**
```json
{
  "success": true,
  "data": {
    "employeeId": "emp1",
    "employeeName": "John Doe",
    "date": "2026-04-28",
    "service": {
      "id": "service1",
      "name": "Haircut",
      "duration": 30
    },
    "slots": [
      {
        "time": "09:00",
        "available": true
      },
      {
        "time": "09:30",
        "available": true
      },
      {
        "time": "10:00",
        "available": false,
        "reason": "booked"
      }
    ],
    "totalAvailable": 15,
    "totalSlots": 18
  }
}
```

---

### 3. Get Shop Availability
```http
GET /api/v1/shops/:shopId/availability?date=2026-04-28&serviceId=service1
Authorization: Bearer <token>
```

**Purpose:** Get availability across all employees for a shop

**Query Parameters:**
- `date` (required): YYYY-MM-DD format
- `serviceId` (required): Service ID

**Response:**
```json
{
  "success": true,
  "data": {
    "shopId": "shop1",
    "shopName": "Elite Salon",
    "date": "2026-04-28",
    "service": {
      "id": "service1",
      "name": "Haircut",
      "duration": 30
    },
    "employees": [
      {
        "employeeId": "emp1",
        "employeeName": "John Doe",
        "photoUrl": "https://...",
        "availableSlots": ["09:00", "09:30", "11:00"],
        "totalAvailable": 3
      }
    ],
    "firstAvailable": {
      "employeeId": "emp1",
      "employeeName": "John Doe",
      "time": "09:00"
    }
  }
}
```

---

## Booking Management Endpoints

### 4. Create Booking
```http
POST /api/v1/bookings
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "shopId": "6634f2a1b8c9d4e5f6a7b8c3",
  "employeeId": "6634f2a1b8c9d4e5f6a7b8c1",
  "serviceId": "6634f2a1b8c9d4e5f6a7b8c2",
  "date": "2026-04-28",
  "time": "10:00"
}
```

**Response:** Booking created with status `PENDING`

---

### 5. Get Pending Confirmations (Barber)
```http
GET /api/v1/bookings/pending-confirmations?page=1&limit=10
Authorization: Bearer <barber_token>
```

**Response:** List of bookings awaiting barber confirmation

**Note:** Bookings auto-cancel after 24 hours if not confirmed

---

### 6. Confirm Booking (Barber)
```http
PATCH /api/v1/bookings/:id/confirm
Authorization: Bearer <barber_token>
```

**Requirements:**
- Status must be `AWAITING_CONFIRMATION`
- Payment must be `SUCCESS`
- Must confirm within 24 hours (or booking auto-cancels)

**Response:** Booking status changed to `CONFIRMED`

---

### 7. Cancel Booking

#### Customer Cancellation
```http
DELETE /api/v1/bookings/:id
Authorization: Bearer <customer_token>
```

**Refund:**
- Unpaid: No refund
- Paid: Partial refund (fees deducted)

**Note:** Auto-cancelled bookings (24h no response) receive full refund

#### Barber Cancellation (Deprecated)
```http
DELETE /api/v1/bookings/:id
Authorization: Bearer <barber_token>
```

**Note:** Barber manual cancellation is no longer supported. Bookings auto-cancel after 24 hours if not confirmed.

**Previous behavior:**
- Unpaid: No refund (booking deleted)
- Paid (awaiting confirmation): **FULL refund** (no fees)
- Paid (confirmed): ❌ Not allowed

---

### 8. Update Booking Status (Barber)
```http
PUT /api/v1/bookings/:id/status
Authorization: Bearer <barber_token>
Content-Type: application/json

{
  "status": "completed"
}
```

**Allowed statuses:** `confirmed`, `completed`, `cancelled`

---

## Refund Comparison

| Scenario | Refund Amount | Example |
|----------|---------------|---------|
| Customer cancels | Total - Fees | ₹303 → ₹293 |
| Auto-cancel (24h no response) | Full amount | ₹303 → ₹303 |
| After confirmation | ❌ Not allowed | - |

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Can only cancel paid bookings that are awaiting confirmation"
}
```

**Common causes:**
- Trying to cancel confirmed booking (barber)
- Trying to cancel completed booking
- Cancelling within 2-hour window (customer)

### 403 Forbidden
```json
{
  "success": false,
  "message": "You can only cancel bookings for your own shop"
}
```

**Cause:** Barber trying to cancel another shop's booking

### 404 Not Found
```json
{
  "success": false,
  "message": "Booking not found"
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid token) |
| 403 | Forbidden (not your resource) |
| 404 | Not Found |
| 500 | Server Error |

---

## Testing Flow

### Happy Path
1. Customer creates booking → `POST /bookings`
2. Customer pays → Payment webhook updates status to `AWAITING_CONFIRMATION`
3. Barber confirms (within 24h) → `PATCH /bookings/:id/confirm`
4. Service delivered → `PUT /bookings/:id/status` (status: completed)

### Auto-Cancel Path
1. Customer creates booking → `POST /bookings`
2. Customer pays → Status: `AWAITING_CONFIRMATION`
3. Barber doesn't respond for 24 hours → System auto-cancels
4. Customer receives full refund

### Customer Cancellation Path
1. Customer creates booking → `POST /bookings`
2. Customer pays → Status: `AWAITING_CONFIRMATION`
3. Barber confirms → `PATCH /bookings/:id/confirm`
4. Customer cancels → `DELETE /bookings/:id`
5. Customer receives partial refund (fees deducted)
