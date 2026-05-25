// lib/features/authentication/domain/use_cases/session/use_cases/authentication_session_logout_use_case.dart

import '../../../repositories/authentication_repository.dart';

class AuthenticationSessionLogoutUseCase {
  final AuthenticationRepository authenticationRepository;

  const AuthenticationSessionLogoutUseCase(this.authenticationRepository);

  Future<void> call() async {
    return await authenticationRepository.logout();
  }
}
