# Multi-Service Booking Guide

**Date:** April 28, 2026  
**Status:** ✅ IMPLEMENTED

---

## Overview

The booking system supports selecting multiple services, bundles, or a combination of both in a single booking. This guide explains how to use this feature.

---

## Supported Selection Types

### 1. Single Service
```json
POST /api/v1/bookings
{
  "shopId": "shop123",
  "employeeId": "emp456",
  "serviceId": "haircut_id",
  "date": "2026-04-28",
  "time": "10:00"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bookingId": "booking123",
    "totalAmount": 300,
    "durationMinutes": 30,
    "services": [
      {
        "id": "haircut_id",
        "name": "Haircut",
        "finalPrice": 300,
        "duration": 30
      }
    ]
  }
}
```

---

### 2. Multiple Services
```json
POST /api/v1/bookings
{
  "shopId": "shop123",
  "employeeId": "emp456",
  "serviceId": ["haircut_id", "beard_trim_id", "hair_color_id"],
  "date": "2026-04-28",
  "time": "10:00"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bookingId": "booking123",
    "totalAmount": 950,
    "durationMinutes": 110,
    "services": [
      {
        "id": "haircut_id",
        "name": "Haircut",
        "finalPrice": 300,
        "duration": 30
      },
      {
        "id": "beard_trim_id",
        "name": "Beard Trim",
        "finalPrice": 150,
        "duration": 20
      },
      {
        "id": "hair_color_id",
        "name": "Hair Color",
        "finalPrice": 500,
        "duration": 60
      }
    ]
  }
}
```

---

### 3. Single Bundle
```json
POST /api/v1/bookings
{
  "shopId": "shop123",
  "employeeId": "emp456",
  "serviceId": "grooming_package_id",
  "date": "2026-04-28",
  "time": "10:00"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bookingId": "booking123",
    "totalAmount": 800,
    "durationMinutes": 90,
    "services": [
      {
        "id": "grooming_package_id",
        "name": "Grooming Package",
        "totalPrice": 800,
        "totalDuration": 90,
        "serviceType": "bundled"
      }
    ]
  }
}
```

---

### 4. Multiple Bundles
```json
POST /api/v1/bookings
{
  "shopId": "shop123",
  "employeeId": "emp456",
  "serviceId": ["grooming_package_id", "spa_package_id"],
  "date": "2026-04-28",
  "time": "10:00"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bookingId": "booking123",
    "totalAmount": 2000,
    "durationMinutes": 210,
    "services": [
      {
        "id": "grooming_package_id",
        "name": "Grooming Package",
        "totalPrice": 800,
        "totalDuration": 90
      },
      {
        "id": "spa_package_id",
        "name": "Spa Package",
        "totalPrice": 1200,
        "totalDuration": 120
      }
    ]
  }
}
```

---

### 5. Mixed Selection (Services + Bundles)
```json
POST /api/v1/bookings
{
  "shopId": "shop123",
  "employeeId": "emp456",
  "serviceId": ["haircut_id", "grooming_package_id", "beard_trim_id"],
  "date": "2026-04-28",
  "time": "10:00"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bookingId": "booking123",
    "totalAmount": 1250,
    "durationMinutes": 140,
    "services": [
      {
        "id": "haircut_id",
        "name": "Haircut",
        "finalPrice": 300,
        "duration": 30
      },
      {
        "id": "grooming_package_id",
        "name": "Grooming Package",
        "totalPrice": 800,
        "totalDuration": 90
      },
      {
        "id": "beard_trim_id",
        "name": "Beard Trim",
        "finalPrice": 150,
        "duration": 20
      }
    ]
  }
}
```

---

## Pricing Calculation

### Single Services
```
Total = Sum of all finalPrice values
Example: ₹300 + ₹150 + ₹500 = ₹950
```

### Bundled Services
```
Total = totalPrice of bundle
Example: ₹800 (Grooming Package)
```

### Mixed Selection
```
Total = Sum of all service prices + Sum of all bundle prices
Example: ₹300 (Haircut) + ₹800 (Bundle) + ₹150 (Beard) = ₹1250
```

---

## Duration Calculation

### Single Services
```
Total Duration = Sum of all duration values
Example: 30 + 20 + 60 = 110 minutes
```

### Bundled Services
```
Total Duration = totalDuration of bundle
Example: 90 minutes (Grooming Package)
```

### Mixed Selection
```
Total Duration = Sum of all service durations + Sum of all bundle durations
Example: 30 (Haircut) + 90 (Bundle) + 20 (Beard) = 140 minutes
```

---

## Slot Locking

The system automatically locks multiple time slots based on total duration:

**Example:** 140-minute booking starting at 10:00
```
Locked Slots:
- 10:00 (start)
- 10:30
- 11:00
- 11:30
- 12:00
- 12:30 (end at 12:20, but 12:30 slot blocked)
```

This prevents overlapping bookings.

---

## Validation Rules

