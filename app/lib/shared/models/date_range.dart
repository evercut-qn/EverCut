// lib/shared/models/date_range.dart

class DateRange {
  final DateTime from;
  final DateTime to;

  const DateRange({
    required this.from,
    required this.to,
  });

  DateRange copyWith({
    DateTime? from,
    DateTime? to,
  }) {
    return DateRange(
      from: from ?? this.from,
      to: to ?? this.to,
    );
  }
}
