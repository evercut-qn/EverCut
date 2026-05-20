# Transactions API Guide

## Overview

The Transactions API provides barbers with comprehensive access to their earnings history, including detailed transaction records, monthly revenue summaries, and PDF statement downloads. This API is designed to support the mobile app's Transactions screen.

## Features

- **Transaction History**: Paginated list of all completed payment transactions
- **Monthly Revenue Summary**: Current month revenue with percentage change from last month
- **Transaction Details**: Comprehensive view of individual transactions
- **Statement Download**: Export transactions as professional PDF for accounting purposes
- **Filtering**: Filter transactions by status, date range

## Authentication

All endpoints require:
- Valid JWT access token
- User role: `BARBER`

Include the token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Endpoints

### 1. Get Earnings Summary

Retrieve earnings summary with monthly revenue breakdown.

**Endpoint**: `GET /api/v1/earnings`

**Response**:
```json
{
  "success": true,
  "message": "Earnings fetched",
  "data": {
    "totalEarning": 500000,
    "lastMonthEarning": 145000,
    "todayEarning": 5000,
    "monthlyRevenue": {
      "amount": 145000,
      "currency": "INR",
      "changePercentage": 12.5,
      "changeDirection": "up",
      "period": "December 2024"
    }
  }
}
```

**Fields**:
- `totalEarning`: Total earnings across all time (in rupees)
- `lastMonthEarning`: Earnings from last month (in rupees)
- `todayEarning`: Earnings from today (in rupees)
- `monthlyRevenue`: Current month revenue with percentage change from last month
  - `amount`: Current month revenue in rupees
  - `currency`: Currency code (always "INR")
  - `changePercentage`: Absolute percentage change from last month
  - `changeDirection`: "up", "down", or "neutral"
  - `period`: Current month and year

**Example Request**:

```bash
curl -X GET "http://localhost:5000/api/v1/earnings" \
  -H "Authorization: Bearer <token>"
```

---

### 2. Get Transaction History

Retrieve paginated transaction history with monthly revenue summary.

**Endpoint**: `GET /api/v1/earnings/transactions`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 10, max: 100) |
| `status` | string | No | Filter by payment status (completed, refunded, etc.) |
| `startDate` | ISO date | No | Filter from date (inclusive) |
| `endDate` | ISO date | No | Filter to date (inclusive) |

**Response**:
```json
{
  "success": true,
  "message": "Transactions fetched",
  "data": [
    {
      "id": "6756d8e9f1234567890abcde",
      "transactionId": "TXN99201458",
      "customer": {
        "name": "Elena Vance",
        "upiId": "9876543210@upi"
      },
      "amount": 145.00,
      "currency": "INR",
      "status": "completed",
      "timestamp": "2024-12-13T10:30:00.000Z",
      "date": "13 DECEMBER 2024"
    }
  ],
  "meta": {
    "monthlyRevenue": {
      "amount": 145000,
      "currency": "INR",
      "changePercentage": 12.5,
      "changeDirection": "up",
      "period": "December 2024"
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 8,
      "totalDocuments": 150,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Monthly Revenue Calculation**:
- `amount`: Total barber payout for current month (in rupees)
- `changePercentage`: Percentage change from last month (absolute value)
- `changeDirection`: "up", "down", or "neutral"
- `period`: Current month and year

**Example Requests**:

```bash
# Get first page of transactions
curl -X GET "http://localhost:5000/api/v1/earnings/transactions?page=1&limit=20" \
  -H "Authorization: Bearer <token>"

# Filter by date range
curl -X GET "http://localhost:5000/api/v1/earnings/transactions?startDate=2026-01-01&endDate=2026-12-31" \
  -H "Authorization: Bearer <token>"

# Filter by status
curl -X GET "http://localhost:5000/api/v1/earnings/transactions?status=completed" \
  -H "Authorization: Bearer <token>"
