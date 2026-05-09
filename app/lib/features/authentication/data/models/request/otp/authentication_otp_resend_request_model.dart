// lib/features/authentication/data/models/request/otp/authentication_otp_resend_request_model.dart

import '../../../../domain/use_cases/otp/params/authentication_otp_resend_params.dart';

class AuthenticationOtpResendRequestModel {
  final String phoneNumber;

  const AuthenticationOtpResendRequestModel({
    required this.phoneNumber,
  });

  factory AuthenticationOtpResendRequestModel.fromParams(AuthenticationOtpResendParams params) {
    return AuthenticationOtpResendRequestModel(
      phoneNumber: params.phoneNumber,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'mobile': phoneNumber,
      'retryType': 'text',
    };
  }
}
