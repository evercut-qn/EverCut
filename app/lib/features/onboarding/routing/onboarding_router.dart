// lib/features/onboarding/routing/onboarding_router.dart

import 'package:flutter/cupertino.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/navigation/route_paths.dart';
import '../presentation/views/onboarding_screen.dart';

class OnboardingRouter {
  static GoRoute config(GlobalKey<NavigatorState>? parentNavigatorKey) => GoRoute(
    path: RoutePaths.onboarding,
    pageBuilder: (BuildContext context, GoRouterState state) {
      return CupertinoPage(
        child: const OnboardingScreen(),
      );
    },
  );
}
