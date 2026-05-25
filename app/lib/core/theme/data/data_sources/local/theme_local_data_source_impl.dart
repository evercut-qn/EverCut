// lib/core/theme/data/data_sources/local/theme_local_data_source_impl.dart

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../constants/storage/storage_keys.dart';
import '../../../../errors/cache/cache_exception.dart';

import 'theme_local_data_source.dart';

class ThemeLocalDataSourceImpl implements ThemeLocalDataSource {
  final SharedPreferences sharedPreferences;

  ThemeLocalDataSourceImpl(this.sharedPreferences);

  @override
  ThemeMode getThemeMode() {
    try {
      final cachedThemeModeIndex = sharedPreferences.getInt(StorageKeys.themeMode);
      if (cachedThemeModeIndex != null) {
        return ThemeMode.values[cachedThemeModeIndex];
      } else {
        return ThemeMode.system;
      }
    } catch (_) {
      throw const CacheException('Failed to read theme mode.');
    }
  }

  @override
  Future<void> saveThemeMode(ThemeMode mode) async {
    try {
      if (!(await sharedPreferences.setInt(StorageKeys.themeMode, mode.index))) {
        throw const CacheException('Failed to save theme mode.');
      }
    } catch (_) {
      throw const CacheException('Failed to save theme mode.');
    }
  }
}
