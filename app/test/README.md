# Test Suite Documentation

This directory contains comprehensive tests for the Ratings and Services data layer integration.

## Test Structure

```
test/
├── features/
│   ├── ratings/
│   │   ├── data/
│   │   │   ├── data_sources/
│   │   │   │   └── remote/
│   │   │   │       └── rating_remote_data_source_test.dart
│   │   │   └── repositories/
│   │   │       └── rating_repository_test.dart
│   │   └── domain/
│   └── services/
│       ├── data/
│       │   ├── data_sources/
│       │   │   └── remote/
│       │   │       └── service_remote_data_source_test.dart
│       │   └── repositories/
│       │       └── service_repository_test.dart
│       └── domain/
├── integration/
│   ├── ratings_api_integration_test.dart
│   └── services_api_integration_test.dart
└── README.md (this file)
```

## Running Tests

### Unit Tests

Run all unit tests:
```bash
flutter test
```

Run specific feature tests:
```bash
# Ratings tests
flutter test test/features/ratings/

# Services tests
flutter test test/features/services/
```

Run specific test file:
```bash
flutter test test/features/ratings/data/repositories/rating_repository_test.dart
```

### Integration Tests

Integration tests require a running backend server and valid test data.

**Prerequisites:**
1. Start the backend server:
   ```bash
   cd server
   npm start
   ```

2. Seed test data (if needed):
   ```bash
   cd server
   node scripts/seed-barber-rating-mock-data.js
   ```

3. Configure test credentials in integration test files:
   - Update `testShopId` with a valid shop ID
   - Update `testAccessToken` with a valid authentication token

Run integration tests:
```bash
# All integration tests
flutter test test/integration/

# Specific integration test
flutter test test/integration/ratings_api_integration_test.dart
```

### Generate Test Mocks

Before running tests, generate mock classes:
```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

## Test Coverage

### Ratings Feature
- ✅ Remote data source implementation
- ✅ Repository implementation
- ✅ DTO to entity mapping
- ✅ Pagination handling
- ✅ Error handling
- ✅ Authentication flow
- ✅ API contract validation

### Services Feature
- ✅ Remote data source implementation
- ✅ Repository implementation
- ✅ DTO to entity mapping
- ✅ Single service operations
- ✅ Bundled service operations
- ✅ Search functionality
- ✅ CRUD operations

## Test Scenarios Covered

### Ratings
1. **Add Rating** - Customer submits rating for a shop
2. **Get Shop Ratings** - Fetch paginated ratings for a shop (public)
3. **Get Rating Summary** - Fetch aggregated rating statistics
4. **Get Owned Ratings** - Barber fetches their shop's ratings
5. **Add Reply** - Barber replies to a rating
6. **Update Reply** - Barber updates their reply
7. **Delete Reply** - Barber removes their reply
8. **Delete Rating** - Barber removes a rating

### Services
1. **Get Services** - Fetch paginated services with filters
2. **Add Single Service** - Create a single service
3. **Add Bundled Service** - Create a bundled service package
4. **Update Service** - Modify service details
5. **Delete Service** - Soft delete a service
6. **Search Services** - Search services by name and gender

## Error Scenarios Tested

- Invalid shop/service IDs
- Network failures
- Authentication errors (401)
- Authorization errors (403)
- Validation errors (400)
- Conflict errors (409)
- Server errors (500)

## Best Practices

1. **Isolation**: Each test is independent and doesn't rely on other tests
2. **Mocking**: External dependencies are mocked for unit tests
3. **Assertions**: Clear and specific assertions for expected behavior
4. **Cleanup**: Proper setup and teardown for test resources
5. **Documentation**: Each test has clear description of what it tests

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: subosito/flutter-action@v2
      - run: flutter pub get
      - run: flutter pub run build_runner build
      - run: flutter test
```

## Troubleshooting

### Mock Generation Fails
```bash
flutter clean
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

### Integration Tests Fail
1. Verify backend server is running
2. Check API base URL configuration
3. Ensure test data is seeded
4. Verify authentication tokens are valid
5. Check network connectivity

### Test Timeout
Increase timeout in test file:
```dart
test('my test', () async {
  // test code
}, timeout: Timeout(Duration(seconds: 30)));
```

## Adding New Tests

When adding new features:

1. Create test file following the structure above
2. Add unit tests for data sources
3. Add unit tests for repositories
4. Add integration tests for API endpoints
5. Update this README with new test scenarios
6. Run all tests to ensure no regressions

## Code Coverage

Generate coverage report:
```bash
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
```

Target: Maintain >80% code coverage for data layer
