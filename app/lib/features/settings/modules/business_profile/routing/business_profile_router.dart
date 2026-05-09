// lib/features/settings/modules/business_profile/routing/business_profile_router.dart

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../../core/di/injection.dart';
import '../../../../../core/constants/navigation/route_segments.dart';
import '../presentation/bloc/business_profile_bloc.dart';
import '../presentation/views/edit_amenities/edit_amenities_screen.dart';
import '../presentation/views/manage_availability/manage_availability_screen.dart';
import '../presentation/views/update_bank_details/update_bank_details_screen.dart';
import '../presentation/views/business_profile_screen.dart';
import '../presentation/views/edit_business_profile/edit_business_profile_screen.dart';

class BusinessProfileRouter {
  static GoRoute config(GlobalKey<NavigatorState>? parentNavigatorKey) => GoRoute(
    path: RouteSegments.businessProfile,
    pageBuilder: (BuildContext context, GoRouterState state) {
      return CupertinoPage(
        child: BlocProvider(
          create: (context) => sl<BusinessProfileBloc>(),
          child: const BusinessProfileScreen(),
        ),
      );
    },
    parentNavigatorKey: parentNavigatorKey,
    routes: <GoRoute>[
      GoRoute(
        path: RouteSegments.editBusinessProfile,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: BlocProvider.value(
              value: context.read<BusinessProfileBloc>(),
              child: const EditBusinessProfileScreen(),
            ),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
      ),
      GoRoute(
        path: RouteSegments.updateBankDetails,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: BlocProvider.value(
              value: context.read<BusinessProfileBloc>(),
              child: const UpdateBankDetailsScreen(),
            ),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
      ),
      GoRoute(
        path: RouteSegments.editAmenities,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: BlocProvider.value(
              value: context.read<BusinessProfileBloc>(),
              child: const EditAmenitiesScreen(),
            ),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
      ),
      GoRoute(
        path: RouteSegments.manageAvailability,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: BlocProvider.value(
              value: context.read<BusinessProfileBloc>(),
              child: const ManageAvailabilityScreen(),
            ),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
      ),
    ],
  );
}
