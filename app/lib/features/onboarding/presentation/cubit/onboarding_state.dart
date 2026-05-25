// lib/features/onboarding/presentation/cubit/onboarding_state.dart

part of 'onboarding_cubit.dart';

class OnboardingState {
  final int currentStep;
  final PersonalInfoStep personalInfo;
  final BusinessProfileStep businessProfile;
  final AmenitiesStep amenities;
  final AvailabilityStep availability;
  final PayoutStep payout;

  const OnboardingState({
    this.currentStep = 0,
    this.personalInfo = const PersonalInfoStep(),
    this.businessProfile = const BusinessProfileStep(),
    this.amenities = const AmenitiesStep(),
    this.availability = const AvailabilityStep(),
    this.payout = const PayoutStep(),
  });

  OnboardingState copyWith({
    int? currentStep,
    PersonalInfoStep? personalInfo,
    BusinessProfileStep? businessProfile,
    AmenitiesStep? amenities,
    AvailabilityStep? availability,
    PayoutStep? payout,
  }) {
    return OnboardingState(
      currentStep: currentStep ?? this.currentStep,
      personalInfo: personalInfo ?? this.personalInfo,
      businessProfile: businessProfile ?? this.businessProfile,
      amenities: amenities ?? this.amenities,
      availability: availability ?? this.availability,
      payout: payout ?? this.payout,
    );
  }
}
