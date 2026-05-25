// lib/core/navigation/app_router.dart

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/appointments/routing/appointments_router.dart';
import '../../features/authentication/routing/authentication_router.dart';
import '../../features/dashboard/routing/dashboard_router.dart';
import '../../features/extras/routing/extras_router.dart';
import '../../features/onboarding/routing/onboarding_router.dart';
import '../../features/settings/routing/settings_router.dart';
import '../../features/subscription/routing/subscription_router.dart';
import '../../features/transactions/routing/transactions_router.dart';
import '../../shared/widgets/common/appbars/bottom_navigation_bar.dart';
import '../connectivity/routing/connectivity_router.dart';
import '../constants/navigation/route_paths.dart';
import '../theme/foundation/app_icons.dart';

class AppRouter {
  static final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>();
  static final List<String> _mainRoutes = const <String>[RoutePaths.dashboard, RoutePaths.appointments, RoutePaths.subscription, RoutePaths.transactions, RoutePaths.settings];
  static final GoRouter config = GoRouter(
    initialLocation: RoutePaths.dashboard,
    navigatorKey: _rootNavigatorKey,
    routes: [
      ExtrasRouter.config(_rootNavigatorKey),
      ConnectivityRouter.config(_rootNavigatorKey),
      AuthenticationRouter.config(_rootNavigatorKey),
      OnboardingRouter.config(_rootNavigatorKey),
      ShellRoute(
        pageBuilder: (BuildContext context, GoRouterState state, Widget child) {
          final selectedIndex = _mainRoutes.indexOf(state.topRoute?.path ?? RoutePaths.dashboard).clamp(0, _mainRoutes.length - 1);
          return NoTransitionPage(
            child: Scaffold(
              body: child,
              bottomNavigationBar: CustomBottomNavigationBar(
                destinations: <CustomBottomNavigationDestination>[
                  CustomBottomNavigationDestination(
                    icon: AppIcons.strokeRoundedHome01,
                    selectedIcon: AppIcons.solidRoundedHome01,
                    label: 'Dashboard',
                  ),
                  CustomBottomNavigationDestination(
                    icon: AppIcons.strokeRoundedAppointment02,
                    selectedIcon: AppIcons.solidRoundedAppointment02,
                    label: 'Appointments',
                  ),
                  CustomBottomNavigationDestination(
                    icon: AppIcons.strokeRoundedBookmark01,
                    selectedIcon: AppIcons.solidRoundedBookmark01,
                    label: 'Subscription',
                  ),
                  CustomBottomNavigationDestination(
                    icon: AppIcons.strokeRoundedInvoice04,
                    selectedIcon: AppIcons.solidRoundedInvoice04,
                    label: 'Transactions',
                  ),
                  CustomBottomNavigationDestination(
                    icon: AppIcons.strokeRoundedSettings01,
                    selectedIcon: AppIcons.solidRoundedSettings01,
                    label: 'Settings',
                  ),
                ],
                onDestinationSelected: (int value) {
                  if (selectedIndex != value) {
                    context.go(_mainRoutes[value]);
                  }
                },
                selectedIndex: selectedIndex,
              ),
            ),
          );
        },
        routes: <GoRoute>[
          DashboardRouter.config(_rootNavigatorKey),
          AppointmentsRouter.config(_rootNavigatorKey),
          SubscriptionRouter.config(_rootNavigatorKey),
          TransactionsRouter.config(_rootNavigatorKey),
          SettingsRouter.config(_rootNavigatorKey),
        ],
      ),
    ],
  );
}
