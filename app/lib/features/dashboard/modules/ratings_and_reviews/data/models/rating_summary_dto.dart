// lib/features/dashboard/modules/ratings_and_reviews/data/models/rating_summary_dto.dart

import '../../domain/entities/rating_summary.dart';

/// Data Transfer Object for Rating Summary
class RatingSummaryDto {
  final double averageRating;
  final int totalReviews;
  final Map<int, int> stars;

  const RatingSummaryDto({
    required this.averageRating,
    required this.totalReviews,
    required this.stars,
  });

  factory RatingSummaryDto.fromJson(Map<String, dynamic> json) {
    final starsMap = json['stars'] as Map<String, dynamic>;
    return RatingSummaryDto(
      averageRating: (json['averageRating'] as num).toDouble(),
      totalReviews: json['totalReviews'] as int,
      stars: {
        1: starsMap['1'] as int,
        2: starsMap['2'] as int,
        3: starsMap['3'] as int,
        4: starsMap['4'] as int,
        5: starsMap['5'] as int,
      },
    );
  }

  RatingSummary toDomain() {
    return RatingSummary(
      averageRating: averageRating,
      totalReviews: totalReviews,
      stars: stars,
    );
  }
}
