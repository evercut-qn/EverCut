# Booking Flow Documentation

**Version:** 3.0  
**Last Updated:** April 28, 2026  
**Status:** Auto-Cancel Enabled

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Booking States](#booking-states)
3. [Complete Flow](#complete-flow)
4. [All Available Operations](#all-available-operations)
5. [Cancellation Rules](#cancellation-rules)
6. [Detailed Scenarios](#detailed-scenarios)
7. [Edge Cases](#edge-cases)
8. [Refund Logic](#refund-logic)
9. [Business Rules](#business-rules)
10. [API Reference](#api-reference)
11. [Future Enhancements](#future-enhancements)

---

## Quick Reference

### Decision Tree: What Can I Do?

```
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOMER ACTIONS                         │
└─────────────────────────────────────────────────────────────┘

Booking Status: PENDING (Not Paid)
├─ ✅ Update booking (change employee, date, time)
├─ ✅ Reschedule booking (max 1 time, >2h before)
├─ ✅ Cancel booking (no refund)
└─ ✅ Pay for booking → Status: AWAITING_CONFIRMATION

Booking Status: AWAITING_CONFIRMATION (Paid, Waiting)
├─ ✅ Cancel booking (partial refund, >2h before)
├─ ✅ View booking status
├─ ❌ Cannot update or reschedule (locked after payment)
└─ ⏰ Auto-cancels after 24h (full refund)

Booking Status: CONFIRMED (Barber Accepted)
├─ ✅ Cancel booking (partial refund, >2h before)
├─ ✅ View booking details
├─ ❌ Cannot update or reschedule
└─ ⏰ Wait for service delivery

Booking Status: COMPLETED (Service Done)
├─ ✅ Rate barber
├─ ✅ Reorder (create new booking)
└─ ❌ Cannot cancel or modify

┌─────────────────────────────────────────────────────────────┐
│                     BARBER ACTIONS                          │
└─────────────────────────────────────────────────────────────┘

Booking Status: PENDING (Not Paid)
├─ ✅ View booking
├─ ✅ Cancel booking (delete)
└─ ❌ Cannot confirm (payment required)

Booking Status: AWAITING_CONFIRMATION (Paid, Waiting)
├─ ✅ Confirm booking → Status: CONFIRMED
├─ ✅ View booking details
├─ ⏰ Must respond within 24h (or auto-cancels)
└─ ❌ Cannot manually cancel (auto-cancel only)

Booking Status: CONFIRMED (Accepted)
├─ ✅ Mark as completed
├─ ✅ Mark as no-show
├─ ✅ View booking details
└─ ❌ Cannot cancel (committed)

Booking Status: COMPLETED (Service Done)
├─ ✅ View booking
├─ ⏰ Wait for payout
└─ ❌ Cannot modify
```

---

### Booking Lifecycle

```
CREATE → PENDING → PAYMENT → AWAITING_CONFIRMATION → CONFIRMED → COMPLETED
           ↓           ↓              ↓                    ↓
       CANCELLED   CANCELLED      CANCELLED            CANCELLED
```

### Key Points

✅ **24-hour auto-cancel:** Bookings auto-cancel if barber doesn't respond  
✅ **Full refund on auto-cancel:** Customer gets 100% refund  
✅ **Customer cancellation:** Partial refund (fees deducted)  
✅ **Cannot cancel after confirmation:** Barber committed to service  
✅ **Slot automatically released:** On cancellation  
✅ **2-hour cancellation window:** For customers  
✅ **Missed confirmation tracking:** Shops tracked for reliability

### Important Constraints

⚠️ **Update/Reschedule:** Only PENDING bookings (before payment)  
⚠️ **Reschedule Limit:** Maximum 1 reschedule per booking  
⚠️ **2-Hour Window:** Cannot cancel/reschedule within 2h of appointment  
⚠️ **Price Lock:** Booking amount locked at creation time  
⚠️ **Barber Cancel:** Only unpaid bookings (PENDING status)  
⚠️ **Status Update:** Barber can only mark CONFIRMED bookings as completed/no-show

---

### API Endpoints

| Endpoint | Role | Action |
|----------|------|--------|
| `POST /bookings` | CUSTOMER | Create booking |
| `POST /payments/initiate` | CUSTOMER | Pay for booking |
| `PATCH /bookings/:id/confirm` | BARBER | Confirm booking (within 24h) |
| `DELETE /bookings/:id` | CUSTOMER | Cancel booking |
| `PUT /bookings/:id/status` | BARBER | Update status (completed/no-show) |
| `GET /bookings/pending-confirmations` | BARBER | List pending confirmations |

---

## Booking States

### Status Enum

```
PENDING              - Booking created, not paid
AWAITING_CONFIRMATION - Paid, waiting for barber confirmation (24h max)
CONFIRMED            - Barber confirmed, ready for service
COMPLETED            - Service delivered
CANCELLED            - Booking cancelled
NO_SHOW              - Customer didn't show up
```

### Payment Status Enum

```
PENDING              - No payment initiated
INITIATED            - Payment process started
SUCCESS              - Payment successful
FAILED               - Payment failed
REFUND_PENDING       - Refund initiated
REFUNDED             - Refund completed
REFUND_FAILED        - Refund failed
```

### Payout Status Enum

```
NOT_INITIATED        - No payout started
INITIATED            - Payout process started
PENDING              - Payout in progress
COMPLETED            - Payout completed
FAILED               - Payout failed
REVERSED             - Payout reversed
```

### State Transitions

**Valid Transitions:**
```
PENDING → AWAITING_CONFIRMATION (payment success)
AWAITING_CONFIRMATION → CONFIRMED (barber confirms)
AWAITING_CONFIRMATION → CANCELLED (customer cancels OR auto-cancel)
CONFIRMED → COMPLETED (service delivered)
CONFIRMED → CANCELLED (customer cancels)
PENDING → CANCELLED (customer cancels)
```

**Invalid Transitions:**
```
COMPLETED → Any (service already delivered)
CANCELLED → Any (final state)
AWAITING_CONFIRMATION → COMPLETED (must be confirmed first)
```

---

## Complete Flow

### Standard Happy Path

```
1. CREATE BOOKING
   Customer: POST /bookings
   Result: Status PENDING, Slot CLAIMED

2. INITIATE PAYMENT
   Customer: POST /payments/initiate
   Result: Payment link generated

3. COMPLETE PAYMENT
   Customer: Completes payment
   Webhook: Payment success
   Result: Status AWAITING_CONFIRMATION, 24h countdown starts

4. BARBER CONFIRMS
   Barber: PATCH /bookings/:id/confirm
   Result: Status CONFIRMED

5. SERVICE DELIVERED
   Barber: PUT /bookings/:id/status {status: "completed"}
   Result: Status COMPLETED, Slot RELEASED

6. PAYOUT PROCESSED
   System: Scheduled payout job
   Result: Barber receives payment
```

### Auto-Cancel Path

```
1. Customer creates booking → PENDING
2. Customer pays → AWAITING_CONFIRMATION
3. Barber doesn't respond for 24 hours
4. System auto-cancels → CANCELLED
5. Customer receives full refund (100%)
6. Shop's missedConfirmationCount incremented
```

---

## All Available Operations

### Customer Operations Summary

| Operation | Endpoint | When Allowed | Restrictions |
|-----------|----------|--------------|--------------|
| **Create Booking** | `POST /bookings` | Anytime | Must be future date/time |
| **Update Booking** | `PUT /bookings/:id` | Status: PENDING only | Can change employee, date, time |
| **Reschedule Booking** | `PUT /bookings/:id/reschedule` | Status: PENDING only | Max 1 reschedule, >2h before appointment |
| **Reorder Booking** | `POST /bookings/:id/reorder` | Anytime (creates new) | Creates new booking from completed one |
| **Cancel Booking** | `DELETE /bookings/:id` | Before completion | >2h before appointment if paid |
| **Get Bookings** | `GET /bookings` | Anytime | Filter by type: upcoming/past/cancelled |
| **Get Booking Details** | `GET /bookings/:id` | Anytime | Own bookings only |
| **Get Confirmation** | `GET /bookings/:id/confirmation` | After payment | Booking confirmation details |
| **Toggle Favorite** | `PUT /bookings/:id/favorite` | Anytime | Mark shop as favorite |

### Barber Operations Summary

| Operation | Endpoint | When Allowed | Restrictions |
|-----------|----------|--------------|--------------|
| **Confirm Booking** | `PATCH /bookings/:id/confirm` | Status: AWAITING_CONFIRMATION | Within 24h of payment |
| **Update Status** | `PUT /bookings/:id/status` | After confirmation | completed, no-show only |
| **Cancel Booking** | `DELETE /bookings/:id` | Status: PENDING only | Before payment only |
| **Get Bookings** | `GET /bookings` | Anytime | All shop bookings |
| **Get Pending** | `GET /bookings/pending-confirmations` | Anytime | Bookings awaiting confirmation |
| **Get By Status** | `GET /bookings/status` | Anytime | Filter by specific status |
| **Get Stats** | `GET /bookings/stats` | Anytime | Booking statistics |
| **Get Details** | `GET /bookings/:id` | Anytime | Own shop bookings only |

---

## Cancellation Rules

### Customer Cancellation

**Endpoint:** `DELETE /api/v1/bookings/:id`

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
Service Amount: ₹300
Platform Fee: ₹3
Refund Fee: ₹7
Total Paid: ₹303

Refund = Service Amount - Refund Fee
Refund = ₹300 - ₹7 = ₹293

Customer Receives: ₹293
Platform Keeps: ₹10 (₹3 platform fee + ₹7 refund fee)
```

---

### Auto-Cancellation (System)

**Trigger:** 24 hours after payment with no barber response

| Booking Status | When | Refund |
|----------------|------|--------|
| AWAITING_CONFIRMATION | 24 hours after payment | **FULL** (100% - no fees) |

**Refund Calculation:**
```
Total Paid: ₹303
Refund: ₹303 (full amount)

Customer Receives: ₹303
Platform Loses: ₹3 (platform fee) + gateway fees
```

**Why full refund?** Barber didn't respond, so customer shouldn't pay any fees.

**Shop Impact:**
- `missedConfirmationCount` incremented
- May affect shop's reliability score
- Repeated missed confirmations may result in penalties

**Auto-Cancel Process:**
- Scheduled job runs every 15 minutes
- Checks for bookings in AWAITING_CONFIRMATION status
- If 24 hours passed since payment: Auto-cancels with full refund
- Both parties notified

---

### Status Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     BOOKING STATES                           │
└──────────────────────────────────────────────────────────────┘

PENDING
  ├─ Customer: DELETE → CANCELLED (no refund)
  ├─ Barber: DELETE → DELETED (no refund)
  └─ Customer: PAY → AWAITING_CONFIRMATION

AWAITING_CONFIRMATION (24h max)
  ├─ Customer: DELETE → CANCELLED (partial refund)
  ├─ System: AUTO-CANCEL (24h) → CANCELLED (FULL refund)
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

## Detailed Scenarios

### Scenario 1: Customer Creates Booking (No Payment)

**State:** PENDING, Payment PENDING, Slot CLAIMED

**Customer Actions:**
- Pay for booking
- Cancel booking (releases slot, no refund)
- Update booking details
- Reschedule booking

**Barber Actions:**
- View booking (read-only)
- Cannot confirm (payment required first)

**Time Limits:**
- No automatic expiry
- Appointment must be in future

---

### Scenario 2: Customer Pays (Awaiting Confirmation)

**State:** AWAITING_CONFIRMATION, Payment SUCCESS, Slot CLAIMED

**Customer Actions:**
- Cancel booking (partial refund)
- View booking status
- Cannot reschedule (must cancel and rebook)

**Barber Actions:**
- Confirm booking (proceeds to CONFIRMED)
- View booking details
- **Must respond within 24 hours** (or booking auto-cancels)

**System Behavior:**
- Booking appears in barber's "pending confirmations" list
- 24-hour countdown starts
- Auto-cancel if no response

---

### Scenario 3: Barber Confirms Booking

**State:** CONFIRMED, Payment SUCCESS, Slot CLAIMED

**Customer Actions:**
- Cancel booking (partial refund, >2 hours before)
- View booking details
- Cannot reschedule

**Barber Actions:**
- Mark as completed (after service)
- Mark as no-show (if customer doesn't show)
- Cannot cancel (committed to service)

**Time Limits:**
- Customer cancellation window: 2 hours before appointment

---

### Scenario 4: Service Completed

**State:** COMPLETED, Payment SUCCESS, Payout NOT_INITIATED

**Customer Actions:**
- Rate barber
- Rebook
- Cannot cancel (service delivered)

**Barber Actions:**
- View booking (read-only)
- Wait for payout (automatic)

**System Behavior:**
- Slot released
- Ready for payout processing

---

### Scenario 5: Customer Cancels Before Payment

**Process:**
1. Customer: DELETE /bookings/:id
2. System validates booking and ownership
3. Release slot, update status to CANCELLED
4. No refund (no payment made)

---

### Scenario 6: Customer Cancels After Payment

**Process:**
1. Customer: DELETE /bookings/:id
2. System validates (>2 hours before appointment)
3. Release slot, update status to CANCELLED
4. Initiate partial refund (₹293 from ₹303)

---

### Scenario 7: Customer Tries to Cancel Within 2 Hours

**Result:** Error - "Cancellation not allowed within 2 hours of appointment"

**Reason:** Too close to appointment, barber cannot rebook slot

---

### Scenario 8: Customer Tries to Cancel After Completion

**Result:** Error - "Cannot cancel a completed booking"

**Reason:** Service already delivered

---

### Scenario 9: Auto-Cancel After 24 Hours

**Process:**
1. Scheduled job runs every 15 minutes
2. Identifies bookings where:
   - Status = AWAITING_CONFIRMATION
   - Payment status = SUCCESS
   - paidAt <= (now - 24 hours)
3. For each booking:
   - Release slot
   - Update status to CANCELLED
   - Set autoCancelledAt timestamp
   - Initiate full refund (100%)
   - Increment shop.missedConfirmationCount
   - Notify both parties

**Refund:** ₹303 (full amount)

**Shop Impact:** Missed confirmation tracked, may affect reliability score

---

### Scenario 10: Barber Marks as No-Show

**Process:**
1. Barber: PUT /bookings/:id/status {status: "no-show"}
2. System validates appointment time has passed
3. Update status to NO_SHOW
4. Release slot
5. No refund to customer
6. Barber still gets paid

**Reason:** Customer didn't show up, barber blocked time

---

### Scenario 11: Payment Fails

**Process:**
1. Customer attempts payment
2. Payment fails (insufficient funds, etc.)
3. Webhook: Payment failure received
4. Status remains PENDING
5. Slot remains claimed (customer can retry)

---

### Scenario 12: Refund Fails

**Process:**
1. Refund initiated to gateway
2. Gateway rejects refund (account closed, etc.)
3. Update payment status to REFUND_FAILED
4. Flag for manual resolution
5. Admin contacts customer

---

### Scenario 13: Customer Updates Booking (Before Payment)

**Initial State:**
- Status: PENDING
- Payment: PENDING

**What Can Be Updated:**
- Employee (switch to different barber)
- Date (change appointment date)
- Time (change appointment time)

**Update Process:**
1. Customer: PUT /bookings/:id
2. System validates: Booking is PENDING (not paid)
3. System validates: New slot is available
4. Release old slot, claim new slot
5. Update booking details

**Restrictions:**
- Can only update PENDING bookings
- Cannot update after payment
- New slot must be available
- Must be future date/time

**Use Case:** Customer realizes they need a different time or prefer a different barber before paying.

---

### Scenario 14: Customer Reschedules Booking (Before Payment)

**Initial State:**
- Status: PENDING
- Payment: PENDING
- Reschedule count: 0

**Reschedule Process:**
1. Customer: PUT /bookings/:id/reschedule
2. System validates: Booking is PENDING
3. System validates: Not within 2-hour window
4. System validates: Reschedule count < 1 (max 1 reschedule)
5. System validates: New slot available
6. Release old slot, claim new slot
7. Increment reschedule count
8. Update date and time

**Restrictions:**
- Can only reschedule PENDING bookings
- Maximum 1 reschedule per booking
- Cannot reschedule within 2 hours of appointment
- Cannot reschedule after payment
- New slot must be available

**Reschedule Count:**
- First reschedule: Allowed
- Second reschedule: Blocked with error "You can only reschedule once"

**Use Case:** Customer needs to change appointment time but hasn't paid yet.

---

### Scenario 15: Customer Tries to Reschedule After Payment

**Initial State:**
- Status: AWAITING_CONFIRMATION or CONFIRMED
- Payment: SUCCESS

**Reschedule Attempt:**
1. Customer: PUT /bookings/:id/reschedule
2. System validates: Booking status
3. System rejects: Cannot reschedule paid bookings

**Result:** Error - "Cannot reschedule paid bookings. Please cancel and create a new booking."

**Reason:** After payment, booking is locked. Customer must cancel (with refund) and create new booking.

---

### Scenario 16: Customer Reorders Completed Booking

**Initial State:**
- Status: COMPLETED
- Payment: SUCCESS

**Reorder Process:**
1. Customer: POST /bookings/:id/reorder
2. System validates: Original booking exists
3. System validates: New date/time is in future
4. System validates: New date/time is different from original
5. Create NEW booking with:
   - Same shop, employee, services
   - New date and time
   - Status: PENDING
   - Payment: PENDING
6. Claim new slot

**Result:** New booking created (original booking unchanged)

**Use Case:** Customer loved the service and wants to book again with same barber.

**Note:** This creates a completely new booking. Original booking remains COMPLETED.

---

### Scenario 17: Customer Tries to Update Within 2-Hour Window

**Initial State:**
- Status: PENDING
- Time: <2 hours before appointment

**Update/Reschedule Attempt:**
1. Customer: PUT /bookings/:id or PUT /bookings/:id/reschedule
2. System validates: Time until appointment
3. System rejects: Within 2-hour window

**Result:** Error - "Reschedule not allowed within 2 hours of appointment"

**Reason:** Too close to appointment time, barber needs preparation time.

---

### Scenario 18: Customer Exceeds Reschedule Limit

**Initial State:**
- Status: PENDING
- Reschedule count: 1

**Reschedule Attempt:**
1. Customer: PUT /bookings/:id/reschedule
2. System validates: Reschedule count
3. System rejects: Already rescheduled once

**Result:** Error - "You can only reschedule once"

**Reason:** Prevents excessive rescheduling. Customer must cancel and create new booking.

---

### Scenario 19: Customer Marks Shop as Favorite

**Process:**
1. Customer: PUT /bookings/:id/favorite
2. System toggles favorite status for the shop
3. Shop added to/removed from customer's favorites

**Use Case:** Customer wants to save shop for future bookings.

**Note:** This is a convenience feature, doesn't affect booking flow.

---

### Scenario 20: Barber Updates Booking Status to Completed

**Initial State:**
- Status: CONFIRMED
- Payment: SUCCESS

**Completion Process:**
1. Barber: PUT /bookings/:id/status {status: "completed"}
2. System validates: Status is CONFIRMED
3. System validates: Payment is SUCCESS
4. Update status to COMPLETED
5. Set completedAt timestamp
6. Set payoutStatus to NOT_INITIATED
7. Release slot

**Result:** Booking marked complete, ready for payout

---

### Scenario 21: Barber Updates Booking Status to No-Show

**Initial State:**
- Status: CONFIRMED
- Payment: SUCCESS

**No-Show Process:**
1. Barber: PUT /bookings/:id/status {status: "no-show"}
2. System validates: Status is CONFIRMED
3. System validates: Appointment time has passed
4. Update status to NO_SHOW
5. Set completedAt timestamp
6. Set payoutStatus to NOT_INITIATED
7. Release slot
8. No refund to customer

**Result:** Customer charged, barber gets paid

**Reason:** Customer didn't show up, barber blocked time.

---

### Scenario 22: Barber Tries to Update Status for Awaiting Confirmation

**Initial State:**
- Status: AWAITING_CONFIRMATION
- Payment: SUCCESS

**Status Update Attempt:**
1. Barber: PUT /bookings/:id/status {status: "completed"}
2. System validates: Current status
3. System rejects: Must use confirm endpoint first

**Result:** Error - "Use the confirm or cancel endpoints for bookings awaiting confirmation"

**Reason:** Barber must explicitly confirm before marking complete.

---

### Scenario 23: Barber Cancels Unpaid Booking

**Initial State:**
- Status: PENDING
- Payment: PENDING

**Cancellation Process:**
1. Barber: DELETE /bookings/:id
2. System validates: Booking is PENDING
3. System validates: Payment is PENDING
4. Release slot
5. Delete or mark as CANCELLED

**Result:** Booking cancelled, no refund needed

**Use Case:** Barber doesn't want to accept this booking (before customer pays).

---

### Scenario 24: Barber Tries to Cancel Paid Booking

**Initial State:**
- Status: AWAITING_CONFIRMATION or CONFIRMED
- Payment: SUCCESS

**Cancellation Attempt:**
1. Barber: DELETE /bookings/:id
2. System validates: Payment status
3. System rejects: Cannot cancel paid bookings

**Result:** Error - "Cannot cancel paid bookings"

**Reason:** After payment, only auto-cancel (24h) is allowed. Barber must confirm or wait for auto-cancel.

---

### Scenario 25: Customer Gets Booking Confirmation Details

**Process:**
1. Customer: GET /bookings/:id/confirmation
2. System returns:
   - Booking details
   - Shop information
   - Employee information
   - Service details
   - Payment information
   - QR code or confirmation number

**Use Case:** Customer needs to show confirmation at shop.

---

### Scenario 26: Barber Gets Booking Statistics

**Process:**
1. Barber: GET /bookings/stats
2. System returns:
   - Total bookings
   - Pending confirmations count
   - Confirmed bookings count
   - Completed bookings count
   - Cancelled bookings count
   - Revenue statistics
   - Missed confirmation count

**Use Case:** Barber dashboard overview.

---

### Scenario 27: Barber Gets Bookings by Status

**Process:**
1. Barber: GET /bookings/status?status=confirmed
2. System returns: All bookings with specified status
3. Supports pagination

**Use Case:** Barber wants to see all confirmed bookings for today.

---

## Edge Cases

### Edge Case 1: Duplicate Payment Attempts

**Handling:**
- Check for existing pending payment
- If exists and not expired: Return existing payment link
- If expired: Mark old as EXPIRED, create new

**Reason:** Prevents duplicate charges

---

### Edge Case 2: Concurrent Booking Attempts

**Handling:**
- First request claims slot atomically
- Second request fails with "Slot not available"
- Database-level locking ensures atomicity

**Reason:** Prevents double booking

---

### Edge Case 3: Barber Confirms After Customer Cancels

**Handling:**
- Customer cancellation processes first
- Status changes to CANCELLED
- Barber confirmation fails: "Booking is not awaiting confirmation"

**Reason:** Cancellation takes precedence

---

### Edge Case 4: Payment Success After Booking Cancelled

**Handling:**
- Check booking status before processing payment
- If CANCELLED: Do not update, initiate immediate refund
- Log anomaly

**Reason:** Handles network delays gracefully

---

### Edge Case 5: Customer Cancels During Payout Processing

**Handling:**
- Check payout status before cancellation
- If INITIATED or PENDING: Block cancellation
- Error: "Refund window has closed"

**Reason:** Cannot refund after payout started

---

### Edge Case 6: Barber Deletes Employee After Booking

**Handling:**
- Prevent employee deletion if active bookings exist
- Error: "Cannot delete employee with active bookings"

**Reason:** Maintains referential integrity

---

### Edge Case 7: Shop Closed on Booking Date

**Handling:**
- Admin marks shop as closed
- System auto-cancels all future bookings
- Full refund to all customers
- Notify all affected parties

**Reason:** Protects customers

---

### Edge Case 8: Multiple Refund Attempts

**Handling:**
- Check payment status
- If already REFUND_PENDING or REFUNDED: Return existing details
- Idempotency check prevents duplicate refunds

**Reason:** Prevents double refunds

---

### Edge Case 9: Customer Updates to Same Slot

**Scenario:**
- Customer tries to update booking to same employee, date, and time

**Handling:**
- System detects no change
- Returns booking without processing
- No slot operations performed

**Reason:** Optimization - no need to release and reclaim same slot

---

### Edge Case 10: Reschedule to Past Date/Time

**Scenario:**
- Customer tries to reschedule to past date/time

**Handling:**
- System validates date/time is in future
- Rejects with error: "Appointment has already passed"

**Reason:** Cannot book in the past

---

### Edge Case 11: Reorder with Same Date/Time

**Scenario:**
- Customer tries to reorder with same date/time as original

**Handling:**
- System validates new date/time is different
- Rejects with error: "Please choose a different date or time"

**Reason:** Reorder should be for different time

---

### Edge Case 12: Slot Conflict During Update

**Scenario:**
- Customer updates booking
- New slot gets booked by someone else simultaneously

**Handling:**
- System attempts to claim new slot
- If fails: Restore old slot
- Return error: "Employee not available at this date/time"

**Reason:** Prevents double booking, maintains data consistency

---

### Edge Case 13: Employee Deleted After Booking

**Scenario:**
- Booking exists for employee
- Admin tries to delete employee

**Handling:**
- System checks for active bookings
- Prevents deletion if bookings exist
- Error: "Cannot delete employee with active bookings"

**Reason:** Maintains referential integrity

---

### Edge Case 14: Service Price Changed After Booking

**Scenario:**
- Booking created with service price ₹300
- Shop owner changes service price to ₹400
- Booking still shows ₹300

**Handling:**
- Booking stores totalAmount at creation time
- Price changes don't affect existing bookings
- Customer pays original price

**Reason:** Price locked at booking time

---

## Refund Logic

### Refund Fee Structure

- Single Service: ₹7
- Bundle Service: ₹15

### Platform Fee Structure

- Single Service: ₹3
- Bundle Service: ₹10

### Refund Process

1. **Initiate Refund:**
   - Calculate refund amount
   - Create refund record
   - Call payment gateway API
   - Update payment status to REFUND_PENDING

2. **Gateway Processing:**
   - Gateway processes refund
   - Sends webhook on completion

3. **Refund Success:**
   - Update payment status to REFUNDED
   - Notify customer

4. **Refund Failure:**
   - Update payment status to REFUND_FAILED
   - Flag for manual resolution
   - Alert admin team

### Refund Timeline

- Refund initiated: Immediate
- Gateway processing: 1-2 business days
- Customer account credit: 5-7 business days
- **Total time: 5-9 business days**

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

### Rule 6: No Refund After Service
Once service is completed, no refund. Customer can dispute separately.

### Rule 7: No Refund After Payout
Once barber is paid, automatic refund not possible. Requires manual intervention.

### Rule 8: Slot Management
Slot claimed on booking creation. Slot released on cancellation or completion. Prevents double booking.

### Rule 9: No-Show Policy
Customer charged full amount. Barber receives payment. Protects barber from lost income.

### Rule 10: Payout Timing
Payouts processed after service completion. Scheduled job runs daily. Barber receives payment minus platform fee.

### Rule 11: Update Only Before Payment
Customers can only update (change employee, date, time) PENDING bookings. After payment, booking is locked.

### Rule 12: Reschedule Limit
Maximum 1 reschedule per booking. Prevents excessive rescheduling. Customer must cancel and rebook if limit reached.

### Rule 13: Reschedule Window
Cannot reschedule within 2 hours of appointment. Same as cancellation window.

### Rule 14: Reorder Creates New Booking
Reordering a completed booking creates a completely new booking. Original booking remains unchanged.

### Rule 15: Price Lock
Booking amount is locked at creation time. Service price changes don't affect existing bookings.

### Rule 16: Barber Cannot Cancel Paid Bookings
Barber can only cancel PENDING (unpaid) bookings. After payment, only auto-cancel (24h) applies.

### Rule 17: Status Update Restrictions
Barber can only update status to "completed" or "no-show" for CONFIRMED bookings. Cannot manually set to CANCELLED for paid bookings.

---

## API Reference

### Customer Operations

**1. Create Booking:**
```http
POST /api/v1/bookings
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "shopId": "...",
  "employeeId": "...",
  "serviceId": "...",
  "date": "2026-04-28",
  "time": "10:00"
}
```
**Response:** Booking created with status PENDING

---

**2. Update Booking (Before Payment):**
```http
PUT /api/v1/bookings/:id
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "employeeId": "...",  // Optional: change barber
  "date": "2026-04-29", // Optional: change date
  "time": "14:00"       // Optional: change time
}
```
**Allowed:** Status PENDING only  
**Response:** Updated booking

---

**3. Reschedule Booking (Before Payment):**
```http
PUT /api/v1/bookings/:id/reschedule
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "newDate": "2026-04-29",
  "newTime": "14:00"
}
```
**Allowed:** Status PENDING only, max 1 reschedule, >2h before appointment  
**Response:** Rescheduled booking with incremented rescheduleCount

---

**4. Reorder Booking (Create from Completed):**
```http
POST /api/v1/bookings/:id/reorder
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "date": "2026-05-01",
  "time": "10:00"
}
```
**Allowed:** Anytime (creates new booking)  
**Response:** New booking created with same shop, employee, services

---

**5. Initiate Payment:**
```http
POST /api/v1/payments/initiate
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "bookingId": "..."
}
```
**Response:** Payment link generated

---

**6. Get Bookings:**
```http
GET /api/v1/bookings?type=upcoming&page=1&limit=10
Authorization: Bearer <customer_token>
```
**Query Params:**
- `type`: upcoming | past | cancelled
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response:** Paginated list of bookings

---

**7. Get Booking Details:**
```http
GET /api/v1/bookings/:id
Authorization: Bearer <customer_token>
```
**Response:** Detailed booking information

---

**8. Get Booking Confirmation:**
```http
GET /api/v1/bookings/:id/confirmation
Authorization: Bearer <customer_token>
```
**Response:** Booking confirmation details (after payment)

---

**9. Cancel Booking:**
```http
DELETE /api/v1/bookings/:id
Authorization: Bearer <customer_token>
```
**Allowed:** Before completion, >2h before appointment if paid  
**Response:** Booking cancelled, refund initiated if paid

---

**10. Toggle Favorite Shop:**
```http
PUT /api/v1/bookings/:id/favorite
Authorization: Bearer <customer_token>
```
**Response:** Shop marked as favorite/unfavorite

---

### Barber Operations

**1. Get Pending Confirmations:**
```http
GET /api/v1/bookings/pending-confirmations?page=1&limit=10
Authorization: Bearer <barber_token>
```
**Response:** Paginated list of bookings awaiting confirmation

---

**2. Confirm Booking:**
```http
PATCH /api/v1/bookings/:id/confirm
Authorization: Bearer <barber_token>
```
**Allowed:** Status AWAITING_CONFIRMATION, within 24h of payment  
**Response:** Booking confirmed

---

**3. Update Booking Status:**
```http
PUT /api/v1/bookings/:id/status
Authorization: Bearer <barber_token>
Content-Type: application/json

{
  "status": "completed"  // or "no-show"
}
```
**Allowed:** Status CONFIRMED only  
**Response:** Booking status updated

---

**4. Cancel Booking (Unpaid Only):**
```http
DELETE /api/v1/bookings/:id
Authorization: Bearer <barber_token>
```
**Allowed:** Status PENDING, payment PENDING only  
**Response:** Booking cancelled

---

**5. Get All Bookings:**
```http
GET /api/v1/bookings?page=1&limit=10
Authorization: Bearer <barber_token>
```
**Response:** Paginated list of all shop bookings

---

**6. Get Bookings by Status:**
```http
GET /api/v1/bookings/status?status=confirmed&page=1&limit=10
Authorization: Bearer <barber_token>
```
**Query Params:**
- `status`: pending | awaiting_confirmation | confirmed | completed | cancelled | no_show

**Response:** Paginated list of bookings with specified status

---

**7. Get Booking Statistics:**
```http
GET /api/v1/bookings/stats
Authorization: Bearer <barber_token>
```
**Response:** Booking statistics (counts, revenue, missed confirmations)

---

**8. Get Booking Details:**
```http
GET /api/v1/bookings/:id
Authorization: Bearer <barber_token>
```
**Response:** Detailed booking information for shop

---

**9. Get Milestone Progress:**
```http
GET /api/v1/bookings/progress?milestone=100
Authorization: Bearer <barber_token>
```
**Response:** Progress towards booking milestone

---

## Future Enhancements

### Enhancement 1: Barber Confirmation Reminders

**Triggers:**
- 12 hours after payment: Reminder notification
- 23 hours after payment: Urgent reminder

**Channels:** Push notification, Email, SMS (urgent)

**Benefits:** Reduces missed confirmations, improves response time

---

### Enhancement 2: Graduated Refund Policy

**Tiers:**
- >48 hours: 95% refund
- 24-48 hours: 80% refund
- 12-24 hours: 60% refund
- 2-12 hours: 40% refund
- <2 hours: 0% refund

**Benefits:** Encourages early cancellation, protects barber income, fair to both parties

---

### Enhancement 3: Missed Confirmation Rate Tracking

**Metrics:**
- Track barber confirmation rate
- Track customer cancellation rate
- Display reliability scores

**Actions:**
- Reward reliable barbers (featured placement)
- Penalize unreliable barbers (lower ranking)
- Show scores to customers

**Benefits:** Improves marketplace quality, incentivizes good behavior

---

### Enhancement 4: Deposit System

**Trigger:** Barber with high missed confirmation rate (>20%)

**Requirement:** Barber must provide deposit (₹500-1000), held by platform, released after 30 days of good behavior

**Benefits:** Deters unreliable behavior, protects platform from losses

---

## Summary

### Current Implementation

✅ Payment before confirmation  
✅ 24-hour auto-cancel with full refund  
✅ Customer cancellation with partial refund  
✅ Missed confirmation tracking  
✅ Slot management prevents double booking  
✅ No refund after service completion  

### Files Modified

**Code:**
- `server/src/models/booking.model.js` - Added `autoCancelledAt`
- `server/src/models/shop.model.js` - Added `missedConfirmationCount`, `lastMissedConfirmationAt`
- `server/src/services/booking.service.js` - Added `autoCancelAwaitingBookings()`
- `server/src/repositories/booking.repository.js` - Added `findAwaitingConfirmationExpired()`
- `server/src/jobs/auto-cancel-bookings.cron.js` - Created cron job
- `server/src/server.js` - Integrated cron job

---

**Document Status:** Complete  
**Implementation Status:** Auto-Cancel Enabled  
**Next Review:** After notification system implementation
