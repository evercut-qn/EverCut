// lib/shared/models/ranges/amount_range.dart

import 'package:equatable/equatable.dart';

class AmountRangeModel extends Equatable {
  final double min;
  final double max;

  const AmountRangeModel({
    required this.min,
    required this.max,
  });

  AmountRangeModel copyWith({
    double? min,
    double? max,
  }) {
    return AmountRangeModel(
      min: min ?? this.min,
      max: max ?? this.max,
    );
  }

  @override
  List<Object?> get props => [min, max];
}
