// lib/shared/extensions/context/device_metrics.dart

import 'dart:ui';

import 'package:flutter/widgets.dart';

class DeviceMetrics {
  DeviceMetrics._();

  static const double _designWidth = 414.0;
  static const Size _fallbackSize = Size(_designWidth, 896.0);

  static Size _size = _fallbackSize;
  static EdgeInsets _padding = EdgeInsets.zero;
  static double _scaleFactor = 1.0;

  static void sync([FlutterView? view]) {
    final Iterable<FlutterView> views = PlatformDispatcher.instance.views;
    view ??= views.isNotEmpty ? views.first : null;

    if (view != null && view.devicePixelRatio > 0) {
      _padding = EdgeInsets.fromViewPadding(view.padding, view.devicePixelRatio);

      final Size logicalSize = view.physicalSize / view.devicePixelRatio;
      if (logicalSize.width > 0 && logicalSize.height > 0) {
        _size = logicalSize;
        _scaleFactor = _size.width / _designWidth;
      }
    }
  }

  static EdgeInsets get padding => _padding;
  static Size get size => _size;
  static double scale(double value) => value * _scaleFactor;
}
