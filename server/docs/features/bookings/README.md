# Booking System - Quick Reference

## 📖 Documentation

| File | Description |
|------|-------------|
| **BOOKING-FLOW.md** | Booking lifecycle and status flow |
| **API-REFERENCE.md** | API endpoints with examples |

---

## 🔄 Booking Flow

```
CREATE → PENDING → PAYMENT → AWAITING_CONFIRMATION
                                    ↓
                              BARBER DECISION
                                    ↓
                        ┌───────────┴───────────┐
                        ↓                       ↓
                    CONFIRMED               CANCELLED
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
- **Barber cancels (before confirm):** FULL refund (no fees)
- **Barber cancels (after confirm):** Not allowed

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
2. ✅ Barber can confirm or cancel paid bookings
3. ✅ Barber cancellation = FULL refund (customer protection)
4. ✅ Single cancel endpoint: `DELETE /bookings/:id`
5. ✅ Cannot cancel after confirmation (barber commitment)

---

## 🧪 Testing

1. Create booking → Status: `PENDING`
2. Pay for booking → Status: `AWAITING_CONFIRMATION`
3. Barber confirms → Status: `CONFIRMED`
4. OR Barber cancels → Status: `CANCELLED` (full refund)

---

**Version:** 2.1.0  
**Status:** ✅ Production Ready
