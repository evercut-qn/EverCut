// lib/shared/models/scheduling/break_time.dart

import 'package:equatable/equatable.dart';

class BreakTimeModel extends Equatable {
  final String startsAt;
  final String endsAt;

  const BreakTimeModel({
    required this.startsAt,
    required this.endsAt,
  });

  BreakTimeModel copyWith({
    String? startsAt,
    String? endsAt,
  }) {
    return BreakTimeModel(
      startsAt: startsAt ?? this.startsAt,
      endsAt: endsAt ?? this.endsAt,
    );
  }

  @override
  List<Object?> get props => [startsAt, endsAt];
}
