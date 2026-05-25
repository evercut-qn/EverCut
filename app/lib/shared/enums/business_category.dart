// lib/shared/enums/business_category.dart

import 'package:flutter/widgets.dart';

import '../../core/theme/foundation/app_icons.dart';

enum BusinessCategoryEnum {
  barberShop,
  hairSalon,
  beautySalon,
  doorstepService,
}

extension BusinessCategoryEnumExtension on BusinessCategoryEnum {
  String get label {
    switch (this) {
      case BusinessCategoryEnum.barberShop:
        return 'Barber Shop';
      case BusinessCategoryEnum.hairSalon:
        return 'Hair Salon';
      case BusinessCategoryEnum.beautySalon:
        return 'Beauty Salon';
      case BusinessCategoryEnum.doorstepService:
        return 'Doorstep Service';
    }
  }

  IconData get icon {
    switch (this) {
      case BusinessCategoryEnum.barberShop:
        return AppIcons.solidRoundedChairBarber;
      case BusinessCategoryEnum.hairSalon:
        return AppIcons.solidRoundedHairDryer;
      case BusinessCategoryEnum.beautySalon:
        return AppIcons.solidRoundedThread;
      case BusinessCategoryEnum.doorstepService:
        return AppIcons.solidRoundedDoor02;
    }
  }

  int get value {
    switch (this) {
      case BusinessCategoryEnum.barberShop:
        return 0;
      case BusinessCategoryEnum.hairSalon:
        return 1;
      case BusinessCategoryEnum.beautySalon:
        return 2;
      case BusinessCategoryEnum.doorstepService:
        return 3;
    }
  }

  static BusinessCategoryEnum fromValue(int value) {
    switch (value) {
      case 0:
        return BusinessCategoryEnum.barberShop;
      case 1:
        return BusinessCategoryEnum.hairSalon;
      case 2:
        return BusinessCategoryEnum.beautySalon;
      case 3:
        return BusinessCategoryEnum.doorstepService;
      default:
        return BusinessCategoryEnum.barberShop;
    }
  }
}
