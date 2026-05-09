# Booking System - Complete Guide

**Version:** 3.1  
**Last Updated:** May 5, 2026  
**Status:** ✅ Production Ready (Enhanced Booking List API)

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [API Endpoints](#api-endpoints)
3. [Booking Lifecycle](#booking-lifecycle)
4. [Complete Booking Flow](#complete-booking-flow)
5. [Business Rules](#business-rules)
6. [Detailed Scenarios](#detailed-scenarios)
7. [Edge Cases](#edge-cases)

---

## Quick Reference

### Availability API Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│               AVAILABILITY API DECISION TREE                │
└─────────────────────────────────────────────────────────────┘

START: Need to check availability?

├─ Has the customer selected an employee?
│
├─ YES → Use Employee-Specific API
│   └─ GET /employees/:id/availability
│   └─ Benefits:
│       ├─ Displays all slots with availability status
│       ├─ Provides reasons for unavailability
│       ├─ Offers a detailed slot-by-slot view
│       └─ Ideal for calendar/schedule views
│
└─ NO → Use Shop-Wide API
    └─ GET /shops/:id/availability
    └─ Benefits:
        ├─ Shows availability across all employees
        ├─ Suggests the first available slot
        ├─ Helps customers choose an employee
        └─ Ideal for quick bookings
```

### Customer Actions by Status

```
PENDING (Not Paid)
├─ ✅ Update booking (change employee, date, time)
├─ ✅ Reschedule booking (max 1 time, >2h before)
├─ ✅ Cancel booking (no refund)
└─ ✅ Pay for booking → AWAITING_CONFIRMATION

AWAITING_CONFIRMATION (Paid, Waiting)
├─ ✅ Cancel booking (partial refund, >2h before)
├─ ❌ Cannot update or reschedule (locked)
└─ ⏰ Auto-cancels after 24h (full refund)

CONFIRMED (Barber Accepted)
├─ ✅ Cancel booking (partial refund, >2h before)
└─ ❌ Cannot update or reschedule

COMPLETED (Service Done)
├─ ✅ Rate barber
├─ ✅ Reorder (create new booking)
└─ ❌ Cannot cancel or modify
```

### Barber Actions by Status

```
PENDING (Not Paid)
├─ ✅ View booking
├─ ✅ Cancel booking
└─ ❌ Cannot confirm (payment required)

AWAITING_CONFIRMATION (Paid, Waiting)
├─ ✅ Confirm booking → CONFIRMED
├─ ⏰ Must respond within 24h
└─ ❌ Cannot manually cancel

CONFIRMED (Accepted)
├─ ✅ Mark as completed
├─ ✅ Mark as no-show
└─ ❌ Cannot cancel (committed)

COMPLETED (Service Done)
├─ ✅ View booking
└─ ⏰ Wait for payout
```

### Key Constraints

⚠️ **Update/Reschedule:** Only PENDING bookings (before payment)  
⚠️ **Reschedule Limit:** Maximum 1 reschedule per booking  
⚠️ **2-Hour Window:** Cannot cancel/reschedule within 2h of appointment  
⚠️ **Price Lock:** Booking amount locked at creation time  
⚠️ **24-Hour Auto-Cancel:** Full refund if barber doesn't respond  
⚠️ **Partial Refund:** Customer cancellation deducts fees

---

### Employee Leave Behavior

Employee leave is handled through `Employee.blockedDates`. When a barber marks an employee unavailable with `PATCH /api/v1/employees/:id/availability`, the system adds the requested date(s) to `blockedDates`, prevents new bookings and reschedules for that employee/date combination, finds active affected bookings, and sends customer notifications.

Existing bookings are not reassigned, cancelled, or mutated. They keep the original employee, original time, services, status, and payment state.

Booking list and booking detail responses include a single frontend-facing flag on populated employees:

```json
{
  "employee": {
    "id": "507f1f77bcf86cd799439014",
    "firstName": "Dev",
    "lastName": "Patel",
    "photoUrl": "https://cdn.example/employee.jpg",
    "isAvailableOnBookingDate": false
  }
}
```

Frontend clients should show an informational warning when `employee.isAvailableOnBookingDate === false`. The shop assigns any replacement offline when the customer arrives; the API does not record replacement assignment history.

---

## API Endpoints

### Discovery & Availability

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/shops?coordinates=lng,lat` | No | Find nearby shops |
| GET | `/api/v1/shops/:id` | No | Shop details |
| GET | `/api/v1/shops/:id/employees` | No | List employees |
| GET | `/api/v1/employees/:id/availability` | Yes | Employee availability (recommended) |
| GET | `/api/v1/shops/:id/availability` | Yes | Shop-wide availability |
| PATCH | `/api/v1/employees/:id/availability` | BARBER | Mark employee available/unavailable for date(s) |

### Booking Management (Customer)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/v1/bookings` | CUSTOMER | Create booking |
| GET | `/api/v1/bookings` | CUSTOMER | List bookings (supports: date range, favorite, status, paymentStatus) |
| GET | `/api/v1/bookings/:id` | CUSTOMER | Get booking details |
| PATCH | `/api/v1/bookings/:id` | CUSTOMER | Update schedule or cancel with `status=cancelled` |
| POST | `/api/v1/bookings` | CUSTOMER | Reorder from `sourceBookingId` |
| PATCH | `/api/v1/bookings/:id/favorite` | CUSTOMER | Set favorite state with `{ "favorite": true/false }` |

### Booking Management (Barber)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/bookings` | BARBER | List all bookings (supports: employeeId, dateFrom, dateTo, status, paymentStatus) |
| GET | `/api/v1/bookings?status=awaiting_confirmation&paymentStatus=success` | BARBER | List pending confirmations |
| GET | `/api/v1/bookings?employeeId=X&dateFrom=Y&dateTo=Z` | BARBER | Filter by employee and date range |
| GET | `/api/v1/bookings/analytics` | BARBER | Get summary, milestone, today pulse, and queue analytics |
| PATCH | `/api/v1/bookings/:id` | BARBER | Confirm, complete, no-show, or cancel |

### Payment & Refunds

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/v1/payments` | CUSTOMER | Initiate native SDK payment |
| POST | `/api/v1/payments/:id/verify` | CUSTOMER | Verify payment after SDK callback |
| GET | `/api/v1/payments` | CUSTOMER/BARBER/ADMIN | List visible payments |
| GET | `/api/v1/payments/:id` | CUSTOMER/BARBER/ADMIN | Get payment status |
| POST | `/api/v1/bookings/:id/refunds` | ADMIN/BARBER | Initiate refund |

---

## Booking Lifecycle

### Status Flow

```
CREATE → PENDING → PAYMENT → AWAITING_CONFIRMATION → CONFIRMED → COMPLETED
           ↓           ↓              ↓                    ↓
       CANCELLED   CANCELLED      CANCELLED            CANCELLED
```

### Status Definitions

| Status | Description | Can Cancel? | Can Update? |
|--------|-------------|-------------|-------------|
| **PENDING** | Created, not paid | ✅ Yes | ✅ Yes |
| **AWAITING_CONFIRMATION** | Paid, waiting for barber (24h max) | ✅ Yes | ❌ No |
| **CONFIRMED** | Barber confirmed | ✅ Yes (>2h before) | ❌ No |
| **COMPLETED** | Service delivered | ❌ No | ❌ No |
| **CANCELLED** | Booking cancelled | ❌ No | ❌ No |
| **NO_SHOW** | Customer didn't show | ❌ No | ❌ No |

### Payment Status

- `PENDING` - No payment initiated
- `INITIATED` - Payment process started
- `SUCCESS` - Payment successful
- `FAILED` - Payment failed
- `REFUND_PENDING` - Refund initiated
- `REFUNDED` - Refund completed
- `REFUND_FAILED` - Refund failed

### Payout Status

- `NOT_INITIATED` - No payout started
- `INITIATED` - Payout process started
- `PENDING` - Payout in progress
- `COMPLETED` - Payout completed
- `FAILED` - Payout failed
- `REVERSED` - Payout reversed

---

## Complete Booking Flow

### Step 1: Discover Shops

**Customer provides location:**

```http
GET /api/v1/shops?longitude=77.5946&latitude=12.9716
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

---

### Step 3: View Shop Employees

```http
GET /api/v1/shops/:shopId/employees
```

**Auth:** Not required (public endpoint)

**Returns:**
```json
{
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
```

---

### Step 4: Check Availability

**Choose based on decision tree above:**

#### Option A: Employee-Specific (Customer selected employee)

```http
GET /api/v1/employees/:employeeId/availability?date=2026-04-28&serviceId=service1
Authorization: Bearer <token>
```

**Returns:**
```json
{
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
  "availableWindows": [
    { "startTime": "09:00", "endTime": "10:00", "startMinute": 540, "endMinute": 600 },
    { "startTime": "11:00", "endTime": "13:00", "startMinute": 660, "endMinute": 780 }
  ],
  "totalAvailable": 15,
  "totalSlots": 18
}
```

**Benefits:**
- ✅ Shows all slots with availability status
- ✅ Considers service duration
- ✅ Blocks overlapping slots
- ✅ Filters past slots (if today)
- ✅ Backend calculates everything

#### Option B: Shop-Wide (Customer hasn't selected employee)

```http
GET /api/v1/shops/:shopId/availability?date=2026-04-28&serviceId=service1
Authorization: Bearer <token>
```

**Returns:**
```json
{
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
```

**Benefits:**
- ✅ Shows availability for all employees
- ✅ Suggests first available slot
- ✅ Helps customer choose employee

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

**Multi-Service Support:**
```json
{
  "shopId": "shop1",
  "employeeId": "emp1",
  "serviceId": ["service1", "service2", "service3"],
  "date": "2026-04-28",
  "time": "10:00"
}
```

**Returns:**
```json
{
  "bookingId": "booking123",
  "status": "pending",
  "paymentStatus": "pending",
  "paymentRequired": true,
  "time": "10:00",
  "endTime": "10:30",
  "startMinute": 600,
  "endMinute": 630,
  "durationMinutes": 30,
  "slotLockTimes": ["10:00"],
  "totalAmount": 300
}
```

**What Happens:**
- ✅ Exact time range is **atomically claimed** on the employee document (prevents double booking)
- ✅ Booking created with status `PENDING`
- ✅ Customer must pay to proceed

---

### Step 6: Initiate Native SDK Payment

```http
POST /api/v1/payments
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "bookingId": "booking123"
}
```

**Returns:** Native SDK credentials for Flutter to launch PhonePe SDK

```json
{
  "success": true,
  "message": "Payment initiated",
  "data": {
    "paymentId": "payment_id",
    "bookingId": "booking123",
    "merchantOrderId": "EC-booking123-...",
    "orderId": "OMO123456789",
    "token": "eyJhbGci...",
    "merchantId": "MERCHANT_ID",
    "amountInPaisa": 30300,
    "amountInRupees": 303,
    "state": "PENDING",
    "expiresAt": 1234567890000,
    "gateway": "phonepe",
    "paymentFlow": "PHONEPE_SDK"
  }
}
```

**Flutter Action:** Launch PhonePe SDK with `orderId`, `token`, `merchantId`

---

### Step 7: Verify Payment (After SDK Callback)

After PhonePe SDK returns callback to Flutter, Flutter must verify with backend:

```http
POST /api/v1/payments/:paymentId/verify
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "sdkStatus": "SUCCESS",
  "sdkResponseCode": "PAYMENT_SUCCESS",
  "sdkMessage": "Payment completed successfully"
}
```

**Backend Action:** Polls PhonePe Order Status API to verify actual payment state

**What Happens on Success:**
- ✅ Payment transaction status updated to `COMPLETED`
- ✅ Booking status updated to `AWAITING_CONFIRMATION`
- ✅ `paidAt` timestamp set
- ✅ 24-hour countdown starts
- ✅ Barber notified to confirm

**Webhook Backup:** PhonePe also sends S2S webhook for production reliability

---

### Step 8: Barber Confirms (Within 24 Hours)

```http
PATCH /api/v1/bookings/:bookingId
Authorization: Bearer <barber_token>
Content-Type: application/json

{
  "status": "confirmed"
}
```

**Returns:**
```json
{
  "bookingId": "booking123",
  "status": "confirmed",
  "barberConfirmedAt": "2026-04-28T10:15:00Z"
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
  "bookingId": "booking123",
  "status": "completed",
  "completedAt": "2026-04-28T11:00:00Z"
}
```

**What Happens:**
- ✅ Booking status updated to `COMPLETED`
- ✅ Slot released
- ✅ Ready for payout
- ✅ Customer can rate barber

---

## Booking List API - Detailed Documentation

### Overview

The `GET /api/v1/bookings` endpoint provides role-specific filtering capabilities for both customers and barbers. The API intelligently adapts based on the authenticated user's role.

### For Customers

**Endpoint:** `GET /api/v1/bookings`

**Available Filters:**

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `dateFrom` | string | YYYY-MM-DD | Start date, inclusive |
| `dateTo` | string | YYYY-MM-DD | End date, inclusive |
| `favorite` | boolean | `true`, `false` | Show only favorite bookings |
| `status` | string | See status values below | Filter by booking status |
| `paymentStatus` | string | See payment status values below | Filter by payment status |
| `page` | number | 1, 2, 3... | Page number (default: 1) |
| `limit` | number | 1-100 | Items per page (default: 10) |

**Example Requests:**

```http
# Get bookings from a date onward
GET /api/v1/bookings?dateFrom=2026-05-07
Authorization: Bearer <customer_token>

# Get completed bookings before a date
GET /api/v1/bookings?dateTo=2026-05-07&status=completed
Authorization: Bearer <customer_token>

# Get favorite bookings
GET /api/v1/bookings?favorite=true
Authorization: Bearer <customer_token>

# Get bookings with successful payment
GET /api/v1/bookings?paymentStatus=success&page=1&limit=20
Authorization: Bearer <customer_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "bookingId": "507f1f77bcf86cd799439011",
        "shop": {
          "shopId": "507f1f77bcf86cd799439012",
          "name": "Elite Salon",
          "address": "123 Main St, City",
          "coverUrl": "https://..."
        },
        "employee": {
          "employeeId": "507f1f77bcf86cd799439013",
          "name": "Jane Smith",
          "photoUrl": "https://..."
        },
        "services": [
          {
            "serviceId": "507f1f77bcf86cd799439014",
            "name": "Haircut",
            "price": 250
          },
          {
            "serviceId": "507f1f77bcf86cd799439015",
            "name": "Beard Trim",
            "price": 53
          }
        ],
        "date": "2026-05-10",
        "time": "10:00",
        "endTime": "11:00",
        "durationMinutes": 60,
        "totalAmount": 303,
        "status": "confirmed",
        "paymentStatus": "success",
        "createdAt": "2026-05-01T08:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  },
  "message": "Bookings fetched"
}
```

---

### For Barbers

**Endpoint:** `GET /api/v1/bookings`

**Available Filters:**

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `employeeId` | ObjectId | Valid employee ID | Filter by specific employee |
| `dateFrom` | string | YYYY-MM-DD | Start date (inclusive) |
| `dateTo` | string | YYYY-MM-DD | End date (inclusive) |
| `status` | string | See status values below | Filter by booking status |
| `paymentStatus` | string | See payment status values below | Filter by payment status |
| `page` | number | 1, 2, 3... | Page number (default: 1) |
| `limit` | number | 1-100 | Items per page (default: 10) |

**Example Requests:**

```http
# Get all bookings for a specific employee
GET /api/v1/bookings?employeeId=507f1f77bcf86cd799439013
Authorization: Bearer <barber_token>

# Get bookings for an employee in a date range
GET /api/v1/bookings?employeeId=507f1f77bcf86cd799439013&dateFrom=2026-05-01&dateTo=2026-05-31
Authorization: Bearer <barber_token>

# Get pending confirmations
GET /api/v1/bookings?status=awaiting_confirmation&paymentStatus=success
Authorization: Bearer <barber_token>

# Get today's confirmed bookings
GET /api/v1/bookings?dateFrom=2026-05-05&dateTo=2026-05-05&status=confirmed
Authorization: Bearer <barber_token>

# Get all bookings in May 2026
GET /api/v1/bookings?dateFrom=2026-05-01&dateTo=2026-05-31
Authorization: Bearer <barber_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "bookingId": "507f1f77bcf86cd799439011",
        "customer": {
          "customerId": "507f1f77bcf86cd799439016",
          "name": "John Doe",
          "phone": "+919876543210"
        },
        "employee": {
          "employeeId": "507f1f77bcf86cd799439013",
          "name": "Jane Smith"
        },
        "services": [
          {
            "serviceId": "507f1f77bcf86cd799439014",
            "name": "Haircut",
            "price": 250
          }
        ],
        "date": "2026-05-10",
        "time": "10:00",
        "endTime": "10:30",
        "durationMinutes": 30,
        "totalAmount": 250,
        "status": "confirmed",
        "paymentStatus": "success",
        "payoutStatus": "not_initiated",
        "createdAt": "2026-05-01T08:30:00Z",
        "barberConfirmedAt": "2026-05-01T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 120,
      "totalPages": 12
    },
    "numberOfEmployees": 5,
    "numberOfCustomers": 85
  },
  "message": "Bookings fetched"
}
```

---

### Status Values

**Booking Status:**
- `pending` - Created, not paid
- `awaiting_confirmation` - Paid, waiting for barber
- `confirmed` - Barber confirmed
- `completed` - Service delivered
- `cancelled` - Booking cancelled
- `no-show` - Customer didn't show up

**Payment Status:**
- `pending` - No payment initiated
- `initiated` - Payment process started
- `success` - Payment successful
- `failed` - Payment failed
- `refund_pending` - Refund initiated
- `refund_failed` - Refund failed
- `refunded` - Refund completed

---

### Validation & Error Handling

**Customer Restrictions:**
```json
// Customers cannot use barber-only filters
GET /api/v1/bookings?employeeId=X

// Response: 403 Forbidden
{
  "success": false,
  "message": "Employee filters are only available for barbers"
}
```

**Barber Restrictions:**
```json
// Barbers cannot use customer-only filters
GET /api/v1/bookings?favorite=true

// Response: 403 Forbidden
{
  "success": false,
  "message": "Favorite filters are only available for customers"
}
```

**Invalid Employee:**
```json
// ❌ Employee must belong to barber's shop
GET /api/v1/bookings?employeeId=invalid_or_other_shop_employee

// Response: 400 Bad Request
{
  "success": false,
  "message": "Employee does not belong to this shop"
}
```

**Invalid Date Format:**
```json
// ❌ Dates must be in YYYY-MM-DD format
GET /api/v1/bookings?dateFrom=05-01-2026

// Response: 400 Bad Request
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "dateFrom",
      "message": "must be in YYYY-MM-DD format"
    }
  ]
}
```

---

### Use Cases

**Customer Use Cases:**

1. **View Upcoming Appointments**
   ```http
   GET /api/v1/bookings?dateFrom=2026-05-07&status=confirmed
   ```

2. **Check Booking History**
   ```http
   GET /api/v1/bookings?dateTo=2026-05-07&page=1&limit=20
   ```

3. **Find Favorite Bookings to Reorder**
   ```http
   GET /api/v1/bookings?favorite=true
   ```

4. **Track Payment Status**
   ```http
   GET /api/v1/bookings?paymentStatus=pending
   ```

**Barber Use Cases:**

1. **Find Employee's Bookings for Leave Management**
   ```http
   GET /api/v1/bookings?employeeId=X&dateFrom=2026-06-15&dateTo=2026-06-17&status=confirmed,awaiting_confirmation
   ```

2. **View Today's Schedule**
   ```http
   GET /api/v1/bookings?dateFrom=2026-05-05&dateTo=2026-05-05
   ```

3. **Check Pending Confirmations**
   ```http
   GET /api/v1/bookings?status=awaiting_confirmation&paymentStatus=success
   ```

4. **Monthly Revenue Report**
   ```http
   GET /api/v1/bookings?dateFrom=2026-05-01&dateTo=2026-05-31&status=completed&paymentStatus=success
   ```

5. **Employee Performance Tracking**
   ```http
   GET /api/v1/bookings?employeeId=X&dateFrom=2026-05-01&dateTo=2026-05-31&status=completed
   ```

---

## Business Rules

### Rule 1: Payment Before Confirmation
Customer must pay before barber can confirm. Ensures payment is secured.

### Rule 2: Confirmation Required
Barber must explicitly confirm booking. No auto-confirmation. Gives barber control.

### Rule 3: 24-Hour Auto-Cancel
If barber doesn't respond within 24 hours, booking auto-cancels with full refund. Protects customer from indefinite waiting.

### Rule 4: Customer Cancellation Window
Customer can cancel anytime except <2 hours before appointment. Protects barber's time while allowing reasonable flexibility.

### Rule 5: Partial Refund on Customer Cancellation
Customer pays cancellation fee. Covers platform costs and discourages frivolous cancellations.

**Refund Calculation:**
```
Service Amount: ₹299
Platform Fee: ₹10
Refund Fee: ₹15
Total Paid: ₹309

Refund = Service Amount - Refund Fee
Refund = ₹299 - ₹15 = ₹284

Customer Receives: ₹284
Platform Keeps: ₹25 (₹10 platform fee + ₹15 refund fee)
```

### Rule 6: Full Refund on Auto-Cancel
```
Total Paid: ₹303
Refund: ₹303 (full amount)

Customer Receives: ₹303
Platform Loses: ₹3 (platform fee) + gateway fees
```

**Why full refund?** Barber didn't respond, so customer shouldn't pay any fees.

### Rule 7: No Refund After Service
Once service is completed, no refund. Customer can dispute separately.

### Rule 8: Exact Range Management
The booking source of truth is `Employee.bookedRanges[]`, a continuous `[startMinute, endMinute)` lock claimed with a single MongoDB `findOneAndUpdate`. Legacy `bookedSlots[]` markers remain only for compatibility. Ranges are released on cancellation, payment expiry, auto-cancel, completion, and no-show.

### Rule 9: No-Show Policy
Customer charged full amount. Barber receives payment. Protects barber from lost income.

### Rule 10: Update Only Before Payment
Customers can only update (change employee, date, time) PENDING bookings. After payment, booking is locked.

### Rule 11: Reschedule Limit
Maximum 1 reschedule per booking. Prevents excessive rescheduling. Customer must cancel and rebook if limit reached.

### Rule 12: Price Lock
Booking amount is locked at creation time. Service price changes don't affect existing bookings.

### Rule 13: Barber Cannot Cancel Paid Bookings
Barber can only cancel PENDING (unpaid) bookings. After payment, only auto-cancel (24h) applies.

---

## Detailed Scenarios

### Scenario 1: Happy Path

```
1. Customer creates booking → PENDING
2. Customer pays → AWAITING_CONFIRMATION
3. Barber confirms (within 24h) → CONFIRMED
4. Service delivered → COMPLETED
5. Payout processed → Barber receives payment
```

### Scenario 2: Auto-Cancel Path

```
1. Customer creates booking → PENDING
2. Customer pays → AWAITING_CONFIRMATION
3. Barber doesn't respond for 24 hours
4. System auto-cancels → CANCELLED
5. Customer receives full refund (100%)
6. Shop's missedConfirmationCount incremented
```

### Scenario 3: Customer Cancellation (Before Payment)

```
1. Customer creates booking → PENDING
2. Customer cancels → CANCELLED
3. No refund (no payment made)
4. Slot released
```

### Scenario 4: Customer Cancellation (After Payment)

```
1. Customer creates booking → PENDING
2. Customer pays → AWAITING_CONFIRMATION
3. Barber confirms → CONFIRMED
4. Customer cancels (>2h before) → CANCELLED
5. Customer receives partial refund (₹293 from ₹303)
6. Slot released
```

### Scenario 5: Customer Updates Booking (Before Payment)

```
1. Customer creates booking → PENDING
2. Customer updates (change employee/date/time)
3. Old slot released, new slot claimed
4. Booking updated
```

### Scenario 6: Customer Reschedules (Before Payment)

```
1. Customer creates booking → PENDING
2. Customer reschedules (max 1 time, >2h before)
3. Old slot released, new slot claimed
4. Reschedule count incremented
5. Booking updated
```

### Scenario 7: Customer Reorders (After Completion)

```
1. Original booking: COMPLETED
2. Customer reorders
3. NEW booking created with same shop, employee, services
4. New booking starts as PENDING
5. Original booking remains unchanged
```

### Scenario 8: Barber Marks as No-Show

```
1. Booking: CONFIRMED
2. Customer doesn't show up
3. Barber marks as NO_SHOW
4. No refund to customer
5. Barber still gets paid
6. Slot released
```

### Scenario 9: Multi-Service Booking

```
1. Customer selects multiple services: ["haircut", "beard", "color"]
2. System calculates total duration: 110 minutes
3. System calculates total price: ₹950
4. Creates booking with multiple slot locks
5. Locks slots: 10:00, 10:30, 11:00, 11:30
```

---

## Edge Cases

### Edge Case 1: Concurrent Booking Attempts

**Problem:** Two customers try to book the same slot simultaneously.

**Handling:**
- First request claims slot atomically
- Second request fails with "Slot not available"
- Database-level locking ensures atomicity

**Reason:** Prevents double booking

---

### Edge Case 2: Payment Success After Booking Cancelled

**Problem:** Customer cancels booking, but payment webhook arrives late.

**Handling:**
- Check booking status before processing payment
- If CANCELLED: Do not update, initiate immediate refund
- Log anomaly

**Reason:** Handles network delays gracefully

---

### Edge Case 3: Barber Confirms After Customer Cancels

**Problem:** Customer cancels while barber is confirming.

**Handling:**
- Customer cancellation processes first
- Status changes to CANCELLED
- Barber confirmation fails: "Booking is not awaiting confirmation"

**Reason:** Cancellation takes precedence

---

### Edge Case 4: Customer Updates to Same Slot

**Problem:** Customer tries to update booking to same employee, date, and time.

**Handling:**
- System detects no change
- Returns booking without processing
- No slot operations performed

**Reason:** Optimization - no need to release and reclaim same slot

---

### Edge Case 5: Service Price Changed After Booking

**Problem:** Booking created with service price ₹299, shop owner changes price to ₹400.

**Handling:**
- Booking stores totalAmount at creation time
- Price changes don't affect existing bookings
- Customer pays original price

**Reason:** Price locked at booking time

---

### Edge Case 6: Employee Deleted After Booking

**Problem:** Booking exists for employee, admin tries to delete employee.

**Handling:**
- System checks for active bookings
- Prevents deletion if bookings exist
- Error: "Cannot delete employee with active bookings"

**Reason:** Maintains referential integrity

---

### Edge Case 7: Multiple Refund Attempts

**Problem:** Refund initiated multiple times for same booking.

**Handling:**
- Check payment status
- If already REFUND_PENDING or REFUNDED: Return existing details
- Idempotency check prevents duplicate refunds

**Reason:** Prevents double refunds

---

**Document Status:** ✅ Complete  
**Last Updated:** May 4, 2026  
**Next Steps:** Use these APIs in your application
