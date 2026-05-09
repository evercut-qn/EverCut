// lib/features/authentication/data/data_sources/local/authentication_local_data_source.dart

abstract interface class AuthenticationLocalDataSource {
  Future<bool> hasActiveSession();
  Future<void> saveAccessToken(String accessToken);
  Future<void> saveRefreshToken(String refreshToken);
  Future<void> saveOnboardingToken(String onboardingToken);
  Future<String?> getAccessToken();
  Future<String?> getRefreshToken();
  Future<String?> getOnboardingToken();
  Future<void> clearAccessToken();
  Future<void> clearRefreshToken();
  Future<void> clearOnboardingToken();
  Future<void> clearSession();
}
