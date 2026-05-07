// lib/features/appointments/routing/appointments_router.dart

import 'package:flutter/cupertino.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/navigation/route_paths.dart';
import '../../../core/constants/navigation/route_segments.dart';
import '../../../shared/enums/appointment_status.dart';
import '../presentation/views/appointment_details/appointment_details_screen.dart';
import '../presentation/views/appointments_list/appointments_list_screen.dart';
import '../presentation/views/appointments_screen.dart';
import '../presentation/views/employee_appointments/employee_appointments_screen.dart';
import '../presentation/views/team_activity/team_activity_screen.dart';

class AppointmentsRouter {
  static GoRoute config(GlobalKey<NavigatorState>? parentNavigatorKey) => GoRoute(
    path: RoutePaths.appointments,
    pageBuilder: (BuildContext context, GoRouterState state) {
      return NoTransitionPage(
        child: const AppointmentsScreen(),
      );
    },
    routes: <GoRoute>[
      GoRoute(
        path: RouteSegments.appointmentsList,
        pageBuilder: (BuildContext context, GoRouterState state) {
          final AppointmentStatusEnum status = (state.extra as Map<String, AppointmentStatusEnum>)['status']!;
          return CupertinoPage(
            child: AppointmentsListScreen(status),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
        routes: <GoRoute>[
          GoRoute(
            path: RouteSegments.appointmentDetails,
            pageBuilder: (BuildContext context, GoRouterState state) {
              return CupertinoPage(
                child: const AppointmentDetailsScreen(),
              );
            },
            parentNavigatorKey: parentNavigatorKey,
          ),
        ],
      ),
      GoRoute(
        path: RouteSegments.teamActivity,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const TeamActivityScreen(),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
        routes: <GoRoute>[
          GoRoute(
            path: RouteSegments.employeeAppointments,
            pageBuilder: (BuildContext context, GoRouterState state) {
              return CupertinoPage(
                child: const EmployeeAppointmentsScreen(),
              );
            },
            parentNavigatorKey: parentNavigatorKey,
            routes: <GoRoute>[
              GoRoute(
                path: RouteSegments.appointmentDetails,
                pageBuilder: (BuildContext context, GoRouterState state) {
                  return CupertinoPage(
                    child: const AppointmentDetailsScreen(),
                  );
                },
                parentNavigatorKey: parentNavigatorKey,
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: RouteSegments.employeeAppointments,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const EmployeeAppointmentsScreen(),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
        routes: <GoRoute>[
          GoRoute(
            path: RouteSegments.appointmentDetails,
            pageBuilder: (BuildContext context, GoRouterState state) {
              return CupertinoPage(
                child: const AppointmentDetailsScreen(),
              );
            },
            parentNavigatorKey: parentNavigatorKey,
          ),
        ],
      ),
      GoRoute(
        path: RouteSegments.appointmentDetails,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const AppointmentDetailsScreen(),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
      ),
    ],
  );
}
