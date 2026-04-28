# Shop Discovery Flow

## Overview

Flutter clients discover shops, inspect shop details, fetch employees, and check availability before creating a booking.

## API Steps

1. Find nearby shops:
   `GET /api/v1/shops/nearby?coordinates=77.5946,12.9716`

2. View shop details and services:
   `GET /api/v1/shops/:id`

3. View employees:
   `GET /api/v1/shops/:id/employees`

4. Check one employee:
   `GET /api/v1/employees/:id/available-slots?date=2099-01-01&serviceId=<service_id>`

5. Check whole shop:
   `GET /api/v1/shops/:id/availability?date=2099-01-01&serviceId=<service_id>`

## Response Example

```json
{
  "success": true,
  "message": "Shop availability fetched",
  "data": {
    "shopId": "shop_id",
    "date": "2099-01-01",
    "service": {
      "id": "service_id",
      "name": "Haircut",
      "duration": 60
    },
    "employees": [
      {
        "employeeId": "employee_id",
        "employeeName": "Test Barber",
        "availableSlots": ["10:00", "10:30", "11:00"],
        "totalAvailable": 3
      }
    ],
    "firstAvailable": {
      "employeeId": "employee_id",
      "employeeName": "Test Barber",
      "time": "10:00"
    }
  }
}
```

## Important Notes

- Availability times are `HH:MM`. Send the same value to booking APIs.
- Availability requires authentication for slot checks.
- Shop details include service lists, gallery photos, and rating summary.
