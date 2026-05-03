# EverCut Booking System — Architecture Analysis & Redesign

**Version:** 1.0 | **Date:** May 3, 2026 | **Scope:** End-to-end booking flow

---

## Implementation Status - May 3, 2026

The production code has moved beyond the redesign proposed in this analysis. The implemented architecture is an exact time-range engine:

- Core model: exact `[startMinute, endMinute)` ranges on `Employee.bookedRanges[]`.
- Availability: derives `availableWindows[]` and `slots[]` from the same range-overlap logic used by booking creation.
- Booking: computes aggregate service duration, exact `endTime`, and atomically claims the employee range before persistence.
- Conflict prevention: MongoDB single-document `findOneAndUpdate` rejects overlaps under concurrency; optional `idempotencyKey` protects client retries.
- Time handling: shop hours, employee hours, shop breaks, blocked dates, past times, 7-day window, and end boundaries are validated before claim.

The rest of this file remains useful for understanding the old system's issues.

---

## 1. Executive Summary

The EverCut booking system is a **slot-marker-based** scheduling engine for a salon marketplace. It handles multi-service bookings, atomic slot claiming via MongoDB `findOneAndUpdate`, a payment-gated confirmation flow, and auto-cancellation. After analyzing every file in the booking path, I identified **3 critical**, **4 major**, and **3 moderate** issues. The most dangerous is the **availability ↔ booking logic divergence**: the availability API uses time-range overlap checks while the booking engine uses discrete slot-marker claiming — leading to false availability and failed bookings at payment time.

> [!CAUTION]
> The existing `SLOT-DURATION-MISMATCH-ANALYSIS.md` correctly identifies the core divergence but its proposed fix is **incomplete** — it does not address break times, end-of-day boundary validation, stale slot cleanup, or race conditions beyond the atomic claim.

---

## 2. Current System Analysis

### 2.1 Data Model

| Entity | Key Fields | Role |
|--------|-----------|------|
| **Booking** | `customerId, employeeId, shopId, serviceIds[], date, time, durationMinutes, slotLockTimes[], status, paymentStatus, payoutStatus` | Core booking record |
| **Employee** | `bookedSlots[{date,time}], workingHours{start,end}, blockedDates[]` | Slot ownership & schedule |
| **Shop** | `openTime, closeTime, availableDays[], breakTimes[{start,end}], isOpen` | Business hours |
| **Service** | `duration (single), totalDuration (bundled), serviceType` | Duration source |

### 2.2 End-to-End Booking Creation Flow

```
Customer Request (POST /bookings)
  │
  ├─ 1. Validate input (Joi: bookSalonSchema)
  ├─ 2. Normalize time → 24h format
  ├─ 3. Validate date/time is future + within 7-day window
  ├─ 4. Validate shop exists, isOpen, day is available
  ├─ 5. isWithinShopHours(time, openTime, closeTime)  ← checks START time only
  ├─ 6. Fetch services, sum durations, sum prices
  ├─ 7. assertValidServiceDuration (> 0)
  ├─ 8. assertBundleMinimum (≥ ₹300 for bundles)
  ├─ 9. Max duration check (≤ 480 min)
  ├─10. buildSlotLockTimes(time, duration) → e.g. ["10:00","10:30","11:00"]
  ├─11. employeeRepository.claimSlots(empId, date, slotLockTimes)  ← ATOMIC
  ├─12. bookingRepository.create(...)
  └─13. Return booking with paymentRequired: true
```

### 2.3 Availability API Flow

```
GET /employees/:id/available-slots?date=...&serviceId=...
  │
  ├─ Fetch employee, shop, services
  ├─ Sum service durations → serviceDuration
  ├─ Fetch bookings for employee+date → bookedSlots [{date, time, durationMinutes}]
  ├─ calculateAvailableSlots():
  │    ├─ Intersect shop hours ∩ employee hours → effective window
  │    ├─ generateTimeSlots(start, end, serviceDuration, 30min interval)
  │    └─ For each slot → isSlotBlocked(slot, bookedSlots, serviceDuration)
  │         └─ Time-range overlap: slotStart < bookedEnd && slotEnd > bookedStart
  └─ Return slots with available/blocked status
```

