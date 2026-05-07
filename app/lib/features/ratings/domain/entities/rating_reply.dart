// lib/features/ratings/domain/entities/rating_reply.dart

import 'package:equatable/equatable.dart';

/// Domain entity for Rating Reply
class RatingReply extends Equatable {
  final String text;
  final DateTime repliedAt;

  const RatingReply({
    required this.text,
    required this.repliedAt,
  });

  @override
  List<Object?> get props => [text, repliedAt];
}
