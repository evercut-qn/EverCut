// lib/features/transactions/presentation/models/transaction_filter.dart

import 'package:equatable/equatable.dart';

import '../../../../shared/models/ui/sort_option.dart';
import '../../../../shared/models/ranges/amount_range.dart';
import '../../../../shared/models/ranges/date_range.dart';

class TransactionFilterModel extends Equatable {
  final AmountRangeModel amountRange;
  final DateRangeModel dateRange;
  final SortOptionModel? sortOption;

  const TransactionFilterModel({
    required this.amountRange,
    required this.dateRange,
    this.sortOption,
  });

  TransactionFilterModel copyWith({
    AmountRangeModel? amountRange,
    DateRangeModel? dateRange,
    SortOptionModel? sortOption,
  }) {
    return TransactionFilterModel(
      amountRange: amountRange ?? this.amountRange,
      dateRange: dateRange ?? this.dateRange,
      sortOption: sortOption ?? this.sortOption,
    );
  }

  @override
  List<Object?> get props => [
    amountRange,
    dateRange,
    sortOption,
  ];
}
