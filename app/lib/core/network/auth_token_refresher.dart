abstract class AuthTokenRefresher {
  Future<bool> refreshToken();
  Future<void> clearSession();
}
