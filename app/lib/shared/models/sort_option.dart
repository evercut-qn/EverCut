// lib/shared/models/sort_option.dart

import '../enums/sort.dart';

class SortOption {
  final SortBy sortBy;
  final SortOrder sortOrder;

  const SortOption({
    required this.sortBy,
    this.sortOrder = SortOrder.ascending, // default
  });

  SortOption copyWith({
    SortBy? sortBy,
    SortOrder? sortOrder,
  }) {
    return SortOption(
      sortBy: sortBy ?? this.sortBy,
      sortOrder: sortOrder ?? this.sortOrder,
    );
  }
}
