// lib/core/navigation/app_router.dart

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../features/appointments/presentation/views/appointment_details/appointment_details_screen.dart';
import '../../features/appointments/presentation/views/appointments_screen.dart';
import '../../features/authentication/presentation/bloc/authentication_bloc.dart';
import '../../features/authentication/presentation/views/otp_verification/otp_verification_screen.dart';
import '../../features/authentication/presentation/views/phone_entry/phone_entry_screen.dart';
import '../../features/dashboard/presentation/views/dashboard_screen.dart';
import '../../features/image_gallery/presentation/views/image_gallery_screen.dart';
import '../../features/merchant_onboarding/presentation/navigation/merchant_onboarding_routes_config.dart';
import '../../features/merchant_onboarding/presentation/views/merchant_onboarding_screen.dart';
import '../../features/onboarding/presentation/views/onboarding_screen.dart';
import '../../features/ratings_and_reviews/presentation/views/ratings_and_reviews/ratings_and_reviews_screen.dart';
import '../../features/rewards/presentation/views/rewards_screen.dart';
import '../../features/settings/presentation/navigation/settings_routes_config.dart';
import '../../features/test/presentation/views/test_screen.dart';
import '../../features/transactions/presentation/views/transaction_details/transaction_details_screen.dart';
import '../../features/transactions/presentation/views/transactions_screen.dart';
import '../../shared/widgets/common/appbars/navigation_bar.dart';
import '../auth/auth_state_notifier.dart';
import '../connectivity/presentation/views/connection_not_found/connection_not_found_screen.dart';
import '../constants/navigation/route_paths.dart';
import '../constants/navigation/route_segments.dart';
import '../di/injection.dart' as di;
import '../theme/foundation/app_icons.dart';

class AppRouter {
  static final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>();

  static final List<String> _mainRoutes = const <String>[
    RoutePaths.dashboard,
    RoutePaths.appointments,
    RoutePaths.transactions,
    RoutePaths.settings,
  ];

