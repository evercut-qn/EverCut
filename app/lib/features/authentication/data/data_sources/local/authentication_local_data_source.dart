// lib/features/authentication/data/data_sources/local/authentication_local_data_source.dart
import '../../../../../core/auth/auth_session.dart';

abstract class AuthenticationLocalDataSource {
  Future<AuthSession?> readSession();
  Future<void> saveSession(AuthSession session);
  Future<void> saveOnboardingToken(String onboardingToken);
  Future<String?> readRefreshToken();
  Future<void> saveTokenPair({
    required String accessToken,
    required String refreshToken,
  });
  Future<void> clearSession();
}
