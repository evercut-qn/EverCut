// lib/features/transactions/presentation/models/transaction_filter.dart

import '../../../../shared/models/sort_option.dart';
import '../../../../shared/models/amount_range.dart';
import '../../../../shared/models/date_range.dart';

class TransactionFilter {
  final AmountRange amountRange;
  final DateRange dateRange;
  final SortOption sortOption;

  const TransactionFilter({
    required this.amountRange,
    required this.dateRange,
    required this.sortOption,
  });

  TransactionFilter copyWith({
    AmountRange? amountRange,
    DateRange? dateRange,
    SortOption? sortOption,
  }) {
    return TransactionFilter(
      amountRange: amountRange ?? this.amountRange,
      dateRange: dateRange ?? this.dateRange,
      sortOption: sortOption ?? this.sortOption,
    );
  }
}
