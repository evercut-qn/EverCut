// lib/features/dashboard/modules/ratings_and_reviews/data/models/rating_dto.dart

import '../../domain/entities/rating.dart';
import '../../domain/entities/rating_user.dart';
import '../../domain/entities/rating_reply.dart';

/// Data Transfer Object for Rating
/// Maps backend API response to domain entity
class RatingDto {
  final String id;
  final String shopId;
  final int rating;
  final String review;
  final RatingUserDto user;
  final RatingReplyDto? reply;
  final DateTime createdAt;
  final DateTime updatedAt;

  const RatingDto({
    required this.id,
    required this.shopId,
    required this.rating,
    required this.review,
    required this.user,
    this.reply,
    required this.createdAt,
    required this.updatedAt,
  });

  factory RatingDto.fromJson(Map<String, dynamic> json) {
    return RatingDto(
      id: json['id'] as String,
      shopId: json['shopId'] as String,
      rating: json['rating'] as int,
      review: (json['review'] ?? '') as String,
      user: RatingUserDto.fromJson(json['user'] as Map<String, dynamic>),
      reply: json['reply'] != null
          ? RatingReplyDto.fromJson(json['reply'] as Map<String, dynamic>)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Rating toDomain() {
    return Rating(
      id: id,
      shopId: shopId,
      rating: rating,
      review: review,
      user: user.toDomain(),
      reply: reply?.toDomain(),
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

class RatingUserDto {
  final String firstName;
  final String lastName;
  final String? photoUrl;

  const RatingUserDto({
    required this.firstName,
    required this.lastName,
    this.photoUrl,
  });

  factory RatingUserDto.fromJson(Map<String, dynamic> json) {
    return RatingUserDto(
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String,
      photoUrl: json['photoUrl'] as String?,
    );
  }

  RatingUser toDomain() {
    return RatingUser(
      firstName: firstName,
      lastName: lastName,
      photoUrl: photoUrl,
    );
  }
}

class RatingReplyDto {
  final String text;
  final DateTime repliedAt;

  const RatingReplyDto({
    required this.text,
    required this.repliedAt,
  });

  factory RatingReplyDto.fromJson(Map<String, dynamic> json) {
    return RatingReplyDto(
      text: json['text'] as String,
      repliedAt: DateTime.parse(json['repliedAt'] as String),
    );
  }

  RatingReply toDomain() {
    return RatingReply(
      text: text,
      repliedAt: repliedAt,
    );
  }
}