### 2.4 What Works Correctly

1. **Atomic slot claiming** — `claimSlots()` uses `$not: {$elemMatch}` + `findOneAndUpdate` = no double-booking at DB level
2. **Multi-slot lock calculation** — `buildSlotLockTimes()` correctly generates all 30-min markers
3. **Slot release on failure** — try/catch in `bookSalon()` releases slots if booking creation fails
4. **Reschedule atomicity** — releases old slots, claims new, rolls back on failure
5. **Auto-cancel cron** — 24h timeout with full refund, double-checks status before acting
6. **Booking lifecycle** — well-defined state machine with proper guards

---

## 3. Key Issues & Limitations

### CRITICAL-1: Availability ↔ Booking Logic Divergence

**Location:** `slot-calculator.utils.js:63` vs `employee.repository.js:41`

The availability API uses **time-range overlap** (`isSlotBlocked`), while booking creation uses **discrete marker membership** (`claimSlots`). These are fundamentally different algorithms that produce different results.

**Impact:** A slot shown as "available" can fail at booking time, or vice versa.

### CRITICAL-2: No End-of-Day Boundary Validation at Booking Time

**Location:** `booking.service.js:199`

`isWithinShopHours()` only checks that the **start time** is within shop hours. A 90-minute booking starting at 17:00 with shop closing at 17:30 would pass this check but extend beyond closing time.

**Impact:** Bookings can be created that extend past shop closing time.

### CRITICAL-3: Break Times Completely Ignored

**Location:** `shop.model.js:164` — `breakTimes` field exists on Shop schema.

The Shop model stores `breakTimes[{start, end}]`, but neither the availability API nor the booking creation flow checks whether the requested time falls within or spans a break period.

**Impact:** Bookings can be created during lunch breaks; availability shows break periods as free.

### MAJOR-1: No Duration-Aware Shop Hours Check

`isWithinShopHours(time, open, close)` checks `time >= open && time < close` — it doesn't verify `time + duration <= close`. The slot calculator handles this for availability (`generateTimeSlots` stops at `close - duration`), but the booking creation path does NOT perform this check independently.

### MAJOR-2: `bookedSlots` on Employee Grows Unbounded

Employee documents accumulate `bookedSlots` entries forever. There is no cleanup of past-date entries. Over months/years, this array grows without bound, degrading `claimSlots` query performance.

### MAJOR-3: Slot Release Not Guaranteed on Completion/No-Show

When a barber marks a booking as `COMPLETED` or `NO_SHOW` via `updateBookingStatus()`, **slots are NOT released** from the Employee's `bookedSlots` array. Only cancellation flows call `releaseBookingSlotLock()`.

**Impact:** Completed bookings permanently consume slot markers on the employee, blocking future availability for the same date. For past dates this is harmless, but for same-day completions it blocks slots that should be freed.

### MAJOR-4: No Idempotency Guard on Booking Creation

If a network retry causes the client to `POST /bookings` twice with identical parameters, two separate bookings can be created (for different slot markers if the first one was already claimed). There is no idempotency key mechanism.

### MODERATE-1: Race Window Between Availability Check and Booking

Between when a customer sees a slot as "available" and when they submit the booking, another customer can claim it. The atomic claim handles this safely (second attempt fails), but the UX is poor — no hold/reservation mechanism exists.

### MODERATE-2: Occupancy Calculation Uses Magic Number

`getTodaysPulse()` hardcodes `slotsPerEmployee = 16` (8h × 2 slots/hr) instead of computing from actual employee working hours and booked slot durations.

### MODERATE-3: `findConflict()` Repository Method Is Unused

`booking.repository.js:215` defines `findConflict()` but it is never called anywhere in the codebase — dead code.

---

## 4. Real-World Scenarios & Failures

### Scenario A: Multi-Service Booking Shown Available But Fails