  static final GoRouter config = GoRouter(
    initialLocation: RoutePaths.authentication,
    navigatorKey: _rootNavigatorKey,
    refreshListenable: di.sl<AuthStateNotifier>(),
    redirect: (BuildContext context, GoRouterState state) {
      final authState = di.sl<AuthStateNotifier>().state;
      final String location = state.uri.path;
      final bool isAuthRoute = location.startsWith(RoutePaths.authentication);
      final bool isOnboardingRoute = location.startsWith(RoutePaths.merchantOnboarding);
      final bool isConnectionRoute = location == RoutePaths.connectionNotFound;

      if (isConnectionRoute || location == RoutePaths.onboarding) {
        return null;
      }

      switch (authState.status) {
        case AppAuthStatus.unknown:
          return isAuthRoute ? null : RoutePaths.authentication;
        case AppAuthStatus.unauthenticated:
          return isAuthRoute ? null : RoutePaths.authentication;
        case AppAuthStatus.onboarding:
          return isOnboardingRoute ? null : RoutePaths.merchantOnboarding;
        case AppAuthStatus.authenticated:
          if (isAuthRoute || isOnboardingRoute) {
            return RoutePaths.dashboard;
          }
          return null;
      }
    },
    routes: [
      GoRoute(
        path: RoutePaths.connectionNotFound,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return MaterialPage(
            canPop: false,
            child: const ConnectionNotFoundScreen(),
            fullscreenDialog: true,
          );
        },
      ),
      GoRoute(
        path: RoutePaths.onboarding,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return NoTransitionPage(
            child: const OnboardingScreen(),
          );
        },
      ),
      ShellRoute(
        builder: (BuildContext context, GoRouterState state, Widget child) {
          return BlocProvider(
            create: (BuildContext context) => di.sl<AuthenticationBloc>(),
            child: child,
          );
        },
        routes: <GoRoute>[
          GoRoute(
            path: RoutePaths.authentication,
            redirect: (BuildContext context, GoRouterState state) {
              if (state.uri.path == RoutePaths.authentication) {
                return RoutePaths.phoneEntry;
              } else {
                return null;
              }
            },
            routes: <GoRoute>[
              GoRoute(
                path: RouteSegments.phoneEntry,
                pageBuilder: (BuildContext context, GoRouterState state) {
                  if (context.canPop()) {
                    return CupertinoPage(
                      child: const PhoneEntryScreen(),
                    );
                  } else {
                    return NoTransitionPage(
                      child: const PhoneEntryScreen(),
                    );
                  }
                },
                routes: <GoRoute>[
                  GoRoute(
                    path: RouteSegments.otpVerification,
                    pageBuilder: (BuildContext context, GoRouterState state) {
                      final phoneNumber = (state.extra as Map<String, String>)['phoneNumber']!;
                      return CupertinoPage(
                        child: OtpVerificationScreen(phoneNumber),
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: RoutePaths.merchantOnboarding,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const MerchantOnboardingScreen(),
          );
        },
      ),
      // MerchantOnboardingRoutes.config(_rootNavigatorKey),
      ShellRoute(
        pageBuilder: (BuildContext context, GoRouterState state, Widget child) {
          final selectedIndex = _mainRoutes.indexOf(state.topRoute?.path ?? RoutePaths.dashboard).clamp(0, _mainRoutes.length - 1);
          return NoTransitionPage(
            child: Scaffold(
              body: child,
              bottomNavigationBar: CustomNavigationBar(
                destinations: <NavigationDestination>[
                  NavigationDestination(
                    icon: Icon(AppIcons.strokeRoundedHome01),
                    selectedIcon: Icon(AppIcons.solidRoundedHome01),
                    label: 'Dashboard',
                  ),
                  NavigationDestination(
                    icon: Icon(AppIcons.strokeRoundedAppointment02),
                    selectedIcon: Icon(AppIcons.solidRoundedAppointment02),
                    label: 'Appointments',
                  ),
                  NavigationDestination(
                    icon: Icon(AppIcons.strokeRoundedFile02),
                    selectedIcon: Icon(AppIcons.solidRoundedFile02),
                    label: 'Transactions',
                  ),
                  NavigationDestination(
                    icon: Icon(AppIcons.strokeRoundedSettings01),
                    selectedIcon: Icon(AppIcons.solidRoundedSettings01),
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
          GoRoute(
            path: RoutePaths.dashboard,
            pageBuilder: (BuildContext context, GoRouterState state) {
              return NoTransitionPage(
                child: const DashboardScreen(),
              );
            },
            routes: <GoRoute>[
              GoRoute(
                path: RouteSegments.rewards,
                parentNavigatorKey: _rootNavigatorKey,
                pageBuilder: (BuildContext context, GoRouterState state) {
                  return CupertinoPage(
                    child: const RewardsScreen(),
                  );
                },
              ),
            ],
          ),
          GoRoute(
            path: RoutePaths.appointments,
            pageBuilder: (BuildContext context, GoRouterState state) {
              return NoTransitionPage(
                child: const AppointmentsScreen(),
              );
            },
            routes: <GoRoute>[
              GoRoute(
                path: RouteSegments.appointmentDetails,
                parentNavigatorKey: _rootNavigatorKey,
                pageBuilder: (BuildContext context, GoRouterState state) {
                  return CupertinoPage(
                    child: const AppointmentDetailsScreen(),
                  );
                },
              ),
            ],
          ),
          GoRoute(
            path: RoutePaths.transactions,
            pageBuilder: (BuildContext context, GoRouterState state) {
              return NoTransitionPage(
                child: const TransactionsScreen(),
              );
            },
            routes: <GoRoute>[
              GoRoute(
                path: RouteSegments.transactionDetails,
                parentNavigatorKey: _rootNavigatorKey,
                pageBuilder: (BuildContext context, GoRouterState state) {
                  return CupertinoPage(
                    child: const TransactionDetailsScreen(),
                  );
                },
              ),
            ],
          ),
          SettingsRoutes.config(_rootNavigatorKey),
        ],
      ),
      GoRoute(
        path: RoutePaths.imageGallery,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const ImageGalleryScreen(),
          );
        },
      ),
      GoRoute(
        path: RoutePaths.ratingsAndReviews,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return NoTransitionPage(
            child: const RatingsAndReviewsScreen(),
          );
        },
      ),
      GoRoute(
        path: RoutePaths.test,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return MaterialPage(
            child: const TestScreen(),
          );
        },
      ),
    ],
  );
}
