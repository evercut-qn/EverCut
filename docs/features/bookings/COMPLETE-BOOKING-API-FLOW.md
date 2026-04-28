# Complete Booking API Flow - Corrected

**Date:** April 28, 2026  
**Status:** ✅ ACCURATE - Reflects actual implementation

---

## Complete Customer Booking Journey

### Step 1: Discover Shops
```http
GET /api/v1/shops/nearby?latitude=12.9716&longitude=77.5946&radius=2000
```

**Returns:** List of nearby shops with distance, ratings, and basic info

---

### Step 2: View Shop Details
```http
GET /api/v1/shops/:shopId
```

**Returns:** 
- Shop information (name, address, hours, days)
- Services (single & bundled)
- Photos
- Ratings
- **Note:** Does NOT include employees (see Step 3)

---

### Step 3: View Shop Employees
```http
GET /api/v1/shops/:shopId/employees
```

**Auth:** Not required (public endpoint)

**Returns:**
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

**Purpose:** Customer selects preferred employee

---

### Step 4: Check Availability

You have **TWO OPTIONS** for checking availability:

#### Option A: Employee-Specific Availability (Recommended)

```http
GET /api/v1/employees/:employeeId/available-slots?date=2026-04-28&serviceId=service1
Authorization: Bearer <token>
```

**Returns:**
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
      { "time": "09:00", "available": true },
      { "time": "09:30", "available": true },
      { "time": "10:00", "available": false, "reason": "booked" },
      { "time": "10:30", "available": false, "reason": "blocked_by_previous" },
      { "time": "11:00", "available": true }
    ],
    "totalAvailable": 15,
    "totalSlots": 18
  }
}
```

**Use When:**
- Customer has already selected an employee
- Customer wants to see detailed slot-by-slot availability
- Customer wants to know WHY a slot is unavailable

**Benefits:**
- ✅ Shows all slots with availability status
- ✅ Considers service duration (blocks overlapping slots)
- ✅ Shows reason for unavailability
- ✅ Filters past slots (if checking today)
- ✅ Backend calculates everything (no frontend logic needed)

---

#### Option B: Shop-Wide Availability

```http
GET /api/v1/shops/:shopId/availability?date=2026-04-28&serviceId=service1
Authorization: Bearer <token>
```

**Returns:**
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
        "availableSlots": ["09:00", "09:30", "11:00", "14:00"],
        "totalAvailable": 4
      },
      {
        "employeeId": "emp2",
        "employeeName": "Jane Smith",
        "photoUrl": "https://...",
        "availableSlots": ["10:00", "11:00", "15:00"],
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

**Use When:**
- Customer hasn't selected an employee yet
- Customer wants to see "first available" across all employees
- Customer wants to compare availability across employees

**Benefits:**
- ✅ Shows availability for all employees at once
- ✅ Suggests first available slot
- ✅ Helps customer choose employee based on availability
- ✅ Aggregated view for quick decision

---

### Step 5: Create Booking

```http
POST /api/v1/bookings
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "shopId": "shop1",
  "employeeId": "emp1",
  "serviceId": "service1",
  "date": "2026-04-28",
  "time": "10:00"
}
```

**Returns:**
```json
{
  "success": true,
  "message": "Booking created",
  "data": {
    "bookingId": "booking123",
    "status": "pending",
    "paymentStatus": "pending",
    "paymentRequired": true,
    "durationMinutes": 30,
    "slotLockTimes": ["10:00"],
    "totalAmount": 300
  }
}
```

**What Happens:**
- ✅ Slot is **atomically claimed** (prevents double booking)
- ✅ Booking created with status `PENDING`
- ✅ Customer must pay to proceed

---

### Step 6: Initiate Payment

```http
POST /api/v1/payments/initiate
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "bookingId": "booking123"
}
```

**Returns:** Payment link for customer to complete payment

---

### Step 7: Payment Webhook (Automatic)

When customer completes payment, payment gateway sends webhook to backend:

**What Happens:**
- ✅ Booking status updated to `AWAITING_CONFIRMATION`
- ✅ `paidAt` timestamp set
- ✅ 24-hour countdown starts
- ✅ Barber notified to confirm

---

### Step 8: Barber Confirms (Within 24 Hours)

```http
PATCH /api/v1/bookings/:bookingId/confirm
Authorization: Bearer <barber_token>
```

**Returns:**
```json
{
  "success": true,
  "message": "Booking confirmed",
  "data": {
    "bookingId": "booking123",
    "status": "confirmed",
    "barberConfirmedAt": "2026-04-28T10:15:00Z"
  }
}
```

**What Happens:**
- ✅ Booking status updated to `CONFIRMED`
- ✅ Customer notified
- ✅ Booking locked (cannot be cancelled by barber)

---

### Step 9: Auto-Cancel (If No Response)

If barber doesn't confirm within 24 hours:

**What Happens (Automatic):**
- ✅ Booking status updated to `CANCELLED`
- ✅ Slot released
- ✅ **FULL REFUND** initiated (100% - no fees)
- ✅ Shop's `missedConfirmationCount` incremented
- ✅ Both parties notified

---

### Step 10: Service Completed

```http
PUT /api/v1/bookings/:bookingId/status
Authorization: Bearer <barber_token>
Content-Type: application/json

