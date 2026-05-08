// lib/features/dashboard/modules/ratings_and_reviews/domain/entities/rating_user.dart

import 'package:equatable/equatable.dart';

/// Domain entity for Rating User
class RatingUser extends Equatable {
  final String firstName;
  final String lastName;
  final String? photoUrl;

  const RatingUser({
    required this.firstName,
    required this.lastName,
    this.photoUrl,
  });

  String get fullName => '$firstName $lastName'.trim();

  @override
  List<Object?> get props => [firstName, lastName, photoUrl];
}
