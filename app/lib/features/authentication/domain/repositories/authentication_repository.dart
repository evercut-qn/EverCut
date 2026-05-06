// lib/features/authentication/domain/repositories/authentication_repository.dart

import '../entities/authentication_result.dart';

abstract class AuthenticationRepository {
  Future<void> sendOtp(String phoneNumber);
  Future<void> resendOtp(String phoneNumber);
  Future<AuthenticationResult> verifyOtp({
    required String phoneNumber,
    required String otp,
  });
  Future<bool> refreshToken();
  Future<void> logout();
  Future<void> clearSession();
}
