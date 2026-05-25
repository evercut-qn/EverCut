// lib/features/onboarding/presentation/cubit/onboarding_cubit.dart

import 'package:flutter_bloc/flutter_bloc.dart';

import 'steps/amenities_step.dart';
import 'steps/availability_step.dart';
import 'steps/business_profile_step.dart';
import 'steps/payout_step.dart';
import 'steps/personal_info_step.dart';

part 'onboarding_state.dart';

class OnboardingCubit extends Cubit<OnboardingState> {
  OnboardingCubit() : super(const OnboardingState());

  void nextStep() {
    if (state.currentStep <= 3) {
      emit(state.copyWith(currentStep: state.currentStep + 1));
    }
  }

  void previousStep() {
    if (state.currentStep > 0) {
      emit(state.copyWith(currentStep: state.currentStep - 1));
    }
  }

  void goToStep(int index) {
    emit(
      state.copyWith(
        currentStep: index,
      ),
    );
  }

  void updatePersonalInfo(PersonalInfoStep step) {
    emit(
      state.copyWith(
        personalInfo: step,
      ),
    );
  }

  void updateBusinessProfile(BusinessProfileStep step) {
    emit(
      state.copyWith(
        businessProfile: step,
      ),
    );
  }

  void updateAmenities(AmenitiesStep step) {
    emit(
      state.copyWith(
        amenities: step,
      ),
    );
  }

  void updateAvailability(AvailabilityStep step) {
    emit(
      state.copyWith(
        availability: step,
      ),
    );
  }

  void updatePayout(PayoutStep step) {
    emit(
      state.copyWith(
        payout: step,
      ),
    );
  }

  void patchPersonalInfo({
    String? firstName,
    String? lastName,
    String? email,
    DateTime? dateOfBirth,
    int? gender,
  }) {
    emit(
      state.copyWith(
        personalInfo: state.personalInfo.copyWith(
          firstName: firstName,
          lastName: lastName,
          email: email,
          dateOfBirth: dateOfBirth,
          gender: gender,
        ),
      ),
    );
  }

  void patchBusinessProfile({
    String? shopName,
    int? category,
    int? targetCustomers,
    String? location,
    dynamic image,
  }) {
    emit(
      state.copyWith(
        businessProfile: state.businessProfile.copyWith(
          shopName: shopName,
          category: category,
          targetCustomers: targetCustomers,
          location: location,
          image: image,
        ),
      ),
    );
  }

  void toggleAmenity(dynamic amenity) {
    final current = Set.of(state.amenities.selectedAmenities);

    if (current.contains(amenity)) {
      current.remove(amenity);
    } else {
      current.add(amenity);
    }

    emit(
      state.copyWith(
        amenities: state.amenities.copyWith(
          selectedAmenities: current,
        ),
      ),
    );
  }

  // void updateAvailabilityStep({
  //   Set? workingDays,
  //   String? openTime,
  //   String? closeTime,
  //   Set? breaks,
  // }) {
  //   emit(
  //     state.copyWith(
  //       availability: state.availability.copyWith(
  //         workingDays: workingDays ?? state.availability.workingDays,
  //         openTime: openTime ?? state.availability.openTime,
  //         closeTime: closeTime ?? state.availability.closeTime,
  //         breaks: breaks ?? state.availability.breaks,
  //       ),
  //     ),
  //   );
  // }

  void updatePayoutStep({
    String? accountHolderName,
    String? bankName,
    String? accountNumber,
    String? ifscCode,
  }) {
    emit(
      state.copyWith(
        payout: state.payout.copyWith(
          accountHolderName: accountHolderName,
          bankName: bankName,
          accountNumber: accountNumber,
          ifscCode: ifscCode,
        ),
      ),
    );
  }

  Map<String, dynamic> buildFinalPayload() {
    return {
      "personalInfo": {
        "firstName": state.personalInfo.firstName,
        "lastName": state.personalInfo.lastName,
        "email": state.personalInfo.email,
        "dateOfBirth": state.personalInfo.dateOfBirth?.toIso8601String(),
        "gender": state.personalInfo.gender,
      },
      "businessProfile": {
        "shopName": state.businessProfile.shopName,
        "category": state.businessProfile.category,
        "targetCustomers": state.businessProfile.targetCustomers,
        "location": state.businessProfile.location,
      },
      "amenities": state.amenities.selectedAmenities.toList(),
      "availability": {
        "workingDays": state.availability.workingDays.toList(),
        "openTime": state.availability.openTime,
        "closeTime": state.availability.closeTime,
        "breaks": state.availability.breaks.toList(),
      },
      "payout": {
        "accountHolderName": state.payout.accountHolderName,
        "bankName": state.payout.bankName,
        "accountNumber": state.payout.accountNumber,
        "ifscCode": state.payout.ifscCode,
      },
    };
  }

  void reset() {
    emit(const OnboardingState());
  }
}
