// lib/features/authentication/domain/use_cases/authentication_otp_verify_params.dart

class AuthenticationOtpVerifyParams {
  final String phoneNumber;
  final String verificationId;
  final String smsCode;

  const AuthenticationOtpVerifyParams(
    this.phoneNumber,
    this.verificationId,
    this.smsCode,
  );
}
