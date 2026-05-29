# API Refactoring Guide: UI-Coupled to Resource-Based Routing

## Overview

This document outlines the refactoring of UI-coupled routes to proper resource-based RESTful endpoints. The changes eliminate tight coupling between the backend API and frontend UI screens, creating a more flexible and maintainable architecture.

## Refactoring Date

April 30, 2026

## Principles Applied

1. **Resource-Based Routing**: Routes are organized around backend data entities (bookings, employees, earnings) rather than frontend screens
2. **RESTful Conventions**: Standard HTTP methods and plural nouns for collections
3. **Separation of Concerns**: Backend provides data; frontend handles aggregation and presentation
4. **Flexibility**: UI changes don't require backend modifications

---

## Endpoint Migrations

### 1. Dashboard Routes → Resource Routes

#### ❌ **REMOVED: `/dashboard/overview`**

**Old Endpoint:**
```
GET /api/v1/dashboard/overview
Authorization: Bearer {barber_access_token}
```

**New Approach:**
Frontend should call individual resource endpoints:
- `GET /api/v1/bookings/overview` - For pulse metrics
- `GET /api/v1/employees/analytics` - For staff data
- `GET /api/v1/bookings/overview` - For queue data

**Alternative (if aggregation is needed):**
```
GET /api/v1/bookings/overview + /api/v1/employees/analytics + /api/v1/earnings
Authorization: Bearer {barber_access_token}
```

**Rationale:** The `/overview` endpoint was a UI-specific aggregation. Frontends should fetch individual resources or use the earnings overview endpoint for dashboard data.

---

#### ✅ **MIGRATED: `/dashboard/pulse` → `/bookings/overview`**

**Old Endpoint:**
```
GET /api/v1/dashboard/pulse
Authorization: Bearer {barber_access_token}
```

**New Endpoint:**
```
GET /api/v1/bookings/overview
Authorization: Bearer {barber_access_token}
```

**Response Structure:** (unchanged)
```json
{
  "success": true,
  "message": "Today's pulse fetched",
  "data": {
    "occupancy": {
      "booked": 12,
      "total": 32,
      "percentage": 38
    },
    "statusBreakdown": [
      { "label": "All", "count": 15, "color": "default" },
      { "label": "Pending", "count": 8, "color": "warning" },
      { "label": "Done", "count": 5, "color": "success" },
      { "label": "Cancelled", "count": 2, "color": "muted" }
    ]
  }
}
```

**Rationale:** Pulse metrics are booking-related analytics, so they belong under the `/bookings` resource.

---

#### ✅ **MIGRATED: `/dashboard/staff` → `/employees/analytics`**

**Old Endpoint:**
```
GET /api/v1/dashboard/staff
Authorization: Bearer {barber_access_token}
```

**New Endpoint:**
```
GET /api/v1/employees/analytics
Authorization: Bearer {barber_access_token}
```

**Response Structure:** (unchanged)
```json
{
  "success": true,
  "message": "Staff availability fetched",
  "data": {
    "staff": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "photoUrl": "https://...",
        "progress": {
          "completed": 5,
          "total": 8,
          "remaining": 3,
          "percentage": 63
        }
      }
    ],
    "totalStaff": 3
  }
}
```

**Rationale:** Staff availability is employee-related data, so it belongs under the `/employees` resource.

---

#### ✅ **MIGRATED: `/dashboard/queue` → `/bookings/overview`**

**Old Endpoint:**
```
GET /api/v1/dashboard/queue?date range=active
Authorization: Bearer {barber_access_token}
```

**New Endpoint:**
```
GET /api/v1/bookings/overview
Authorization: Bearer {barber_access_token}
```

**Query Parameters:**
- `date range` (optional): `active` or `upcoming` (default: `active`)

**Response Structure:** (unchanged)
```json
{
  "success": true,
  "message": "Today's queue fetched",
  "data": {
    "date range": "active",
    "active": {
      "count": 3,
      "items": [
        {
          "id": "507f1f77bcf86cd799439011",
          "customer": { "name": "Jane Smith" },
          "employee": { "name": "John Doe" },
          "time": "14:30",
          "status": "confirmed",
          "services": ["Haircut", "Beard Trim"]
        }
      ]
    },
    "upcoming": {
      "count": 5,
      "items": []
    }
  }
}
```

**Rationale:** Queue data represents today's bookings filtered by time proximity, so it belongs under the `/bookings` resource.

---

### 2. Customer Routes → Resource Routes

#### ❌ **REMOVED: `/customers/me/home`**

**Old Endpoint:**
```
GET /api/v1/customers/me/home
Authorization: Bearer {customer_access_token}
```

**Old Response:**
```json
{
  "success": true,
  "message": "Home profile fetched",
  "data": {
    "photo": "https://...",
    "name": "Jane Smith",
    "address": "123 Main St, City"
  }
}
```

**New Approach:**
```
GET /api/v1/customers/me
Authorization: Bearer {customer_access_token}
```

