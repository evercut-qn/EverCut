// lib/shared/extensions/context/device_metrics_extension.dart

import 'package:flutter/widgets.dart';

import '../../utils/device/device_metrics.dart';

extension DeviceMetricsExtension on BuildContext {
  double get screenWidth => DeviceMetrics.size.width;
  double get screenHeight => DeviceMetrics.size.height;
  EdgeInsets get systemPadding => DeviceMetrics.padding;
  double scale(double value) => DeviceMetrics.scale(value);
  Size get safeAreaViewportSize {
    final (EdgeInsets padding, Size size) = (DeviceMetrics.padding, DeviceMetrics.size);
    return Size(
      size.width - (padding.left + padding.right),
      size.height - (padding.top + padding.bottom),
    );
  }
}
