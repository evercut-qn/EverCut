// lib/shared/enums/target_customer.dart

import 'package:flutter/widgets.dart';

import '../../core/theme/foundation/app_icons.dart';

enum TargetCustomer {
  men,
  women,
  unisex,
}

extension TargetCustomerExtension on TargetCustomer {
  String get label {
    switch (this) {
      case TargetCustomer.men:
        return 'Men';
      case TargetCustomer.women:
        return 'Women';
      case TargetCustomer.unisex:
        return 'Unisex';
    }
  }

  IconData get icon {
    switch (this) {
      case TargetCustomer.men:
        return AppIcons.solidRoundedMan;
      case TargetCustomer.women:
        return AppIcons.solidRoundedWoman;
      case TargetCustomer.unisex:
        return AppIcons.solidRoundedManWoman;
    }
  }

  int get value {
    switch (this) {
      case TargetCustomer.men:
        return 0;
      case TargetCustomer.women:
        return 1;
      case TargetCustomer.unisex:
        return 2;
    }
  }

  static TargetCustomer fromValue(int value) {
    switch (value) {
      case 0:
        return TargetCustomer.men;
      case 1:
        return TargetCustomer.women;
      case 2:
        return TargetCustomer.unisex;
      default:
        return TargetCustomer.men;
    }
  }
}
