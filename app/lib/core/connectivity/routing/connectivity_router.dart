// lib/core/connectivity/routing/connectivity_router.dart

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../constants/navigation/route_paths.dart';
import '../presentation/views/connectivity_screen.dart';

class ConnectivityRouter {
  static GoRoute config(GlobalKey<NavigatorState>? parentNavigatorKey) => GoRoute(
    path: RoutePaths.connectivity,
    pageBuilder: (BuildContext context, GoRouterState state) {
      return MaterialPage(
        canPop: false,
        child: const ConnectivityScreen(),
        fullscreenDialog: true,
      );
    },
  );
}
