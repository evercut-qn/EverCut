// lib/features/subscription/routing/subscription_router.dart

import 'package:flutter/cupertino.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/navigation/route_paths.dart';
import '../presentation/views/subscription_screen.dart';

class SubscriptionRouter {
  static GoRoute config(GlobalKey<NavigatorState> rootNavigatorKey) => GoRoute(
    path: RoutePaths.subscription,
    pageBuilder: (BuildContext context, GoRouterState state) {
      return NoTransitionPage(
        child: const SubscriptionScreen(),
      );
    },
  );
}
