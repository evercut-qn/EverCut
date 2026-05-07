// lib/features/settings/routing/settings_router.dart

import 'package:flutter/cupertino.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/navigation/route_paths.dart';
import '../../../core/constants/navigation/route_segments.dart';
import '../modules/appearance/presentation/views/appearance_screen.dart';
import '../modules/manage_account/presentation/views/delete_account/delete_account_screen.dart';
import '../modules/manage_account/presentation/views/edit_profile/edit_profile_screen.dart';
import '../modules/manage_account/presentation/views/manage_account_screen.dart';
import '../modules/manage_account/presentation/views/update_phone_number/update_phone_number_screen.dart';
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
            path: RouteSegments.updatePhoneNumber,
            pageBuilder: (BuildContext context, GoRouterState state) {
              return CupertinoPage(
                child: const UpdatePhoneNumberScreen(),
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
      // GoRoute(
      //   path: RouteSegments.businessProfile,
      //   pageBuilder: (BuildContext context, GoRouterState state) {
      //     return CupertinoPage(
      //       child: const BusinessProfileScreen(),
      //     );
      //   },
      //   parentNavigatorKey: parentNavigatorKey,
      //   routes: <GoRoute>[
      //     GoRoute(
      //       path: RouteSegments.editBusinessProfile,
      //       pageBuilder: (BuildContext context, GoRouterState state) {
      //         return CupertinoPage(
      //           child: const EditBusinessProfileScreen(),
      //         );
      //       },
      //       parentNavigatorKey: parentNavigatorKey,
      //     ),
      //     GoRoute(
      //       path: RouteSegments.bankAccountDetails,
      //       pageBuilder: (BuildContext context, GoRouterState state) {
      //         return CupertinoPage(
      //           child: const BankAccountDetailsScreen(),
      //         );
      //       },
      //       parentNavigatorKey: parentNavigatorKey,
      //     ),
      //     GoRoute(
      //       path: RouteSegments.employeeManagement,
      //       pageBuilder: (BuildContext context, GoRouterState state) {
      //         return CupertinoPage(
      //           child: const EmployeeManagementScreen(),
      //         );
      //       },
      //       parentNavigatorKey: parentNavigatorKey,
      //     ),
      //     GoRoute(
      //       path: RouteSegments.manageServices,
      //       pageBuilder: (BuildContext context, GoRouterState state) {
      //         return CupertinoPage(
      //           child: const ManageServicesScreen(),
      //         );
      //       },
      //       parentNavigatorKey: parentNavigatorKey,
      //     ),
      //     GoRoute(
      //       path: RouteSegments.amenities,
      //       pageBuilder: (BuildContext context, GoRouterState state) {
      //         return CupertinoPage(
      //           child: const AmenitiesScreen(),
      //         );
      //       },
      //       parentNavigatorKey: parentNavigatorKey,
      //     ),
      //   ],
      // ),
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
