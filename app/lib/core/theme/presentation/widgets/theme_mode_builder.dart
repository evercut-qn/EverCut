// lib/core/theme/presentation/widgets/theme_mode_builder.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../cubit/theme_cubit.dart';

class ThemeModeBuilder extends StatelessWidget {
  final Widget Function(BuildContext context, bool isDarkMode) builder;

  const ThemeModeBuilder({
    super.key,
    required this.builder,
  });

  @override
  Widget build(BuildContext context) {
    return BlocSelector<ThemeCubit, ThemeState, bool>(
      selector: (ThemeState state) => state.isDarkMode,
      builder: (BuildContext context, bool isDarkMode) {
        return builder(context, isDarkMode);
      },
    );
  }
}
