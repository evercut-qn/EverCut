// lib/features/authentication/data/data_sources/local/authentication_local_data_source_impl.dart
import '../../../../../core/auth/auth_session.dart';
import '../../../../../core/auth/session_store.dart';

import 'authentication_local_data_source.dart';

class AuthenticationLocalDataSourceImpl implements AuthenticationLocalDataSource {
  final SessionStore sessionStore;

  const AuthenticationLocalDataSourceImpl(this.sessionStore);

  @override
  Future<void> clearSession() {
    return sessionStore.clearSession();
  }

  @override
  Future<AuthSession?> readSession() {
    return sessionStore.readSession();
  }

  @override
  Future<String?> readRefreshToken() {
    return sessionStore.readRefreshToken();
  }

  @override
  Future<void> saveOnboardingToken(String onboardingToken) {
    return sessionStore.saveOnboardingToken(onboardingToken);
  }

  @override
  Future<void> saveSession(AuthSession session) {
    return sessionStore.saveSession(session);
  }

  @override
  Future<void> saveTokenPair({
    required String accessToken,
    required String refreshToken,
  }) {
    return sessionStore.saveTokenPair(
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
  }
}
