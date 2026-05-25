// lib/features/settings/routing/settings_router.dart

import 'package:flutter/cupertino.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/navigation/route_paths.dart';
import '../../../core/constants/navigation/route_segments.dart';
import '../modules/appearance/presentation/views/appearance_screen.dart';
import '../modules/business_profile/routing/business_profile_router.dart';
import '../modules/contact_us/presentation/views/contact_us_screen.dart';
import '../modules/manage_account/routing/manage_account_router.dart';
import '../modules/notifications/presentation/views/notifications_screen.dart';
import '../modules/privacy_policy/presentation/views/privacy_policy_screen.dart';
import '../modules/terms_of_service/presentation/views/terms_of_service_screen.dart';
import '../presentation/views/settings_screen.dart';

class SettingsRouter {
  static GoRoute config(GlobalKey<NavigatorState>? parentNavigatorKey) => GoRoute(
    path: RoutePaths.settings,
    pageBuilder: (BuildContext context, GoRouterState state) {
      return NoTransitionPage(
        child: const SettingsScreen(),
      );
    },
    routes: <GoRoute>[
      ManageAccountRouter.config(parentNavigatorKey),
      BusinessProfileRouter.config(parentNavigatorKey),
      GoRoute(
        path: RouteSegments.appearance,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const AppearanceScreen(),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
      ),
      GoRoute(
        path: RouteSegments.notifications,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const NotificationsScreen(),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
      ),
      GoRoute(
        path: RouteSegments.contactUs,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const ContactUsScreen(),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
      ),
      GoRoute(
        path: RouteSegments.termsOfService,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const TermsOfServiceScreen(),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
      ),
      GoRoute(
        path: RouteSegments.privacyPolicy,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const PrivacyPolicyScreen(),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
      ),
    ],
  );
}
