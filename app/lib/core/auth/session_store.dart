import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../constants/storage/storage_keys.dart';

import 'auth_session.dart';

class SessionStore {
  final FlutterSecureStorage secureStorage;
  final SharedPreferences sharedPreferences;

  const SessionStore(
    this.secureStorage,
    this.sharedPreferences,
  );

  Future<AuthSession?> readSession() async {
    final String? accessToken = await secureStorage.read(key: StorageKeys.authAccessToken);
    final String? refreshToken = await secureStorage.read(key: StorageKeys.authRefreshToken);
    final String? rawUser = sharedPreferences.getString(StorageKeys.authUser);

    if (accessToken == null || refreshToken == null || rawUser == null) {
      return null;
    }

    final String? rawProfile = sharedPreferences.getString(StorageKeys.authProfile);

    return AuthSession(
      user: AuthUser.fromJson(Map<String, dynamic>.from(jsonDecode(rawUser) as Map)),
      profile: rawProfile == null ? null : Map<String, dynamic>.from(jsonDecode(rawProfile) as Map),
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
  }

  Future<String?> readAccessToken() {
    return secureStorage.read(key: StorageKeys.authAccessToken);
  }

  Future<String?> readRefreshToken() {
    return secureStorage.read(key: StorageKeys.authRefreshToken);
  }

  Future<String?> readOnboardingToken() {
    return secureStorage.read(key: StorageKeys.authOnboardingToken);
  }

  Future<void> saveSession(AuthSession session) async {
    await secureStorage.write(key: StorageKeys.authAccessToken, value: session.accessToken);
    await secureStorage.write(key: StorageKeys.authRefreshToken, value: session.refreshToken);
    await secureStorage.delete(key: StorageKeys.authOnboardingToken);
    await sharedPreferences.setString(StorageKeys.authUser, session.encodeUser());
    await sharedPreferences.setString(StorageKeys.authProfile, session.encodeProfile());
  }

  Future<void> saveTokenPair({
    required String accessToken,
    required String refreshToken,
  }) async {
    await secureStorage.write(key: StorageKeys.authAccessToken, value: accessToken);
    await secureStorage.write(key: StorageKeys.authRefreshToken, value: refreshToken);
  }

  Future<void> saveOnboardingToken(String token) async {
    await clearSession();
    await secureStorage.write(key: StorageKeys.authOnboardingToken, value: token);
  }

  Future<void> clearSession() async {
    await secureStorage.delete(key: StorageKeys.authAccessToken);
    await secureStorage.delete(key: StorageKeys.authRefreshToken);
    await secureStorage.delete(key: StorageKeys.authOnboardingToken);
    await sharedPreferences.remove(StorageKeys.authUser);
    await sharedPreferences.remove(StorageKeys.authProfile);
  }
}
