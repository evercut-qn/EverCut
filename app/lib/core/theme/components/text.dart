// lib/core/theme/components/text.dart

import 'package:flutter/material.dart';

import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

Map<String, TextTheme> textTheme = {
  'Dark': _textTheme(
    color: DarkColorTokens.neutralShade850,
  ),
  'Light': _textTheme(
    color: LightColorTokens.neutralShade850,
  ),
};

TextTheme _textTheme({
  required Color color,
}) {
  return TextTheme(
    bodyLarge: TextStyle(color: color),
    bodyMedium: TextStyle(color: color),
    bodySmall: TextStyle(color: color),
    displayLarge: TextStyle(color: color),
    displayMedium: TextStyle(color: color),
    displaySmall: TextStyle(color: color),
    headlineLarge: TextStyle(color: color),
    headlineMedium: TextStyle(color: color),
    headlineSmall: TextStyle(color: color),
    labelLarge: TextStyle(color: color),
    labelMedium: TextStyle(color: color),
    labelSmall: TextStyle(color: color),
    titleLarge: TextStyle(color: color),
    titleMedium: TextStyle(color: color),
    titleSmall: TextStyle(color: color),
  );
}
