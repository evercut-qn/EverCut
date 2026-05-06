// lib/shared/models/amount_range.dart

class AmountRange {
  final double min;
  final double max;

  const AmountRange({
    required this.min,
    required this.max,
  });

  AmountRange copyWith({
    double? min,
    double? max,
  }) {
    return AmountRange(
      min: min ?? this.min,
      max: max ?? this.max,
    );
  }
}
