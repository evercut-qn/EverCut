// lib/features/authentication/domain/use_cases/otp/params/authentication_otp_resend_params.dart

class AuthenticationOtpResendParams {
  final String phoneNumber;

  const AuthenticationOtpResendParams({
    required this.phoneNumber,
  });
}