```

---

### 3. Get Transaction Detail

Retrieve detailed information about a specific transaction.

**Endpoint**: `GET /api/v1/earnings/transactions/:id`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | ObjectId | Yes | Transaction ID |

**Response**:
```json
{
  "success": true,
  "message": "Transaction detail fetched",
  "data": {
    "id": "6756d8e9f1234567890abcde",
    "transactionId": "TXN99201458",
    "customer": {
      "name": "Alex Johnson"
    },
    "barber": {
      "name": "Alex Johnson"
    },
    "booking": {
      "date": "Oct 24, 2026",
      "time": "10:30 AM"
    },
    "services": [
      {
        "id": "6756d8e9f1234567890abcd2",
        "name": "Haircut",
        "price": 45.00
      },
      {
        "id": "6756d8e9f1234567890abcd3",
        "name": "Beard",
        "price": 20.00
      }
    ],
    "grandTotal": 55.00,
    "taxInclusive": true,
    "paymentStatus": "Successfully Paid",
    "userUpi": "9876543210@upi",
    "currency": "INR",
    "timestamp": "2026-10-24T10:30:00.000Z",
    "paymentMode": "UPI"
  }
}
```

**Example Request**:

```bash
curl -X GET "http://localhost:5000/api/v1/earnings/transactions/6756d8e9f1234567890abcde" \
  -H "Authorization: Bearer <token>"
```

---

### 4. Download Transaction Statement

Download a professional PDF statement of transactions within a date range.

**Endpoint**: `GET /api/v1/earnings/transactions/statement`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | ISO date | Yes | Start date (inclusive) |
| `endDate` | ISO date | Yes | End date (inclusive) |

**PDF Response**:
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="transactions_2026-01-01_to_2026-12-31.pdf"`

**PDF Features**:
- Professional formatting with EverCut branding
- Shop information and barber first/last name
- Statement period and generation date
- Summary statistics (total transactions, total amount, average transaction)
- Detailed transaction table with optimized column widths
- Full transaction IDs displayed (no truncation)
- Indian currency formatting (Rs. 6,150.00)
- Automatic pagination for large datasets
- Color-coded sections for better readability
- Compact design - fits more data per page
- Vertical separators between columns

**Example Request**:

```bash
# Download PDF statement
curl -X GET "http://localhost:5000/api/v1/earnings/transactions/statement?startDate=2026-01-01&endDate=2026-12-31" \
  -H "Authorization: Bearer <token>" \
  --output transactions.pdf
```

---

## Error Responses

All endpoints follow the standard error format:

```json
{
  "success": false,
  "message": "Error description",
  "data": {}
}
```

**Common Error Codes**:

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Not a barber or accessing another shop's data |
| 404 | Not Found - Transaction or shop not found |
| 500 | Internal Server Error |

**Example Error Response**:

```json
{
  "success": false,
  "message": "Transaction not found",
  "data": {}
}
```

---

## Data Models

### Transaction List Item

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Public payment transaction identifier |
| `transactionId` | string | Display transaction ID (e.g., "TXN99201458") |
| `customer.name` | string | Customer full name |
| `customer.upiId` | string | Customer UPI ID (derived from phone) |
| `amount` | number | Transaction amount in rupees |
| `currency` | string | Currency code (always "INR") |
| `status` | string | Payment status |
| `timestamp` | ISO date | Transaction timestamp |
| `date` | string | Formatted date (e.g., "13 DECEMBER 2024") |

### Transaction Detail

| Field | Type | Description |
|-------|------|-------------|
| `customer` | object | Customer information |
| `customer.name` | string | Customer full name |
| `barber` | object | Barber/employee information |
| `barber.name` | string | Barber full name |
| `booking` | object | Booking date and time |
| `booking.date` | string | Formatted date (e.g., "Oct 24, 2026") |
| `booking.time` | string | Booking time slot (e.g., "10:30 AM") |
| `services` | array | List of services with prices |
| `grandTotal` | number | Total amount (service amount) |
| `taxInclusive` | boolean | Whether tax is included |
| `paymentStatus` | string | Human-readable payment status |
| `userUpi` | string | Customer UPI ID |
| `paymentMode` | string | Payment method used |

### Monthly Revenue

