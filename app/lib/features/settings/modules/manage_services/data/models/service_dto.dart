// lib/features/settings/modules/manage_services/data/models/service_dto.dart

import '../../domain/entities/service.dart';

/// Data Transfer Object for Service
class ServiceDto {
  final String id;
  final String shopId;
  final String serviceName;
  final String serviceType;
  final String serviceFor;
  final String imageUrl;
  final int? duration;
  final double? actualPrice;
  final double? offerPrice;
  final double? finalPrice;
  final List<String>? bundledServices;
  final int? totalDuration;
  final double? totalPrice;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ServiceDto({
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

  factory ServiceDto.fromJson(Map<String, dynamic> json) {
    return ServiceDto(
      id: json['id'] as String,
      shopId: json['shopId'] as String,
      serviceName: json['serviceName'] as String,
      serviceType: json['serviceType'] as String,
      serviceFor: json['serviceFor'] as String,
      imageUrl: json['imageUrl'] as String,
      duration: json['duration'] as int?,
      actualPrice: (json['actualPrice'] as num?)?.toDouble(),
      offerPrice: (json['offerPrice'] as num?)?.toDouble(),
      finalPrice: (json['finalPrice'] as num?)?.toDouble(),
      bundledServices: json['bundledServices'] != null
          ? List<String>.from(json['bundledServices'] as List)
          : null,
      totalDuration: json['totalDuration'] as int?,
      totalPrice: (json['totalPrice'] as num?)?.toDouble(),
      isActive: json['isActive'] as bool,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'shopId': shopId,
      'serviceName': serviceName,
      'serviceType': serviceType,
      'serviceFor': serviceFor,
      'imageUrl': imageUrl,
      if (duration != null) 'duration': duration,
      if (actualPrice != null) 'actualPrice': actualPrice,
      if (offerPrice != null) 'offerPrice': offerPrice,
      if (finalPrice != null) 'finalPrice': finalPrice,
      if (bundledServices != null) 'bundledServices': bundledServices,
      if (totalDuration != null) 'totalDuration': totalDuration,
      if (totalPrice != null) 'totalPrice': totalPrice,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  Service toDomain() {
    return Service(
      id: id,
      shopId: shopId,
      serviceName: serviceName,
      serviceType: ServiceType.fromJson(serviceType),
      serviceFor: ServiceFor.fromJson(serviceFor),
      imageUrl: imageUrl,
      duration: duration,
      actualPrice: actualPrice,
      offerPrice: offerPrice,
      finalPrice: finalPrice,
      bundledServices: bundledServices,
      totalDuration: totalDuration,
      totalPrice: totalPrice,
      isActive: isActive,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}
