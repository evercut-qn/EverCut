// lib/features/dashboard/modules/ratings_and_reviews/presentation/models/review_message.dart

part of '../widgets/review_thread.dart';

class ReviewMessageModel {
  final String name;
  final String message;
  final DateTime dateTime;

  const ReviewMessageModel({
    required this.name,
    required this.message,
    required this.dateTime,
  });
}
