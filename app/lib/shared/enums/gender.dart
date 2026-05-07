// lib/shared/enums/gender.dart

import 'package:flutter/material.dart';

enum GenderEnum {
  male,
  female,
  transgender,
}

extension GenderEnumExtension on GenderEnum {
  String get label {
    switch (this) {
      case GenderEnum.male:
        return 'Male';
      case GenderEnum.female:
        return 'Female';
      case GenderEnum.transgender:
        return 'Transgender';
    }
  }

  IconData get icon {
    switch (this) {
      case GenderEnum.male:
        return Icons.male;
      case GenderEnum.female:
        return Icons.female;
      case GenderEnum.transgender:
        return Icons.transgender;
    }
  }

  int get value {
    switch (this) {
      case GenderEnum.male:
        return 0;
      case GenderEnum.female:
        return 1;
      case GenderEnum.transgender:
        return 2;
    }
  }

  static GenderEnum fromValue(int value) {
    switch (value) {
      case 0:
        return GenderEnum.male;
      case 1:
        return GenderEnum.female;
      case 2:
        return GenderEnum.transgender;
      default:
        return GenderEnum.male;
    }
  }
}
