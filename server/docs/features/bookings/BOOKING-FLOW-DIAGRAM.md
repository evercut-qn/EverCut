# Booking Flow - Visual Diagrams

**Quick visual reference for understanding the complete booking flow**

---

## Complete End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER JOURNEY                             │
└─────────────────────────────────────────────────────────────────┘

1. DISCOVER SHOPS
   │
   ├─ GET /shops/nearby?lat=12.97&lon=77.59
   ├─ GET /shops/search?query=haircut
   └─ GET /shops/nearby/services?gender=male
   │
   ↓
   
2. SELECT SHOP
   │
   └─ GET /shops/:shopId
      Returns: Shop info, Services, Photos, Ratings
      ⚠️  MISSING: Employee list
   │
   ↓
   
3. VIEW EMPLOYEES (⚠️ GAP - No API)
   │
   └─ Should be: GET /shops/:shopId/employees
      Should return: Employee list with photos, names, ratings
   │
   ↓
   
4. CHECK AVAILABILITY
   │
   └─ GET /employees/:employeeId/calendar?date=2026-04-28
      Returns: Working hours, Booked slots, Blocked dates
      ⚠️  Frontend must calculate available slots
   │
   ↓
   
5. SELECT DATE & TIME
   │
   └─ Customer picks from available slots
      ⚠️  Race condition possible here
   │
   ↓
   
6. CREATE BOOKING
   │
   └─ POST /bookings
      {
        shopId, employeeId, serviceId,
        date, time
      }
      ✅ Atomic slot claim prevents double booking
   │
   ↓
   
7. PAY FOR BOOKING
   │
   └─ POST /payments/initiate
      Status: PENDING → AWAITING_CONFIRMATION
   │
   ↓
   
8. BARBER CONFIRMS (within 24h)
   │
   └─ PATCH /bookings/:id/confirm
      Status: AWAITING_CONFIRMATION → CONFIRMED
   │
   ↓
   
9. SERVICE DELIVERED
   │
   └─ PUT /bookings/:id/status {status: "completed"}
      Status: CONFIRMED → COMPLETED
   │
   ↓
   
10. PAYOUT TO BARBER
    │
    └─ Automated daily job
       Barber receives payment
```

---

## Availability Check Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              HOW AVAILABILITY IS DETERMINED                     │
└─────────────────────────────────────────────────────────────────┘

SHOP LEVEL
├─ openTime: "09:00"
├─ closeTime: "21:00"
├─ availableDays: ["Monday", "Tuesday", ...]
└─ isOpen: true/false

EMPLOYEE LEVEL
├─ workingHours: { start: "09:00", end: "18:00" }
├─ bookedSlots: [{ date: "2026-04-28", time: "10:00" }, ...]
├─ blockedDates: ["2026-04-30", ...]
└─ isActive: true/false

FRONTEND CALCULATION (⚠️ Current Implementation)
├─ 1. Generate all possible slots (shop hours ∩ employee hours)
├─ 2. Remove booked slots
├─ 3. Remove blocked dates
├─ 4. Remove past slots (if today)
└─ 5. Display available slots

BACKEND VALIDATION (At Booking Creation)
├─ 1. Check date/time is in future
├─ 2. Check shop is open
├─ 3. Check shop open on selected day
├─ 4. Check time within shop hours
├─ 5. ATOMIC SLOT CLAIM (prevents double booking)
└─ 6. If claim succeeds → Booking created
       If claim fails → Error returned
```

---

## Atomic Slot Claim (Critical Safety Mechanism)

```
┌─────────────────────────────────────────────────────────────────┐
│           ATOMIC SLOT CLAIM - PREVENTS DOUBLE BOOKING           │
└─────────────────────────────────────────────────────────────────┘

DATABASE OPERATION (Single Atomic Transaction)

Employee.findOneAndUpdate(
  {
    _id: employeeId,
    isActive: true,
    bookedSlots: {
      $not: { $elemMatch: { date, time } }  ← Slot NOT already taken
    },
    blockedDates: { $ne: date }  ← Date NOT blocked
  },
  {
    $push: { bookedSlots: { date, time } }  ← Add slot
  }
)

RESULT:
├─ SUCCESS: Slot was available, now claimed
│   └─ Booking created
│
└─ FAILURE: Slot was taken or date blocked
    └─ Error: "Employee not available"

WHY ATOMIC?
├─ Single database operation
├─ No race condition
├─ Either succeeds or fails completely
└─ No partial state possible
```

