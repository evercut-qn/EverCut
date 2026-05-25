// lib/shared/extensions/context/go_router_extension.dart

import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

extension GoRouterExtension on BuildContext {
  Future<T?> pushNested<T extends Object?>(String routeName, {Object? extra}) async {
    return await push('${GoRouterState.of(this).matchedLocation}/$routeName', extra: extra);
  }
}
