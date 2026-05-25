// lib/features/settings/modules/business_profile/data/models/request/update_pin_request_model.dart

class UpdatePinRequestModel {
  final String currentPin;
  final String newPin;
  final String confirmNewPin;

  UpdatePinRequestModel({
    required this.currentPin,
    required this.newPin,
    required this.confirmNewPin,
  });

  Map<String, dynamic> toJson() {
    return {
      'currentPin': currentPin,
      'newPin': newPin,
      'confirmNewPin': confirmNewPin,
    };
  }
}
