# Dashboard Implementation Guide

## Overview

This document describes the comprehensive dashboard implementation for the EverCut barber booking platform, providing real-time analytics and operational insights for barber shop owners.

## Features Implemented

### 1. Today's Pulse - Executive Performance

**Endpoint:** `GET /api/dashboard/pulse`

**Description:** Provides real-time occupancy and booking status breakdown for the current day.

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "occupancy": {
      "booked": 45,
      "total": 96,
      "percentage": 47
    },
    "statusBreakdown": [
      {
        "label": "All",
        "count": 102,
        "color": "default"
      },
      {
        "label": "Pending",
        "count": 25,
        "color": "warning"
      },
      {
        "label": "Done",
        "count": 65,
        "color": "success"
      },
      {
        "label": "Cancelled",
        "count": 12,
        "color": "muted"
      }
    ]
  },
  "message": "Today's pulse fetched"
}
```

**Business Logic:**
- **Occupancy Calculation:** Based on total available slots (employees × slots per day) vs booked slots
- **Status Breakdown:**
  - **All:** Total bookings for today
  - **Pending:** PENDING, AWAITING_CONFIRMATION, CONFIRMED statuses
  - **Done:** COMPLETED, NO_SHOW statuses
  - **Cancelled:** CANCELLED status

---

### 2. Staff Availability

**Endpoint:** `GET /api/dashboard/staff`

**Description:** Shows each employee's daily appointment progress and availability.

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "staff": [
      {
        "employeeId": "507f1f77bcf86cd799439011",
        "name": "Ram Kumar",
        "role": "Master Barber",
        "photoUrl": "https://...",
        "progress": {
          "completed": 4,
          "total": 6,
          "remaining": 2,
          "percentage": 67
        }
      }
    ],
    "totalStaff": 3
  },
  "message": "Staff availability fetched"
}
```

**Business Logic:**
- Tracks completed vs total appointments for each employee
- Calculates progress percentage
- Shows remaining appointments
- Only includes active, non-deleted employees

---

### 3. Today's Queue

**Endpoint:** `GET /api/dashboard/queue?filter=active`

**Query Parameters:**
- `filter`: `active` or `upcoming` (default: `active`)

**Description:** Shows today's appointments organized by status (active/upcoming).

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "filter": "active",
    "active": {
      "count": 3,
      "items": [
        {
          "bookingId": "507f1f77bcf86cd799439011",
          "customer": {
            "name": "Julian Thorne"
          },
          "employee": {
            "name": "Ram Goswami"
          },
          "time": "11:30 AM",
          "status": "confirmed",
          "services": ["Haircut", "Beard Trim"]
        }
      ]
    },
    "upcoming": {
      "count": 8,
      "items": []
    }
  },
  "message": "Today's queue fetched"
}
```

**Business Logic:**
- **Active:** Appointments within ±30 minutes of current time
- **Upcoming:** Appointments more than 30 minutes in the future
- Excludes cancelled, completed, and no-show bookings
- Sorted by appointment time

---

### 4. Dashboard Overview

**Endpoint:** `GET /api/dashboard/overview`

**Description:** Combines all dashboard sections into a single response for efficient loading.

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "pulse": { /* Today's Pulse data */ },
    "staff": { /* Staff Availability data */ },
    "queue": { /* Today's Queue data */ }
  },
  "message": "Dashboard overview fetched"
}
```

---

## Display ID System

**Note:** Display IDs have been removed from the implementation. Customer and employee identification uses MongoDB ObjectIds directly.

---

## Enhanced Booking Details

### Platform Fee Display

The booking details endpoint now includes:
- **Sub-Total:** Sum of all service prices
- **Platform Fee:** 
  - ₹3 for single service
  - ₹10 for bundled services
- **Total Amount:** Sub-total + Platform Fee

### Customer & Employee Information

Both customer and employee objects now include:
- `fullName`: Concatenated first and last name for convenience

**Example Response:**
```json
{
  "bookingId": "507f1f77bcf86cd799439011",
  "customer": {
    "_id": "507f1f77bcf86cd799439012",
    "fullName": "Alex Johnson",
    "firstName": "Alex",
    "lastName": "Johnson"
  },
  "employee": {
    "_id": "507f1f77bcf86cd799439013",
    "fullName": "Ram Kumar",
    "firstName": "Ram",
    "lastName": "Kumar"
  },
  "services": [
    {
      "serviceName": "Haircut",
      "finalPrice": 45,
      "duration": 30
    },
    {
      "serviceName": "Beard Trim",
      "finalPrice": 20,
      "duration": 15
    }
  ],
  "subTotal": 65,
  "platformFee": 10,
  "totalAmount": 75,
  "durationMinutes": 45,
  "status": "confirmed",
  "paymentStatus": "success"
}
```

---

## Database Schema Changes

No database schema changes required. The dashboard uses existing booking, employee, and customer models.

---

## API Routes

All dashboard routes require authentication and BARBER role:

```
GET /api/dashboard/overview    - Complete dashboard data
GET /api/dashboard/pulse       - Today's pulse metrics
GET /api/dashboard/staff       - Staff availability
GET /api/dashboard/queue       - Today's queue (active/upcoming)
```

---

## Security & Authorization

- All endpoints require valid JWT authentication
- Only users with `BARBER` role can access dashboard endpoints
- Shop owners can only view data for their own shop

---

## Performance Considerations

1. **Caching:** Consider caching dashboard data for 1-2 minutes to reduce database load
2. **Indexing:** Ensure proper indexes on:
   - `Booking.shopId + date`
   - `Booking.employeeId + date`
3. **Pagination:** Queue endpoint returns all items for today (typically manageable)
4. **Aggregation:** Use MongoDB aggregation pipelines for complex calculations

---

## Testing

### Manual Testing with Postman

1. **Authenticate as Barber:**
   ```
   POST /api/auth/login
   Body: { "phoneNumber": "+919876543210", "pin": "1234" }
   ```

2. **Get Dashboard Overview:**
   ```
   GET /api/dashboard/overview
   Headers: { "Authorization": "Bearer <token>" }
   ```

3. **Get Today's Pulse:**
   ```
   GET /api/dashboard/pulse
   Headers: { "Authorization": "Bearer <token>" }
   ```

4. **Get Staff Availability:**
   ```
   GET /api/dashboard/staff
   Headers: { "Authorization": "Bearer <token>" }
   ```

5. **Get Active Queue:**
   ```
   GET /api/dashboard/queue?filter=active
   Headers: { "Authorization": "Bearer <token>" }
   ```

6. **Get Upcoming Queue:**
   ```
   GET /api/dashboard/queue?filter=upcoming
   Headers: { "Authorization": "Bearer <token>" }
   ```

---

## Troubleshooting

### Occupancy Shows 0/0

**Problem:** No employees or incorrect calculation

**Solution:** 
- Ensure shop has active employees
- Check employee `isActive` and `deletedAt` fields
- Verify booking date filtering

### Queue Shows Wrong Items

**Problem:** Active/upcoming classification incorrect

**Solution:**
- Verify server timezone matches expected timezone
- Check time parsing logic in `parseTimeToMinutes`
- Ensure booking times are in correct format (HH:MM)

---

## Related Documentation

- [Booking System Guide](../bookings/BOOKING-SYSTEM-GUIDE.md)
- [Employee Management](../employees/EMPLOYEE-MANAGEMENT.md)
- [Authentication & Authorization](../../security/SECURITY-AUTH-AUDIT.md)
