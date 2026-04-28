# Booking Availability - Implementation Plan

**Version:** 1.0  
**Date:** April 28, 2026  
**Status:** Ready for Implementation

---

## Issues Identified

### 🔴 Critical Issue 1: No Employee List API
**Problem:** Customers cannot see available employees for a shop.

**Current Gap:**
- `GET /shops/:shopId` returns services but NOT employees
- Customer must somehow know employee ID to check availability

**Impact:** Severe UX issue - customers cannot choose their preferred barber

---

### 🔴 Critical Issue 2: Frontend Calculates Availability
**Problem:** Complex availability logic duplicated on frontend.

**Current Gap:**
- Backend returns raw data: working hours, booked slots, blocked dates
- Frontend must calculate available slots
- Service duration not considered
- Logic inconsistent across platforms

**Impact:** Complex frontend, service duration ignored, potential booking conflicts

---

### 🟡 Medium Issue 3: Race Condition Window
**Problem:** Time gap between checking availability and creating booking.

**Current Mitigation:** Atomic slot claim prevents double booking (data safe)

**Impact:** Poor UX - customer thinks slot is available but gets error

---

## Solutions to Implement

### Solution 1: Add Employee List API ✅

**Endpoint:**
```http
GET /api/v1/shops/:shopId/employees
```

**Response:**
```json
{
  "employees": [
    {
      "id": "emp1",
      "firstName": "John",
      "lastName": "Doe",
      "photoUrl": "https://...",
      "gender": "male",
      "workingHours": {
        "start": "09:00",
        "end": "18:00"
      },
      "isActive": true
    }
  ]
}
```

**Implementation:**
- Add route: `GET /shops/:shopId/employees`
- Add controller: `getShopEmployees`
- Add service: `getEmployeesByShopId`
- Return only active employees
- Exclude sensitive data (phone numbers, etc.)
- No authentication required (public endpoint)

---

### Solution 2: Add Available Slots API ✅

**Endpoint:**
```http
GET /api/v1/employees/:employeeId/available-slots?date=2026-04-28&serviceId=service1
```

**Response:**
```json
{
  "employeeId": "emp1",
  "employeeName": "John Doe",
  "date": "2026-04-28",
  "service": {
    "id": "service1",
    "name": "Haircut",
    "duration": 30
  },
  "shopHours": {
    "openTime": "09:00",
    "closeTime": "21:00"
  },
  "employeeHours": {
    "start": "09:00",
    "end": "18:00"
  },
  "slots": [
    {
      "time": "09:00",
      "available": true
    },
    {
      "time": "09:30",
      "available": true
    },
    {
      "time": "10:00",
      "available": false,
      "reason": "booked"
    },
    {
      "time": "10:30",
      "available": false,
      "reason": "blocked_by_duration"
    },
    {
      "time": "11:00",
      "available": true
    }
  ],
  "slotInterval": 30,
  "totalAvailable": 15,
  "totalSlots": 18
}
```

**Implementation:**
- Add route: `GET /employees/:employeeId/available-slots`
- Add controller: `getAvailableSlots`
- Add service: `calculateAvailableSlots`
- Calculate all possible slots based on:
  - Shop open/close time
  - Employee working hours
  - Service duration (blocks consecutive slots)
  - Booked slots
  - Blocked dates
  - Past time (if today)
- Slot interval: 30 minutes (configurable)

**Algorithm:**
```javascript
1. Get shop hours (openTime, closeTime)
2. Get employee hours (start, end)
3. Get service duration
4. Get booked slots for date
5. Get blocked dates

6. Calculate effective hours:
   effectiveStart = max(shopOpen, employeeStart)
   effectiveEnd = min(shopClose, employeeEnd)

7. Generate all possible slots (30-min intervals):
   slots = []
   currentTime = effectiveStart
   while (currentTime + serviceDuration <= effectiveEnd):
     slots.push(currentTime)
     currentTime += 30 minutes

8. Mark unavailable slots:
   for each slot:
     if date is blocked: mark unavailable
     if slot is booked: mark unavailable
     if slot + duration overlaps booked slot: mark unavailable
     if slot is in past (today): mark unavailable

9. Return slots with availability status
```

---

### Solution 3: Add Shop-Wide Availability API ✅

**Endpoint:**
```http
GET /api/v1/shops/:shopId/availability?date=2026-04-28&serviceId=service1
```

**Response:**
```json
{
  "shopId": "shop1",
  "shopName": "Elite Salon",
  "date": "2026-04-28",
  "service": {
    "id": "service1",
    "name": "Haircut",
    "duration": 30
  },
  "employees": [
    {
      "employeeId": "emp1",
      "employeeName": "John Doe",
      "photoUrl": "https://...",
      "availableSlots": ["09:00", "09:30", "11:00", "14:00"],
      "totalAvailable": 4
    },
    {
      "employeeId": "emp2",
      "employeeName": "Jane Smith",
      "photoUrl": "https://...",
      "availableSlots": ["10:00", "10:30", "15:00", "16:00"],
      "totalAvailable": 4
    }
  ],
  "firstAvailable": {
    "employeeId": "emp1",
    "employeeName": "John Doe",
    "time": "09:00"
  }
}
```

**Implementation:**
- Add route: `GET /shops/:shopId/availability`
- Add controller: `getShopAvailability`
- Add service: `calculateShopAvailability`
- Get all active employees for shop
- Calculate available slots for each employee
- Return aggregated availability
- Include "first available" suggestion

---

