// lib/shared/extensions/context/device_metrics.dart

import 'dart:ui';

import 'package:flutter/widgets.dart';

class DeviceMetrics {
  DeviceMetrics._();

  static const double _designWidth = 414.0;

  static late Size size;
  static late EdgeInsets padding;

  static late double _scaleFactor;

  static void sync([FlutterView? view]) {
    view ??= PlatformDispatcher.instance.views.first;

    size = view.physicalSize / view.devicePixelRatio;
    padding = EdgeInsets.fromViewPadding(view.padding, view.devicePixelRatio);

    _scaleFactor = size.width / _designWidth;
  }

  static double scale(double value) => value * _scaleFactor;
}
