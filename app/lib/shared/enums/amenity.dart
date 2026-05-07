// lib/shared/enums/amenity.dart

import 'package:flutter/widgets.dart';

import '../../core/theme/foundation/app_icons.dart';

enum AmenityEnum {
  airConditioning,
  waitingArea,
  drinkingWater,
  washrooms,
  parkingArea,
  wifi,
  chargingPoints,
}

extension AmenityEnumExtension on AmenityEnum {
  String get label {
    switch (this) {
      case AmenityEnum.airConditioning:
        return 'Air Conditioning';
      case AmenityEnum.waitingArea:
        return 'Waiting Area';
      case AmenityEnum.drinkingWater:
        return 'Drinking Water';
      case AmenityEnum.washrooms:
        return 'Washrooms';
      case AmenityEnum.parkingArea:
        return 'Parking Area';
      case AmenityEnum.wifi:
        return 'Wi-Fi';
      case AmenityEnum.chargingPoints:
        return 'Charging Points';
    }
  }

  IconData get icon {
    switch (this) {
      case AmenityEnum.airConditioning:
        return AppIcons.solidRoundedSnow;
      case AmenityEnum.waitingArea:
        return AppIcons.solidRoundedChair04;
      case AmenityEnum.drinkingWater:
        return AppIcons.solidRoundedSoftDrink02;
      case AmenityEnum.washrooms:
        return AppIcons.solidRoundedToilet01;
      case AmenityEnum.parkingArea:
        return AppIcons.solidRoundedParkingAreaSquare;
      case AmenityEnum.wifi:
        return AppIcons.solidRoundedWifi01;
      case AmenityEnum.chargingPoints:
        return AppIcons.solidRoundedBatteryCharging01;
    }
  }

  int get value {
    switch (this) {
      case AmenityEnum.airConditioning:
        return 0;
      case AmenityEnum.waitingArea:
        return 1;
      case AmenityEnum.drinkingWater:
        return 2;
      case AmenityEnum.washrooms:
        return 3;
      case AmenityEnum.parkingArea:
        return 4;
      case AmenityEnum.wifi:
        return 5;
      case AmenityEnum.chargingPoints:
        return 6;
    }
  }

  static AmenityEnum fromValue(int value) {
    switch (value) {
      case 0:
        return AmenityEnum.airConditioning;
      case 1:
        return AmenityEnum.waitingArea;
      case 2:
        return AmenityEnum.drinkingWater;
      case 3:
        return AmenityEnum.washrooms;
      case 4:
        return AmenityEnum.parkingArea;
      case 5:
        return AmenityEnum.wifi;
      case 6:
        return AmenityEnum.chargingPoints;
      default:
        return AmenityEnum.airConditioning;
    }
  }
}
