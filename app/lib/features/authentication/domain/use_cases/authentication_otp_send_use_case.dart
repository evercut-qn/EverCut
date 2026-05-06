// lib/features/authentication/domain/use_cases/authentication_otp_send_use_case.dart

import '../repositories/authentication_repository.dart';

import 'authentication_otp_send_params.dart';

class AuthenticationOtpSendUseCase {
  final AuthenticationRepository authenticationRepository;

  const AuthenticationOtpSendUseCase(this.authenticationRepository);

  Future<void> call(AuthenticationOtpSendParams params) async {}
}
