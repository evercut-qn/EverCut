// lib/features/authentication/domain/use_cases/otp/params/authentication_otp_send_params.dart

class AuthenticationOtpSendParams {
  final String phoneNumber;

  const AuthenticationOtpSendParams({
    required this.phoneNumber,
  });
}
