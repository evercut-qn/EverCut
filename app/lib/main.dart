// lib/main.dart

import 'package:flutter/material.dart';

import 'app.dart';

import 'core/di/injection.dart' as di;
import 'shared/utils/device/device_metrics.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  DeviceMetrics.sync();

  await di.init();

  runApp(const EvercutMerchant());
}
