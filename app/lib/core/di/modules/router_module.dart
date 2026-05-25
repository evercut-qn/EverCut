// lib/core/di/modules/router_module.dart

import 'package:get_it/get_it.dart';
import 'package:go_router/go_router.dart';

import '../../navigation/app_router.dart';

class RouterModule {
  static void register(GetIt sl) {
    sl.registerLazySingleton<GoRouter>(() => AppRouter.config);
  }
}