```
Employee schedule:  [10:00 FREE] [10:30 BOOKED] [11:00 FREE] [11:30 FREE]
Customer picks: 60-min service starting at 10:00
Availability API: isSlotBlocked checks range [10:00, 11:00] vs [10:30, 11:00]
  → Overlap detected: 10:00 < 11:00 && 11:00 > 10:30 → BLOCKED ✅ (works here)
```

But consider:
```
Employee schedule:  [10:00 FREE] [10:30 FREE] [11:00 BOOKED(30min)] [11:30 FREE]
Customer picks: 90-min service starting at 10:00
Required markers: [10:00, 10:30, 11:00]
Availability API: checks [10:00, 11:30] vs [11:00, 11:30] → overlap → BLOCKED ✅

But if the booked slot at 11:00 was only 30min and stored durationMinutes=30:
Availability: [10:00, 11:30] vs [11:00, 11:30] → 10:00 < 11:30 && 11:30 > 11:00 → BLOCKED ✅
```

The overlap check **happens to work** for some cases but fails for the "gap" scenario:

```
Employee schedule:  [11:30 FREE] [12:00 BOOKED(30min)] [12:30 FREE] [13:00 BOOKED(30min)]
Customer picks: 90-min starting at 11:30
Required markers: [11:30, 12:00, 12:30]
Availability: checks [11:30, 13:00] vs each booked:
  - vs [12:00, 12:30]: 11:30 < 12:30 && 13:00 > 12:00 → BLOCKED ✅
```

Actually in this case the overlap catches it. The **real failure** is:

```
Employee schedule:  [11:30 FREE] [12:00 BOOKED(30min)] [12:30 FREE] [13:00 FREE]
Customer picks: 30-min starting at 12:30
Availability: [12:30, 13:00] vs [12:00, 12:30] → 12:30 < 12:30? NO → AVAILABLE ✅
This is correct.
```

The **actual dangerous case** the existing doc identifies:
```
Booked: 12:00 (durationMinutes=0 or missing)
Availability: uses fallback durationMinutes = serviceDuration of NEW service
This mis-attributes duration to the existing booking, causing incorrect overlap.
```

### Scenario B: Booking During Break Time

```
Shop hours: 09:00–18:00, break: 13:00–14:00
Customer books 12:30, service 60min → needs [12:30, 13:00, 13:30]
isWithinShopHours("12:30", "09:00", "18:00") → true
claimSlots succeeds (no one booked 13:00 or 13:30)
Result: Booking spans the lunch break ← INCORRECT
```

### Scenario C: End-of-Day Overflow

```
Shop closes at 18:00. Customer books 17:30, service 60min.
isWithinShopHours("17:30", "09:00", "18:00") → true (17:30 < 18:00)
buildSlotLockTimes("17:30", 60) → ["17:30", "18:00"]
claimSlots succeeds (18:00 marker free)
Result: Service runs until 18:30 but shop closes at 18:00 ← INCORRECT
```

### Scenario D: Concurrent Booking Race

```
Customer A and B both see 10:00 as available.
A submits POST /bookings → claimSlots succeeds → booking created
B submits POST /bookings → claimSlots returns null → "Employee not available"
Result: Handled correctly by atomic claim ✅
```

### Scenario E: Completed Booking Blocks Future Same-Day Slots

```
10:00 booking completed at 10:35. Barber marks COMPLETED.
updateBookingStatus() does NOT call releaseBookingSlotLock().
Employee still has ["10:00"] in bookedSlots.
Customer tries to book 10:00 for later → "not available"
Result: For same-day re-use, slot is permanently blocked ← INCORRECT
```

---

## 5. Critical Review of SLOT-DURATION-MISMATCH-ANALYSIS.md

### What It Gets Right
- Correctly identifies the core problem: availability and booking use different logic
- Correctly proposes marker-based validation as the solution concept
- Correctly notes that atomic claiming at booking time prevents actual double-bookings
- Good test case enumeration

### What It Gets Wrong or Misses

