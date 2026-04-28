# Complete Booking Discovery & Creation Flow

**Version:** 1.0  
**Last Updated:** April 28, 2026  
**Purpose:** End-to-end explanation of how customers discover shops and create bookings

---

## Table of Contents

1. [Overview](#overview)
2. [Complete Customer Journey](#complete-customer-journey)
3. [Step-by-Step Flow](#step-by-step-flow)
4. [Availability Management](#availability-management)
5. [Validation at Each Step](#validation-at-each-step)
6. [Potential Issues & Gaps](#potential-issues--gaps)
7. [Recommendations](#recommendations)

---

## Overview

### The Complete Flow

```
1. DISCOVER SHOPS
   ↓
2. SELECT SHOP
   ↓
3. VIEW SERVICES
   ↓
4. SELECT SERVICE(S)
   ↓
5. VIEW EMPLOYEES
   ↓
6. SELECT EMPLOYEE
   ↓
7. CHECK AVAILABILITY (Calendar)
   ↓
8. SELECT DATE & TIME
   ↓
9. CREATE BOOKING (Atomic Slot Claim)
   ↓
10. PAY FOR BOOKING
```

---

## Complete Customer Journey

### Phase 1: Shop Discovery

**Customer starts with location:**

```
Customer provides: Latitude, Longitude
```

**Available Discovery Methods:**

1. **Nearby Shops**
   ```http
   GET /api/v1/shops/nearby?latitude=12.9716&longitude=77.5946
   ```
   - Returns shops within 2km radius
   - Sorted by distance
   - Shows: Shop name, address, rating, distance

2. **Search Shops**
   ```http
   GET /api/v1/shops/search?query=haircut
   ```
   - Text search across shop names and services
   - Returns matching shops

3. **Nearby Services by Gender**
   ```http
   GET /api/v1/shops/nearby/services?latitude=12.9716&longitude=77.5946&gender=male
   ```
   - Returns services available nearby filtered by gender
   - Useful for service-first discovery

4. **Doorstep Services**
   ```http
   GET /api/v1/shops/doorstep
   ```
   - Returns shops offering home service

---

### Phase 2: Shop Details

**Customer selects a shop:**

```http
GET /api/v1/shops/:shopId
```

**Response includes:**
```json
{
  "shop": {
    "shopName": "Elite Salon",
    "address": "...",
    "openTime": "09:00",
    "closeTime": "21:00",
    "availableDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    "isOpen": true,
    "rating": 4.5,
    "totalRatings": 120
  },
  "services": {
    "single": [
      {
        "serviceName": "Haircut",
        "duration": 30,
        "finalPrice": 300,
        "actualPrice": 350,
        "offerPrice": 50,
        "serviceFor": "male"
      }
    ],
    "bundled": [
      {
        "serviceName": "Haircut + Shave",
        "bundledServices": ["serviceId1", "serviceId2"],
        "totalDuration": 45,
        "finalPrice": 500
      }
    ]
  },
  "photos": [...],
  "ratings": {...}
}
```

**What customer sees:**
- Shop information
- All available services with prices
- Photos
- Ratings and reviews
- **BUT NO EMPLOYEES YET** ⚠️

---

### Phase 3: Employee Selection

**Problem:** Shop details API doesn't return employees!

**Current Gap:** Customer cannot see employees at this stage.

**Expected Flow (Missing):**
```http
GET /api/v1/shops/:shopId/employees
```

**Should return:**
```json
{
  "employees": [
    {
      "id": "emp1",
      "firstName": "John",
      "lastName": "Doe",
      "photoUrl": "...",
      "gender": "male",
      "workingHours": {
        "start": "09:00",
        "end": "18:00"
      }
    }
  ]
}
```

**Current Workaround:** Customer must somehow know employee ID to check calendar.

---

### Phase 4: Check Employee Availability

**Customer checks employee calendar:**

```http
GET /api/v1/employees/:employeeId/calendar?date=2026-04-28
```

**Response:**
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
    { "date": "2026-04-28", "time": "10:00", "bookingId": "..." },
    { "date": "2026-04-28", "time": "11:00", "bookingId": "..." }
  ]
}
```

**What customer sees:**
- Employee's working hours
- Blocked dates (employee on leave)
- Already booked time slots
- **Customer must calculate available slots on frontend** ⚠️

---

### Phase 5: Create Booking

**Customer selects available slot and creates booking:**

```http
POST /api/v1/bookings
{
  "shopId": "shop1",
  "employeeId": "emp1",
  "serviceId": "service1",  // or ["service1", "service2"] for bundle
  "date": "2026-04-28",
  "time": "14:00"
}
```

**Backend Validation (in order):**

1. ✅ **Customer exists**
2. ✅ **Date/time is in future**
3. ✅ **Shop exists and is open**
4. ✅ **Shop is open on selected day** (availableDays check)
5. ✅ **Time is within shop hours** (openTime - closeTime)
6. ✅ **Services exist and belong to shop**
7. ✅ **Atomic slot claim** (most critical)

**Atomic Slot Claim:**
```javascript
// Database operation (atomic)
Employee.findOneAndUpdate(
  {
    _id: employeeId,
    isActive: true,
    bookedSlots: { $not: { $elemMatch: { date, time } } },  // Slot not taken
    blockedDates: { $ne: date }  // Date not blocked
  },
  {
    $push: { bookedSlots: { date, time } }  // Claim slot
  }
)
```

**If slot claim succeeds:**
- Booking created with status PENDING
- Slot added to employee's bookedSlots array
- Customer receives booking confirmation

**If slot claim fails:**
- Returns null
- Error: "Employee not available at this date/time"
- No booking created

---

## Availability Management

### How Availability is Stored

**Shop Level:**
```javascript
{
  openTime: "09:00",
  closeTime: "21:00",
  availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  isOpen: true  // Can be toggled by barber
}
```

**Employee Level:**
```javascript
{
  workingHours: {
    start: "09:00",
    end: "18:00"
  },
  bookedSlots: [
    { date: "2026-04-28", time: "10:00" },
    { date: "2026-04-28", time: "11:00" }
  ],
  blockedDates: [
    "2026-04-30",  // Employee on leave
    "2026-05-01"
  ],
  isActive: true
}
```

### How Availability is Calculated

**Available slots = All possible slots - Booked slots - Blocked dates**

**Frontend Responsibility:**
1. Get employee calendar (working hours + booked slots + blocked dates)
2. Generate all possible time slots based on:
   - Shop open/close time
   - Employee working hours
   - Service duration
3. Remove booked slots
4. Remove slots on blocked dates
5. Remove past slots (if today)
6. Display available slots to customer

**Example Calculation:**
```
Shop hours: 09:00 - 21:00
Employee hours: 09:00 - 18:00
Service duration: 30 minutes
Date: 2026-04-28

Possible slots: 09:00, 09:30, 10:00, 10:30, ..., 17:30
Booked slots: 10:00, 11:00
Available slots: 09:00, 09:30, 10:30, 11:30, ..., 17:30
```

---

## Validation at Each Step

### Step 1: Shop Discovery
✅ **Validated:** Location-based search  
✅ **Validated:** Shop is active  
❌ **Not Validated:** Shop availability for specific date

### Step 2: Shop Details
✅ **Validated:** Shop exists  
✅ **Validated:** Services exist  
❌ **Not Validated:** Employee availability  
❌ **Not Validated:** Employees not returned

### Step 3: Employee Selection
❌ **Missing:** No API to list shop employees  
❌ **Gap:** Customer cannot see employee options

### Step 4: Calendar Check
✅ **Validated:** Employee exists  
✅ **Validated:** Date is not in past  
✅ **Returns:** Working hours, booked slots, blocked dates  
❌ **Not Validated:** Slot availability (frontend calculates)

### Step 5: Booking Creation
✅ **Validated:** Customer exists  
✅ **Validated:** Date/time in future  
✅ **Validated:** Shop exists and is open  
✅ **Validated:** Shop open on selected day  
✅ **Validated:** Time within shop hours  
✅ **Validated:** Services exist and belong to shop  
✅ **Validated:** Atomic slot claim (prevents double booking)  
✅ **Rollback:** If booking creation fails, slot is released

---

## Potential Issues & Gaps

### 🔴 Critical Issues

#### Issue 1: No Employee List API
**Problem:** Customer cannot see available employees for a shop.

**Current State:**
- Shop details API returns services but not employees
- Customer must somehow know employee ID to check calendar

**Impact:**
- Poor user experience
- Customer cannot choose preferred employee
- Cannot see employee photos, names, ratings

**Solution Needed:**
```http
GET /api/v1/shops/:shopId/employees
```

---

#### Issue 2: Race Condition Window
**Problem:** Time gap between calendar check and booking creation.

**Scenario:**
```
Time 10:00:00 - Customer A checks calendar, sees 14:00 available
Time 10:00:01 - Customer B checks calendar, sees 14:00 available
Time 10:00:02 - Customer A creates booking for 14:00 → SUCCESS
Time 10:00:03 - Customer B creates booking for 14:00 → FAILS
```

**Current Mitigation:**
- Atomic slot claim prevents double booking
- Second customer gets error: "Employee not available"

**Impact:**
- Customer B has poor experience (thought slot was available)
- Customer B must go back and check calendar again

**Better Solution:**
- Optimistic locking with version numbers
- Real-time availability updates (WebSocket)
- Temporary slot reservation (5-minute hold)

---

#### Issue 3: Frontend Calculates Availability
**Problem:** Complex availability logic on frontend.

**Current State:**
- Frontend receives: working hours, booked slots, blocked dates
- Frontend must calculate available slots
- Logic duplicated across platforms (web, mobile)

**Issues:**
- Inconsistent availability calculation
- Service duration not considered in calendar API
- Timezone handling complexity
- Different slot intervals (30min, 60min) not standardized

**Better Solution:**
```http
GET /api/v1/employees/:employeeId/available-slots?date=2026-04-28&serviceId=service1
```

**Should return:**
```json
{
  "date": "2026-04-28",
  "availableSlots": [
    { "time": "09:00", "available": true },
    { "time": "09:30", "available": true },
    { "time": "10:00", "available": false },
    { "time": "10:30", "available": true }
  ]
}
```

---

### 🟡 Medium Issues

#### Issue 4: No Service Duration in Calendar
**Problem:** Calendar API doesn't consider service duration.

**Scenario:**
- Service duration: 60 minutes
- Booked slot: 10:00
- Available slots shown: 10:30 (but should be blocked until 11:00)

**Impact:**
- Customer might select 10:30, but booking fails
- Confusing user experience

**Solution:**
- Include service duration in availability calculation
- Block consecutive slots based on service duration

---

#### Issue 5: No Multi-Employee Availability
**Problem:** Cannot check availability across all employees.

**Current State:**
- Must check each employee individually
- Cannot find "first available employee"

**Better Solution:**
```http
GET /api/v1/shops/:shopId/availability?date=2026-04-28&serviceId=service1
```

**Should return:**
```json
{
  "date": "2026-04-28",
  "employees": [
    {
      "employeeId": "emp1",
      "name": "John Doe",
      "availableSlots": ["09:00", "09:30", "10:30"]
    },
    {
      "employeeId": "emp2",
      "name": "Jane Smith",
      "availableSlots": ["10:00", "11:00", "14:00"]
    }
  ]
}
```

---

#### Issue 6: No Slot Reservation
**Problem:** No way to temporarily hold a slot while customer completes booking.

**Scenario:**
```
1. Customer checks calendar → 14:00 available
2. Customer fills booking form (2 minutes)
3. Another customer books 14:00
4. First customer submits → FAILS
```

**Better Solution:**
- Temporary slot reservation (5-minute hold)
- Reservation expires if not confirmed
- Prevents race conditions

---

### 🟢 Minor Issues

#### Issue 7: No Bulk Date Availability
**Problem:** Cannot check availability for multiple dates at once.

**Current State:**
- Must make separate API call for each date
- Slow for calendar view (showing full month)

**Better Solution:**
```http
GET /api/v1/employees/:employeeId/calendar?startDate=2026-04-01&endDate=2026-04-30
```

---

#### Issue 8: No Employee Ratings
**Problem:** Cannot see employee-specific ratings.

**Current State:**
- Only shop-level ratings available
- Cannot choose employee based on their performance

**Better Solution:**
- Track ratings per employee
- Show employee ratings in employee list

---

## Recommendations

### Priority 1: Critical Fixes (Implement Immediately)

#### 1. Add Employee List API
```http
GET /api/v1/shops/:shopId/employees
```

**Returns:**
```json
{
  "employees": [
    {
      "id": "emp1",
      "firstName": "John",
      "lastName": "Doe",
      "photoUrl": "...",
      "gender": "male",
      "workingHours": { "start": "09:00", "end": "18:00" },
      "rating": 4.8,
      "totalBookings": 150
    }
  ]
}
```

**Implementation:**
- Add route: `GET /shops/:id/employees`
- Return active employees only
- Include basic info (no sensitive data)
- Filter by gender if needed

---

#### 2. Add Available Slots API
```http
GET /api/v1/employees/:employeeId/available-slots?date=2026-04-28&serviceId=service1
```

**Returns:**
```json
{
  "date": "2026-04-28",
  "serviceDuration": 30,
  "slots": [
    { "time": "09:00", "available": true },
    { "time": "09:30", "available": true },
    { "time": "10:00", "available": false, "reason": "booked" },
    { "time": "10:30", "available": false, "reason": "blocked_by_previous" },
    { "time": "11:00", "available": true }
  ]
}
```

**Benefits:**
- Centralized availability logic
- Considers service duration
- Consistent across platforms
- Easier to maintain

---

### Priority 2: Important Improvements (Implement Soon)

#### 3. Add Shop-Wide Availability API
```http
GET /api/v1/shops/:shopId/availability?date=2026-04-28&serviceId=service1
```

**Returns availability across all employees.**

---

#### 4. Add Slot Reservation System
```http
POST /api/v1/bookings/reserve
{
  "employeeId": "emp1",
  "date": "2026-04-28",
  "time": "14:00",
  "serviceId": "service1"
}
```

**Response:**
```json
{
  "reservationId": "res123",
  "expiresAt": "2026-04-28T10:05:00Z",
  "expiresIn": 300  // seconds
}
```

**Then create booking:**
```http
POST /api/v1/bookings
{
  "reservationId": "res123",
  ...
}
```

---

### Priority 3: Nice to Have (Future)

#### 5. Real-time Availability Updates
- WebSocket connection
- Push updates when slots are booked
- Update calendar in real-time

#### 6. Smart Scheduling
- Suggest best available times
- "Next available" feature
- Multi-day availability view

#### 7. Employee Preferences
- Customer can save favorite employees
- Auto-suggest preferred employee

---

## Summary

### Current Flow Works But Has Gaps

✅ **What Works:**
- Atomic slot claiming prevents double booking
- Shop and service discovery is functional
- Calendar API provides necessary data
- Validation is comprehensive at booking creation

❌ **What's Missing:**
- No employee list API (critical gap)
- Frontend calculates availability (should be backend)
- Race condition window (mitigated but not eliminated)
- No slot reservation system
- No service duration consideration in calendar

### Recommended Implementation Order

1. **Week 1:** Add employee list API
2. **Week 2:** Add available slots API (with service duration)
3. **Week 3:** Add shop-wide availability API
4. **Week 4:** Add slot reservation system
5. **Future:** Real-time updates, smart scheduling

### Current Flow is Functional But Not Optimal

The current implementation **prevents data corruption** (no double bookings) but provides **suboptimal user experience** (race conditions, missing employee list, complex frontend logic).

The atomic slot claim is the safety net that makes the current flow work, but the recommended improvements would significantly enhance the user experience.

---

**Document Status:** Complete  
**Next Steps:** Review with team and prioritize improvements