### Solution 4: Slot Reservation System (Future Enhancement)

**Not implementing in this phase** - requires additional infrastructure:
- Redis for temporary storage
- Expiration handling
- Cleanup jobs
- More complex booking flow

**Recommendation:** Implement after monitoring usage patterns

---

## Implementation Details

### File Structure

```
server/src/
├── controllers/
│   ├── shop.controller.js (add getShopEmployees)
│   └── employee.controller.js (add getAvailableSlots)
├── services/
│   ├── shop.service.js (add getEmployeesByShopId)
│   ├── employee.service.js (add calculateAvailableSlots)
│   └── booking.service.js (add calculateShopAvailability)
├── repositories/
│   └── employee.repository.js (add findByShopIdPublic)
├── routes/
│   ├── shops.routes.js (add GET /:id/employees)
│   └── employees.routes.js (add GET /:id/available-slots)
├── validators/
│   ├── shop.validator.js (add employeeListSchema)
│   └── employee.validator.js (add availableSlotsSchema)
└── utils/
    └── slot-calculator.utils.js (NEW - slot generation logic)
```

### New Utility: Slot Calculator

**File:** `server/src/utils/slot-calculator.utils.js`

**Functions:**
- `generateTimeSlots(startTime, endTime, intervalMinutes)` - Generate all possible slots
- `isSlotAvailable(slot, bookedSlots, serviceDuration)` - Check if slot is available
- `calculateAvailableSlots(params)` - Main calculation function
- `filterPastSlots(slots, date)` - Remove past slots if today

---

## API Specifications

### 1. Get Shop Employees

**Endpoint:** `GET /api/v1/shops/:shopId/employees`

**Authentication:** None (public)

**Query Parameters:** None

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "employees": [...]
  },
  "message": "Employees fetched"
}
```

**Errors:**
- 404: Shop not found

---

### 2. Get Available Slots

**Endpoint:** `GET /api/v1/employees/:employeeId/available-slots`

**Authentication:** Optional (for better UX, can show past bookings)

**Query Parameters:**
- `date` (required): YYYY-MM-DD format
- `serviceId` (required): Service ID

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "employeeId": "...",
    "date": "...",
    "slots": [...]
  },
  "message": "Available slots fetched"
}
```

**Errors:**
- 400: Invalid date format
- 400: Date is in the past
- 404: Employee not found
- 404: Service not found

---

### 3. Get Shop Availability

**Endpoint:** `GET /api/v1/shops/:shopId/availability`

**Authentication:** None (public)

**Query Parameters:**
- `date` (required): YYYY-MM-DD format
- `serviceId` (required): Service ID

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "shopId": "...",
    "employees": [...],
    "firstAvailable": {...}
  },
  "message": "Shop availability fetched"
}
```

**Errors:**
- 400: Invalid date format
- 400: Date is in the past
- 404: Shop not found
- 404: Service not found

---

## Validation Rules

### Date Validation
- Format: YYYY-MM-DD
- Must not be in the past
- Must be a valid date

### Service Validation
- Must exist
- Must belong to the shop
- Must have duration field

### Employee Validation
- Must exist
- Must be active
- Must belong to the shop

---

## Testing Strategy

### Unit Tests
- Slot generation logic
- Availability calculation
- Duration blocking logic
- Past slot filtering

### Integration Tests
- Employee list API
- Available slots API
- Shop availability API
- Edge cases (blocked dates, past times, etc.)

### Manual Tests
1. Get employee list for shop
2. Check available slots for employee
3. Verify service duration blocks consecutive slots
4. Verify blocked dates work
5. Verify past slots are filtered (today)
6. Check shop-wide availability

---

## Migration Considerations

### Backward Compatibility
- Existing calendar API remains unchanged
- New APIs are additions, not replacements
- Frontend can migrate gradually

### Performance
- Add database indexes:
  - `employees: { shopId: 1, isActive: 1 }`
  - `bookings: { employeeId: 1, date: 1 }`
- Cache shop hours (rarely change)
- Consider caching employee working hours

### Monitoring
- Track API response times
- Monitor slot calculation performance
- Alert on slow queries

---

## Rollout Plan

### Phase 1: Implementation (Week 1)
- Day 1-2: Implement slot calculator utility
- Day 3: Implement employee list API
- Day 4: Implement available slots API
- Day 5: Implement shop availability API

### Phase 2: Testing (Week 1)
- Day 6: Unit tests
- Day 7: Integration tests

### Phase 3: Documentation (Week 2)
- Day 1: Update API documentation
- Day 2: Update Postman collections
- Day 3: Update booking flow documentation

### Phase 4: Deployment (Week 2)
- Day 4: Deploy to staging
- Day 5: Test on staging
- Day 6: Deploy to production
- Day 7: Monitor and fix issues

---

## Success Metrics

### Technical Metrics
- API response time < 200ms
- Slot calculation time < 50ms
- Zero double bookings (maintained)

### Business Metrics
- Reduced booking errors
- Increased booking completion rate
- Reduced support tickets

### User Experience Metrics
- Faster booking flow
- Fewer "slot not available" errors
- Better employee selection

---

## Future Enhancements

### Phase 2 (Month 2)
- Slot reservation system
- Real-time availability updates (WebSocket)
- Smart scheduling suggestions

### Phase 3 (Month 3)
- Multi-day availability view
- Recurring booking support
- Waitlist functionality

---

**Document Status:** Complete  
**Ready for Implementation:** Yes  
**Estimated Effort:** 1-2 weeks
