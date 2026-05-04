# Employee Detail Endpoint

## Overview

This document describes the employee detail endpoint that provides comprehensive information about a specific employee, including their profile, statistics, and upcoming bookings.

## Endpoint

**URL:** `GET /api/employees/:id`

**Authentication:** Required (BARBER role)

**Authorization:** Shop owners can only access employees from their own shop

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String (ObjectId) | Yes | Employee ID |

### Headers

```
Authorization: Bearer <jwt_token>
```

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "employee": {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "Ram",
      "lastName": "Kumar",
      "fullName": "Ram Kumar",
      "phoneNumber": "+919876543210",
      "gender": "Male",
      "dateOfBirth": "1990-05-15T00:00:00.000Z",
      "photoUrl": "https://res.cloudinary.com/...",
      "workingHours": {
        "start": "09:00",
        "end": "18:00"
      },
      "blockedDates": [],
      "isActive": true,
      "createdAt": "2025-01-15T10:30:00.000Z"
    },
    "statistics": {
      "today": {
        "total": 6,
        "completed": 4,
        "pending": 2
      },
      "allTime": {
        "totalBookings": 245,
        "totalEarnings": 125000
      },
      "thisMonth": {
        "totalBookings": 48,
        "totalEarnings": 24500
      },
      "upcoming": {
        "count": 12,
        "bookings": [
          {
            "bookingId": "507f1f77bcf86cd799439012",
            "date": "2026-04-30T00:00:00.000Z",
            "time": "14:30",
            "customer": {
              "name": "John Doe"
            },
            "services": ["Haircut", "Beard Trim"],
            "status": "confirmed"
          }
        ]
      }
    }
  },
  "message": "Employee details fetched"
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "This endpoint is available only to barbers"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Employee not found"
}
```

---

## Response Fields

### Employee Object

| Field | Type | Description |
|-------|------|-------------|
| `_id` | String | Employee unique identifier |
| `firstName` | String | Employee first name |
| `lastName` | String | Employee last name |
| `fullName` | String | Full name (firstName + lastName) |
| `phoneNumber` | String | Contact phone number |
| `gender` | String | Gender (Male/Female/Other) |
| `dateOfBirth` | Date | Date of birth |
| `photoUrl` | String | Profile photo URL (Cloudinary) |
| `workingHours` | Object | Working hours (start/end times) |
| `blockedDates` | Array | List of blocked dates |
| `isActive` | Boolean | Whether employee is active/available |
| `createdAt` | Date | Account creation date |

### Statistics Object

#### Today Statistics
| Field | Type | Description |
|-------|------|-------------|
| `total` | Number | Total bookings today |
| `completed` | Number | Completed bookings today |
| `pending` | Number | Pending bookings today |

#### All-Time Statistics
| Field | Type | Description |
|-------|------|-------------|
| `totalBookings` | Number | Total completed bookings (all time) |
| `totalEarnings` | Number | Total earnings in rupees (all time) |

#### This Month Statistics
| Field | Type | Description |
|-------|------|-------------|
| `totalBookings` | Number | Completed bookings this month |
| `totalEarnings` | Number | Earnings this month in rupees |

#### Upcoming Bookings
| Field | Type | Description |
|-------|------|-------------|
| `count` | Number | Total upcoming bookings (next 7 days) |
| `bookings` | Array | First 5 upcoming bookings with details |

---

## Business Logic

### Today's Statistics
- **Total:** All non-cancelled bookings for today
- **Completed:** Bookings with status `completed` or `no-show`
- **Pending:** Bookings with status `pending`, `awaiting_confirmation`, or `confirmed`

### All-Time Statistics
- **Total Bookings:** Count of all bookings with status `completed` or `no-show`
- **Total Earnings:** Sum of `totalAmount` from all completed bookings

### This Month Statistics
- **Period:** Current calendar month (1st to last day)
- **Total Bookings:** Completed bookings within current month
- **Total Earnings:** Sum of earnings from completed bookings this month

### Upcoming Bookings
- **Period:** Today to 7 days in the future
- **Statuses:** Excludes `cancelled`, `completed`, and `no-show`
- **Limit:** Returns first 5 bookings (sorted by date/time)

---

## Use Cases

### 1. Dashboard - Staff Availability Click

When a user clicks on an employee in the Staff Availability section:

```javascript
// Frontend code
const handleEmployeeClick = async (employeeId) => {
  const response = await fetch(`/api/employees/${employeeId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  
  // Display employee details modal/page
  showEmployeeDetails(data.data);
};
```

### 2. Employee Performance Review

View detailed statistics for performance evaluation:

```javascript
const { statistics } = employeeData;

console.log(`Today's Performance: ${statistics.today.completed}/${statistics.today.total}`);
console.log(`Monthly Earnings: ₹${statistics.thisMonth.totalEarnings}`);
console.log(`All-Time Bookings: ${statistics.allTime.totalBookings}`);
```

### 3. Upcoming Schedule Preview

Display employee's upcoming appointments:

```javascript
const { upcoming } = statistics;

upcoming.bookings.forEach(booking => {
  console.log(`${booking.date} at ${booking.time} - ${booking.customer.name}`);
  console.log(`Services: ${booking.services.join(', ')}`);
});
```

---

## Testing

### Manual Testing with cURL

```bash
# 1. Login as barber
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "pin": "1234"}'

# 2. Get employee details
curl http://localhost:3000/api/employees/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Expected Results

✅ Returns 200 OK with employee details
✅ Includes complete profile information
✅ Shows accurate today's statistics
✅ Displays all-time and monthly statistics
✅ Lists upcoming bookings (max 5)

### Test Cases

1. **Valid Employee ID**
   - Should return complete employee details
   - Statistics should be accurate

2. **Invalid Employee ID**
   - Should return 404 Not Found

3. **Employee from Different Shop**
   - Should return 404 Not Found (data isolation)

4. **Inactive Employee**
   - Should still return details (isActive: false)

5. **Employee with No Bookings**
   - Should return zero statistics
   - Empty upcoming bookings array

---

## Security

✅ **Authentication Required** - JWT token must be valid
✅ **Role-Based Access** - Only BARBER role allowed
✅ **Data Isolation** - Shop owners see only their employees
✅ **No Sensitive Data** - Phone numbers are visible (business requirement)

---

## Performance Considerations

### Database Queries

The endpoint makes multiple queries:
1. Find shop by owner ID
2. Find employee by ID
3. Find today's bookings
4. Find all completed bookings
5. Find this month's bookings
6. Find upcoming bookings

**Optimization Recommendations:**
- Add caching for employee details (5-minute TTL)
- Use aggregation pipeline for statistics calculation
- Index on `employeeId + date + status` for faster queries

### Response Time

- **Expected:** < 500ms
- **Acceptable:** < 1000ms
- **Needs Optimization:** > 1000ms

---

## Integration with Dashboard

### Staff Availability Section

When displaying staff in the dashboard:

```javascript
// Dashboard displays staff list
<StaffList>
  {staff.map(employee => (
    <StaffCard 
      key={employee.employeeId}
      employee={employee}
      onClick={() => fetchEmployeeDetails(employee.employeeId)}
    />
  ))}
</StaffList>

// On click, fetch detailed information
const fetchEmployeeDetails = async (employeeId) => {
  const response = await fetch(`/api/employees/${employeeId}`);
  const { data } = await response.json();
  
  // Show modal/drawer with detailed stats
  openEmployeeDetailModal(data);
};
```

---

## Future Enhancements

1. **Customer Reviews**
   - Include average rating
   - Recent customer feedback

2. **Performance Trends**
   - Week-over-week comparison
   - Monthly growth charts

3. **Skill Tags**
   - Specializations
   - Service expertise

4. **Availability Calendar**
   - Visual calendar view
   - Blocked dates management

5. **Commission Tracking**
   - Earnings breakdown
   - Commission calculations

---

## Related Endpoints

- `GET /api/employees` - List all employees
- `POST /api/employees` - Add new employee
- `PUT /api/employees/:id` - Update employee
- `PUT /api/employees/:id/status` - Toggle employee availability status
- `DELETE /api/employees/:id` - Delete employee
- `GET /api/employees/:id/calendar` - Employee calendar
- `GET /api/employees/:id/available-slots` - Available time slots

---

## Related Documentation

- [Dashboard Implementation](../dashboard/DASHBOARD-IMPLEMENTATION.md)
- [Employee Management](./EMPLOYEE-MANAGEMENT.md)
- [Booking System](../bookings/BOOKING-SYSTEM-GUIDE.md)

---

**Last Updated:** May 4, 2026
**Status:** ✅ Implemented and Production-Ready
