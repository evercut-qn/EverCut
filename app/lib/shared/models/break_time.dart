// lib/shared/models/break_time.dart

import 'package:equatable/equatable.dart';

class BreakTime extends Equatable {
  final String startsAt;
  final String endsAt;

  const BreakTime({
    required this.startsAt,
    required this.endsAt,
  });

  @override
  List<Object?> get props => [
    startsAt,
    endsAt,
  ];
}
