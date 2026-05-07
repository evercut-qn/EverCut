// lib/features/transactions/routing/transactions_router.dart

import 'package:flutter/cupertino.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/navigation/route_paths.dart';
import '../../../core/constants/navigation/route_segments.dart';
import '../presentation/views/transaction_details/transaction_details_screen.dart';
import '../presentation/views/transactions_screen.dart';

class TransactionsRouter {
  static GoRoute config(GlobalKey<NavigatorState>? parentNavigatorKey) => GoRoute(
    path: RoutePaths.transactions,
    pageBuilder: (BuildContext context, GoRouterState state) {
      return NoTransitionPage(
        child: const TransactionsScreen(),
      );
    },
    routes: <GoRoute>[
      GoRoute(
        path: RouteSegments.transactionDetails,
        pageBuilder: (BuildContext context, GoRouterState state) {
          return CupertinoPage(
            child: const TransactionDetailsScreen(),
          );
        },
        parentNavigatorKey: parentNavigatorKey,
      ),
    ],
  );
}
