// lib/features/settings/modules/manage_services/domain/entities/service.dart

import 'package:equatable/equatable.dart';

/// Domain entity for Service
class Service extends Equatable {
  final String id;
  final String shopId;
  final String serviceName;
  final ServiceType serviceType;
  final ServiceFor serviceFor;
  final String imageUrl;

  // Single service fields
  final int? duration;
  final double? actualPrice;
  final double? offerPrice;
  final double? finalPrice;

  // Bundled service fields
  final List<String>? bundledServices;
  final int? totalDuration;
  final double? totalPrice;

  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Service({
    required this.id,
    required this.shopId,
    required this.serviceName,
    required this.serviceType,
    required this.serviceFor,
    required this.imageUrl,
    this.duration,
    this.actualPrice,
    this.offerPrice,
    this.finalPrice,
    this.bundledServices,
    this.totalDuration,
    this.totalPrice,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  double get effectivePrice {
    if (serviceType == ServiceType.bundled) {
      return totalPrice ?? 0.0;
    }
    return finalPrice ?? actualPrice ?? 0.0;
  }

  bool get hasDiscount {
    if (serviceType == ServiceType.bundled) {
      return false;
    }
    return offerPrice != null && offerPrice! > 0;
  }

  @override
  List<Object?> get props => [
        id,
        shopId,
        serviceName,
        serviceType,
        serviceFor,
        imageUrl,
        duration,
        actualPrice,
        offerPrice,
        finalPrice,
        bundledServices,
        totalDuration,
        totalPrice,
        isActive,
        createdAt,
        updatedAt,
      ];
}

enum ServiceType {
  single,
  bundled;

  String toJson() => name;

  static ServiceType fromJson(String value) {
    return ServiceType.values.firstWhere(
      (e) => e.name == value,
      orElse: () => ServiceType.single,
    );
  }
}

enum ServiceFor {
  male,
  female,
  unisex;

  String toJson() => name;

  static ServiceFor fromJson(String value) {
    return ServiceFor.values.firstWhere(
      (e) => e.name == value,
      orElse: () => ServiceFor.unisex,
    );
  }

  String get displayName {
    switch (this) {
      case ServiceFor.male:
        return 'Male';
      case ServiceFor.female:
        return 'Female';
      case ServiceFor.unisex:
        return 'Unisex';
    }
  }
}
