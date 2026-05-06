// lib/core/theme/domain/use_cases/get_theme_mode_use_case.dart

import 'package:flutter/material.dart';

import '../repositories/theme_repository.dart';

class GetThemeModeUseCase {
  final ThemeRepository themeRepository;

  const GetThemeModeUseCase(this.themeRepository);

  ThemeMode call() {
    try {
      return themeRepository.getThemeMode();
    } catch (_) {
      return ThemeMode.system;
    }
  }
}