{
  "status": "completed"
}
```

**Returns:**
```json
{
  "success": true,
  "message": "Status updated",
  "data": {
    "bookingId": "booking123",
    "status": "completed",
    "completedAt": "2026-04-28T11:00:00Z"
  }
}
```

**What Happens:**
- ✅ Booking status updated to `COMPLETED`
- ✅ Slot released
- ✅ Ready for payout
- ✅ Customer can rate barber

---

## Alternative Flows

### Customer Cancellation (Before Service)

```http
POST /api/v1/bookings/:bookingId/cancel
Authorization: Bearer <customer_token>
```

**Refund:**
- Unpaid booking: No refund (no payment made)
- Paid booking: Partial refund (fees deducted)

**Restrictions:**
- Cannot cancel within 2 hours of appointment
- Cannot cancel completed bookings

---

### Update Booking (Before Payment)

```http
PUT /api/v1/bookings/:bookingId
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "employeeId": "emp2",
  "date": "2026-04-29",
  "time": "14:00"
}
```

**Allowed:** Only for `PENDING` bookings (before payment)

**What Happens:**
- ✅ Old slot released
- ✅ New slot claimed atomically
- ✅ Booking updated

---

### Reschedule Booking (Before Payment)

```http
PUT /api/v1/bookings/:bookingId/reschedule
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "newDate": "2026-04-29",
  "newTime": "14:00"
}
```

**Allowed:** Only for `PENDING` bookings (before payment)

**Restrictions:**
- Maximum 1 reschedule per booking
- Cannot reschedule within 2 hours of appointment

---

### Reorder Booking (After Completion)

```http
POST /api/v1/bookings/:bookingId/reorder
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "date": "2026-05-05",
  "time": "10:00"
}
```

**What Happens:**
- ✅ Creates NEW booking with same shop, employee, services
- ✅ Original booking remains unchanged
- ✅ New booking starts as `PENDING`

---

## Legacy Endpoint (Not Recommended)

### Employee Calendar (Raw Data)

```http
GET /api/v1/employees/:employeeId/calendar?date=2026-04-28
Authorization: Bearer <token>
```

**Returns:**
```json
{
  "employeeId": "emp1",
  "name": "John Doe",
  "workingHours": {
    "start": "09:00",
    "end": "18:00"
  },
  "blockedDates": ["2026-04-30"],
  "bookedSlots": [
    { "date": "2026-04-28", "time": "10:00", "bookingId": "..." }
  ]
}
```

**Why Not Recommended:**
- ❌ Returns raw data (frontend must calculate availability)
- ❌ Doesn't consider service duration
- ❌ Doesn't block overlapping slots
- ❌ More complex frontend logic required

**Use Instead:** `GET /api/v1/employees/:id/available-slots` (recommended)

---

## Summary: Which Availability API to Use?

| Scenario | Recommended API |
|----------|----------------|
| Customer selected employee | `GET /employees/:id/available-slots` |
| Customer hasn't selected employee | `GET /shops/:id/availability` |
| Need detailed slot information | `GET /employees/:id/available-slots` |
| Need "first available" suggestion | `GET /shops/:id/availability` |
| Building calendar view | `GET /employees/:id/available-slots` |
| Building employee comparison | `GET /shops/:id/availability` |

---

## Complete API Reference

### Discovery APIs
| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/v1/shops/nearby` | No | Find nearby shops |
| `GET /api/v1/shops/:id` | No | Shop details |
| `GET /api/v1/shops/:id/employees` | No | List employees |
| `GET /api/v1/employees/:id/available-slots` | Yes | Employee availability (recommended) |
| `GET /api/v1/shops/:id/availability` | Yes | Shop-wide availability |
| `GET /api/v1/employees/:id/calendar` | Yes | Raw calendar data (legacy) |

### Booking APIs (Customer)
| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/v1/bookings` | Yes | Create booking |
| `GET /api/v1/bookings` | Yes | List bookings |
| `GET /api/v1/bookings/:id` | Yes | Get booking details |
| `PUT /api/v1/bookings/:id` | Yes | Update booking (before payment) |
| `PUT /api/v1/bookings/:id/reschedule` | Yes | Reschedule booking |
| `POST /api/v1/bookings/:id/reorder` | Yes | Reorder booking |
| `POST /api/v1/bookings/:id/cancel` | Yes | Cancel booking |
| `GET /api/v1/bookings/:id/confirmation` | Yes | Get confirmation |

### Booking APIs (Barber)
| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/v1/bookings/pending-confirmations` | Yes | List pending confirmations |
| `PATCH /api/v1/bookings/:id/confirm` | Yes | Confirm booking |
| `PUT /api/v1/bookings/:id/status` | Yes | Update status |
| `GET /api/v1/bookings/stats` | Yes | Get statistics |

---

## Route Placement Explanation

**Why are availability APIs in different routes?**

The routes follow **RESTful design principles**:

1. **`GET /shops/:id/employees`** - Employees are a sub-resource of shops
2. **`GET /shops/:id/availability`** - Shop-level aggregation belongs under shops
3. **`GET /employees/:id/available-slots`** - Employee-specific operation belongs under employees

This is **CORRECT** and follows REST best practices. The routes are NOT misplaced.

---

**Document Status:** ✅ ACCURATE  
**Last Updated:** April 28, 2026  
**Next Steps:** Use these APIs in Flutter frontend
