// lib/features/settings/modules/business_profile/domain/use_cases/params/update_pin_params.dart

class UpdatePinParams {
  final String currentPin;
  final String newPin;
  final String confirmNewPin;

  UpdatePinParams({
    required this.currentPin,
    required this.newPin,
    required this.confirmNewPin,
  });
}
