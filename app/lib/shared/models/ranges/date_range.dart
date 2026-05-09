// lib/shared/models/ranges/date_range.dart

import 'package:equatable/equatable.dart';

class DateRangeModel extends Equatable {
  final DateTime from;
  final DateTime to;

  const DateRangeModel({
    required this.from,
    required this.to,
  });

  DateRangeModel copyWith({
    DateTime? from,
    DateTime? to,
  }) {
    return DateRangeModel(
      from: from ?? this.from,
      to: to ?? this.to,
    );
  }

  @override
  List<Object?> get props => [from, to];
}
