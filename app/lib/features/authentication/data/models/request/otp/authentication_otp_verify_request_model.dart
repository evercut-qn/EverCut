// lib/features/authentication/data/models/request/otp/authentication_otp_verify_request_model.dart

import '../../../../domain/use_cases/otp/params/authentication_otp_verify_params.dart';

class AuthenticationOtpVerifyRequestModel {
  final String phoneNumber;
  final String smsCode;

  const AuthenticationOtpVerifyRequestModel({
    required this.phoneNumber,
    required this.smsCode,
  });

  factory AuthenticationOtpVerifyRequestModel.fromParams(AuthenticationOtpVerifyParams params) {
    return AuthenticationOtpVerifyRequestModel(
      phoneNumber: params.phoneNumber,
      smsCode: params.smsCode,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'mobile': phoneNumber,
      'otp': smsCode,
    };
  }
}
