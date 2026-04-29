# Booking System - Complete Guide

**Version:** 3.0  
**Last Updated:** April 28, 2026  
**Status:** ✅ Production Ready

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
│   └─ GET /employees/:id/available-slots
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

## API Endpoints

### Discovery & Availability

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/shops/nearby` | No | Find nearby shops |
| GET | `/api/v1/shops/:id` | No | Shop details |
| GET | `/api/v1/shops/:id/employees` | No | List employees |
| GET | `/api/v1/employees/:id/available-slots` | Yes | Employee availability (recommended) |
| GET | `/api/v1/shops/:id/availability` | Yes | Shop-wide availability |
| GET | `/api/v1/employees/:id/calendar` | Yes | Raw calendar data (legacy) |

### Booking Management (Customer)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/v1/bookings` | CUSTOMER | Create booking |
| GET | `/api/v1/bookings` | CUSTOMER | List bookings |
| GET | `/api/v1/bookings/:id` | CUSTOMER | Get booking details |
| PUT | `/api/v1/bookings/:id` | CUSTOMER | Update booking (before payment) |
| PUT | `/api/v1/bookings/:id/reschedule` | CUSTOMER | Reschedule booking |
| POST | `/api/v1/bookings/:id/reorder` | CUSTOMER | Reorder booking |
| POST | `/api/v1/bookings/:id/cancel` | CUSTOMER | Cancel booking |
| GET | `/api/v1/bookings/:id/confirmation` | CUSTOMER | Get confirmation |
| PUT | `/api/v1/bookings/:id/favorite` | CUSTOMER | Toggle favorite |

### Booking Management (Barber)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/bookings` | BARBER | List all bookings |
| GET | `/api/v1/bookings/pending-confirmations` | BARBER | List pending confirmations |
| GET | `/api/v1/bookings/status` | BARBER | Get bookings by status |
| GET | `/api/v1/bookings/stats` | BARBER | Get statistics |
| GET | `/api/v1/bookings/progress` | BARBER | Get milestone progress |
| PATCH | `/api/v1/bookings/:id/confirm` | BARBER | Confirm booking |
| PUT | `/api/v1/bookings/:id/status` | BARBER | Update status |
| POST | `/api/v1/bookings/:id/cancel` | BARBER | Cancel unpaid booking |

### Payment & Refunds

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/v1/payments` | CUSTOMER | Initiate native SDK payment |
| POST | `/api/v1/payments/:id/verify` | CUSTOMER | Verify payment after SDK callback |
| GET | `/api/v1/payments/:id` | CUSTOMER | Get payment status |
| GET | `/api/v1/bookings/:id/payment` | CUSTOMER | Get payment details for booking |
| POST | `/api/v1/bookings/:id/refund` | ADMIN/BARBER | Initiate refund |

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
GET /api/v1/shops/nearby?latitude=12.9716&longitude=77.5946
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
GET /api/v1/employees/:employeeId/available-slots?date=2026-04-28&serviceId=service1
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
  "durationMinutes": 30,
  "slotLockTimes": ["10:00"],
  "totalAmount": 300
}
```

**What Happens:**
- ✅ Slot is **atomically claimed** (prevents double booking)
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
PATCH /api/v1/bookings/:bookingId/confirm
Authorization: Bearer <barber_token>
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
Service Amount: ₹300
Platform Fee: ₹3
Refund Fee: ₹7
Total Paid: ₹303

Refund = Service Amount - Refund Fee
Refund = ₹300 - ₹7 = ₹293

Customer Receives: ₹293
Platform Keeps: ₹10 (₹3 platform fee + ₹7 refund fee)
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

### Rule 8: Slot Management
Slot claimed on booking creation. Slot released on cancellation or completion. Prevents double booking.

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

**Problem:** Booking created with service price ₹300, shop owner changes price to ₹400.

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
**Last Updated:** April 28, 2026  
**Next Steps:** Use these APIs in your application