| Field | Type | Description |
|-------|------|-------------|
| `amount` | number | Total revenue in rupees |
| `currency` | string | Currency code |
| `changePercentage` | number | Percentage change from last month |
| `changeDirection` | string | "up", "down", or "neutral" |
| `period` | string | Month and year (e.g., "December 2024") |

---

## Business Logic

### Transaction Amount Calculation

The transaction amount shown to barbers is the **barber payout** amount, which is:
- Service amount (excluding platform fee)
- Calculated from `payment.settlement.barberPayout`
- Displayed in rupees (converted from paisa)

### Monthly Revenue Calculation

1. Sum all completed transactions in current month
2. Sum all completed transactions in last month
3. Calculate percentage change: `((current - last) / last) * 100`
4. Determine direction: positive = "up", negative = "down", zero = "neutral"

### Transaction ID Format

- Gateway transaction ID if available (e.g., "TXN99201458")
- Fallback: `TXN` + last 8 characters of payment ID (uppercase)

### Customer UPI ID

- Derived from customer's phone number
- Format: `<last_10_digits>@upi`
- Example: `9876543210@upi`

---

## Integration Notes

### Mobile App Integration

1. **Transaction List Screen**:
   - Call `GET /earnings/transactions` on screen load
   - Display `monthlyRevenue` at the top
   - Render `items` in a scrollable list
   - Implement pagination using `pagination.hasNextPage`

2. **Transaction Detail Screen**:
   - Call `GET /earnings/transactions/:id` when user taps a transaction
   - Display all fields from the response
   - Show services as a list with individual prices

3. **Statement Download**:
   - Call `GET /earnings/transactions/statement` with date range
   - Save the PDF file to device storage
   - Allow user to share or open in external apps

### Filtering Implementation

```javascript
// Example: Filter by date range
const startDate = '2026-01-01';
const endDate = '2026-12-31';
const url = `/api/v1/earnings/transactions?startDate=${startDate}&endDate=${endDate}`;

// Example: Filter by status
const status = 'completed';
const url = `/api/v1/earnings/transactions?status=${status}`;

// Example: Combine filters
const url = `/api/v1/earnings/transactions?status=completed&startDate=2026-01-01&endDate=2026-12-31&page=1&limit=20`;
```

---

## Testing

### Postman Collection

The Postman collection `12-barber-earnings.json` includes:
1. Get Earnings Summary
2. Get Transaction History
3. Get Transaction Detail
4. Download Transaction Statement (PDF)

### Test Data Requirements

To test these endpoints, you need:
1. A barber user account with valid access token
2. A shop profile associated with the barber
3. Completed bookings with successful payments
4. At least one payment transaction in the database

### Sample Test Flow

```bash
# 1. Login as barber
POST /api/v1/auth/login

# 2. Get transaction history
GET /api/v1/earnings/transactions?page=1&limit=10

# 3. Get detail of first transaction
GET /api/v1/earnings/transactions/<transaction_id>

# 4. Download PDF statement
GET /api/v1/earnings/transactions/statement?startDate=2026-01-01&endDate=2026-12-31
```

---

## Performance Considerations

1. **Pagination**: Always use pagination for transaction lists to avoid loading large datasets
2. **Indexing**: The following indexes are already in place:
   - `payment_transactions.shopId`
   - `payment_transactions.status`
   - `payment_transactions.createdAt`
3. **Caching**: Consider caching monthly revenue summary for 1 hour
4. **Query Optimization**: Date range queries use indexed `createdAt` field

---

## Future Enhancements

Potential improvements for future versions:

1. **Custom PDF Branding**: Add shop logo and custom colors to PDF statements
2. **Advanced Filtering**: Add filters for payment mode, amount range
3. **Analytics**: Add charts and graphs for revenue trends
4. **Export Formats**: Support Excel, JSON exports
5. **Email Statements**: Send statements via email
6. **Scheduled Reports**: Automatic monthly statement generation
7. **Transaction Search**: Search by customer name, transaction ID
8. **Refund Tracking**: Separate view for refunded transactions

---

## Support

For issues or questions:
- Check the Postman collection for working examples
- Review error responses for debugging information
- Ensure proper authentication and authorization
- Verify that test data exists in the database
