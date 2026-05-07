// lib/features/authentication/routing/authentication_router.dart

import 'package:flutter/cupertino.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/navigation/route_paths.dart';
import '../../../core/constants/navigation/route_segments.dart';
import '../../../core/di/injection.dart' as di;
import '../presentation/bloc/authentication_bloc.dart';
import '../presentation/cubit/otp_resend_cubit.dart';
import '../presentation/views/otp_verification/otp_verification_screen.dart';
import '../presentation/views/phone_entry/phone_entry_screen.dart';

class AuthenticationRouter {
  static ShellRoute config(GlobalKey<NavigatorState>? parentNavigatorKey) => ShellRoute(
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
              return NoTransitionPage(
                child: const PhoneEntryScreen(),
              );
            },
            routes: <GoRoute>[
              GoRoute(
                path: RouteSegments.otpVerification,
                pageBuilder: (BuildContext context, GoRouterState state) {
                  final phoneNumber = (state.extra as Map<String, String>)['phoneNumber']!;
                  return CupertinoPage(
                    child: BlocProvider(
                      create: (BuildContext context) => OtpResendCubit(),
                      child: OtpVerificationScreen(phoneNumber),
                    ),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    ],
  );
}
