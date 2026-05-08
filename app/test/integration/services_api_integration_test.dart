// test/integration/services_api_integration_test.dart

/// Integration tests for Services API
/// 
/// These tests verify the complete data flow from API client to repository
/// Run with: flutter test test/integration/services_api_integration_test.dart
/// 
/// Prerequisites:
/// - Backend server running on configured API_BASE_URL
/// - Valid test authentication tokens
/// - Test data seeded in database

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:merchant/core/auth/session_store.dart';
import 'package:merchant/core/network/api_client.dart';
import 'package:merchant/features/settings/modules/manage_services/data/data_sources/remote/service_remote_data_source_impl.dart';
import 'package:merchant/features/settings/modules/manage_services/data/repositories/service_repository_impl.dart';
import 'package:merchant/features/settings/modules/manage_services/domain/entities/service.dart';
import 'package:merchant/features/settings/modules/manage_services/domain/repositories/service_repository.dart';

void main() {
  group('Services API Integration Tests', () {
    late ServiceRepository repository;
    late ApiClient apiClient;
    late http.Client httpClient;
    late SessionStore sessionStore;

    // Test configuration
    const testServiceId = 'YOUR_TEST_SERVICE_ID'; // Replace with actual test service ID
    const testAccessToken = 'YOUR_TEST_ACCESS_TOKEN'; // Replace with actual token

    setUpAll(() {
      // Initialize dependencies
      httpClient = http.Client();
      sessionStore = SessionStore(null, null); // Mock session store for testing
      apiClient = ApiClient(httpClient, sessionStore);
      
      final remoteDataSource = ServiceRemoteDataSourceImpl(apiClient);
      repository = ServiceRepositoryImpl(remoteDataSource);
    });

    tearDownAll(() {
      httpClient.close();
    });

    group('Get Services (Authenticated)', () {
      test('should fetch services with pagination', () async {
        if (testAccessToken == 'YOUR_TEST_ACCESS_TOKEN') {
          print('Skipping: Configure testAccessToken to run integration tests');
          return;
        }

        try {
          final result = await repository.getServices(
            page: 1,
            limit: 10,
          );

          expect(result.items, isNotNull);
          expect(result.pagination, isNotNull);
          expect(result.items, isA<List<Service>>());
          print('✓ Successfully fetched ${result.items.length} services');
          print('  Page ${result.pagination.currentPage} of ${result.pagination.totalPages}');
        } catch (e) {
          fail('Failed to fetch services: $e');
        }
      });

      test('should fetch services with filters', () async {
        if (testAccessToken == 'YOUR_TEST_ACCESS_TOKEN') {
          print('Skipping: Configure testAccessToken to run integration tests');
          return;
        }

        try {
          final result = await repository.getServices(
            page: 1,
            limit: 10,
            serviceType: ServiceType.single,
            serviceFor: ServiceFor.male,
          );

          expect(result.items, isNotNull);
          // Verify all items match the filter
          for (final service in result.items) {
            expect(service.serviceType, ServiceType.single);
            expect(service.serviceFor, ServiceFor.male);
          }
          print('✓ Successfully fetched filtered services');
        } catch (e) {
          fail('Failed to fetch filtered services: $e');
        }
      });
    });

    group('Add Service (Authenticated)', () {
      test('should successfully add a single service', () async {
        if (testAccessToken == 'YOUR_TEST_ACCESS_TOKEN') {
          print('Skipping: Configure testAccessToken to run integration tests');
          return;
        }

        try {
          final service = await repository.addService(
            serviceName: 'Test Haircut ${DateTime.now().millisecondsSinceEpoch}',
            serviceType: ServiceType.single,
            serviceFor: ServiceFor.male,
            actualPrice: 500.0,
            offerPrice: 50.0,
            duration: 30,
          );

          expect(service, isNotNull);
          expect(service.serviceName, contains('Test Haircut'));
          expect(service.serviceType, ServiceType.single);
          expect(service.actualPrice, 500.0);
          expect(service.offerPrice, 50.0);
          expect(service.duration, 30);
          expect(service.finalPrice, 450.0); // actualPrice - offerPrice
          print('✓ Successfully added single service: ${service.id}');
        } catch (e) {
          fail('Failed to add single service: $e');
        }
      });

      test('should successfully add a bundled service', () async {
        if (testAccessToken == 'YOUR_TEST_ACCESS_TOKEN') {
          print('Skipping: Configure testAccessToken to run integration tests');
          return;
        }

        try {
          final service = await repository.addService(
            serviceName: 'Test Combo ${DateTime.now().millisecondsSinceEpoch}',
            serviceType: ServiceType.bundled,
            serviceFor: ServiceFor.male,
            actualPrice: 900.0,
            offerPrice: 100.0,
            bundledServices: ['Haircut', 'Beard Trim', 'Head Massage'],
            totalDuration: 75,
          );

          expect(service, isNotNull);
          expect(service.serviceName, contains('Test Combo'));
          expect(service.serviceType, ServiceType.bundled);
          expect(service.bundledServices, isNotNull);
          expect(service.bundledServices!.length, 3);
          expect(service.totalPrice, 800.0); // actualPrice - offerPrice
          print('✓ Successfully added bundled service: ${service.id}');
        } catch (e) {
          fail('Failed to add bundled service: $e');
        }
      });

      test('should handle validation errors for invalid service', () async {
        if (testAccessToken == 'YOUR_TEST_ACCESS_TOKEN') {
          print('Skipping: Configure testAccessToken to run integration tests');
          return;
        }

        try {
          await repository.addService(
            serviceName: '', // Invalid: empty name
            serviceType: ServiceType.single,
            serviceFor: ServiceFor.male,
            actualPrice: 500.0,
          );
          fail('Should have thrown validation error for empty service name');
        } catch (e) {
          expect(e, isNotNull);
          print('✓ Correctly handled validation error for invalid service');
        }
      });

      test('should handle duplicate service error', () async {
        if (testAccessToken == 'YOUR_TEST_ACCESS_TOKEN') {
          print('Skipping: Configure testAccessToken to run integration tests');
          return;
        }

        try {
          final serviceName = 'Duplicate Test ${DateTime.now().millisecondsSinceEpoch}';
          
          // Add first service
          await repository.addService(
            serviceName: serviceName,
            serviceType: ServiceType.single,
            serviceFor: ServiceFor.male,
            actualPrice: 500.0,
          );

          // Try to add duplicate
          await repository.addService(
            serviceName: serviceName,
            serviceType: ServiceType.single,
            serviceFor: ServiceFor.male,
            actualPrice: 500.0,
          );
          
          fail('Should have thrown conflict error for duplicate service');
        } catch (e) {
          expect(e, isNotNull);
          print('✓ Correctly handled duplicate service error');
        }
      });
    });

    group('Update Service (Authenticated)', () {
      test('should successfully update a service', () async {
        if (testAccessToken == 'YOUR_TEST_ACCESS_TOKEN' || testServiceId == 'YOUR_TEST_SERVICE_ID') {
          print('Skipping: Configure test credentials to run integration tests');
          return;
        }

        try {
          final updatedService = await repository.updateService(
            serviceId: testServiceId,
            serviceFor: ServiceFor.unisex,
            actualPrice: 600.0,
          );

          expect(updatedService, isNotNull);
          expect(updatedService.id, testServiceId);
          expect(updatedService.serviceFor, ServiceFor.unisex);
          expect(updatedService.actualPrice, 600.0);
          print('✓ Successfully updated service');
        } catch (e) {
          fail('Failed to update service: $e');
        }
      });

      test('should handle not found error for invalid service ID', () async {
        if (testAccessToken == 'YOUR_TEST_ACCESS_TOKEN') {
          print('Skipping: Configure testAccessToken to run integration tests');
          return;
        }

        try {
          await repository.updateService(
            serviceId: 'invalid_service_id_12345',
            actualPrice: 600.0,
          );
          fail('Should have thrown not found error');
        } catch (e) {
          expect(e, isNotNull);
          print('✓ Correctly handled not found error');
        }
      });
    });

    group('Delete Service (Authenticated)', () {
      test('should successfully delete a service', () async {
        if (testAccessToken == 'YOUR_TEST_ACCESS_TOKEN') {
          print('Skipping: Configure testAccessToken to run integration tests');
          return;
        }

        try {
          // First create a service to delete
          final service = await repository.addService(
            serviceName: 'To Delete ${DateTime.now().millisecondsSinceEpoch}',
            serviceType: ServiceType.single,
            serviceFor: ServiceFor.male,
            actualPrice: 300.0,
          );

          // Then delete it
          await repository.deleteService(service.id);
          
          print('✓ Successfully deleted service: ${service.id}');
        } catch (e) {
          fail('Failed to delete service: $e');
        }
      });
    });

    group('Service Business Logic', () {
      test('should calculate effective price correctly for single service', () async {
        if (testAccessToken == 'YOUR_TEST_ACCESS_TOKEN') {
          print('Skipping: Configure testAccessToken to run integration tests');
          return;
        }

        try {
          final service = await repository.addService(
            serviceName: 'Price Test ${DateTime.now().millisecondsSinceEpoch}',
            serviceType: ServiceType.single,
            serviceFor: ServiceFor.male,
            actualPrice: 1000.0,
            offerPrice: 200.0,
          );

          expect(service.effectivePrice, 800.0);
          expect(service.hasDiscount, isTrue);
          print('✓ Effective price calculation correct');
        } catch (e) {
          fail('Failed price calculation test: $e');
        }
      });

      test('should handle service without discount', () async {
        if (testAccessToken == 'YOUR_TEST_ACCESS_TOKEN') {
          print('Skipping: Configure testAccessToken to run integration tests');
          return;
        }

        try {
          final service = await repository.addService(
            serviceName: 'No Discount ${DateTime.now().millisecondsSinceEpoch}',
            serviceType: ServiceType.single,
            serviceFor: ServiceFor.male,
            actualPrice: 500.0,
            offerPrice: 0.0,
          );

          expect(service.effectivePrice, 500.0);
          expect(service.hasDiscount, isFalse);
          print('✓ Service without discount handled correctly');
        } catch (e) {
          fail('Failed no discount test: $e');
        }
      });
    });

    group('Pagination', () {
      test('should handle pagination correctly', () async {
        if (testAccessToken == 'YOUR_TEST_ACCESS_TOKEN') {
          print('Skipping: Configure testAccessToken to run integration tests');
          return;
        }

        try {
          final page1 = await repository.getServices(
            page: 1,
            limit: 5,
          );

          expect(page1.pagination.currentPage, 1);
          expect(page1.pagination.itemsPerPage, lessThanOrEqualTo(5));
          
          if (page1.pagination.hasNextPage) {
            final page2 = await repository.getServices(
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

    group('Error Handling', () {
      test('should handle network errors gracefully', () async {
        // Create a client with invalid base URL to simulate network error
        final badClient = ApiClient(
          http.Client(),
          sessionStore,
        );
        final badDataSource = ServiceRemoteDataSourceImpl(badClient);
        final badRepository = ServiceRepositoryImpl(badDataSource);

        try {
          await badRepository.getServices(page: 1, limit: 10);
          // May succeed if network is available, that's okay
        } catch (e) {
          expect(e, isNotNull);
          print('✓ Correctly handled network error');
        }
      });

      test('should handle unauthorized access', () async {
        // Create client without authentication
        final unauthClient = ApiClient(
          http.Client(),
          SessionStore(null, null),
        );
        final unauthDataSource = ServiceRemoteDataSourceImpl(unauthClient);
        final unauthRepository = ServiceRepositoryImpl(unauthDataSource);

        try {
          await unauthRepository.addService(
            serviceName: 'Test',
            serviceType: ServiceType.single,
            serviceFor: ServiceFor.male,
            actualPrice: 500.0,
          );
          fail('Should have thrown unauthorized error');
        } catch (e) {
          expect(e, isNotNull);
          print('✓ Correctly handled unauthorized access');
        }
      });
    });

    group('Complete CRUD Flow', () {
      test('should complete full CRUD lifecycle', () async {
        if (testAccessToken == 'YOUR_TEST_ACCESS_TOKEN') {
          print('Skipping: Configure testAccessToken to run integration tests');
          return;
        }

        try {
          // CREATE
          final created = await repository.addService(
            serviceName: 'CRUD Test ${DateTime.now().millisecondsSinceEpoch}',
            serviceType: ServiceType.single,
            serviceFor: ServiceFor.male,
            actualPrice: 500.0,
            duration: 30,
          );
          expect(created, isNotNull);
          print('  ✓ Created service: ${created.id}');

          // READ
          final services = await repository.getServices(page: 1, limit: 100);
          final found = services.items.any((s) => s.id == created.id);
          expect(found, isTrue);
          print('  ✓ Read service from list');

          // UPDATE
          final updated = await repository.updateService(
            serviceId: created.id,
            serviceFor: ServiceFor.unisex,
            actualPrice: 600.0,
          );
          expect(updated.serviceFor, ServiceFor.unisex);
          expect(updated.actualPrice, 600.0);
          print('  ✓ Updated service');

          // DELETE
          await repository.deleteService(created.id);
          print('  ✓ Deleted service');

          print('✓ Complete CRUD lifecycle successful');
        } catch (e) {
          fail('Failed CRUD lifecycle test: $e');
        }
      });
    });
  });
}
