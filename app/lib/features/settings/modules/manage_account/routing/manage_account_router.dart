// lib/features/settings/modules/manage_account/routing/manage_account_router.dart

import 'package:flutter/cupertino.dart';
import 'package:go_router/go_router.dart';

import '../../../../../core/constants/navigation/route_segments.dart';
import '../presentation/views/delete_account/delete_account_screen.dart';
import '../presentation/views/edit_profile/edit_profile_screen.dart';
import '../presentation/views/manage_account_screen.dart';
import '../presentation/views/update_phone_number/update_phone_number_screen.dart';

class ManageAccountRouter {
  static GoRoute config(GlobalKey<NavigatorState>? parentNavigatorKey) => GoRoute(
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
  );
}
