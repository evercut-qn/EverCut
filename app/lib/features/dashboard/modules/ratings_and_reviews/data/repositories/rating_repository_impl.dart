// lib/features/dashboard/modules/ratings_and_reviews/data/repositories/rating_repository_impl.dart

import '../../domain/entities/rating.dart';
import '../../domain/entities/rating_summary.dart';
import '../../domain/repositories/rating_repository.dart';
import '../../../../../../shared/models/paginated_response.dart';
import '../data_sources/remote/rating_remote_data_source.dart';

class RatingRepositoryImpl implements RatingRepository {
  final RatingRemoteDataSource remoteDataSource;

  const RatingRepositoryImpl(this.remoteDataSource);

  @override
  Future<Rating> addRating({
    required String shopId,
    required int rating,
    String? review,
  }) async {
    final dto = await remoteDataSource.addRating(
      shopId: shopId,
      rating: rating,
      review: review,
    );
    return dto.toDomain();
  }

  @override
  Future<PaginatedResponse<Rating>> getShopRatings({
    required String shopId,
    int? page,
    int? limit,
  }) async {
    final response = await remoteDataSource.getShopRatings(
      shopId: shopId,
      page: page,
      limit: limit,
    );

    final items = response.items.map((dto) => dto.toDomain()).toList();
    return PaginatedResponse(
      items: items,
      pagination: response.pagination,
    );
  }

  @override
  Future<RatingSummary> getShopRatingSummary(String shopId) async {
    final dto = await remoteDataSource.getShopRatingSummary(shopId);
    return dto.toDomain();
  }

  @override
  Future<PaginatedResponse<Rating>> getOwnedRatings({
    int? page,
    int? limit,
  }) async {
    final response = await remoteDataSource.getOwnedRatings(
      page: page,
      limit: limit,
    );

    final items = response.items.map((dto) => dto.toDomain()).toList();
    return PaginatedResponse(
      items: items,
      pagination: response.pagination,
    );
  }

  @override
  Future<RatingSummary> getOwnedRatingSummary() async {
    final dto = await remoteDataSource.getOwnedRatingSummary();
    return dto.toDomain();
  }

  @override
  Future<Rating> addReply({
    required String ratingId,
    required String replyText,
  }) async {
    final dto = await remoteDataSource.addReply(
      ratingId: ratingId,
      replyText: replyText,
    );
    return dto.toDomain();
  }

  @override
  Future<Rating> updateReply({
    required String ratingId,
    required String replyText,
  }) async {
    final dto = await remoteDataSource.updateReply(
      ratingId: ratingId,
      replyText: replyText,
    );
    return dto.toDomain();
  }

  @override
  Future<void> deleteReply(String ratingId) async {
    await remoteDataSource.deleteReply(ratingId);
  }

  @override
  Future<void> deleteRating(String ratingId) async {
    await remoteDataSource.deleteRating(ratingId);
  }
}
