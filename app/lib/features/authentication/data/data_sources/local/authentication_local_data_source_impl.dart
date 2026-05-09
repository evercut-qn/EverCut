// lib/features/authentication/data/data_sources/local/authentication_local_data_source_impl.dart

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../../../core/constants/storage/storage_keys.dart';

import 'authentication_local_data_source.dart';

class AuthenticationLocalDataSourceImpl implements AuthenticationLocalDataSource {
  final FlutterSecureStorage flutterSecureStorage;

  const AuthenticationLocalDataSourceImpl(this.flutterSecureStorage);

  @override
  Future<bool> hasActiveSession() async {
    try {
      final String? accessToken = await getAccessToken();
      final String? refreshToken = await getRefreshToken();
      return accessToken != null && accessToken.isNotEmpty && refreshToken != null && refreshToken.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  @override
  Future<void> saveAccessToken(String accessToken) async {
    try {
      return await flutterSecureStorage.write(
        key: StorageKeys.authenticationAccessToken,
        value: accessToken,
      );
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<void> saveRefreshToken(String refreshToken) async {
    try {
      return await flutterSecureStorage.write(
        key: StorageKeys.authenticationRefreshToken,
        value: refreshToken,
      );
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<void> saveOnboardingToken(String onboardingToken) async {
    try {
      return await flutterSecureStorage.write(
        key: StorageKeys.authenticationOnboardingToken,
        value: onboardingToken,
      );
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<String?> getAccessToken() async {
    try {
      return await flutterSecureStorage.read(key: StorageKeys.authenticationAccessToken);
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<String?> getRefreshToken() async {
    try {
      return await flutterSecureStorage.read(key: StorageKeys.authenticationRefreshToken);
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<String?> getOnboardingToken() async {
    try {
      return await flutterSecureStorage.read(key: StorageKeys.authenticationOnboardingToken);
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<void> clearAccessToken() async {
    try {
      return await flutterSecureStorage.delete(key: StorageKeys.authenticationAccessToken);
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<void> clearRefreshToken() async {
    try {
      return await flutterSecureStorage.delete(key: StorageKeys.authenticationRefreshToken);
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<void> clearOnboardingToken() async {
    try {
      return await flutterSecureStorage.delete(key: StorageKeys.authenticationOnboardingToken);
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<void> clearSession() async {
    try {
      await Future.wait([
        clearAccessToken(),
        clearRefreshToken(),
        clearOnboardingToken(),
      ]);
    } catch (_) {
      rethrow;
    }
  }
}