| Gap | Detail |
|-----|--------|
| **Misdiagnoses the overlap check** | Claims `isSlotBlocked()` "only checks START time" — but it actually checks full range overlap `[slotStart, slotEnd) ∩ [bookedStart, bookedEnd)`. The real bug is the **fallback duration** when `durationMinutes` is 0/missing. |
| **Ignores break times** | No mention of `breakTimes` on Shop model. The proposed marker-based fix would still allow bookings during breaks. |
| **Ignores end-of-day boundary** | No validation that `startTime + duration ≤ closeTime` at booking creation. |
| **Ignores slot cleanup** | No discussion of `bookedSlots` array growth or cleanup for completed/past bookings. |
| **Oversimplifies performance** | Claims "negligible" performance impact but doesn't consider the unbounded `bookedSlots` array. |
| **No DB-level safeguard proposed** | Relies entirely on application-level marker checks. No unique compound index or MongoDB transaction discussed. |
| **Migration is incomplete** | Says "no schema changes needed" but the Employee `bookedSlots` array has no TTL/cleanup mechanism. |
| **Assumption #5 is wrong** | States "Employee schedule is continuous — No mid-day breaks" but `breakTimes` exists on Shop model. |

---

## 6. Proposed Solution — Best-in-Class Architecture

### 6.1 Core Scheduling Model: **Hybrid Marker + Time-Range**

**Choice:** Keep the 30-minute slot-marker system for atomic claiming (it works) but **add time-range validation** as a pre-check layer.

**Justification:**
- Pure slot-based: already in place, atomic claiming is proven
- Pure time-range: harder to do atomically in MongoDB without transactions
- Hybrid: validate with time-ranges (including breaks, end-of-day), then claim with markers

### 6.2 Availability Engine (Redesigned)

```
calculateAvailableSlots(params):
  1. Compute effective window = intersect(shopHours, employeeHours) MINUS breakTimes
     → Produces multiple continuous segments, e.g., [09:00-13:00, 14:00-18:00]
  2. For each segment, generate candidate slots where slot + duration ≤ segment.end
  3. Build bookedMarkerSet from all existing bookings' slotLockTimes
  4. For each candidate slot:
     a. Compute requiredMarkers = buildSlotLockTimes(slot, duration)
     b. If ANY requiredMarker ∈ bookedMarkerSet → BLOCKED
     c. If ANY requiredMarker falls inside a break period → BLOCKED
     d. If slot is in past (today) → BLOCKED
     e. Else → AVAILABLE
  5. Return annotated slots
```

### 6.3 Booking Validation Pipeline

```
bookSalon(userId, data):
  1. Input validation (Joi schema)                              ← EXISTS
  2. Normalize time to HH:MM 24h                                ← EXISTS
  3. Validate future date + booking window                      ← EXISTS
  4. Validate shop open + day available                          ← EXISTS
  5. NEW: Validate time NOT in break period
  6. Fetch services, compute totalDuration, totalAmount          ← EXISTS
  7. NEW: Validate startTime + totalDuration ≤ effective close time
  8. NEW: Validate NO required marker falls in a break period
  9. Build slotLockTimes                                         ← EXISTS
  10. Atomic claimSlots                                          ← EXISTS
  11. Create booking (rollback slots on failure)                 ← EXISTS
```

### 6.4 Conflict Prevention Strategy

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| **Application pre-check** | Marker-based + time-range validation | Fast rejection before DB write |
| **Database atomic claim** | `findOneAndUpdate` with `$not: {$elemMatch}` | Prevents race conditions |
| **Compound index** | `{ _id: 1, "bookedSlots.date": 1, "bookedSlots.time": 1 }` on Employee | Faster claim queries |
| **Slot cleanup cron** | Nightly job removes past-date entries from `bookedSlots` | Prevents unbounded growth |

### 6.5 Data Model Improvements

**Employee model — add index for slot queries:**
```javascript
employeeSchema.index({ 'bookedSlots.date': 1, 'bookedSlots.time': 1 });
```

**No schema changes needed** for Booking or Shop — existing fields are sufficient.

### 6.6 Performance & Scalability

| Concern | Solution |
|---------|----------|
| `bookedSlots` array growth | Nightly cron: remove entries where `date < today` |
| Availability query N+1 | Batch-fetch all employee bookings for a date in one query |
| Slot calculator per-employee loop | Build marker set once, O(1) lookups per candidate |
| High concurrency | Atomic claim already handles this; no locks needed |

