// lib/features/authentication/data/models/response/otp/authentication_otp_verify_response_model.dart

abstract base class AuthenticationOtpVerifyResponseModel {
  const AuthenticationOtpVerifyResponseModel();

  static AuthenticationOtpVerifyResponseModel fromJson(Map<String, dynamic> json) {
    if (json['isNewUser'] as bool) {
      return AuthenticationNewUserResponseModel.fromJson(json);
    } else {
      return AuthenticationExistingUserResponseModel.fromJson(json);
    }
  }
}

final class AuthenticationNewUserResponseModel extends AuthenticationOtpVerifyResponseModel {
  final String onboardingToken;

  const AuthenticationNewUserResponseModel({
    required this.onboardingToken,
  });

  factory AuthenticationNewUserResponseModel.fromJson(Map<String, dynamic> json) {
    return AuthenticationNewUserResponseModel(
      onboardingToken: json['onboardingToken'] as String,
    );
  }
}

final class AuthenticationExistingUserResponseModel extends AuthenticationOtpVerifyResponseModel {
  final String accessToken;
  final String refreshToken;

  const AuthenticationExistingUserResponseModel({
    required this.accessToken,
    required this.refreshToken,
  });

  factory AuthenticationExistingUserResponseModel.fromJson(Map<String, dynamic> json) {
    return AuthenticationExistingUserResponseModel(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
    );
  }
}
