// lib/features/onboarding/presentation/cubit/steps/amenities_step.dart

import '../../../../../shared/enums/amenity.dart';

class AmenitiesStep {
  final Set<AmenityEnum> selectedAmenities;

  const AmenitiesStep({
    this.selectedAmenities = const {},
  });

  AmenitiesStep copyWith({
    Set<AmenityEnum>? selectedAmenities,
  }) {
    return AmenitiesStep(
      selectedAmenities: selectedAmenities ?? this.selectedAmenities,
    );
  }
}
