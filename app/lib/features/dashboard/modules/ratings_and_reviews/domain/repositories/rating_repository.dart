// lib/features/dashboard/modules/ratings_and_reviews/domain/repositories/rating_repository.dart

import '../entities/rating.dart';
import '../entities/rating_summary.dart';
import '../../../../../../shared/models/paginated_response.dart';

/// Abstract repository interface for Rating operations
abstract class RatingRepository {
  /// Add a new rating for a shop (Customer only)
  Future<Rating> addRating({
    required String shopId,
    required int rating,
    String? review,
  });

  /// Get ratings for a specific shop (Public)
  Future<PaginatedResponse<Rating>> getShopRatings({
    required String shopId,
    int? page,
    int? limit,
  });

  /// Get rating summary for a specific shop (Public)
  Future<RatingSummary> getShopRatingSummary(String shopId);

  /// Get ratings for barber's own shop (Barber only)
  Future<PaginatedResponse<Rating>> getOwnedRatings({
    int? page,
    int? limit,
  });

  /// Get rating summary for barber's own shop (Barber only)
  Future<RatingSummary> getOwnedRatingSummary();

  /// Save reply to a rating (Barber only)
  Future<Rating> addReply({
    required String ratingId,
    required String replyText,
  });

  /// Update reply on a rating (Barber only)
  Future<Rating> updateReply({
    required String ratingId,
    required String replyText,
  });

  /// Delete reply from a rating (Barber only)
  Future<void> deleteReply(String ratingId);

  /// Delete a rating (Barber only)
  Future<void> deleteRating(String ratingId);
}
