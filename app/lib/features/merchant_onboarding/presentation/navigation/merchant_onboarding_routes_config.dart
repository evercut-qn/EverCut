// lib/features/merchant_onboarding/presentation/navigation/merchant_onboarding_routes_config.dart

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/navigation/route_paths.dart';
import '../../../../core/constants/navigation/route_segments.dart';
import '../views/amenities/amenities_screen.dart';
import '../views/availability/availability_screen.dart';
import '../views/business_profile/business_profile_screen.dart';
import '../views/payout_details/payout_details_screen.dart';
import '../views/personal_information/personal_information_screen.dart';
import '../widgets/merchant_onboarding_appbar.dart';

class MerchantOnboardingRoutes {
  static ShellRoute config(GlobalKey<NavigatorState>? parentNavigatorKey) => ShellRoute(
    pageBuilder: (BuildContext context, GoRouterState state, Widget child) {
      return CupertinoPage(
        child: Scaffold(
          body: SafeArea(
            child: Column(
              children: [
                MerchantOnboardingAppBar(
                  currentIndex: state.uri.pathSegments.length - 2,
                  indicatorLength: 5,
                  titleText: state.topRoute?.name ?? '',
                ),
                const Divider(height: 1.0),
                Expanded(child: child),
              ],
            ),
          ),
        ),
      );
    },
    routes: [
      GoRoute(
        path: RoutePaths.merchantOnboarding,
        redirect: (BuildContext context, GoRouterState state) {
          if (state.uri.path == RoutePaths.merchantOnboarding) {
            return RoutePaths.personalInformation;
          } else {
            return null;
          }
        },
        routes: <GoRoute>[
          GoRoute(
            name: 'Personal Information',
            path: RouteSegments.personalInformation,
            pageBuilder: (BuildContext context, GoRouterState state) {
              return MaterialPage(
                child: const PersonalInformationScreen(),
              );
            },
            routes: <GoRoute>[
              GoRoute(
                name: 'Business Profile',
                path: RouteSegments.businessProfile,
                pageBuilder: (BuildContext context, GoRouterState state) {
                  return MaterialPage(
                    child: const BusinessProfileScreen(),
                  );
                },
                routes: <GoRoute>[
                  GoRoute(
                    name: 'Amenities',
                    path: RouteSegments.amenities,
                    pageBuilder: (BuildContext context, GoRouterState state) {
                      return MaterialPage(
                        child: const AmenitiesScreen(),
                      );
                    },
                    routes: <GoRoute>[
                      GoRoute(
                        name: 'Availability',
                        path: RouteSegments.availability,
                        pageBuilder: (BuildContext context, GoRouterState state) {
                          return MaterialPage(
                            child: const AvailabilityScreen(),
                          );
                        },
                        routes: <GoRoute>[
                          GoRoute(
                            name: 'Payout Details',
                            path: RouteSegments.payoutDetails,
                            pageBuilder: (BuildContext context, GoRouterState state) {
                              return MaterialPage(
                                child: const PayoutDetailsScreen(),
                              );
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );
}
