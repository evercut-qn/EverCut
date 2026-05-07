// test/features/ratings/data/repositories/rating_repository_test.dart

import 'package:flutter_test/flutter_test.dart';
import 'package:merchant/features/ratings/data/data_sources/remote/rating_remote_data_source.dart';
import 'package:merchant/features/ratings/data/models/rating_dto.dart';
import 'package:merchant/features/ratings/data/models/rating_summary_dto.dart';
import 'package:merchant/features/ratings/data/repositories/rating_repository_impl.dart';
import 'package:merchant/features/ratings/domain/entities/rating.dart';
import 'package:merchant/features/ratings/domain/entities/rating_summary.dart';
import 'package:merchant/shared/models/paginated_response.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';

import 'rating_repository_test.mocks.dart';

@GenerateMocks([RatingRemoteDataSource])
void main() {
  late RatingRepositoryImpl repository;
  late MockRatingRemoteDataSource mockRemoteDataSource;

  setUp(() {
    mockRemoteDataSource = MockRatingRemoteDataSource();
    repository = RatingRepositoryImpl(mockRemoteDataSource);
  });

  group('RatingRepository', () {
    const testShopId = '507f1f77bcf86cd799439011';
    const testRatingId = '507f1f77bcf86cd799439012';

    final testRatingDto = RatingDto(
      id: testRatingId,
      shopId: testShopId,
      rating: 5,
      review: 'Great service!',
      user: const RatingUserDto(
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: null,
      ),
      reply: null,
      createdAt: DateTime.parse('2024-01-01T00:00:00.000Z'),
      updatedAt: DateTime.parse('2024-01-01T00:00:00.000Z'),
    );

    group('addRating', () {
      test('should return Rating entity when remote call succeeds', () async {
        // Arrange
        when(mockRemoteDataSource.addRating(
          shopId: anyNamed('shopId'),
          rating: anyNamed('rating'),
          review: anyNamed('review'),
        )).thenAnswer((_) async => testRatingDto);

        // Act
        final result = await repository.addRating(
          shopId: testShopId,
          rating: 5,
          review: 'Great service!',
        );

        // Assert
        expect(result, isA<Rating>());
        expect(result.id, testRatingId);
        expect(result.rating, 5);
        verify(mockRemoteDataSource.addRating(
          shopId: testShopId,
          rating: 5,
          review: 'Great service!',
        )).called(1);
      });
    });

    group('getShopRatings', () {
      test('should return paginated ratings when remote call succeeds',
          () async {
        // Arrange
        final paginatedDto = PaginatedResponse<RatingDto>(
          items: [testRatingDto],
          pagination: const PaginationMeta(
            currentPage: 1,
            totalPages: 1,
            totalItems: 1,
            itemsPerPage: 10,
            hasNextPage: false,
            hasPreviousPage: false,
          ),
        );

        when(mockRemoteDataSource.getShopRatings(
          shopId: anyNamed('shopId'),
          page: anyNamed('page'),
          limit: anyNamed('limit'),
        )).thenAnswer((_) async => paginatedDto);

        // Act
        final result = await repository.getShopRatings(
          shopId: testShopId,
          page: 1,
          limit: 10,
        );

        // Assert
        expect(result, isA<PaginatedResponse<Rating>>());
        expect(result.items.length, 1);
        expect(result.items.first, isA<Rating>());
        expect(result.pagination.currentPage, 1);
      });
    });

    group('getShopRatingSummary', () {
      test('should return RatingSummary entity when remote call succeeds',
          () async {
        // Arrange
        final summaryDto = const RatingSummaryDto(
          averageRating: 4.5,
          totalReviews: 10,
          stars: {1: 0, 2: 1, 3: 2, 4: 3, 5: 4},
        );

        when(mockRemoteDataSource.getShopRatingSummary(any))
            .thenAnswer((_) async => summaryDto);

        // Act
        final result = await repository.getShopRatingSummary(testShopId);

        // Assert
        expect(result, isA<RatingSummary>());
        expect(result.averageRating, 4.5);
        expect(result.totalReviews, 10);
        expect(result.fiveStarCount, 4);
      });
    });

    group('addReply', () {
      test('should return updated Rating with reply when remote call succeeds',
          () async {
        // Arrange
        final ratingWithReply = RatingDto(
          id: testRatingId,
          shopId: testShopId,
          rating: 5,
          review: 'Great service!',
          user: const RatingUserDto(
            firstName: 'John',
            lastName: 'Doe',
            photoUrl: null,
          ),
          reply: RatingReplyDto(
            text: 'Thank you!',
            repliedAt: DateTime.parse('2024-01-02T00:00:00.000Z'),
          ),
          createdAt: DateTime.parse('2024-01-01T00:00:00.000Z'),
          updatedAt: DateTime.parse('2024-01-02T00:00:00.000Z'),
        );

        when(mockRemoteDataSource.addReply(
          ratingId: anyNamed('ratingId'),
          replyText: anyNamed('replyText'),
        )).thenAnswer((_) async => ratingWithReply);

        // Act
        final result = await repository.addReply(
          ratingId: testRatingId,
          replyText: 'Thank you!',
        );

        // Assert
        expect(result, isA<Rating>());
        expect(result.reply, isNotNull);
        expect(result.reply!.text, 'Thank you!');
      });
    });

    group('deleteRating', () {
      test('should complete successfully when remote call succeeds', () async {
        // Arrange
        when(mockRemoteDataSource.deleteRating(any))
            .thenAnswer((_) async => {});

        // Act & Assert
        expect(
          () => repository.deleteRating(testRatingId),
          returnsNormally,
        );
        verify(mockRemoteDataSource.deleteRating(testRatingId)).called(1);
      });
    });
  });
}
