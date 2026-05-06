// lib/core/theme/domain/use_cases/update_theme_mode_use_case.dart

import 'package:flutter/material.dart';

import '../repositories/theme_repository.dart';

class UpdateThemeModeUseCase {
  final ThemeRepository themeRepository;

  const UpdateThemeModeUseCase(this.themeRepository);

  Future<void> call(ThemeMode mode) async {
    return themeRepository.updateThemeMode(mode);
  }
}
