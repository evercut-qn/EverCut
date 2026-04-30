# Earnings & Transactions Feature

## Overview

The Earnings & Transactions feature provides barbers with comprehensive financial tracking and reporting capabilities. This feature enables barbers to:

- View real-time earnings summaries
- Access detailed transaction history
- Track monthly revenue trends
- Download financial statements
- Monitor payment statuses

## Architecture

### Components

```
┌────────────────────────────────────────────────────────────┐
│                     Mobile App (Flutter)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Transactions │  │ Transaction  │  │  Statement   │      │
│  │    Screen    │  │    Detail    │  │   Download   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│                      Backend API Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Earnings   │  │ Transaction  │  │  Statement   │      │
│  │  Controller  │  │  Controller  │  │  Controller  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Earnings Service                           │   │
│  │  • getEarnings()                                     │   │
│  │  • getTransactions()                                 │   │
│  │  • getTransactionDetail()                            │   │
│  │  • generateStatement()                               │   │
│  │  • calculateMonthlyRevenue()                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│                   Repository Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Payment    │  │   Booking    │  │     Shop     │      │
│  │  Repository  │  │  Repository  │  │  Repository  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│                      Database (MongoDB)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   payment_   │  │   bookings   │  │    shops     │      │
│  │ transactions │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────────────────────────────────────┘
```

## API Endpoints

### 1. Earnings Summary
```
GET /api/v1/earnings
```
Returns total, last month, and today's earnings.

### 2. Transaction History
```
GET /api/v1/earnings/transactions
```
Returns paginated transaction list with monthly revenue summary.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by payment status
- `startDate` (ISO date): Filter from date
- `endDate` (ISO date): Filter to date

### 3. Transaction Detail
```
GET /api/v1/earnings/transactions/:id
```
Returns detailed information about a specific transaction.

### 4. Download Statement
```
GET /api/v1/earnings/transactions/statement
```
Downloads professional PDF statement of transactions.

**Query Parameters:**
- `startDate` (ISO date, required): Start date
- `endDate` (ISO date, required): End date

## Data Models

### Transaction List Item
```javascript
{
  _id: ObjectId,
  transactionId: string,        // Display ID (e.g., "TXN99201458")
  customer: {
    name: string,
    upiId: string
  },
  amount: number,                // In rupees
  currency: string,              // "INR"
  status: string,                // Payment status
  timestamp: Date,
  date: string                   // Formatted date
}
```

### Transaction Detail
```javascript
{
  _id: ObjectId,
  transactionId: string,
  customer: {
    _id: ObjectId,
    name: string,
    customerId: string           // Display ID (e.g., "#C-A123CXZ")
  },
  barber: {
    _id: ObjectId,
    name: string,
    barberId: string             // Display ID (e.g., "#B-X734STL")
  },
  booking: {
    date: string,                // Formatted date
    time: string                 // Formatted time
  },
  services: [{
    _id: ObjectId,
    name: string,
    price: number
  }],
  grandTotal: number,
  taxInclusive: boolean,
  paymentStatus: string,
  transactionId: string,
  userUpi: string,
  currency: string,
  timestamp: Date,
  paymentMode: string
}
```

### Monthly Revenue
```javascript
{
  amount: number,                // Total revenue in rupees
  currency: string,              // "INR"
  changePercentage: number,      // Absolute percentage change
  changeDirection: string,       // "up", "down", or "neutral"
  period: string                 // "December 2024"
}
```

## Business Logic

### Revenue Calculation

1. **Monthly Revenue**: Sum of all completed payment transactions in current month
2. **Percentage Change**: `((current - last) / last) * 100`
3. **Direction**: 
   - "up" if positive change
   - "down" if negative change
   - "neutral" if no change

### Transaction Amount

The amount shown to barbers is the **barber payout** amount:
- Excludes platform fees
- Calculated from `payment.settlement.barberPayout`
- Displayed in rupees (converted from paisa)

### Display ID Generation

