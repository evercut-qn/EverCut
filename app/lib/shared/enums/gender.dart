// lib/shared/enums/gender.dart

import 'package:flutter/material.dart';

enum Gender {
  male,
  female,
  transgender,
}

extension GenderExtension on Gender {
  String get label {
    switch (this) {
      case Gender.male:
        return 'Male';
      case Gender.female:
        return 'Female';
      case Gender.transgender:
        return 'Transgender';
    }
  }

  IconData get icon {
    switch (this) {
      case Gender.male:
        return Icons.male;
      case Gender.female:
        return Icons.female;
      case Gender.transgender:
        return Icons.transgender;
    }
  }

  int get value {
    switch (this) {
      case Gender.male:
        return 0;
      case Gender.female:
        return 1;
      case Gender.transgender:
        return 2;
    }
  }

  static Gender fromValue(int value) {
    switch (value) {
      case 0:
        return Gender.male;
      case 1:
        return Gender.female;
      case 2:
        return Gender.transgender;
      default:
        return Gender.male;
    }
  }
}