### 6.7 Frontend Contract

**Backend exposes:**
- Only truly available slots (never false positives)
- Slot interval, total duration, service breakdown
- Clear `reason` for blocked slots: `"past"`, `"booked"`, `"break"`, `"end_of_day"`

**Frontend responsibility:**
- Display what backend returns; never compute availability
- Use slot picker (no manual time entry)
- Gracefully handle "slot no longer available" on booking attempt

---

## 7. Implementation Plan (File-Wise)

### Step 1: New Utility — `isTimeInBreakPeriod()` 

**File:** `server/src/utils/time.utils.js`

```javascript
export const isTimeRangeInBreakPeriod = (startMinutes, endMinutes, breakTimes = []) => {
    for (const br of breakTimes) {
        const brStart = parseTimeToMinutes(br.start);
        const brEnd = parseTimeToMinutes(br.end);
        if (brStart === null || brEnd === null) continue;
        if (startMinutes < brEnd && endMinutes > brStart) return true;
    }
    return false;
};
```

### Step 2: Redesign `isSlotBlocked` → `isSlotBlockedByMarkers`

**File:** `server/src/utils/slot-calculator.utils.js`

Replace `isSlotBlocked()` with marker-based check:

```javascript
import { buildSlotLockTimes } from './slot-lock.utils.js';

const isSlotBlockedByMarkers = (slotTime, bookedMarkerSet, serviceDuration, breakTimes = []) => {
    const requiredMarkers = buildSlotLockTimes(slotTime, serviceDuration);
    // Check marker collision
    if (requiredMarkers.some(m => bookedMarkerSet.has(m))) return 'booked';
    // Check break period collision
    const slotStart = parseTimeToMinutes(slotTime);
    const slotEnd = slotStart + serviceDuration;
    if (isTimeRangeInBreakPeriod(slotStart, slotEnd, breakTimes)) return 'break';
    return null; // available
};
```

Update `calculateAvailableSlots()` to:
1. Accept `breakTimes` parameter
2. Split effective window by break periods into segments
3. Generate slots per segment
4. Build `bookedMarkerSet` once from all bookings' `slotLockTimes`
5. Use `isSlotBlockedByMarkers()` for each candidate

### Step 3: Pass `slotLockTimes` in Booked Slots

**File:** `server/src/services/booking.service.js` — `getAvailableSlots()` and `getShopAvailability()`

Change:
```javascript
const bookedSlots = bookings.map((b) => ({
    date: b.date, time: b.time, durationMinutes: b.durationMinutes,
}));
```

To:
```javascript
const bookedMarkerSet = new Set();
for (const b of bookings) {
    const markers = b.slotLockTimes?.length
        ? b.slotLockTimes
        : buildSlotLockTimes(b.time, b.durationMinutes || 30);
    markers.forEach(m => bookedMarkerSet.add(m));
}
```

Pass `bookedMarkerSet` and `shop.breakTimes` to the calculator.

### Step 4: Add End-of-Day Validation to `bookSalon()`

**File:** `server/src/services/booking.service.js`

After `isWithinShopHours()` check, add:

```javascript
const bookingEndMinutes = parseTimeToMinutes(normalizedTime) + durationMinutes;
const effectiveCloseMinutes = Math.min(
    parseTimeToMinutes(shop.closeTime),
    parseTimeToMinutes(employee.workingHours?.end) || Infinity
);
if (bookingEndMinutes > effectiveCloseMinutes) {
    throw new BadRequestError('Booking would extend past closing time');
}
```

### Step 5: Add Break Time Validation to `bookSalon()`

**File:** `server/src/services/booking.service.js`

```javascript
if (isTimeRangeInBreakPeriod(
    parseTimeToMinutes(normalizedTime),
    parseTimeToMinutes(normalizedTime) + durationMinutes,
    shop.breakTimes || []
)) {
    throw new BadRequestError('Booking time overlaps with a break period');
}
```

### Step 6: Release Slots on Completion/No-Show