- **Customer ID**: `#C-` + last 7 characters of ObjectId (uppercase)
- **Barber ID**: `#B-` + last 7 characters of ObjectId (uppercase)
- **Transaction ID**: Gateway transaction ID or `TXN` + last 8 characters of payment ID

### UPI ID Format

Customer UPI ID is derived from phone number:
- Format: `<last_10_digits>@upi`
- Example: `9876543210@upi`

## Security

### Authentication
- All endpoints require valid JWT access token
- Token must be included in Authorization header

### Authorization
- Only users with `BARBER` role can access these endpoints
- Barbers can only view transactions for their own shop
- Cross-shop access is blocked with 403 Forbidden

### Data Access Control
```javascript
// Verify shop ownership
const shop = await shopRepository.findByOwnerId(ownerId);
if (toObjectIdString(payment.shopId) !== toObjectIdString(shop._id)) {
  throw new ForbiddenError('You can only access transactions for your own shop');
}
```

## Database Queries

### Indexes Used
```javascript
// payment_transactions collection
{ shopId: 1 }
{ status: 1 }
{ createdAt: 1 }
{ status: 1, createdAt: 1 }
```

### Query Optimization
- Pagination prevents loading large datasets
- Date range queries use indexed `createdAt` field
- Status filters use indexed `status` field
- Shop filters use indexed `shopId` field

## Error Handling

### Common Errors

| Error | Status | Description |
|-------|--------|-------------|
| NotFoundError | 404 | Shop, transaction, or booking not found |
| ForbiddenError | 403 | Accessing another shop's data |
| BadRequestError | 400 | Invalid query parameters |
| UnauthorizedError | 401 | Missing or invalid token |

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "data": {}
}
```

## Testing

### Unit Tests
Located in `server/src/services/__tests__/earnings.service.test.js`

### Integration Tests
Use Postman collection: `12-barber-earnings.json`

### Test Data Requirements
1. Barber user account with valid token
2. Shop profile associated with barber
3. Completed bookings with successful payments
4. Payment transactions in database

### Sample Test Flow
```bash
# 1. Login as barber
POST /api/v1/auth/login
{
  "phoneNumber": "+919876543210",
  "otp": "123456"
}

# 2. Get transaction history
GET /api/v1/earnings/transactions?page=1&limit=10

# 3. Get transaction detail
GET /api/v1/earnings/transactions/<transaction_id>

# 4. Download statement
GET /api/v1/earnings/transactions/statement?startDate=2024-01-01&endDate=2024-12-31
```

## Performance Considerations

### Optimization Strategies

1. **Pagination**: Always use pagination for transaction lists
2. **Indexing**: Leverage existing database indexes
3. **Caching**: Consider caching monthly revenue for 1 hour
4. **Query Limits**: Enforce maximum page size (100 items)
5. **Projection**: Only fetch required fields from database

### Performance Metrics

- Transaction list query: < 100ms
- Transaction detail query: < 50ms
- Monthly revenue calculation: < 200ms
- Statement generation: < 500ms (for 1000 transactions)

## Mobile App Integration

### Transaction List Screen

```dart
// Fetch transactions
final response = await api.get(
  '/earnings/transactions',
  queryParameters: {
    'page': 1,
    'limit': 20,
  },
);

// Display monthly revenue
final monthlyRevenue = response.data['monthlyRevenue'];
print('Revenue: ₹${monthlyRevenue['amount']}');
print('Change: ${monthlyRevenue['changePercentage']}% ${monthlyRevenue['changeDirection']}');

// Display transactions
final transactions = response.data['items'];
for (var transaction in transactions) {
  print('${transaction['customer']['name']}: ₹${transaction['amount']}');
}
```

### Transaction Detail Screen

```dart
// Fetch transaction detail
final response = await api.get('/earnings/transactions/$transactionId');
final transaction = response.data;

// Display customer info
print('Customer: ${transaction['customer']['name']}');
print('Customer ID: ${transaction['customer']['customerId']}');

