// lib/features/onboarding/presentation/cubit/steps/business_profile_step.dart

import 'dart:io';

class BusinessProfileStep {
  final String shopName;
  final int? category;
  final int? targetCustomers;
  final String location;
  final File? image;

  const BusinessProfileStep({
    this.shopName = '',
    this.category,
    this.targetCustomers,
    this.location = '',
    this.image,
  });

  BusinessProfileStep copyWith({
    String? shopName,
    int? category,
    int? targetCustomers,
    String? location,
    File? image,
  }) {
    return BusinessProfileStep(
      shopName: shopName ?? this.shopName,
      category: category ?? this.category,
      targetCustomers: targetCustomers ?? this.targetCustomers,
      location: location ?? this.location,
      image: image ?? this.image,
    );
  }
}