### 1. No Duplicates ✅
```json
// ❌ ERROR
{
  "serviceId": ["haircut_id", "haircut_id"]
}
```
**Error:** "Duplicate services are not allowed"

---

### 2. Maximum Services Limit ✅
```json
// ❌ ERROR (more than 10 services)
{
  "serviceId": ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11"]
}
```
**Error:** "Cannot select more than 10 services per booking"

---

### 3. Maximum Duration Limit ✅
```json
// ❌ ERROR (total > 8 hours)
{
  "serviceId": ["bundle1", "bundle2", "bundle3"]  // Total: 500 minutes
}
```
**Error:** "Total booking duration cannot exceed 8 hours"

---

### 4. All Services Must Belong to Shop ✅
```json
// ❌ ERROR
{
  "shopId": "shop1",
  "serviceId": ["shop1_service", "shop2_service"]
}
```
**Error:** "Selected services must belong to the target shop"

---

### 5. Bundle Minimum Amount ✅
```json
// ❌ ERROR (total < ₹300 for bundle/multiple services)
{
  "serviceId": ["service1", "service2"]  // Total: ₹250
}
```
**Error:** "Bundle service amount must be at least ₹300"

**Note:** This applies when:
- Multiple services selected (2 or more)
- OR any service is a bundle

---

## Checking Availability for Multiple Services

### Employee-Specific Availability

**Single Service:**
```http
GET /api/v1/employees/:id/available-slots?date=2026-04-28&serviceId=haircut_id
```

**Multiple Services:**
```http
GET /api/v1/employees/:id/available-slots?date=2026-04-28&serviceId[]=haircut_id&serviceId[]=beard_trim_id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "employeeId": "emp1",
    "employeeName": "John Doe",
    "date": "2026-04-28",
    "services": [
      {
        "id": "haircut_id",
        "name": "Haircut",
        "duration": 30
      },
      {
        "id": "beard_trim_id",
        "name": "Beard Trim",
        "duration": 20
      }
    ],
    "totalDuration": 50,
    "slots": [
      { "time": "09:00", "available": true },
      { "time": "09:30", "available": true },
      { "time": "10:00", "available": false, "reason": "booked" },
      { "time": "10:30", "available": false, "reason": "blocked_by_previous" },
      { "time": "11:00", "available": true }
    ],
    "totalAvailable": 15,
    "totalSlots": 18
  }
}
```

---

### Shop-Wide Availability

**Single Service:**
```http
GET /api/v1/shops/:id/availability?date=2026-04-28&serviceId=haircut_id
```

**Multiple Services:**
```http
GET /api/v1/shops/:id/availability?date=2026-04-28&serviceId[]=haircut_id&serviceId[]=beard_trim_id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shopId": "shop1",
    "shopName": "Elite Salon",
    "date": "2026-04-28",
    "services": [
      {
        "id": "haircut_id",
        "name": "Haircut",
        "duration": 30
      },
      {
        "id": "beard_trim_id",
        "name": "Beard Trim",
        "duration": 20
      }
    ],
    "totalDuration": 50,
    "employees": [
      {
        "employeeId": "emp1",
        "employeeName": "John Doe",
        "availableSlots": ["09:00", "09:30", "11:00"],
        "totalAvailable": 3
      },
      {
        "employeeId": "emp2",
        "employeeName": "Jane Smith",
        "availableSlots": ["10:00", "14:00", "15:00"],
        "totalAvailable": 3
      }
    ],
    "firstAvailable": {
      "employeeId": "emp1",
      "employeeName": "John Doe",
      "time": "09:00"
    }
  }
}
```

---

## Complete Booking Flow

### Step 1: Browse Services
```http
GET /api/v1/shops/:shopId
```

**Response includes:**
- Single services
- Bundled services

---

### Step 2: Select Services
Customer selects one or more services/bundles from the list.

**Frontend Logic:**
```javascript
const selectedServices = [
  "haircut_id",
  "beard_trim_id",
  "grooming_package_id"
];
```

---

### Step 3: Check Availability
```http
GET /api/v1/employees/:employeeId/available-slots?date=2026-04-28&serviceId[]=haircut_id&serviceId[]=beard_trim_id&serviceId[]=grooming_package_id
```

**Backend calculates:**
- Total duration: 30 + 20 + 90 = 140 minutes
- Available slots considering 140-minute duration

---

### Step 4: Create Booking
```http
POST /api/v1/bookings
{
  "shopId": "shop123",
  "employeeId": "emp456",
  "serviceId": ["haircut_id", "beard_trim_id", "grooming_package_id"],
  "date": "2026-04-28",
  "time": "10:00"
}
```

**Backend:**
- Validates all services
- Calculates total price: ₹1250
- Calculates total duration: 140 minutes
- Claims slots: 10:00, 10:30, 11:00, 11:30, 12:00, 12:30
- Creates booking

---

### Step 5: Payment
```http
POST /api/v1/payments/initiate
{
  "bookingId": "booking123"
}
```

**Payment amount:** ₹1250 + platform fees

