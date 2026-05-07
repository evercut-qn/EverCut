// lib/shared/enums/appointment_status.dart

import 'package:flutter/widgets.dart';

import '../extensions/context/app_colors_extension.dart';

enum AppointmentStatusEnum {
  pending,
  ongoing,
  upcoming,
  completed,
  cancelled,
}

extension AppointmentStatusEnumExtension on AppointmentStatusEnum {
  String get label {
    switch (this) {
      case AppointmentStatusEnum.pending:
        return 'Pending';
      case AppointmentStatusEnum.ongoing:
        return 'Ongoing';
      case AppointmentStatusEnum.upcoming:
        return 'Upcoming';
      case AppointmentStatusEnum.completed:
        return 'Completed';
      case AppointmentStatusEnum.cancelled:
        return 'Cancelled';
    }
  }

  int get value {
    switch (this) {
      case AppointmentStatusEnum.pending:
        return 0;
      case AppointmentStatusEnum.ongoing:
        return 1;
      case AppointmentStatusEnum.upcoming:
        return 2;
      case AppointmentStatusEnum.completed:
        return 3;
      case AppointmentStatusEnum.cancelled:
        return 4;
    }
  }

  static AppointmentStatusEnum fromValue(int value) {
    switch (value) {
      case 0:
        return AppointmentStatusEnum.pending;
      case 1:
        return AppointmentStatusEnum.ongoing;
      case 2:
        return AppointmentStatusEnum.upcoming;
      case 3:
        return AppointmentStatusEnum.completed;
      case 4:
        return AppointmentStatusEnum.cancelled;
      default:
        return AppointmentStatusEnum.pending;
    }
  }

  Color color(BuildContext context) {
    switch (this) {
      case AppointmentStatusEnum.pending:
        return context.appColors.neutralShade850;
      case AppointmentStatusEnum.ongoing:
        return context.appColors.neutralShade850;
      case AppointmentStatusEnum.upcoming:
        return context.appColors.orangeShade100;
      case AppointmentStatusEnum.completed:
        return context.appColors.greenShade100;
      case AppointmentStatusEnum.cancelled:
        return context.appColors.neutralShade850;
    }
  }
}
