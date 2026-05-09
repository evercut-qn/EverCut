// lib/core/theme/presentation/cubit/theme_cubit.dart

import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/use_cases/get_theme_mode_use_case.dart';
import '../../domain/use_cases/update_theme_mode_use_case.dart';

part 'theme_state.dart';

class ThemeCubit extends Cubit<ThemeState> {
  final GetThemeModeUseCase getThemeMode;
  final UpdateThemeModeUseCase updateThemeMode;

  ThemeCubit(
    this.getThemeMode,
    this.updateThemeMode,
  ) : super(ThemeState.initial(getThemeMode()));

  Future<void> changeThemeMode(ThemeMode mode) async {
    try {
      if (mode != state.mode) {
        await updateThemeMode(mode);
        emit(
          state.copyWith(
            mode: mode,
          ),
        );
      }
    } catch (_) {}
  }

  void syncWithSystemBrightness(Brightness brightness) {
    if (state.mode == ThemeMode.system) {
      emit(
        state.copyWith(
          brightness: brightness,
        ),
      );
    }
  }
}