---

## Bundle Rules

### What is a Bundle Booking?

A booking is considered "bundle" if:
1. **Multiple services selected** (2 or more), OR
2. **Any service has type "bundled"**

### Bundle Minimum

**Rule:** Bundle bookings must have a minimum service amount of ₹300.

**Examples:**

✅ **Valid:**
```json
{
  "serviceId": ["haircut_id", "beard_trim_id"]  // Total: ₹450
}
```

❌ **Invalid:**
```json
{
  "serviceId": ["service1", "service2"]  // Total: ₹250
}
```

**Error:** "Bundle service amount must be at least ₹300"

---

## Frontend Implementation Guide

### Service Selection UI

```javascript
// State
const [selectedServices, setSelectedServices] = useState([]);

// Toggle service selection
const toggleService = (serviceId) => {
  if (selectedServices.includes(serviceId)) {
    setSelectedServices(selectedServices.filter(id => id !== serviceId));
  } else {
    setSelectedServices([...selectedServices, serviceId]);
  }
};

// Calculate totals
const calculateTotals = () => {
  const services = selectedServices.map(id => 
    allServices.find(s => s.id === id)
  );
  
  const totalPrice = services.reduce((sum, s) => 
    sum + (s.finalPrice || s.totalPrice), 0
  );
  
  const totalDuration = services.reduce((sum, s) => 
    sum + (s.duration || s.totalDuration), 0
  );
  
  return { totalPrice, totalDuration };
};
```

---

### Availability Check

```javascript
// Check availability for selected services
const checkAvailability = async (employeeId, date, serviceIds) => {
  const params = new URLSearchParams();
  params.append('date', date);
  serviceIds.forEach(id => params.append('serviceId[]', id));
  
  const response = await fetch(
    `/api/v1/employees/${employeeId}/available-slots?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return response.json();
};
```

---

### Create Booking

```javascript
// Create booking with multiple services
const createBooking = async (bookingData) => {
  const response = await fetch('/api/v1/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      shopId: bookingData.shopId,
      employeeId: bookingData.employeeId,
      serviceId: selectedServices,  // Array of service IDs
      date: bookingData.date,
      time: bookingData.time
    })
  });
  
  return response.json();
};
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Duplicate services are not allowed" | Same service selected twice | Remove duplicates |
| "Cannot select more than 10 services" | Too many services | Reduce selection |
| "Total booking duration cannot exceed 8 hours" | Duration > 480 minutes | Reduce services |
| "Selected services must belong to the target shop" | Service from different shop | Select correct services |
| "Bundle service amount must be at least ₹300" | Total < ₹300 for multiple services | Add more services or select bundle |
| "Employee not available at this date/time" | Slot already booked | Choose different time |

---

## Best Practices

### 1. Show Total Price and Duration
Always display calculated totals before booking:
```
Selected Services:
- Haircut (₹300, 30 min)
- Beard Trim (₹150, 20 min)
- Grooming Package (₹800, 90 min)

Total: ₹1,250
Duration: 140 minutes (2 hours 20 minutes)
```

### 2. Validate Before API Call
```javascript
// Frontend validation
if (selectedServices.length === 0) {
  alert('Please select at least one service');
  return;
}

if (selectedServices.length > 10) {
  alert('Cannot select more than 10 services');
  return;
}

const { totalDuration } = calculateTotals();
if (totalDuration > 480) {
  alert('Total duration cannot exceed 8 hours');
  return;
}
```

### 3. Check Availability First
Always check availability before allowing booking creation:
```javascript
const availability = await checkAvailability(employeeId, date, selectedServices);
if (!availability.data.slots.some(slot => slot.available)) {
  alert('No available slots for selected services');
  return;
}
```

### 4. Handle Bundle Minimum
```javascript
const { totalPrice } = calculateTotals();
if (selectedServices.length > 1 && totalPrice < 300) {
  alert('Total amount must be at least ₹300 for multiple services');
  return;
}
```

---

## Backward Compatibility

### Single Service (Old Format) ✅
```json
{
  "serviceId": "haircut_id"  // Still works
}
```

### Array Format (New Format) ✅
```json
{
  "serviceId": ["haircut_id"]  // Also works
}
```

**Both formats are supported** - no breaking changes.

---

## Summary

### Supported Features ✅
- ✅ Single service selection
- ✅ Multiple service selection
- ✅ Single bundle selection
- ✅ Multiple bundle selection
- ✅ Mixed selection (services + bundles)
- ✅ Automatic price calculation
- ✅ Automatic duration calculation
- ✅ Multi-slot locking
- ✅ Availability check for multiple services
- ✅ Duplicate detection
- ✅ Maximum limits enforcement
- ✅ Bundle minimum validation

### Limits
- Maximum 10 services per booking
- Maximum 8 hours (480 minutes) per booking
- Minimum ₹300 for bundle bookings

---

**Status:** ✅ PRODUCTION READY  
**Last Updated:** April 28, 2026