// Display services
for (var service in transaction['services']) {
  print('${service['name']}: ₹${service['price']}');
}

// Display total
print('Grand Total: ₹${transaction['grandTotal']}');
```

### Statement Download

```dart
// Download statement
final response = await api.get(
  '/earnings/transactions/statement',
  queryParameters: {
    'startDate': '2024-01-01',
    'endDate': '2024-12-31',
  },
  options: Options(responseType: ResponseType.bytes),
);

// Save to file
final file = File('${directory.path}/transactions.pdf');
await file.writeAsBytes(response.data);
```

## Filtering Implementation

### Date Range Filter
```javascript
// Frontend
const startDate = '2024-01-01';
const endDate = '2024-12-31';
const url = `/api/v1/earnings/transactions?startDate=${startDate}&endDate=${endDate}`;

// Backend
if (query.startDate || query.endDate) {
  filter.createdAt = {};
  if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
  if (query.endDate) {
    const endDate = new Date(query.endDate);
    endDate.setHours(23, 59, 59, 999);
    filter.createdAt.$lte = endDate;
  }
}
```

### Status Filter
```javascript
// Frontend
const status = 'completed';
const url = `/api/v1/earnings/transactions?status=${status}`;

// Backend
if (query.status) {
  filter.status = query.status;
}
```

## Monitoring & Logging

### Key Metrics to Track

1. **API Performance**
   - Response times for each endpoint
   - Query execution times
   - Database query performance

2. **Usage Patterns**
   - Number of transaction list requests per day
   - Number of statement downloads per day
   - Most common filter combinations

3. **Error Rates**
   - 404 errors (missing transactions)
   - 403 errors (unauthorized access attempts)
   - 500 errors (server errors)

### Logging Examples

```javascript
logger.info('[EarningsService] Transaction history fetched', {
  shopId: shop._id,
  page: query.page,
  limit: query.limit,
  totalTransactions: total,
});

logger.error('[EarningsService] Failed to generate statement', {
  shopId: shop._id,
  startDate: query.startDate,
  endDate: query.endDate,
  error: error.message,
});
```

## Future Enhancements

### Planned Features

1. **Advanced Analytics**: Charts and graphs for revenue trends
2. **Email Statements**: Automatic monthly statement emails
3. **Custom PDF Branding**: Add shop logo and custom colors to PDF statements
4. **Transaction Search**: Search by customer name, transaction ID
5. **Refund Tracking**: Separate view for refunded transactions
6. **Export Formats**: Support Excel, JSON exports
7. **Scheduled Reports**: Automatic weekly/monthly reports
8. **Revenue Forecasting**: Predict future revenue based on trends

### Technical Improvements

1. **Caching**: Implement Redis caching for monthly revenue
2. **Background Jobs**: Generate statements asynchronously
3. **Webhooks**: Notify external systems of new transactions
4. **GraphQL**: Add GraphQL support for flexible queries
5. **Real-time Updates**: WebSocket support for live transaction updates

## Documentation

- [API Guide](./TRANSACTIONS-API-GUIDE.md) - Detailed API documentation
- [Postman Collection](../../postman-collections/12-barber-earnings.json) - API testing collection
- [Architecture Guide](../../architecture/API-REFACTORING-GUIDE.md) - Overall architecture

## Support

For issues or questions:
- Review the API Guide for detailed endpoint documentation
- Check Postman collection for working examples
- Verify authentication and authorization
- Ensure test data exists in database
- Check server logs for error details

## Changelog

### Version 2.1.0 (Current)
- ✅ Added transaction history endpoint
- ✅ Added transaction detail endpoint
- ✅ Added statement download endpoint
- ✅ Added monthly revenue calculation
- ✅ Added filtering by status and date range
- ✅ Added comprehensive documentation
- ✅ Added Postman collection

### Version 2.0.0
- ✅ Basic earnings summary endpoint
- ✅ Dashboard overview endpoint
