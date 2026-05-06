// lib/features/settings/presentation/navigation/settings_routes_config.dart

import 'package:flutter/cupertino.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/navigation/route_paths.dart';
import '../../../../core/constants/navigation/route_segments.dart';
import '../views/appearance/appearance_screen.dart';
import '../views/business_profile/business_profile_screen.dart';
import '../views/business_profile/edit_business_profile/edit_business_profile_screen.dart';
import '../views/business_profile/employee_management/employee_management_screen.dart';
import '../views/business_profile/manage_services/manage_services_screen.dart';
import '../views/business_profile/upi_details/upi_details_screen.dart';
import '../views/manage_account/change_pin/change_pin_screen.dart';
import '../views/manage_account/delete_account/delete_account_screen.dart';
import '../views/manage_account/edit_profile/edit_profile_screen.dart';
import '../views/manage_account/manage_account_screen.dart';
import '../views/notifications/notifications_screen.dart';
import '../views/settings_screen.dart';

class SettingsRoutes {
  static GoRoute config(GlobalKey<NavigatorState>? parentNavigatorKey) => GoRoute(
    path: RoutePaths.settings,
    pageBuilder: (BuildContext context, GoRouterState state) {
      return NoTransitionPage(
        child: const SettingsScreen(),
      );
    },
    routes: <GoRoute>[
      GoRoute(
        path: RouteSegments.manageAccount,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const ManageAccountScreen(),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
        routes: <GoRoute>[
          GoRoute(
            path: RouteSegments.editProfile,
            pageBuilder: (BuildContext context, GoRouterState state) {
              return CupertinoPage(
                child: const EditProfileScreen(),
              );
            },
            parentNavigatorKey: parentNavigatorKey,
          ),
          GoRoute(
            path: RouteSegments.changePin,
            pageBuilder: (BuildContext context, GoRouterState state) {
              return CupertinoPage(
                child: const ChangePinScreen(),
              );
            },
            parentNavigatorKey: parentNavigatorKey,
          ),
          GoRoute(
            path: RouteSegments.deleteAccount,
            pageBuilder: (BuildContext context, GoRouterState state) {
              return CupertinoPage(
                child: const DeleteAccountScreen(),
              );
            },
            parentNavigatorKey: parentNavigatorKey,
          ),
        ],
      ),
      GoRoute(
        path: RouteSegments.settingsBusinessProfile,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const BusinessProfileScreen(),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
        routes: <GoRoute>[
          GoRoute(
            path: RouteSegments.editBusinessProfile,
            pageBuilder: (BuildContext context, GoRouterState state) {
              return CupertinoPage(
                child: const EditBusinessProfileScreen(),
              );
            },
            parentNavigatorKey: parentNavigatorKey,
          ),
          GoRoute(
            path: RouteSegments.employeeManagement,
            pageBuilder: (BuildContext context, GoRouterState state) {
              return CupertinoPage(
                child: const EmployeeManagementScreen(),
              );
            },
            parentNavigatorKey: parentNavigatorKey,
          ),
          GoRoute(
            path: RouteSegments.manageServices,
            pageBuilder: (BuildContext context, GoRouterState state) {
              return CupertinoPage(
                child: const ManageServicesScreen(),
              );
            },
            parentNavigatorKey: parentNavigatorKey,
          ),
          GoRoute(
            path: RouteSegments.upiDetails,
            pageBuilder: (BuildContext context, GoRouterState state) {
              return CupertinoPage(
                child: const UPIDetailsScreen(),
              );
            },
            parentNavigatorKey: parentNavigatorKey,
          ),
        ],
      ),
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
        path: RouteSegments.settingsNotifications,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const NotificationsScreen(),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
      ),
    ],
  );
}
