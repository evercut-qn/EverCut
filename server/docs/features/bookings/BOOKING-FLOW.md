# Booking Flow - Quick Reference

## Booking Lifecycle

```
CREATE → PENDING → PAYMENT → AWAITING_CONFIRMATION → CONFIRMED → COMPLETED
           ↓           ↓              ↓                    ↓
       CANCELLED   CANCELLED      CANCELLED            CANCELLED
```

---

## 1. Create Booking

**Endpoint:** `POST /api/v1/bookings`  
**Role:** CUSTOMER

**Result:**
- Status: `PENDING`
- Payment: `PENDING`
- Slot: CLAIMED

---

## 2. Payment

**Endpoint:** `POST /api/v1/payments/initiate`  
**Role:** CUSTOMER

**After Payment Success:**
- Status: `AWAITING_CONFIRMATION` ⭐
- Payment: `SUCCESS`
- Slot: CLAIMED

**What happens:** Booking waits for barber approval

---

## 3. Barber Actions

### Option A: Confirm Booking ✅

**Endpoint:** `PATCH /api/v1/bookings/:id/confirm`  
**Role:** BARBER

**Result:**
- Status: `CONFIRMED`
- Sets `barberConfirmedAt` timestamp
- Booking proceeds to service

### Option B: Cancel Booking ❌

**Endpoint:** `DELETE /api/v1/bookings/:id`  
**Role:** BARBER

**Result:**
- Status: `CANCELLED`
- **FULL REFUND** (100% - no fees)
- Slot released
- Sets `barberCancelledAt` timestamp

**Restriction:** Can only cancel if status is `AWAITING_CONFIRMATION`

---

## 4. Service Delivery

**Endpoint:** `PUT /api/v1/bookings/:id/status`  
**Role:** BARBER  
**Body:** `{ "status": "completed" }`

**Result:**
- Status: `COMPLETED`
- Sets `completedAt` timestamp
- Ready for payout

---

## Cancellation Rules

### Customer Cancellation

**Endpoint:** `DELETE /api/v1/bookings/:id`  
**Role:** CUSTOMER

| Booking Status | Can Cancel? | Refund |
|----------------|-------------|--------|
| PENDING (unpaid) | ✅ Yes | None (no payment) |
| AWAITING_CONFIRMATION | ✅ Yes | Partial (fees deducted) |
| CONFIRMED | ✅ Yes | Partial (fees deducted) |
| COMPLETED | ❌ No | - |

**Restrictions:**
- Cannot cancel within 2 hours of appointment
- Cannot cancel past appointments

**Refund Calculation:**
```
Refund = Total Amount - Refund Fee - Platform Fee
Example: ₹303 paid → ₹293 refunded (₹300 - ₹7 fee)
```

---

### Barber Cancellation

**Endpoint:** `DELETE /api/v1/bookings/:id`  
**Role:** BARBER

| Booking Status | Can Cancel? | Refund |
|----------------|-------------|--------|
| PENDING (unpaid) | ✅ Yes (deletes) | None (no payment) |
| AWAITING_CONFIRMATION | ✅ Yes | **FULL** (100% - no fees) |
| CONFIRMED | ❌ No | - |
| COMPLETED | ❌ No | - |

**Refund Calculation:**
```
Refund = Full Payment Amount (100%)
Example: ₹303 paid → ₹303 refunded (full amount)
```

**Why full refund?** Barber rejected the booking, so customer shouldn't pay any fees.

---

## Status Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     BOOKING STATES                           │
└──────────────────────────────────────────────────────────────┘

PENDING
  ├─ Customer: DELETE → CANCELLED (no refund)
  ├─ Barber: DELETE → DELETED (no refund)
  └─ Customer: PAY → AWAITING_CONFIRMATION

AWAITING_CONFIRMATION
  ├─ Customer: DELETE → CANCELLED (partial refund)
  ├─ Barber: DELETE → CANCELLED (FULL refund) ⭐
  └─ Barber: PATCH /confirm → CONFIRMED

CONFIRMED
  ├─ Customer: DELETE → CANCELLED (partial refund)
  ├─ Barber: DELETE → ❌ ERROR
  └─ Barber: PUT /status → COMPLETED

COMPLETED
  ├─ Customer: DELETE → ❌ ERROR
  └─ Barber: DELETE → ❌ ERROR
```

---

## Key Points

✅ **One endpoint for all cancellations:** `DELETE /bookings/:id`  
✅ **Customer always gets partial refund** (fees deducted)  
✅ **Barber cancellation = full refund** (before confirmation only)  
✅ **Cannot cancel after confirmation** (barber committed to service)  
✅ **Slot automatically released** on cancellation  
✅ **2-hour cancellation window** for customers

---

## API Summary

| Endpoint | Role | Action |
|----------|------|--------|
| `POST /bookings` | CUSTOMER | Create booking |
| `POST /payments/initiate` | CUSTOMER | Pay for booking |
| `PATCH /bookings/:id/confirm` | BARBER | Confirm booking |
| `DELETE /bookings/:id` | CUSTOMER/BARBER | Cancel booking |
| `PUT /bookings/:id/status` | BARBER | Update status |
| `GET /bookings/pending-confirmations` | BARBER | List pending confirmations |
