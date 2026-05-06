// lib/shared/enums/business_category.dart

import 'package:flutter/widgets.dart';

import '../../core/theme/foundation/app_icons.dart';

enum BusinessCategory {
  barberShop,
  hairSalon,
  beautySalon,
  doorstepService,
}

extension BusinessCategoryExtension on BusinessCategory {
  String get label {
    switch (this) {
      case BusinessCategory.barberShop:
        return 'Barber Shop';
      case BusinessCategory.hairSalon:
        return 'Hair Salon';
      case BusinessCategory.beautySalon:
        return 'Beauty Salon';
      case BusinessCategory.doorstepService:
        return 'Doorstep Service';
    }
  }

  IconData get icon {
    switch (this) {
      case BusinessCategory.barberShop:
        return AppIcons.solidRoundedChairBarber;
      case BusinessCategory.hairSalon:
        return AppIcons.solidRoundedHairDryer;
      case BusinessCategory.beautySalon:
        return AppIcons.solidRoundedThread;
      case BusinessCategory.doorstepService:
        return AppIcons.solidRoundedDoor02;
    }
  }

  int get value {
    switch (this) {
      case BusinessCategory.barberShop:
        return 0;
      case BusinessCategory.hairSalon:
        return 1;
      case BusinessCategory.beautySalon:
        return 2;
      case BusinessCategory.doorstepService:
        return 3;
    }
  }

  static BusinessCategory fromValue(int value) {
    switch (value) {
      case 0:
        return BusinessCategory.barberShop;
      case 1:
        return BusinessCategory.hairSalon;
      case 2:
        return BusinessCategory.beautySalon;
      case 3:
        return BusinessCategory.doorstepService;
      default:
        return BusinessCategory.barberShop;
    }
  }
}