**File:** `server/src/services/booking.service.js` — `updateBookingStatus()`

Add slot release when status changes to COMPLETED or NO_SHOW:

```javascript
if ([BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW].includes(status)) {
    await releaseBookingSlotLock(booking);
}
```

### Step 7: Slot Cleanup Cron Job

**New file:** `server/src/jobs/slot-cleanup.cron.js`

```javascript
// Nightly: remove bookedSlots entries where date < today
const today = new Date().toISOString().slice(0, 10);
await Employee.updateMany(
    {},
    { $pull: { bookedSlots: { date: { $lt: today } } } }
);
```

### Step 8: Fetch Employee Working Hours in `bookSalon()`

**File:** `server/src/services/booking.service.js`

Currently `claimSlots()` only returns `firstName lastName photoUrl`. The employee's `workingHours` is needed for the end-of-day check. Either:
- Fetch employee separately before claiming, OR
- Add `workingHours` to the `claimSlots` select projection

### Step 9: Remove Dead Code

**File:** `server/src/repositories/booking.repository.js`

Remove or mark as deprecated the unused `findConflict()` method.

---

## 8. Assumptions

1. **30-minute slot interval is fixed** — changing it requires system-wide migration
2. **All times are in IST** — no multi-timezone support needed (India-only marketplace)
3. **Bookings cannot span midnight** — single-day only
4. **Break times are shop-level**, not employee-level (employees share shop breaks)
5. **Service durations are always multiples of nothing** — they can be any positive integer; slot locking rounds up via `Math.ceil(duration / 30)`
6. **MongoDB replica set is available** for the atomic `findOneAndUpdate` to be truly atomic (standalone is fine for single-document atomicity)

---

## 9. Validation & Test Checklist

### Availability Tests
- [ ] 30-min service: all free slots shown correctly
- [ ] 90-min service: only slots with 90 continuous free minutes shown
- [ ] Slots during break periods marked as blocked with reason `"break"`
- [ ] Last slot respects `slot + duration ≤ closeTime`
- [ ] Past slots filtered for today's date
- [ ] Fragmented schedule: `FREE, BOOKED, FREE, FREE` → first slot blocked for 60-min service

### Booking Creation Tests
- [ ] Booking starting in break period → rejected
- [ ] Booking spanning break period → rejected
- [ ] Booking extending past close time → rejected
- [ ] Booking extending past employee end time → rejected
- [ ] Multi-service booking with correct total duration and markers
- [ ] Duplicate service IDs → rejected
- [ ] > 10 services → rejected
- [ ] > 480 min duration → rejected

### Conflict Prevention Tests
- [ ] Two concurrent bookings for same slot: first succeeds, second fails
- [ ] Reschedule: old slots released, new claimed, rollback on failure
- [ ] Update: same-slot detection skips slot operations
- [ ] Cancellation releases all slot markers

### Lifecycle Tests
- [ ] COMPLETED status releases slot markers
- [ ] NO_SHOW status releases slot markers
- [ ] Auto-cancel after 24h releases slots + initiates full refund
- [ ] Barber cancel (awaiting_confirmation) releases slots + full refund

### Data Integrity Tests
- [ ] Slot cleanup cron removes past-date entries
- [ ] `bookedSlots` array does not grow beyond current + 7 future days
- [ ] Old bookings without `slotLockTimes` handled via fallback reconstruction

---

## 10. Priority & Sequencing

| Priority | Item | Risk if Deferred |
|----------|------|-----------------|
| **P0** | Marker-based availability (Steps 2-3) | False availability → failed bookings |
| **P0** | End-of-day boundary check (Step 4) | Bookings past closing time |
| **P0** | Break time validation (Steps 1, 5) | Bookings during lunch break |
| **P1** | Release slots on completion (Step 6) | Same-day slot re-use blocked |
| **P1** | Slot cleanup cron (Step 7) | Employee doc bloat over time |
| **P2** | Remove dead code (Step 9) | Code hygiene |
| **P2** | Occupancy magic number fix | Inaccurate dashboard metrics |

---

**Document Status:** ✅ Analysis Complete — Ready for Implementation Review
