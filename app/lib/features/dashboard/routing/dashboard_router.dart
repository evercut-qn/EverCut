// lib/features/dashboard/routing/dashboard_router.dart

import 'package:flutter/cupertino.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/navigation/route_paths.dart';
import '../../../core/constants/navigation/route_segments.dart';
import '../modules/analytics/presentation/views/analytics_screen.dart';
import '../modules/gallery/presentation/views/gallery_screen.dart';
import '../modules/notifications/presentation/views/notifications_screen.dart';
import '../modules/ratings_and_reviews/presentation/views/ratings_and_reviews_screen.dart';
import '../modules/rewards/presentation/views/rewards_screen.dart';
import '../modules/team/presentation/views/team_screen.dart';
import '../presentation/views/dashboard_screen.dart';

class DashboardRouter {
  static GoRoute config(GlobalKey<NavigatorState>? parentNavigatorKey) => GoRoute(
    path: RoutePaths.dashboard,
    pageBuilder: (BuildContext context, GoRouterState state) {
      return NoTransitionPage(
        child: const DashboardScreen(),
      );
    },
    routes: <GoRoute>[
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
        path: RouteSegments.rewards,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const RewardsScreen(),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
      ),
      GoRoute(
        path: RouteSegments.team,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const TeamScreen(),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
      ),
      GoRoute(
        path: RouteSegments.gallery,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const GalleryScreen(),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
      ),
      GoRoute(
        path: RouteSegments.analytics,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const AnalyticsScreen(),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
      ),
      GoRoute(
        path: RouteSegments.ratingsAndReviews,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return NoTransitionPage(
            child: const RatingsAndReviewsScreen(),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
      ),
    ],
  );
}
