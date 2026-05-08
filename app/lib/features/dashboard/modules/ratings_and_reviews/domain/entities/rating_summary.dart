// lib/features/dashboard/modules/ratings_and_reviews/domain/entities/rating_summary.dart

import 'package:equatable/equatable.dart';

/// Domain entity for Rating Summary
class RatingSummary extends Equatable {
  final double averageRating;
  final int totalReviews;
  final Map<int, int> stars;

  const RatingSummary({
    required this.averageRating,
    required this.totalReviews,
    required this.stars,
  });

  int get oneStarCount => stars[1] ?? 0;
  int get twoStarCount => stars[2] ?? 0;
  int get threeStarCount => stars[3] ?? 0;
  int get fourStarCount => stars[4] ?? 0;
  int get fiveStarCount => stars[5] ?? 0;

  double getStarPercentage(int starRating) {
    if (totalReviews == 0) return 0.0;
    final count = stars[starRating] ?? 0;
    return (count / totalReviews) * 100;
  }

  @override
  List<Object?> get props => [averageRating, totalReviews, stars];
}
