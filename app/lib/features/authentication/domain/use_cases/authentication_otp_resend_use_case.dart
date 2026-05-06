// lib/features/authentication/domain/use_cases/authentication_otp_resend_use_case.dart

import '../repositories/authentication_repository.dart';

import 'authentication_otp_resend_params.dart';

class AuthenticationOtpResendUseCase {
  final AuthenticationRepository authenticationRepository;

  const AuthenticationOtpResendUseCase(this.authenticationRepository);

  Future<void> call(AuthenticationOtpResendParams params) {
    return authenticationRepository.resendOtp(params.phoneNumber);
  }
}
