// lib/features/ratings/domain/entities/rating.dart

import 'package:equatable/equatable.dart';

import 'rating_user.dart';
import 'rating_reply.dart';

/// Domain entity for Rating
class Rating extends Equatable {
  final String id;
  final String shopId;
  final int rating;
  final String review;
  final RatingUser user;
  final RatingReply? reply;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Rating({
    required this.id,
    required this.shopId,
    required this.rating,
    required this.review,
    required this.user,
    this.reply,
    required this.createdAt,
    required this.updatedAt,
  });

  @override
  List<Object?> get props => [
        id,
        shopId,
        rating,
        review,
        user,
        reply,
        createdAt,
        updatedAt,
      ];
}
