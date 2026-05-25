// lib/features/authentication/domain/use_cases/otp/params/authentication_otp_verify_params.dart

class AuthenticationOtpVerifyParams {
  final String phoneNumber;
  final String smsCode;

  const AuthenticationOtpVerifyParams({
    required this.phoneNumber,
    required this.smsCode,
  });
}