---

## Race Condition Scenario

```
┌─────────────────────────────────────────────────────────────────┐
│              RACE CONDITION (Current Issue)                     │
└─────────────────────────────────────────────────────────────────┘

TIME    CUSTOMER A                    CUSTOMER B
────────────────────────────────────────────────────────────────
10:00   Check calendar
        → 14:00 available ✅
        
10:01                                 Check calendar
                                      → 14:00 available ✅
        
10:02   Fill booking form
        (takes 2 minutes)
        
10:03                                 Fill booking form
                                      (takes 1 minute)
        
10:04   POST /bookings                
        → Atomic claim succeeds ✅
        → Booking created
        
10:05                                 POST /bookings
                                      → Atomic claim fails ❌
                                      → Error: "Not available"
                                      → Must check calendar again

PROBLEM: Customer B thought slot was available but it wasn't
MITIGATION: Atomic claim prevents double booking (data safe)
SOLUTION: Slot reservation system (better UX)
```

---

## Recommended Improved Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  IMPROVED FLOW (Recommended)                    │
└─────────────────────────────────────────────────────────────────┘

1. DISCOVER SHOPS
   └─ Same as current

2. SELECT SHOP
   └─ GET /shops/:shopId
      Returns: Shop info, Services, Photos, Ratings, EMPLOYEES ✅

3. SELECT EMPLOYEE
   └─ Customer sees all employees with photos, ratings
      ✅ No need to guess employee ID

4. CHECK AVAILABILITY
   └─ GET /employees/:employeeId/available-slots?date=2026-04-28&serviceId=service1
      Returns: Pre-calculated available slots ✅
      ✅ Backend handles all logic
      ✅ Considers service duration
      ✅ Consistent across platforms

5. SELECT SLOT
   └─ Customer picks from available slots

6. RESERVE SLOT (NEW)
   └─ POST /bookings/reserve
      Returns: reservationId, expiresIn: 300 seconds
      ✅ Slot held for 5 minutes
      ✅ Prevents race condition

7. CREATE BOOKING
   └─ POST /bookings { reservationId, ... }
      ✅ Uses reserved slot
      ✅ No race condition

8. PAY & CONTINUE
   └─ Same as current
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA FLOW                                    │
└─────────────────────────────────────────────────────────────────┘

SHOP
├─ shopName
├─ address
├─ openTime, closeTime
├─ availableDays
├─ isOpen
└─ location (lat, lon)

EMPLOYEE
├─ firstName, lastName
├─ photoUrl
├─ workingHours
├─ bookedSlots ← UPDATED ON BOOKING
├─ blockedDates
└─ isActive

SERVICE
├─ serviceName
├─ duration ← IMPORTANT FOR AVAILABILITY
├─ finalPrice
├─ serviceFor (male/female/unisex)
└─ serviceType (single/bundled)

BOOKING
├─ customerId
├─ shopId
├─ employeeId
├─ serviceIds
├─ date, time ← CLAIMED SLOT
├─ totalAmount
├─ status
├─ paymentStatus
└─ payoutStatus

FLOW:
Shop → Services → Employee → Available Slots → Booking → Payment
```

---

## Current vs Recommended

```
┌─────────────────────────────────────────────────────────────────┐
│              CURRENT vs RECOMMENDED                             │
└─────────────────────────────────────────────────────────────────┘

CURRENT FLOW:
✅ Works (no double bookings)
❌ Missing employee list API
❌ Frontend calculates availability
❌ Race condition window
❌ No slot reservation
❌ Service duration not considered

RECOMMENDED FLOW:
✅ Employee list API
✅ Backend calculates availability
✅ Slot reservation system
✅ Service duration considered
✅ Better user experience
✅ Consistent logic across platforms
```

---

## Summary

### Critical Components

1. **Atomic Slot Claim** - Prevents double booking (CURRENT)
2. **Employee List API** - Shows available employees (MISSING)
3. **Available Slots API** - Pre-calculated slots (MISSING)
4. **Slot Reservation** - Temporary hold (MISSING)

### Current State

The flow is **functionally correct** but has **UX gaps**:
- Data integrity: ✅ Protected by atomic operations
- User experience: ⚠️ Could be significantly improved

### Priority Fixes

1. Add employee list API (Week 1)
2. Add available slots API (Week 2)
3. Add slot reservation (Week 3)

---

**Document Status:** Complete  
**Purpose:** Visual reference for understanding booking flow
