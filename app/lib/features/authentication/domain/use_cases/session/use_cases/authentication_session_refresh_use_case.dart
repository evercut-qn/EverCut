// lib/features/authentication/domain/use_cases/session/use_cases/authentication_session_refresh_use_case.dart

import '../../../repositories/authentication_repository.dart';

class AuthenticationSessionRefreshUseCase {
  final AuthenticationRepository authenticationRepository;

  const AuthenticationSessionRefreshUseCase(this.authenticationRepository);

  Future<void> call() async {
    return await authenticationRepository.refreshSession();
  }
}
