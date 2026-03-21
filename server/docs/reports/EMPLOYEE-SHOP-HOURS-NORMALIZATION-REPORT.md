# EverCut Backend - Employee Shop Hours Normalization Report

> **Generated:** 2026-03-21  
> **Primary scope:** `POST /api/v1/barber/employees` and the shared shop-schedule handling used by employee, onboarding, shop-update, and booking flows.

---

## 1. Issue Observed

`POST /api/v1/barber/employees` returned:

```json
{
  "success": false,
  "message": "Employee working hours must stay within shop hours",
  "data": {}
}
```

even when the submitted employee hours were logically inside the barber shop schedule.

---

## 2. Root Cause

The backend was mixing two schedule formats:

- employee working hours were validated in `HH:MM` 24-hour format
- shop opening, closing, and break times could still enter and remain stored as `hh:mm AM/PM`

The failing employee path compared those values as raw strings inside `src/services/employee.service.js`:

- employee hours: `09:00` to `18:00`
- legacy shop hours: `09:00 AM` to `08:00 PM`

That raw string comparison produced false failures even though the actual time ranges were valid.

The same format inconsistency also affected related code paths:

- shop creation during barber onboarding
- barber shop schedule updates
- booking checks that rely on shop opening and closing hours
- seed data used for local rating fixtures

---

## 3. Fix Implemented

The fix was kept small and applied at the shared schedule boundary:

1. Added shared time normalization helpers in `src/utils/time.utils.js`
   - `parseTimeToMinutes()` now accepts both `HH:MM` and `hh:mm AM/PM`
   - `toTwentyFourHourTime()` normalizes supported inputs to `HH:MM`

2. Added shared shop schedule normalization in `src/utils/shop-schedule.utils.js`
   - normalizes `openTime`, `closeTime`, and break times
   - validates time ordering
   - validates break times remain within shop hours

3. Fixed the employee service in `src/services/employee.service.js`
   - replaced raw string comparisons with normalized minute-based comparisons
   - normalizes default employee working hours from the shop schedule before persistence
   - returns a clear error if the stored shop schedule itself is invalid

4. Normalized shop schedule writes in:
   - `src/services/onboarding.service.js`
   - `src/services/shop.service.js`

5. Tightened validator behavior in:
   - `src/validators/onboarding.validator.js`
   - `src/validators/shop.validator.js`

6. Updated the rating seed script so newly seeded shop and employee schedules are stored in `HH:MM`

---

## 4. Similar Issues Checked And Fixed

The same schedule-format bug pattern existed outside the employee route and was addressed consistently:

- `src/services/booking.service.js` now benefits from the shared `isWithinShopHours()` normalization path through `time.utils.js`
- barber onboarding now normalizes shop schedule input before creating the shop
- barber profile shop updates now normalize effective schedule values before saving
- local seed data no longer reintroduces AM/PM shop schedule values for shop and employee records

---

## 5. Files Modified

- `server/src/utils/time.utils.js`
- `server/src/utils/shop-schedule.utils.js`
- `server/src/services/employee.service.js`
- `server/src/services/onboarding.service.js`
- `server/src/services/shop.service.js`
- `server/src/validators/onboarding.validator.js`
- `server/src/validators/shop.validator.js`
- `server/src/services/__tests__/employee.service.test.js`
- `server/src/utils/__tests__/time.utils.test.js`
- `server/src/validators/__tests__/onboarding.validator.test.js`
- `server/src/validators/__tests__/shop.validator.test.js`
- `server/scripts/seed-barber-rating-mock-data.js`
- `server/scripts/regenerate-postman-collections.mjs`
- `server/postman-collections/README.md`
- regenerated Postman collections affected by the generator output:
  - `server/postman-collections/02-onboarding.json`
  - `server/postman-collections/08-barber-employees.json`
  - `server/postman-collections/EverCut.postman_environment.json`

---

## 6. Verification Performed

### Targeted tests

- `server/src/services/__tests__/employee.service.test.js`
- `server/src/utils/__tests__/time.utils.test.js`
- `server/src/validators/__tests__/onboarding.validator.test.js`
- `server/src/validators/__tests__/shop.validator.test.js`

### Verification focus

- employee creation now accepts valid 24-hour employee hours even when legacy shop hours exist in AM/PM format
- default employee working hours are normalized to `HH:MM`
- shop schedule input is normalized consistently during barber onboarding
- shared shop-hours checks now work for legacy AM/PM shop records as well as normalized `HH:MM` records

---

## 7. Additional Observation

This issue was not an employee-only validation bug. It was a schedule-normalization gap at the boundary between shop data, employee data, and booking logic. Fixing the shared schedule utilities removed the immediate employee failure and reduced the same risk in adjacent flows without widening the change beyond the schedule-handling layer.
