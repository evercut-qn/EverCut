// lib/features/authentication/domain/use_cases/authentication_otp_verify_use_case.dart

import '../repositories/authentication_repository.dart';

import 'authentication_otp_verify_params.dart';

class AuthenticationOtpVerifyUseCase {
  final AuthenticationRepository authenticationRepository;

  const AuthenticationOtpVerifyUseCase(this.authenticationRepository);

  Future<void> call(AuthenticationOtpVerifyParams params) async {}
}
