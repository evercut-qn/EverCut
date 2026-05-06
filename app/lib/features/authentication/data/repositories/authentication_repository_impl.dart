// lib/features/authentication/data/repositories/authentication_repository_impl.dart

import '../../../../core/network/auth_token_refresher.dart';
import '../../../../core/auth/auth_state_notifier.dart';
import '../../domain/entities/authentication_result.dart';
import '../../domain/repositories/authentication_repository.dart';
import '../data_sources/local/authentication_local_data_source.dart';
import '../data_sources/remote/authentication_remote_data_source.dart';

class AuthenticationRepositoryImpl implements AuthenticationRepository, AuthTokenRefresher {
  final AuthenticationRemoteDataSource remoteDataSource;
  final AuthenticationLocalDataSource localDataSource;
  final AuthStateNotifier authStateNotifier;

  const AuthenticationRepositoryImpl(
    this.remoteDataSource,
    this.localDataSource,
    this.authStateNotifier,
  );

  @override
  Future<void> sendOtp(String phoneNumber) {
    return remoteDataSource.sendOtp(phoneNumber);
  }

  @override
  Future<void> resendOtp(String phoneNumber) {
    return remoteDataSource.resendOtp(phoneNumber);
  }

  @override
  Future<AuthenticationResult> verifyOtp({
    required String phoneNumber,
    required String otp,
  }) async {
    final result = await remoteDataSource.verifyOtp(
      phoneNumber: phoneNumber,
      otp: otp,
    );

    if (result.isNewUser) {
      final String onboardingToken = result.onboardingToken!;
      await localDataSource.saveOnboardingToken(onboardingToken);
      await authStateNotifier.markSessionChanged();
      return NewMerchantOnboardingRequired(onboardingToken);
    }

    final session = result.session!;
    await localDataSource.saveSession(session);
    await authStateNotifier.markSessionChanged();
    return ExistingMerchantSession(session);
  }

  @override
  Future<bool> refreshToken() async {
    final String? refreshToken = await localDataSource.readRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      return false;
    }

    try {
      final tokens = await remoteDataSource.refreshToken(refreshToken);
      if (tokens.accessToken.isEmpty || tokens.refreshToken.isEmpty) {
        await clearSession();
        return false;
      }
      await localDataSource.saveTokenPair(
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      );
      await authStateNotifier.markSessionChanged();
      return true;
    } catch (_) {
      await clearSession();
      return false;
    }
  }

  @override
  Future<void> logout() async {
    try {
      await remoteDataSource.logout();
    } finally {
      await clearSession();
    }
  }

  @override
  Future<void> clearSession() {
    return authStateNotifier.clear();
  }
}
