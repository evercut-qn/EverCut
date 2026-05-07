// lib/shared/enums/target_customer.dart

import 'package:flutter/widgets.dart';

import '../../core/theme/foundation/app_icons.dart';

enum TargetCustomerEnum {
  men,
  women,
  unisex,
}

extension TargetCustomerEnumExtension on TargetCustomerEnum {
  String get label {
    switch (this) {
      case TargetCustomerEnum.men:
        return 'Men';
      case TargetCustomerEnum.women:
        return 'Women';
      case TargetCustomerEnum.unisex:
        return 'Unisex';
    }
  }

  IconData get icon {
    switch (this) {
      case TargetCustomerEnum.men:
        return AppIcons.solidRoundedMan;
      case TargetCustomerEnum.women:
        return AppIcons.solidRoundedWoman;
      case TargetCustomerEnum.unisex:
        return AppIcons.solidRoundedManWoman;
    }
  }

  int get value {
    switch (this) {
      case TargetCustomerEnum.men:
        return 0;
      case TargetCustomerEnum.women:
        return 1;
      case TargetCustomerEnum.unisex:
        return 2;
    }
  }

  static TargetCustomerEnum fromValue(int value) {
    switch (value) {
      case 0:
        return TargetCustomerEnum.men;
      case 1:
        return TargetCustomerEnum.women;
      case 2:
        return TargetCustomerEnum.unisex;
      default:
        return TargetCustomerEnum.men;
    }
  }
}
