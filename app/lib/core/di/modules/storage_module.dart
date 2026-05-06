// lib/core/di/modules/storage_module.dart

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../auth/session_store.dart';
import '../../auth/auth_state_notifier.dart';

class StorageModule {
  static void register(GetIt sl) {
    sl.registerLazySingletonAsync<SharedPreferences>(
      () => SharedPreferences.getInstance(),
    );
    sl.registerLazySingleton<FlutterSecureStorage>(
      () => const FlutterSecureStorage(
        aOptions: AndroidOptions(encryptedSharedPreferences: true),
        iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
      ),
    );
    sl.registerSingletonWithDependencies<SessionStore>(
      () => SessionStore(
        sl<FlutterSecureStorage>(),
        sl<SharedPreferences>(),
      ),
      dependsOn: [SharedPreferences],
    );
    sl.registerSingletonWithDependencies<AuthStateNotifier>(
      () => AuthStateNotifier(sl<SessionStore>()),
      dependsOn: [SessionStore],
    );
  }
}
