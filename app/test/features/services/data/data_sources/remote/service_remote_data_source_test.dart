// test/features/services/data/data_sources/remote/service_remote_data_source_test.dart

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:merchant/core/auth/session_store.dart';
import 'package:merchant/core/network/api_client.dart';
import 'package:merchant/features/settings/modules/manage_services/data/data_sources/remote/service_remote_data_source_impl.dart';
import 'package:merchant/features/settings/modules/manage_services/data/models/add_service_request.dart';
import 'package:merchant/features/settings/modules/manage_services/data/models/service_dto.dart';
import 'package:merchant/features/settings/modules/manage_services/data/models/update_service_request.dart';
import 'package:merchant/shared/models/paginated_response.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';

import 'service_remote_data_source_test.mocks.dart';

@GenerateMocks([http.Client, SessionStore])
void main() {
  late ServiceRemoteDataSourceImpl dataSource;
  late MockClient mockHttpClient;
  late MockSessionStore mockSessionStore;
  late ApiClient apiClient;

  setUp(() {
    mockHttpClient = MockClient();
    mockSessionStore = MockSessionStore();
    apiClient = ApiClient(mockHttpClient, mockSessionStore);
    dataSource = ServiceRemoteDataSourceImpl(apiClient);
  });

  group('ServiceRemoteDataSource', () {
    const testServiceId = '507f1f77bcf86cd799439011';
    const testShopId = '507f1f77bcf86cd799439012';
    const testAccessToken = 'test_access_token';

    setUp(() {
      when(mockSessionStore.readAccessToken())
          .thenAnswer((_) async => testAccessToken);
    });

    group('getServices', () {
      test('should successfully fetch services with pagination', () async {
        // Arrange
        final responseBody = '''
        {
          "success": true,
          "message": "Services fetched",
          "data": [
            {
              "id": "$testServiceId",
              "shopId": "$testShopId",
              "serviceName": "Haircut",
              "serviceType": "single",
              "serviceFor": "male",
              "imageUrl": "https://example.com/image.jpg",
              "duration": 30,
              "actualPrice": 500,
              "offerPrice": 50,
              "finalPrice": 450,
              "isActive": true,
              "createdAt": "2024-01-01T00:00:00.000Z",
              "updatedAt": "2024-01-01T00:00:00.000Z"
            }
          ],
          "meta": {
            "currentPage": 1,
            "totalPages": 1,
            "totalItems": 1,
            "itemsPerPage": 10,
            "hasNextPage": false,
            "hasPreviousPage": false
          }
        }
        ''';

        when(mockHttpClient.get(
          any,
          headers: anyNamed('headers'),
        )).thenAnswer((_) async => http.Response(responseBody, 200));

        // Act
        final result = await dataSource.getServices(
          page: 1,
          limit: 10,
        );

        // Assert
        expect(result, isA<PaginatedResponse<ServiceDto>>());
        expect(result.items.length, 1);
        expect(result.items.first.serviceName, 'Haircut');
        expect(result.items.first.serviceType, 'single');
        expect(result.pagination.currentPage, 1);
      });
    });

    group('addService', () {
      test('should successfully add a single service', () async {
        // Arrange
        final responseBody = '''
        {
          "success": true,
          "message": "Service added",
          "data": {
            "id": "$testServiceId",
            "shopId": "$testShopId",
            "serviceName": "Beard Trim",
            "serviceType": "single",
            "serviceFor": "male",
            "imageUrl": "https://example.com/beard.jpg",
            "duration": 20,
            "actualPrice": 300,
            "offerPrice": 0,
            "finalPrice": 300,
            "isActive": true,
            "createdAt": "2024-01-01T00:00:00.000Z",
            "updatedAt": "2024-01-01T00:00:00.000Z"
          }
        }
        ''';

        when(mockHttpClient.post(
          any,
          headers: anyNamed('headers'),
          body: anyNamed('body'),
        )).thenAnswer((_) async => http.Response(responseBody, 201));

        final request = const AddServiceRequest(
          serviceName: 'Beard Trim',
          serviceType: 'single',
          serviceFor: 'male',
          actualPrice: 300,
          duration: 20,
        );

        // Act
        final result = await dataSource.addService(request);

        // Assert
        expect(result, isA<ServiceDto>());
        expect(result.serviceName, 'Beard Trim');
        expect(result.actualPrice, 300);
        expect(result.duration, 20);
      });

      test('should successfully add a bundled service', () async {
        // Arrange
        final responseBody = '''
        {
          "success": true,
          "message": "Service added",
          "data": {
            "id": "$testServiceId",
            "shopId": "$testShopId",
            "serviceName": "Grooming Combo",
            "serviceType": "bundled",
            "serviceFor": "male",
            "imageUrl": "https://example.com/combo.jpg",
            "actualPrice": 900,
            "offerPrice": 100,
            "totalPrice": 800,
            "bundledServices": ["Haircut", "Beard Trim", "Head Massage"],
            "totalDuration": 75,
            "isActive": true,
            "createdAt": "2024-01-01T00:00:00.000Z",
            "updatedAt": "2024-01-01T00:00:00.000Z"
          }
        }
        ''';

        when(mockHttpClient.post(
          any,
          headers: anyNamed('headers'),
          body: anyNamed('body'),
        )).thenAnswer((_) async => http.Response(responseBody, 201));

        final request = const AddServiceRequest(
          serviceName: 'Grooming Combo',
          serviceType: 'bundled',
          serviceFor: 'male',
          actualPrice: 900,
          offerPrice: 100,
          bundledServices: ['Haircut', 'Beard Trim', 'Head Massage'],
          totalDuration: 75,
        );

        // Act
        final result = await dataSource.addService(request);

        // Assert
        expect(result, isA<ServiceDto>());
        expect(result.serviceName, 'Grooming Combo');
        expect(result.serviceType, 'bundled');
        expect(result.bundledServices, isNotNull);
        expect(result.bundledServices!.length, 3);
      });
    });

    group('updateService', () {
      test('should successfully update a service', () async {
        // Arrange
        final responseBody = '''
        {
          "success": true,
          "message": "Service updated",
          "data": {
            "id": "$testServiceId",
            "shopId": "$testShopId",
            "serviceName": "Haircut",
            "serviceType": "single",
            "serviceFor": "unisex",
            "imageUrl": "https://example.com/image.jpg",
            "duration": 30,
            "actualPrice": 500,
            "offerPrice": 50,
            "finalPrice": 450,
            "isActive": true,
            "createdAt": "2024-01-01T00:00:00.000Z",
            "updatedAt": "2024-01-02T00:00:00.000Z"
          }
        }
        ''';

        when(mockHttpClient.put(
          any,
          headers: anyNamed('headers'),
          body: anyNamed('body'),
        )).thenAnswer((_) async => http.Response(responseBody, 200));

        final request = const UpdateServiceRequest(
          serviceFor: 'unisex',
        );

        // Act
        final result = await dataSource.updateService(
          serviceId: testServiceId,
          request: request,
        );

        // Assert
        expect(result, isA<ServiceDto>());
        expect(result.serviceFor, 'unisex');
      });
    });

    group('deleteService', () {
      test('should successfully delete a service', () async {
        // Arrange
        final responseBody = '''
        {
          "success": true,
          "message": "Service deleted",
          "data": {
            "message": "Service deleted successfully"
          }
        }
        ''';

        when(mockHttpClient.delete(
          any,
          headers: anyNamed('headers'),
          body: anyNamed('body'),
        )).thenAnswer((_) async => http.Response(responseBody, 200));

        // Act & Assert
        expect(
          () => dataSource.deleteService(testServiceId),
          returnsNormally,
        );
      });
    });
  });
}
