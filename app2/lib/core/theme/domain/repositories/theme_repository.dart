// lib/core/theme/domain/repositories/theme_repository.dart

import 'package:flutter/material.dart';

abstract class ThemeRepository {
  ThemeMode getThemeMode();
  Future<void> updateThemeMode(ThemeMode mode);
}
