// lib/features/dashboard/modules/ratings_and_reviews/presentation/models/customer_review.dart

part of '../widgets/review_thread.dart';

class CustomerReviewModel extends ReviewMessageModel {
  final double rating;
  final String? avatarUrl;

  const CustomerReviewModel({
    required super.name,
    required super.message,
    required super.dateTime,
    required this.rating,
    this.avatarUrl,
  });
}
