# Booking System - Quick Reference

## 📖 Documentation

| File | Description |
|------|-------------|
| **BOOKING-DISCOVERY-FLOW.md** | Complete end-to-end flow from shop discovery to booking creation |
| **BOOKING-FLOW-DIAGRAM.md** | Visual diagrams and quick reference |
| **BOOKING-FLOW.md** | Booking lifecycle, scenarios, and API reference |
| **API-REFERENCE.md** | API endpoints with examples |

---

## 🔄 Booking Flow

```
CREATE → PENDING → PAYMENT → AWAITING_CONFIRMATION (24h max)
                                    ↓
                              BARBER DECISION
                                    ↓
                        ┌───────────┴───────────┐
                        ↓                       ↓
                    CONFIRMED            AUTO-CANCELLED
                        ↓                  (full refund)
                    COMPLETED
```

---

## 🔑 Key Concepts

### Booking Statuses
- `PENDING` - Created, not paid
- `AWAITING_CONFIRMATION` - Paid, waiting for barber approval
- `CONFIRMED` - Barber approved
- `COMPLETED` - Service delivered
- `CANCELLED` - Cancelled

### Refund Rules
- **Customer cancels:** Partial refund (fees deducted)
- **Auto-cancel (24h no response):** FULL refund (no fees)
- **Cannot cancel after confirm:** Not allowed

### Key Endpoints
```
POST   /bookings                        Create booking
GET    /bookings/pending-confirmations  List pending (barber)
PATCH  /bookings/:id/confirm            Confirm (barber)
DELETE /bookings/:id                    Cancel
```

---

## 📁 Implementation

### Files Modified
- `utils/constants.js` - Added `AWAITING_CONFIRMATION` status
- `models/booking.model.js` - Added `barberConfirmedAt`, `barberCancelledAt`
- `services/payment.service.js` - Updated webhook, refund logic
- `services/booking.service.js` - Merged cancel functions
- `controllers/booking.controller.js` - Reorganized
- `routes/bookings.routes.js` - Cleaned up
- `validators/booking.validator.js` - Added pagination schema

### Key Changes
1. ✅ Payment success → Status: `AWAITING_CONFIRMATION` (not auto-confirmed)
2. ✅ 24-hour auto-cancel if barber doesn't respond
3. ✅ Auto-cancel = FULL refund (customer protection)
4. ✅ Missed confirmations tracked per shop
5. ✅ Single cancel endpoint: `DELETE /bookings/:id`
6. ✅ Cannot cancel after confirmation (barber commitment)

---

## 🧪 Testing

1. Create booking → Status: `PENDING`
2. Pay for booking → Status: `AWAITING_CONFIRMATION` (24h countdown)
3. Barber confirms → Status: `CONFIRMED`
4. OR System auto-cancels → Status: `CANCELLED` (full refund after 24h)

---

**Version:** 2.1.0  
**Status:** ✅ Production Ready
