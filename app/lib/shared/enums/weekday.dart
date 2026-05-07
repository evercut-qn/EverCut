// lib/shared/enums/weekday.dart

enum WeekdayEnum {
  sunday,
  monday,
  tuesday,
  wednesday,
  thursday,
  friday,
  saturday,
}

extension WeekdayEnumExtension on WeekdayEnum {
  String get label {
    switch (this) {
      case WeekdayEnum.sunday:
        return 'Sunday';
      case WeekdayEnum.monday:
        return 'Monday';
      case WeekdayEnum.tuesday:
        return 'Tuesday';
      case WeekdayEnum.wednesday:
        return 'Wednesday';
      case WeekdayEnum.thursday:
        return 'Thursday';
      case WeekdayEnum.friday:
        return 'Friday';
      case WeekdayEnum.saturday:
        return 'Saturday';
    }
  }

  int get value {
    switch (this) {
      case WeekdayEnum.sunday:
        return 0;
      case WeekdayEnum.monday:
        return 1;
      case WeekdayEnum.tuesday:
        return 2;
      case WeekdayEnum.wednesday:
        return 3;
      case WeekdayEnum.thursday:
        return 4;
      case WeekdayEnum.friday:
        return 5;
      case WeekdayEnum.saturday:
        return 6;
    }
  }

  static WeekdayEnum fromValue(int value) {
    switch (value) {
      case 0:
        return WeekdayEnum.sunday;
      case 1:
        return WeekdayEnum.monday;
      case 2:
        return WeekdayEnum.tuesday;
      case 3:
        return WeekdayEnum.wednesday;
      case 4:
        return WeekdayEnum.thursday;
      case 5:
        return WeekdayEnum.friday;
      case 6:
        return WeekdayEnum.saturday;
      default:
        return WeekdayEnum.sunday;
    }
  }
}
