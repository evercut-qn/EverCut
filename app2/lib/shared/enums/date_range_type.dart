// lib/shared/enums/date_range_type.dart

enum DateRangeEnum {
  yesterday,
  today,
  tomorrow,
  thisWeek,
  lastWeek,
  custom,
}

extension DateRangeEnumExtension on DateRangeEnum {
  String get label {
    switch (this) {
      case DateRangeEnum.yesterday:
        return 'Yesterday';
      case DateRangeEnum.today:
        return 'Today';
      case DateRangeEnum.tomorrow:
        return 'Tomorrow';
      case DateRangeEnum.thisWeek:
        return 'This Week';
      case DateRangeEnum.lastWeek:
        return 'Last Week';
      case DateRangeEnum.custom:
        return 'Custom';
    }
  }
}
