# Booking API - Quick Reference

## Endpoints

### 1. Create Booking
```http
POST /api/v1/bookings
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "shopId": "6634f2a1b8c9d4e5f6a7b8c3",
  "employeeId": "6634f2a1b8c9d4e5f6a7b8c1",
  "serviceId": "6634f2a1b8c9d4e5f6a7b8c2",
  "date": "2026-04-28",
  "time": "10:00"
}
```

**Response:** Booking created with status `PENDING`

---

### 2. Get Pending Confirmations (Barber)
```http
GET /api/v1/bookings/pending-confirmations?page=1&limit=10
Authorization: Bearer <barber_token>
```

**Response:** List of bookings awaiting barber confirmation

---

### 3. Confirm Booking (Barber)
```http
PATCH /api/v1/bookings/:id/confirm
Authorization: Bearer <barber_token>
```

**Requirements:**
- Status must be `AWAITING_CONFIRMATION`
- Payment must be `SUCCESS`

**Response:** Booking status changed to `CONFIRMED`

---

### 4. Cancel Booking

#### Customer Cancellation
```http
DELETE /api/v1/bookings/:id
Authorization: Bearer <customer_token>
```

**Refund:**
- Unpaid: No refund
- Paid: Partial refund (fees deducted)

#### Barber Cancellation
```http
DELETE /api/v1/bookings/:id
Authorization: Bearer <barber_token>
```

**Refund:**
- Unpaid: No refund (booking deleted)
- Paid (awaiting confirmation): **FULL refund** (no fees)
- Paid (confirmed): ❌ Not allowed

---

### 5. Update Booking Status (Barber)
```http
PUT /api/v1/bookings/:id/status
Authorization: Bearer <barber_token>
Content-Type: application/json

{
  "status": "completed"
}
```

**Allowed statuses:** `confirmed`, `completed`, `cancelled`

---

## Refund Comparison

| Scenario | Refund Amount | Example |
|----------|---------------|---------|
| Customer cancels | Total - Fees | ₹303 → ₹293 |
| Barber cancels (before confirm) | Full amount | ₹303 → ₹303 |
| Barber cancels (after confirm) | ❌ Not allowed | - |

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Can only cancel paid bookings that are awaiting confirmation"
}
```

**Common causes:**
- Trying to cancel confirmed booking (barber)
- Trying to cancel completed booking
- Cancelling within 2-hour window (customer)

### 403 Forbidden
```json
{
  "success": false,
  "message": "You can only cancel bookings for your own shop"
}
```

**Cause:** Barber trying to cancel another shop's booking

### 404 Not Found
```json
{
  "success": false,
  "message": "Booking not found"
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid token) |
| 403 | Forbidden (not your resource) |
| 404 | Not Found |
| 500 | Server Error |

---

## Testing Flow

### Happy Path
1. Customer creates booking → `POST /bookings`
2. Customer pays → Payment webhook updates status to `AWAITING_CONFIRMATION`
3. Barber confirms → `PATCH /bookings/:id/confirm`
4. Service delivered → `PUT /bookings/:id/status` (status: completed)

### Barber Cancellation Path
1. Customer creates booking → `POST /bookings`
2. Customer pays → Status: `AWAITING_CONFIRMATION`
3. Barber cancels → `DELETE /bookings/:id`
4. Customer receives full refund

### Customer Cancellation Path
1. Customer creates booking → `POST /bookings`
2. Customer pays → Status: `AWAITING_CONFIRMATION`
3. Barber confirms → `PATCH /bookings/:id/confirm`
4. Customer cancels → `DELETE /bookings/:id`
5. Customer receives partial refund (fees deducted)
