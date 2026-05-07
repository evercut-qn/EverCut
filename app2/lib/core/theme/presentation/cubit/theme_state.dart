// lib/core/theme/presentation/cubit/theme_state.dart

part of 'theme_cubit.dart';

class ThemeState extends Equatable {
  final Brightness brightness;
  final ThemeMode mode;

  const ThemeState({
    required this.brightness,
    required this.mode,
  });

  bool get isDarkMode => brightness == Brightness.dark;

  factory ThemeState.defaultState([ThemeMode mode = ThemeMode.system]) {
    return ThemeState(
      brightness: WidgetsBinding.instance.platformDispatcher.platformBrightness,
      mode: mode,
    );
  }

  ThemeState copyWith({
    Brightness? brightness,
    ThemeMode? mode,
  }) {
    return ThemeState(
      brightness: brightness ?? this.brightness,
      mode: mode ?? this.mode,
    );
  }

  @override
  List<Object?> get props => [
    brightness,
    mode,
  ];
}
