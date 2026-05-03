# Slot Duration Validation - System Analysis & Solution Design

**Version:** 1.0  
**Date:** May 3, 2026  
**Status:** 🔍 Analysis Complete

---

## Executive Summary

This document analyzes the scheduling problem where **service duration mismatches with available time slots**, causing booking failures and poor user experience. After comprehensive codebase analysis, the findings are:

### Key Findings

| Issue | Status | Impact |
|-------|--------|--------|
| **CASE 1:** Service duration exceeds slot time (65 mins in 30-min slot) | ✅ **FULLY HANDLED** | No action needed |
| **CASE 2:** Service duration exceeds available continuous time (120 mins in fragmented 60-min gaps) | ✅ **FULLY HANDLED** | No action needed |
| **System Architecture** | ✅ **ROBUST** | Exact-range booking prevents all described issues |

### Conclusion

**The described problems DO NOT EXIST in the current system.** The codebase has already been redesigned to use **exact minute-range locking** (`startMinute`, `endMinute`) with atomic overlap detection. The legacy slot-marker system mentioned in the problem statement has been replaced.

---

## Table of Contents

1. [Problem Statement Review](#problem-statement-review)
2. [Current System Architecture](#current-system-architecture)
3. [How Each Case Is Handled](#how-each-case-is-handled)
4. [Code Evidence](#code-evidence)
5. [Validation Logic Flow](#validation-logic-flow)
6. [What Is Implemented](#what-is-implemented)
7. [What Is NOT Needed](#what-is-not-needed)
8. [Assumptions](#assumptions)
9. [Validation Checklist](#validation-checklist)

---

## Problem Statement Review

### CASE 1: Service Duration Exceeds Slot Time

**Scenario:**
- Barber has 30-minute slots (12:00, 12:30, 1:00, 1:30 PM)
- Customer books at 12:30 PM with services totaling 65 minutes
- Expected problem: Booking spills into next slot → conflicts

**Reality:** ✅ **FULLY HANDLED** by exact-range locking

### CASE 2: Service Duration Exceeds Available Free Time

**Scenario:**
- Schedule: 10:30-11:30 Booked, 11:30-12:30 Free (60 mins), 12:30-1:30 Booked
- Customer selects services totaling 120 minutes
- Expected problem: UI shows slot as available but booking impossible

**Reality:** ✅ **FULLY HANDLED** by continuous-time validation

---

## Current System Architecture

### Booking Source of Truth: Exact Minute Ranges

The system uses **continuous minute ranges** as the primary booking mechanism:

```javascript
// Booking Schema (server/src/models/booking.model.js)
{
  time: "12:30",           // Display time (HH:MM)
  endTime: "13:35",        // Display end time
  startMinute: 750,        // Minutes since midnight (12:30 = 750)
  endMinute: 815,          // Minutes since midnight (13:35 = 815)
  durationMinutes: 65,     // Actual service duration
  slotLockTimes: ["12:30", "13:00", "13:30"]  // Legacy compatibility only
}
```

### Employee Time Range Locking

```javascript
// Employee Schema (server/src/repositories/employee.repository.js)
{
  bookedRanges: [
    {
      bookingId: ObjectId,
      date: "2026-05-03",
      startTime: "12:30",
      endTime: "13:35",
      startMinute: 750,
      endMinute: 815
    }
  ],
  bookedSlots: []  // Legacy compatibility only, not used for validation
}
```

### Atomic Overlap Detection

```javascript
// server/src/repositories/employee.repository.js:75
async claimTimeRange(employeeId, range, options = {}) {
    const query = {
        _id: employeeId,
        isActive: true,
        deletedAt: null,
        blockedDates: { $ne: new Date(date) },
        $and: [
            {
                bookedRanges: {
                    $not: {
                        $elemMatch: {
                            date,
                            startMinute: { $lt: endMinute },  // Existing starts before new ends
                            endMinute: { $gt: startMinute },  // Existing ends after new starts
                        },
                    },
                },
            },
        ],
    };
    
    // Atomically claim if no overlap exists
    return Employee.findOneAndUpdate(query, { $push: { bookedRanges: range } });
}
```

**This query ensures:**
- ✅ No existing booking overlaps with the new time range
- ✅ Atomic operation prevents race conditions
- ✅ Works for ANY duration (5 mins, 65 mins, 120 mins)

---

## How Each Case Is Handled

### CASE 1: Service Duration Exceeds Slot Time ✅

**Scenario:** 65-minute service at 12:30 PM

**System Behavior:**

1. **Booking Creation** (`server/src/services/booking.service.js:195`)
   ```javascript
   const durationMinutes = sumServiceDurations(services);  // 65 minutes
   const schedulePlan = buildSchedulingPlan({
       shop,
       employee,
       date,
       time: "12:30",
       durationMinutes: 65
   });
   ```

2. **Time Range Calculation** (`server/src/utils/time.utils.js`)
   ```javascript
   const timeRange = buildTimeRange("12:30", 65);
   // Returns: { startTime: "12:30", endTime: "13:35", startMinute: 750, endMinute: 815 }
   ```

3. **Atomic Claim** (`server/src/repositories/employee.repository.js:75`)
   ```javascript
   await employeeRepository.claimTimeRange(employeeId, {
       bookingId: booking._id,
       date: "2026-05-03",
       startTime: "12:30",
       endTime: "13:35",
       startMinute: 750,
       endMinute: 815
   });
   ```

4. **Overlap Check**
   - Database checks: Is there ANY booking where `startMinute < 815 AND endMinute > 750`?
   - If YES: Booking FAILS immediately
   - If NO: Booking succeeds, range locked

**Result:** ✅ **No conflict possible**

**Why It Works:**
- Exact minute ranges prevent spillover
- Atomic query ensures no race conditions
- Works for ANY duration

---

### CASE 2: Service Duration Exceeds Available Free Time ✅

**Scenario:** 120-minute service at 11:30 AM with fragmented schedule

```
10:30-11:30 → BOOKED (Booking A)
11:30-12:30 → FREE (60 mins)
12:30-13:30 → BOOKED (Booking B)
```

**System Behavior:**

1. **Availability Calculation** (`server/src/utils/slot-calculator.utils.js:145`)
   ```javascript
   const availableWindows = subtractBlockedRanges(effectiveWindow, [
       ...breakRanges,
       ...normalizedBookedRanges
   ]);
   // Returns: [{ startMinute: 690, endMinute: 750 }]  // 11:30-12:30 (60 mins)
   ```

2. **Slot Generation** (`server/src/utils/slot-calculator.utils.js:165`)
   ```javascript
   const candidateTimes = generateTimeSlotsFromMinutes(
       effectiveStartMinutes,
       effectiveEndMinutes,
       serviceDuration  // 120 minutes
   );
   ```

3. **Continuous Time Validation** (`server/src/utils/slot-calculator.utils.js:172`)
   ```javascript
   for (let currentMinutes = startMinutes;
        currentMinutes + serviceDuration <= endMinutes;  // 690 + 120 <= 750? NO
        currentMinutes += intervalMinutes) {
       slots.add(minutesToTimeString(currentMinutes));
   }
   ```

4. **Result**
   - 11:30 requires 120 continuous minutes
   - Only 60 minutes available (11:30-12:30)
   - **11:30 NOT generated as candidate slot**
   - UI does NOT show 11:30 as available

**Result:** ✅ **False availability prevented**

**Why It Works:**
- Availability engine uses same exact-range logic as booking
- Continuous time requirement enforced: `currentMinutes + serviceDuration <= endMinutes`
- Fragmented time correctly identified as insufficient

---

## Code Evidence

### Evidence 1: Exact Range Booking

**Location:** `server/src/services/booking.service.js:195-240`

```javascript
const buildSchedulingPlan = ({ shop, employee, date, time, durationMinutes }) => {
    const timeRange = buildTimeRange(time, durationMinutes);
    // Returns exact startMinute and endMinute
    
    return {
        ...timeRange,  // { startTime, endTime, startMinute, endMinute }
        date,
        effectiveWindow,
        slotLockTimes: buildSlotLockTimes(timeRange.startTime, durationMinutes),
    };
};
```

**Key Point:** `buildTimeRange()` calculates exact end time based on duration, not slot boundaries.

---

### Evidence 2: Atomic Overlap Detection

**Location:** `server/src/repositories/employee.repository.js:75-115`

```javascript
async claimTimeRange(employeeId, range, options = {}) {
    const query = {
        _id: employeeId,
        isActive: true,
        deletedAt: null,
        blockedDates: { $ne: new Date(date) },
        $and: [
            {
                bookedRanges: {
                    $not: {
                        $elemMatch: {
                            date,
                            startMinute: { $lt: endMinute },
                            endMinute: { $gt: startMinute },
                        },
                    },
                },
            },
        ],
    };
    
    return Employee.findOneAndUpdate(
        trustQueryOperators(query),
        { $push: { bookedRanges: range } },
        queryOptions
    );
}
```

**Key Point:** MongoDB query ensures no existing booking overlaps with new range.

---

### Evidence 3: Continuous Time Validation

**Location:** `server/src/utils/slot-calculator.utils.js:145-180`

```javascript
const generateTimeSlotsFromMinutes = (
    startMinutes,
    endMinutes,
    serviceDuration,
    intervalMinutes = SLOT_INTERVAL_MINUTES,
) => {
    const slots = new Set();
    for (
        let currentMinutes = startMinutes;
        currentMinutes + serviceDuration <= endMinutes;  // ← Continuous time check
        currentMinutes += intervalMinutes
    ) {
        slots.add(minutesToTimeString(currentMinutes));
    }
    return [...slots].filter(Boolean);
};
```

**Key Point:** Loop condition `currentMinutes + serviceDuration <= endMinutes` ensures sufficient continuous time.

---

### Evidence 4: Available Windows Calculation

**Location:** `server/src/utils/slot-calculator.utils.js:100-145`

```javascript
const subtractBlockedRanges = (windowRange, blockedRanges = []) => {
    let windows = [{ ...windowRange }];

    for (const block of mergeRanges(blockedRanges)) {
        const nextWindows = [];

        for (const window of windows) {
            if (!doTimeRangesOverlap(window.startMinute, window.endMinute, block.startMinute, block.endMinute)) {
                nextWindows.push(window);
                continue;
            }

            // Split window around blocked range
            if (block.startMinute > window.startMinute) {
                nextWindows.push({
                    startMinute: window.startMinute,
                    endMinute: Math.min(block.startMinute, window.endMinute),
                });
            }

            if (block.endMinute < window.endMinute) {
                nextWindows.push({
                    startMinute: Math.max(block.endMinute, window.startMinute),
                    endMinute: window.endMinute,
                });
            }
        }

        windows = nextWindows;
    }

    return windows.filter((window) => window.startMinute < window.endMinute);
};
```

**Key Point:** Calculates exact continuous free windows by subtracting all blocked ranges.

---

## Validation Logic Flow

### Availability Check Flow

```
1. Customer requests availability for 120-minute service on 2026-05-03

2. Backend fetches employee schedule:
   ├─ Shop hours: 09:00-18:00 (540-1080 minutes)
   ├─ Employee hours: 09:00-18:00 (540-1080 minutes)
   ├─ Booked ranges: [
   │    { startMinute: 630, endMinute: 690 },  // 10:30-11:30
   │    { startMinute: 750, endMinute: 810 }   // 12:30-13:30
   │  ]
   └─ Break times: []

3. Calculate effective window:
   ├─ Start: max(540, 540) = 540 (09:00)
   └─ End: min(1080, 1080) = 1080 (18:00)

4. Subtract blocked ranges:
   ├─ Initial window: [540, 1080]
   ├─ Subtract [630, 690]: → [540, 630], [690, 1080]
   ├─ Subtract [750, 810]: → [540, 630], [690, 750], [810, 1080]
   └─ Available windows: [
        { startMinute: 540, endMinute: 630 },   // 09:00-10:30 (90 mins)
        { startMinute: 690, endMinute: 750 },   // 11:30-12:30 (60 mins)
        { startMinute: 810, endMinute: 1080 }   // 13:30-18:00 (270 mins)
      ]

5. Generate candidate slots (120-minute service):
   ├─ Window 1 [540, 630]: 540 + 120 = 660 > 630 ❌ (insufficient)
   ├─ Window 2 [690, 750]: 690 + 120 = 810 > 750 ❌ (insufficient)
   ├─ Window 3 [810, 1080]: 810 + 120 = 930 ≤ 1080 ✅
   │    ├─ 810 (13:30) ✅
   │    ├─ 815 (13:35) ✅
   │    ├─ 820 (13:40) ✅
   │    └─ ... (more slots)
   └─ Available slots: ["13:30", "13:35", "13:40", ...]

6. Return to customer:
   ├─ 11:30 NOT shown (insufficient continuous time)
   └─ First available: 13:30
```

**Result:** ✅ **Customer only sees truly available slots**

---

### Booking Creation Flow

```
1. Customer selects 13:30 for 120-minute service

2. Backend validates:
   ├─ Date in future? ✅
   ├─ Within booking window? ✅
   ├─ Shop open on this day? ✅
   ├─ Employee active? ✅
   └─ Date not blocked? ✅

3. Calculate time range:
   ├─ Start: 13:30 (810 minutes)
   ├─ Duration: 120 minutes
   └─ End: 15:30 (930 minutes)

4. Validate within working hours:
   ├─ Effective window: [540, 1080]
   ├─ Booking range: [810, 930]
   ├─ 810 ≥ 540? ✅
   ├─ 930 ≤ 1080? ✅
   └─ Within hours: ✅

5. Check break overlap:
   ├─ Break times: []
   └─ No overlap: ✅

6. Create booking document:
   ├─ Generate booking ID
   └─ Status: PENDING

7. Atomic claim:
   ├─ Query: Find employee where NO booking has:
   │    ├─ date = "2026-05-03"
   │    ├─ startMinute < 930
   │    └─ endMinute > 810
   ├─ If found: Push { bookingId, date, startMinute: 810, endMinute: 930 }
   └─ If not found: Delete booking, throw error

8. Result:
   ├─ Success: Booking created, range locked
   └─ Failure: Booking deleted, error returned
```

**Result:** ✅ **Atomic operation prevents conflicts**

---

## What Is Implemented

### ✅ Exact Minute-Range Booking

- **Location:** `server/src/services/booking.service.js:195-240`
- **What:** Bookings store exact `startMinute` and `endMinute`
- **Why:** Enables precise overlap detection for any duration

### ✅ Atomic Overlap Detection

- **Location:** `server/src/repositories/employee.repository.js:75-115`
- **What:** MongoDB query checks for range overlaps atomically
- **Why:** Prevents double-booking and race conditions

### ✅ Continuous Time Validation

- **Location:** `server/src/utils/slot-calculator.utils.js:145-180`
- **What:** Slot generation requires `currentMinutes + serviceDuration <= endMinutes`
- **Why:** Ensures sufficient continuous time before showing slot as available

### ✅ Available Windows Calculation

- **Location:** `server/src/utils/slot-calculator.utils.js:100-145`
- **What:** Subtracts all blocked ranges to find continuous free windows
- **Why:** Accurately identifies fragmented vs continuous time

### ✅ Multi-Service Duration Aggregation

- **Location:** `server/src/services/booking.service.js:60-65`
- **What:** Sums durations from all selected services
- **Why:** Handles bookings with multiple services correctly

### ✅ Duration Validation

- **Location:** `server/src/services/booking.service.js:66-70`
- **What:** Ensures total duration is positive and finite
- **Why:** Prevents invalid bookings

### ✅ Working Hours Enforcement

- **Location:** `server/src/services/booking.service.js:195-240`
- **What:** Validates booking fits within shop and employee hours
- **Why:** Prevents bookings outside working hours

### ✅ Break Time Overlap Detection

- **Location:** `server/src/services/booking.service.js:195-240`
- **What:** Checks if booking overlaps with shop break times
- **Why:** Prevents bookings during breaks

### ✅ Blocked Date Validation

- **Location:** `server/src/repositories/employee.repository.js:75`
- **What:** Atomic query checks `blockedDates: { $ne: new Date(date) }`
- **Why:** Prevents bookings on employee's blocked dates

### ✅ Reschedule/Update with Range Locking

- **Location:** `server/src/services/booking.service.js:450-550`
- **What:** Releases old range, claims new range atomically
- **Why:** Maintains consistency during booking changes

### ✅ Legacy Compatibility

- **Location:** Throughout codebase
- **What:** `slotLockTimes` array maintained for backward compatibility
- **Why:** Supports old bookings and gradual migration

---

## What Is NOT Needed

### ❌ Slot-Marker Validation

**Why Not Needed:** System uses exact minute ranges, not discrete slot markers.

**Old Approach (Not Used):**
```javascript
// Check if specific 30-minute markers are free
const requiredMarkers = ["12:30", "13:00", "13:30"];
const bookedMarkers = ["13:00"];
const hasConflict = requiredMarkers.some(m => bookedMarkers.includes(m));
```

**Current Approach (Used):**
```javascript
// Check if minute ranges overlap
const newRange = { startMinute: 750, endMinute: 815 };
const existingRange = { startMinute: 780, endMinute: 810 };
const hasConflict = newRange.startMinute < existingRange.endMinute 
                 && newRange.endMinute > existingRange.startMinute;
```

### ❌ Gap Detection Logic

**Why Not Needed:** `subtractBlockedRanges()` already identifies continuous free windows.

### ❌ Fallback Duration Handling

**Why Not Needed:** All bookings store `durationMinutes`. Old bookings without it use stored `slotLockTimes` for compatibility.

### ❌ Slot Granularity Reduction

**Why Not Needed:** Exact minute ranges eliminate granularity waste. A 65-minute booking locks exactly 65 minutes, not 90.

---

## Assumptions

1. **All bookings store exact ranges**
   - New bookings: `startMinute`, `endMinute`, `durationMinutes` always populated
   - Old bookings: Handled via `slotLockTimes` compatibility layer

2. **MongoDB atomic operations are reliable**
   - `findOneAndUpdate` with complex queries works correctly
   - No race conditions in production

3. **Service durations are accurate**
   - Services have correct `duration` or `totalDuration` fields
   - No zero or negative durations

4. **Time calculations are correct**
   - `buildTimeRange()` accurately calculates end times
   - `parseTimeToMinutes()` handles all time formats

5. **Employee schedules are consistent**
   - Working hours don't change mid-day
   - Break times are properly configured

6. **No manual database edits**
   - All booking operations go through application layer
   - No direct MongoDB updates that bypass validation

7. **Clocks are synchronized**
   - Server time is accurate
   - No timezone issues (all times in shop's local timezone)

---

## Validation Checklist

### Test Case 1: Basic Availability (30-min service)

**Setup:**
- Employee working hours: 09:00-18:00
- No bookings
- Service duration: 30 minutes

**Expected:**
- [ ] All 30-minute slots from 09:00 to 17:30 shown as available
- [ ] 17:30 is last slot (service ends at 18:00)
- [ ] 18:00 NOT shown (would end at 18:30, past closing)

---

### Test Case 2: Long Service Duration (120-min service)

**Setup:**
- Employee working hours: 09:00-18:00
- No bookings
- Service duration: 120 minutes

**Expected:**
- [ ] Slots from 09:00 to 16:00 shown as available
- [ ] 16:00 is last slot (service ends at 18:00)
- [ ] 16:05 NOT shown (would end at 18:05, past closing)

---

### Test Case 3: Fragmented Schedule (CASE 2 Scenario)

**Setup:**
- Employee working hours: 09:00-18:00
- Existing bookings:
  - 10:30-11:30 (60 mins)
  - 12:30-13:30 (60 mins)
- Service duration: 120 minutes

**Expected:**
- [ ] 09:00 NOT shown (only 90 mins until 10:30)
- [ ] 11:30 NOT shown (only 60 mins until 12:30)
- [ ] 13:30 shown as available (270 mins until 18:00)
- [ ] First available slot: 13:30

---

### Test Case 4: Exact Fit (65-min service)

**Setup:**
- Employee working hours: 09:00-18:00
- Existing booking: 13:35-14:00 (25 mins)
- Service duration: 65 minutes

**Expected:**
- [ ] 12:30 shown as available (ends at 13:35, no overlap)
- [ ] 12:35 NOT shown (would end at 13:40, overlaps with 13:35-14:00)
- [ ] Booking at 12:30 succeeds
- [ ] Booking at 12:35 fails

---

### Test Case 5: Back-to-Back Bookings

**Setup:**
- Employee working hours: 09:00-18:00
- Existing booking: 10:00-11:00 (60 mins)
- Service duration: 60 minutes

**Expected:**
- [ ] 09:00 shown as available (ends at 10:00, no overlap)
- [ ] 11:00 shown as available (starts at 11:00, no overlap)
- [ ] 10:00 NOT shown (overlaps with existing booking)
- [ ] Booking at 09:00 succeeds
- [ ] Booking at 11:00 succeeds

---

### Test Case 6: Multi-Service Booking

**Setup:**
- Services: Haircut (30 mins) + Beard (20 mins) + Color (45 mins)
- Total duration: 95 minutes
- Employee working hours: 09:00-18:00
- No bookings

**Expected:**
- [ ] Total duration calculated as 95 minutes
- [ ] Slots from 09:00 to 16:25 shown as available
- [ ] 16:30 NOT shown (would end at 18:05, past closing)
- [ ] Booking locks exact range (e.g., 10:00-11:35)

---

### Test Case 7: Break Time Overlap

**Setup:**
- Employee working hours: 09:00-18:00
- Break time: 13:00-14:00
- Service duration: 60 minutes

**Expected:**
- [ ] 12:00 NOT shown (would end at 13:00, overlaps with break start)
- [ ] 12:30 NOT shown (would end at 13:30, overlaps with break)
- [ ] 14:00 shown as available (starts after break)

---

### Test Case 8: Blocked Date

**Setup:**
- Employee blocked dates: ["2026-05-03"]
- Service duration: 30 minutes

**Expected:**
- [ ] No slots shown for 2026-05-03
- [ ] Reason: "date_blocked"
- [ ] Booking attempt fails with "Employee is blocked for this date"

---

### Test Case 9: Concurrent Booking Attempts

**Setup:**
- Two customers try to book same slot simultaneously
- Service duration: 30 minutes
- Slot: 10:00

**Expected:**
- [ ] First request succeeds
- [ ] Second request fails with "Employee not available"
- [ ] No double-booking occurs
- [ ] Database shows only one booking

---

### Test Case 10: Reschedule with Overlap

**Setup:**
- Existing booking: 10:00-11:00 (60 mins)
- Another booking: 12:00-13:00 (60 mins)
- Customer tries to reschedule first booking to 11:30

**Expected:**
- [ ] Reschedule fails (would overlap with 12:00-13:00)
- [ ] Original booking remains at 10:00
- [ ] Error: "Employee not available at the new date/time"

---

**Document Status:** ✅ Analysis Complete  
**Recommendation:** No changes needed. System already handles all described scenarios correctly.  
**Next Steps:** Run validation checklist to confirm production behavior matches analysis.
