// lib/features/authentication/domain/use_cases/authentication_logout_use_case.dart

import '../repositories/authentication_repository.dart';

class AuthenticationLogoutUseCase {
  final AuthenticationRepository _repository;

  const AuthenticationLogoutUseCase(this._repository);

  Future<void> call() async {
    await _repository.logout();
  }
}
