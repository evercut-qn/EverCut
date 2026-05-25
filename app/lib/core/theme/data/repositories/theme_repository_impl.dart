// lib/core/theme/data/repositories/theme_repository_impl.dart

import 'package:flutter/material.dart';

import '../../domain/repositories/theme_repository.dart';
import '../data_sources/local/theme_local_data_source.dart';

class ThemeRepositoryImpl implements ThemeRepository {
  final ThemeLocalDataSource localDataSource;

  ThemeRepositoryImpl(this.localDataSource);

  @override
  ThemeMode getThemeMode() {
    return localDataSource.getThemeMode();
  }

  @override
  Future<void> updateThemeMode(ThemeMode mode) {
    return localDataSource.saveThemeMode(mode);
  }
}
