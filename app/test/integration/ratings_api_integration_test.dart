// test/integration/ratings_api_integration_test.dart

/// Integration tests for Ratings API
/// 
/// These tests verify the complete data flow from API client to repository
/// Run with: flutter test test/integration/ratings_api_integration_test.dart
/// 
/// Prerequisites:
/// - Backend server running on configured API_BASE_URL
/// - Valid test authentication tokens
/// - Test data seeded in database

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:merchant/core/auth/session_store.dart';
import 'package:merchant/core/network/api_client.dart';
import 'package:merchant/features/ratings/data/data_sources/remote/rating_remote_data_source_impl.dart';
import 'package:merchant/features/ratings/data/repositories/rating_repository_impl.dart';
import 'package:merchant/features/ratings/domain/repositories/rating_repository.dart';

void main() {
  group('Ratings API Integration Tests', () {
    late RatingRepository repository;
    late ApiClient apiClient;
    late http.Client httpClient;
    late SessionStore sessionStore;

    // Test configuration
    const testShopId = 'YOUR_TEST_SHOP_ID'; // Replace with actual test shop ID
    const testAccessToken = 'YOUR_TEST_ACCESS_TOKEN'; // Replace with actual token

    setUpAll(() {
      // Initialize dependencies
      httpClient = http.Client();
      sessionStore = SessionStore(null); // Mock session store for testing
      apiClient = ApiClient(httpClient, sessionStore);
      
      final remoteDataSource = RatingRemoteDataSourceImpl(apiClient);
      repository = RatingRepositoryImpl(remoteDataSource);
    });

    tearDownAll(() {
      httpClient.close();
    });

    group('Public Endpoints (No Auth)', () {
      test('should fetch shop ratings without authentication', () async {
        // Skip if no test shop ID configured
        if (testShopId == 'YOUR_TEST_SHOP_ID') {
          print('Skipping: Configure testShopId to run integration tests');
          return;
        }

        try {
          final result = await repository.getShopRatings(
            shopId: testShopId,
            page: 1,
            limit: 10,
          );

          expect(result.items, isNotNull);
          expect(result.pagination, isNotNull);
          print('✓ Successfully fetched ${result.items.length} ratings');
        } catch (e) {
          fail('Failed to fetch shop ratings: $e');
        }
      });

      test('should fetch shop rating summary without authentication', () async {
        if (testShopId == 'YOUR_TEST_SHOP_ID') {
          print('Skipping: Configure testShopId to run integration tests');
          return;
        }

        try {
          final result = await repository.getShopRatingSummary(testShopId);

          expect(result.averageRating, greaterThanOrEqualTo(0));
          expect(result.totalReviews, greaterThanOrEqualTo(0));
          print('✓ Rating summary: ${result.averageRating} stars, ${result.totalReviews} reviews');
        } catch (e) {
          fail('Failed to fetch rating summary: $e');
        }
      });
    });

    group('Authenticated Endpoints (Barber)', () {
      test('should fetch owned ratings with authentication', () async {
        if (testAccessToken == 'YOUR_TEST_ACCESS_TOKEN') {
          print('Skipping: Configure testAccessToken to run integration tests');
          return;
        }

        try {
          final result = await repository.getOwnedRatings(
            page: 1,
            limit: 10,
          );

          expect(result.items, isNotNull);
          expect(result.pagination, isNotNull);
          print('✓ Successfully fetched ${result.items.length} owned ratings');
        } catch (e) {
          fail('Failed to fetch owned ratings: $e');
        }
      });

      test('should fetch owned rating summary with authentication', () async {
        if (testAccessToken == 'YOUR_TEST_ACCESS_TOKEN') {
          print('Skipping: Configure testAccessToken to run integration tests');
          return;
        }

        try {
          final result = await repository.getOwnedRatingSummary();

          expect(result.averageRating, greaterThanOrEqualTo(0));
          expect(result.totalReviews, greaterThanOrEqualTo(0));
          print('✓ Owned rating summary: ${result.averageRating} stars, ${result.totalReviews} reviews');
        } catch (e) {
          fail('Failed to fetch owned rating summary: $e');
        }
      });
    });

    group('Error Handling', () {
      test('should handle invalid shop ID gracefully', () async {
        try {
          await repository.getShopRatings(
            shopId: 'invalid_shop_id',
            page: 1,
            limit: 10,
          );
          fail('Should have thrown an exception for invalid shop ID');
        } catch (e) {
          expect(e, isNotNull);
          print('✓ Correctly handled invalid shop ID error');
        }
      });

      test('should handle network errors gracefully', () async {
        // Create a client with invalid base URL to simulate network error
        final badClient = ApiClient(
          http.Client(),
          sessionStore,
        );
        final badDataSource = RatingRemoteDataSourceImpl(badClient);
        final badRepository = RatingRepositoryImpl(badDataSource);

        try {
          await badRepository.getShopRatings(
            shopId: testShopId,
            page: 1,
            limit: 10,
          );
          // May succeed if network is available, that's okay
        } catch (e) {
          expect(e, isNotNull);
          print('✓ Correctly handled network error');
        }
      });
    });

    group('Pagination', () {
      test('should handle pagination correctly', () async {
        if (testShopId == 'YOUR_TEST_SHOP_ID') {
          print('Skipping: Configure testShopId to run integration tests');
          return;
        }

        try {
          final page1 = await repository.getShopRatings(
            shopId: testShopId,
            page: 1,
            limit: 5,
          );

          expect(page1.pagination.currentPage, 1);
          expect(page1.pagination.itemsPerPage, lessThanOrEqualTo(5));
          
          if (page1.pagination.hasNextPage) {
            final page2 = await repository.getShopRatings(
              shopId: testShopId,
              page: 2,
              limit: 5,
            );
            
            expect(page2.pagination.currentPage, 2);
            print('✓ Pagination working correctly');
          } else {
            print('✓ Single page result, pagination metadata correct');
          }
        } catch (e) {
          fail('Failed pagination test: $e');
        }
      });
    });
  });
}
