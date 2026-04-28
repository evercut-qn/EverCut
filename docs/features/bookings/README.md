# Booking System - Quick Reference

## 📖 Documentation Structure

### 🎯 Core Documentation (Start Here)

| File | Description | Audience |
|------|-------------|----------|
| **BOOKING-FLOW.md** | Complete booking lifecycle, scenarios, and business rules | All developers |
| **API-REFERENCE.md** | Quick API endpoint reference with examples | All developers |
| **COMPLETE-BOOKING-API-FLOW.md** | Detailed API guide with request/response examples | All developers |

### 📱 Feature-Specific Guides

| File | Description | Audience |
|------|-------------|----------|
| **MULTI-SERVICE-BOOKING-GUIDE.md** | Multi-service booking examples and validation rules | All developers |
| **BOOKING-DISCOVERY-FLOW.md** | Shop discovery and search flow | All developers |
| **FLUTTER-IMPLEMENTATION-GUIDE.md** | Flutter code examples and best practices | Flutter team |

### 📦 Historical Documentation

Completed implementation plans, analysis reports, and superseded documentation are archived in the `archive/` folder for reference. See `archive/README.md` for details.

---

## 🔄 Complete Booking Flow

### Discovery Phase (NEW)
```
1. Browse Shops → GET /api/v1/shops/nearby
2. View Shop → GET /api/v1/shops/:id
3. View Employees → GET /api/v1/shops/:id/employees
4. Check Availability (choose one):
   Option A: GET /api/v1/employees/:id/available-slots?date=YYYY-MM-DD&serviceId=X
   Option B: GET /api/v1/shops/:id/availability?date=YYYY-MM-DD&serviceId=X
5. Select Available Slot
```

### Booking Phase
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

### Discovery Endpoints
```
GET /api/v1/shops/:id/employees                    List employees (public)
GET /api/v1/employees/:id/available-slots          Employee availability (auth required)
GET /api/v1/shops/:id/availability                 Shop-wide availability (auth required)
```

**Note:** These routes are correctly placed in their respective resource files:
- Employee list under `/shops` (employees are a sub-resource of shops)
- Employee slots under `/employees` (employee-specific operation)
- Shop availability under `/shops` (shop-level aggregation)

### Booking Endpoints
```
POST   /api/v1/bookings                        Create booking
GET    /api/v1/bookings/pending-confirmations  List pending (barber)
PATCH  /api/v1/bookings/:id/confirm            Confirm (barber)
POST   /api/v1/bookings/:id/cancel             Cancel
```

---

## 📁 Implementation

### Files Created (NEW)
- `utils/slot-calculator.utils.js` - Slot calculation utility

### Files Modified
- `utils/constants.js` - Added `AWAITING_CONFIRMATION` status
- `models/booking.model.js` - Added `barberConfirmedAt`, `barberCancelledAt`, `autoCancelledAt`
- `models/shop.model.js` - Added `missedConfirmationCount`, `lastMissedConfirmationAt`
- `services/payment.service.js` - Updated webhook, refund logic
- `services/booking.service.js` - Merged cancel functions, added availability APIs
- `services/shop.service.js` - Added `getEmployeesByShopId()`
- `controllers/booking.controller.js` - Reorganized
- `controllers/shop.controller.js` - Added `getShopEmployees()`, `getShopAvailability()`
- `controllers/employee.controller.js` - Added `getAvailableSlots()`
- `routes/bookings.routes.js` - Cleaned up
- `routes/shops.routes.js` - Added employee list and availability routes
- `routes/employees.routes.js` - Added available slots route
- `validators/booking.validator.js` - Added pagination schema
- `validators/shop.validator.js` - Added `shopAvailabilityQuerySchema`
- `validators/employee.validator.js` - Added `availableSlotsQuerySchema`
- `jobs/auto-cancel-bookings.cron.js` - Auto-cancel cron job
- `server.js` - Integrated cron job

### Key Changes
1. ✅ Payment success → Status: `AWAITING_CONFIRMATION` (not auto-confirmed)
2. ✅ 24-hour auto-cancel if barber doesn't respond
3. ✅ Auto-cancel = FULL refund (customer protection)
4. ✅ Missed confirmations tracked per shop
5. ✅ Single cancel endpoint: `DELETE /bookings/:id`
6. ✅ Cannot cancel after confirmation (barber commitment)
7. ✅ NEW: Employee list API for shop discovery
8. ✅ NEW: Available slots API with service duration consideration
9. ✅ NEW: Shop-wide availability API
10. ✅ NEW: Slot calculator utility for backend availability calculation

---

## 🧪 Testing

### Discovery Flow (NEW)
1. Get shop employees → `GET /shops/:id/employees`
2. Check availability → `GET /employees/:id/available-slots?date=2026-04-28&serviceId=service1`
3. Verify slots consider service duration
4. Verify blocked dates work
5. Verify past slots filtered (today)

### Booking Flow
1. Create booking → Status: `PENDING`
2. Pay for booking → Status: `AWAITING_CONFIRMATION` (24h countdown)
3. Barber confirms → Status: `CONFIRMED`
4. OR System auto-cancels → Status: `CANCELLED` (full refund after 24h)

---

**Version:** 3.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** April 28, 2026
