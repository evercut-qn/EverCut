// lib/core/theme/data/data_sources/local/theme_local_data_source.dart

import 'package:flutter/material.dart';

abstract class ThemeLocalDataSource {
  ThemeMode getThemeMode();
  Future<void> saveThemeMode(ThemeMode mode);
}