**New Response:**
```json
{
  "success": true,
  "message": "Profile fetched",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "firstName": "Jane",
    "lastName": "Smith",
    "photoUrl": "https://...",
    "address": "123 Main St, City",
    "location": {
      "type": "Point",
      "coordinates": [77.5946, 12.9716]
    },
    "gender": "female",
    "dateOfBirth": "1995-03-15T00:00:00.000Z",
    "favoriteShopIds": [...],
    "favoriteBookingIds": [...],
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

All JSON APIs now use the same response envelope: `{ success, message, data, meta? }`. Paginated endpoints return the list directly in `data` and pagination/count metadata in `meta`, for example `{ "data": [...], "meta": { "pagination": {...} } }`. Public DTOs expose each resource's own identifier as `id`; relation identifiers keep explicit names such as `shopId` or `bookingId` only when no nested relation object is returned. APIs never expose MongoDB/Mongoose internals such as `_id`, `__v`, `$__`, `_doc`, or `$isNew`.

**Rationale:** The `/home` endpoint returned a subset of customer data formatted for a specific UI screen. Frontends should fetch the full profile via `/customers/me` and extract the fields they need. If performance is critical, consider implementing field filtering via query parameters (e.g., `?fields=photoUrl,firstName,lastName,address`).

---

## Migration Checklist for Frontend Teams

### Immediate Actions Required

- [ ] Update all API calls from `/dashboard/*` to new resource-based endpoints
- [ ] Update all API calls from `/customers/me/home` to `/customers/me`
- [ ] Update Postman collections to use new endpoints
- [ ] Update API documentation references
- [ ] Update environment variables or API configuration files
- [ ] Test all affected screens and workflows

### Dashboard Screen Updates

**Before:**
```javascript
// Single aggregated call
const response = await fetch('/api/v1/dashboard/overview');
const { pulse, staff, queue } = response.data;
```

**After (Option 1 - Individual Calls):**
```javascript
// Parallel resource calls
const [pulseRes, staffRes, queueRes] = await Promise.all([
  fetch('/api/v1/bookings/overview'),
  fetch('/api/v1/employees/analytics'),
  fetch('/api/v1/bookings/overview')
]);

const pulse = pulseRes.data;
const staff = staffRes.data;
const queue = queueRes.data;
```

**After (Option 2 - Aggregated Call):**
```javascript
// Use the earnings overview endpoint
const response = await fetch('/api/v1/bookings/overview + /api/v1/employees/analytics + /api/v1/earnings');
const { pulse, staff, queue } = response.data;
```

### Customer Home Screen Updates

**Before:**
```javascript
const response = await fetch('/api/v1/customers/me/home');
const { photo, name, address } = response.data;
```

**After:**
```javascript
const response = await fetch('/api/v1/customers/me');
const { photoUrl, firstName, lastName, address } = response.data;
const name = `${firstName} ${lastName}`;
```

---

## Benefits of This Refactoring

### 1. **Decoupling**
- Backend is no longer tied to specific frontend screens
- UI redesigns don't require backend changes
- Multiple frontends (web, mobile, admin panel) can use the same API

### 2. **RESTful Compliance**
- Routes follow standard REST conventions
- Easier for new developers to understand
- Better API discoverability

### 3. **Flexibility**
- Frontends can fetch exactly the data they need
- Easier to implement caching strategies
- Better support for partial updates and optimistic UI

### 4. **Maintainability**
- Clear separation between resources
- Easier to test individual endpoints
- Simpler to add new features without breaking existing ones

### 5. **Scalability**
- Individual endpoints can be optimized independently
- Easier to implement rate limiting per resource
- Better support for microservices architecture in the future

---

## Backward Compatibility

**Breaking Changes:** Yes, this is a breaking change. The old dashboard routes have been completely removed.

**Migration Timeline:**
1. ✅ Backend refactoring complete (April 30, 2026)
2. ⏳ Frontend teams update API calls (1-2 weeks)
3. ⏳ QA testing of all affected screens (1 week)
4. ⏳ Production deployment (coordinated release)

**Rollback Plan:**
If critical issues arise, the old dashboard routes can be temporarily restored by:
1. Reverting the commit that removed `dashboard.routes.js`
2. Re-adding the dashboard route to `routes/index.js`
3. Deploying the rollback

---

## Testing Recommendations

### Unit Tests
- ✅ Test new booking controller methods (`booking analytics today data`, `booking analytics queue data`)
- ✅ Test new employee controller method (`getStaffAvailability`)
- ✅ Test new earnings controller method (`getOperationalAnalytics`)

### Integration Tests
- Test that `/bookings/overview` returns correct pulse metrics
- Test that `/employees/analytics` returns correct staff data
- Test that `/bookings/overview` filters correctly by `active`/`upcoming`
- Test that `/customers/me` returns complete profile data

### End-to-End Tests
- Test dashboard screen loads correctly with new endpoints
- Test customer home screen loads correctly with `/customers/me`
- Test error handling when endpoints return errors
- Test loading states during parallel API calls

---

## Support and Questions

For questions about this refactoring, contact:
- **Backend Team**: backend-team@example.com
- **API Documentation**: See `/docs/api/` folder
- **Postman Collections**: See `/server/postman-collections/` folder

---

## Appendix: Complete Endpoint Mapping

| Old Endpoint | New Endpoint | Method | Auth | Status |
|-------------|--------------|--------|------|--------|
| `/dashboard/overview` | `/bookings/overview + /employees/analytics + /earnings` | GET | Barber | Migrated |
| `/dashboard/pulse` | `/bookings/overview` | GET | Barber | Migrated |
| `/dashboard/staff` | `/employees/analytics` | GET | Barber | Migrated |
| `/dashboard/queue` | `/bookings/overview` | GET | Barber | Migrated |
| `/customers/me/home` | `/customers/me` | GET | Customer | Removed |

---

**Document Version:** 1.0  
**Last Updated:** April 30, 2026  
**Author:** Backend Architecture Team
