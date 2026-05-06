// lib/shared/enums/amenity.dart

import 'package:flutter/widgets.dart';

import '../../core/theme/foundation/app_icons.dart';

enum Amenity {
  airConditioning,
  waitingArea,
  drinkingWater,
  washrooms,
  parkingArea,
  wifi,
  chargingPoints,
}

extension AmenityExtension on Amenity {
  String get label {
    switch (this) {
      case Amenity.airConditioning:
        return 'Air Conditioning';
      case Amenity.waitingArea:
        return 'Waiting Area';
      case Amenity.drinkingWater:
        return 'Drinking Water';
      case Amenity.washrooms:
        return 'Washrooms';
      case Amenity.parkingArea:
        return 'Parking Area';
      case Amenity.wifi:
        return 'Wi-Fi';
      case Amenity.chargingPoints:
        return 'Charging Points';
    }
  }

  IconData get icon {
    switch (this) {
      case Amenity.airConditioning:
        return AppIcons.solidRoundedSnow;
      case Amenity.waitingArea:
        return AppIcons.solidRoundedChair04;
      case Amenity.drinkingWater:
        return AppIcons.solidRoundedSoftDrink02;
      case Amenity.washrooms:
        return AppIcons.solidRoundedToilet01;
      case Amenity.parkingArea:
        return AppIcons.solidRoundedParkingAreaSquare;
      case Amenity.wifi:
        return AppIcons.solidRoundedWifi01;
      case Amenity.chargingPoints:
        return AppIcons.solidRoundedBatteryCharging01;
    }
  }

  int get value {
    switch (this) {
      case Amenity.airConditioning:
        return 0;
      case Amenity.waitingArea:
        return 1;
      case Amenity.drinkingWater:
        return 2;
      case Amenity.washrooms:
        return 3;
      case Amenity.parkingArea:
        return 4;
      case Amenity.wifi:
        return 5;
      case Amenity.chargingPoints:
        return 6;
    }
  }

  static Amenity fromValue(int value) {
    switch (value) {
      case 0:
        return Amenity.airConditioning;
      case 1:
        return Amenity.waitingArea;
      case 2:
        return Amenity.drinkingWater;
      case 3:
        return Amenity.washrooms;
      case 4:
        return Amenity.parkingArea;
      case 5:
        return Amenity.wifi;
      case 6:
        return Amenity.chargingPoints;
      default:
        return Amenity.airConditioning;
    }
  }
}
