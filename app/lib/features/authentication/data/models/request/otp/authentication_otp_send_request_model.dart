// lib/features/authentication/data/models/request/otp/authentication_otp_send_request_model.dart

import '../../../../domain/use_cases/otp/params/authentication_otp_send_params.dart';

class AuthenticationOtpSendRequestModel {
  final String phoneNumber;

  const AuthenticationOtpSendRequestModel({
    required this.phoneNumber,
  });

  factory AuthenticationOtpSendRequestModel.fromParams(AuthenticationOtpSendParams params) {
    return AuthenticationOtpSendRequestModel(
      phoneNumber: params.phoneNumber,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'mobile': phoneNumber,
    };
  }
}
