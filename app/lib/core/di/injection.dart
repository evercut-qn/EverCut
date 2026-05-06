// lib/core/di/injection.dart

import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../auth/auth_state_notifier.dart';
import 'modules/authentication_module.dart';
import 'modules/connectivity_module.dart';
import 'modules/network_module.dart';
import 'modules/merchant_onboarding_module.dart';
import 'modules/router_module.dart';
import 'modules/storage_module.dart';
import 'modules/theme_module.dart';

final GetIt sl = GetIt.instance;

Future<void> init() async {
  ConnectivityModule.register(sl);
  StorageModule.register(sl);
  await sl.getAsync<SharedPreferences>();
  await sl.allReady();
  NetworkModule.register(sl);
  await sl.allReady();
  ThemeModule.register(sl);
  AuthenticationModule.register(sl);
  MerchantOnboardingModule.register(sl);
  await sl<AuthStateNotifier>().restore();
  RouterModule.register(sl);
  await sl.allReady();
}
