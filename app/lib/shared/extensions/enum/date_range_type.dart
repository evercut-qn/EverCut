// lib/shared/extensions/enum/date_range_type.dart

import '../../enums/date_range_type.dart';

extension DateRangeTypeExtension on DateRangeType {
  String get label {
    switch (this) {
      case DateRangeType.yesterday:
        return 'Yesterday';
      case DateRangeType.today:
        return 'Today';
      case DateRangeType.tomorrow:
        return 'Tomorrow';
      case DateRangeType.thisWeek:
        return 'This Week';
      case DateRangeType.lastWeek:
        return 'Last Week';
      case DateRangeType.custom:
        return 'Custom';
    }
  }
}
