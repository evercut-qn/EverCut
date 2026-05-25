// lib/core/di/modules/storage_module.dart

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';

class StorageModule {
  static void register(GetIt sl) {
    sl.registerLazySingletonAsync<SharedPreferences>(() => SharedPreferences.getInstance());
    sl.registerLazySingleton<FlutterSecureStorage>(() => const FlutterSecureStorage());
  }
}
