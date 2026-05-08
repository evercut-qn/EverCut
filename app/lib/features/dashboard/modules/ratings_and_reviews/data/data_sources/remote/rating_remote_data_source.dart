// lib/features/dashboard/modules/ratings_and_reviews/data/data_sources/remote/rating_remote_data_source.dart

import '../../models/rating_dto.dart';
import '../../models/rating_summary_dto.dart';
import '../../../../../../../shared/models/paginated_response.dart';

/// Abstract interface for Rating remote data source
abstract class RatingRemoteDataSource {
  /// Add a new rating for a shop (Customer only)
  Future<RatingDto> addRating({
    required String shopId,
    required int rating,
    String? review,
  });

  /// Get ratings for a specific shop (Public)
  Future<PaginatedResponse<RatingDto>> getShopRatings({
    required String shopId,
    int? page,
    int? limit,
  });

  /// Get rating summary for a specific shop (Public)
  Future<RatingSummaryDto> getShopRatingSummary(String shopId);

  /// Get ratings for barber's own shop (Barber only)
  Future<PaginatedResponse<RatingDto>> getOwnedRatings({
    int? page,
    int? limit,
  });

  /// Get rating summary for barber's own shop (Barber only)
  Future<RatingSummaryDto> getOwnedRatingSummary();

  /// Add reply to a rating (Barber only)
  Future<RatingDto> addReply({
    required String ratingId,
    required String replyText,
  });

  /// Update reply on a rating (Barber only)
  Future<RatingDto> updateReply({
    required String ratingId,
    required String replyText,
  });

  /// Delete reply from a rating (Barber only)
  Future<void> deleteReply(String ratingId);

  /// Delete a rating (Barber only)
  Future<void> deleteRating(String ratingId);
}
