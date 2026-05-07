// lib/features/extras/routing/extras_router.dart

import 'package:flutter/cupertino.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/navigation/route_paths.dart';
import '../../../core/constants/navigation/route_segments.dart';
import '../app_lock/presentation/views/app_lock_screen.dart';
import '../test/presentation/views/test_screen.dart';

class ExtrasRouter {
  static GoRoute config(GlobalKey<NavigatorState> rootNavigatorKey) => GoRoute(
    path: RoutePaths.extras,
    redirect: (BuildContext context, GoRouterState state) {
      if (state.uri.path == RoutePaths.authentication) {
        return RoutePaths.test;
      } else {
        return null;
      }
    },
    routes: <GoRoute>[
      GoRoute(
        path: RouteSegments.appLock,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const AppLockScreen(),
          );
        },
      ),
      GoRoute(
        path: RouteSegments.test,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const TestScreen(),
          );
        },
      ),
    ],
  );
}
