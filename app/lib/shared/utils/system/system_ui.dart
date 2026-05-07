// lib/shared/utils/system/system_ui.dart

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/di/injection.dart' as di;
import '../../../core/theme/presentation/cubit/theme_cubit.dart';

class SystemUi {
  static StreamSubscription<ThemeState>? _themeCubitStreamSubscription;

  static Future<void> init() async {
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge, overlays: SystemUiOverlay.values);
    await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

    _themeCubitStreamSubscription = di.sl<ThemeCubit>().stream.listen((state) {
      final iconBrightness = state.isDarkMode ? Brightness.light : Brightness.dark;
      final statusBarBrightness = state.isDarkMode ? Brightness.dark : Brightness.light;

      SystemChrome.setSystemUIOverlayStyle(
        SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarBrightness: statusBarBrightness,
          statusBarIconBrightness: iconBrightness,
          systemNavigationBarColor: Colors.transparent,
          systemNavigationBarDividerColor: Colors.transparent,
          systemNavigationBarIconBrightness: iconBrightness,
        ),
      );
    });
  }

  static void dispose() {
    _themeCubitStreamSubscription?.cancel();
    _themeCubitStreamSubscription = null;
  }
}
