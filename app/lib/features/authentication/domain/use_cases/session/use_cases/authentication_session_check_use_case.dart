// lib/features/authentication/domain/use_cases/session/use_cases/authentication_session_check_use_case.dart

import '../../../repositories/authentication_repository.dart';

class AuthenticationSessionCheckUseCase {
  final AuthenticationRepository authenticationRepository;

  const AuthenticationSessionCheckUseCase(this.authenticationRepository);

  Future<bool> call() async {
    return await authenticationRepository.hasActiveSession();
  }
}
