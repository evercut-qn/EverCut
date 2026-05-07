// test/features/ratings/data/data_sources/remote/rating_remote_data_source_test.dart

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:merchant/core/auth/session_store.dart';
import 'package:merchant/core/network/api_client.dart';
import 'package:merchant/features/ratings/data/data_sources/remote/rating_remote_data_source_impl.dart';
import 'package:merchant/features/ratings/data/models/rating_dto.dart';
import 'package:merchant/features/ratings/data/models/rating_summary_dto.dart';
import 'package:merchant/shared/models/paginated_response.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';

import 'rating_remote_data_source_test.mocks.dart';

@GenerateMocks([http.Client, SessionStore])
void main() {
  late RatingRemoteDataSourceImpl dataSource;
  late MockClient mockHttpClient;
  late MockSessionStore mockSessionStore;
  late ApiClient apiClient;

  setUp(() {
    mockHttpClient = MockClient();
    mockSessionStore = MockSessionStore();
    apiClient = ApiClient(mockHttpClient, mockSessionStore);
    dataSource = RatingRemoteDataSourceImpl(apiClient);
  });

  group('RatingRemoteDataSource', () {
    const testShopId = '507f1f77bcf86cd799439011';
    const testRatingId = '507f1f77bcf86cd799439012';
    const testAccessToken = 'test_access_token';

    setUp(() {
      when(mockSessionStore.readAccessToken())
          .thenAnswer((_) async => testAccessToken);
    });

    group('addRating', () {
      test('should successfully add a rating', () async {
        // Arrange
        final responseBody = '''
        {
          "success": true,
          "message": "Rating submitted",
          "data": {
            "id": "$testRatingId",
            "shopId": "$testShopId",
            "rating": 5,
            "review": "Great service!",
            "user": {
              "firstName": "John",
              "lastName": "Doe",
              "photoUrl": null
            },
            "reply": null,
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

        // Act
        final result = await dataSource.addRating(
          shopId: testShopId,
          rating: 5,
          review: 'Great service!',
        );

        // Assert
        expect(result, isA<RatingDto>());
        expect(result.id, testRatingId);
        expect(result.shopId, testShopId);
        expect(result.rating, 5);
        expect(result.review, 'Great service!');
      });
    });

    group('getShopRatings', () {
      test('should successfully fetch shop ratings with pagination', () async {
        // Arrange
        final responseBody = '''
        {
          "success": true,
          "message": "Ratings fetched",
          "data": [
            {
              "id": "$testRatingId",
              "shopId": "$testShopId",
              "rating": 5,
              "review": "Excellent!",
              "user": {
                "firstName": "Jane",
                "lastName": "Smith",
                "photoUrl": null
              },
              "reply": null,
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
        final result = await dataSource.getShopRatings(
          shopId: testShopId,
          page: 1,
          limit: 10,
        );

        // Assert
        expect(result, isA<PaginatedResponse<RatingDto>>());
        expect(result.items.length, 1);
        expect(result.items.first.rating, 5);
        expect(result.pagination.currentPage, 1);
        expect(result.pagination.totalItems, 1);
      });
    });

    group('getShopRatingSummary', () {
      test('should successfully fetch rating summary', () async {
        // Arrange
        final responseBody = '''
        {
          "success": true,
          "message": "Rating summary",
          "data": {
            "averageRating": 4.5,
            "totalReviews": 10,
            "stars": {
              "1": 0,
              "2": 1,
              "3": 2,
              "4": 3,
              "5": 4
            }
          }
        }
        ''';

        when(mockHttpClient.get(
          any,
          headers: anyNamed('headers'),
        )).thenAnswer((_) async => http.Response(responseBody, 200));

        // Act
        final result = await dataSource.getShopRatingSummary(testShopId);

        // Assert
        expect(result, isA<RatingSummaryDto>());
        expect(result.averageRating, 4.5);
        expect(result.totalReviews, 10);
        expect(result.stars[5], 4);
      });
    });

    group('addReply', () {
      test('should successfully save a reply to rating', () async {
        // Arrange
        final responseBody = '''
        {
          "success": true,
          "message": "Reply saved successfully",
          "data": {
            "id": "$testRatingId",
            "shopId": "$testShopId",
            "rating": 5,
            "review": "Great service!",
            "user": {
              "firstName": "John",
              "lastName": "Doe",
              "photoUrl": null
            },
            "reply": {
              "text": "Thank you for your feedback!",
              "repliedAt": "2024-01-02T00:00:00.000Z"
            },
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

        // Act
        final result = await dataSource.addReply(
          ratingId: testRatingId,
          replyText: 'Thank you for your feedback!',
        );

        // Assert
        expect(result, isA<RatingDto>());
        expect(result.reply, isNotNull);
        expect(result.reply!.text, 'Thank you for your feedback!');
      });
    });

    group('deleteRating', () {
      test('should successfully delete a rating', () async {
        // Arrange
        final responseBody = '''
        {
          "success": true,
          "message": "Rating removed",
          "data": {
            "message": "Rating deleted successfully"
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
          () => dataSource.deleteRating(testRatingId),
          returnsNormally,
        );
      });
    });
  });
}
