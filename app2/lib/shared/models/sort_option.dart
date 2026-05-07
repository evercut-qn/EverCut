// lib/shared/models/sort_option.dart

import 'package:equatable/equatable.dart';

import '../enums/sort.dart';

class SortOptionModel extends Equatable {
  final SortByEnum sortBy;
  final SortOrderEnum sortOrder;

  const SortOptionModel({
    required this.sortBy,
    this.sortOrder = SortOrderEnum.ascending,
  });

  SortOptionModel copyWith({
    SortByEnum? sortBy,
    SortOrderEnum? sortOrder,
  }) {
    return SortOptionModel(
      sortBy: sortBy ?? this.sortBy,
      sortOrder: sortOrder ?? this.sortOrder,
    );
  }

  @override
  List<Object?> get props => [sortBy, sortOrder];
}
