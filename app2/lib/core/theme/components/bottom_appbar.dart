// lib/core/theme/components/bottom_appbar.dart

import 'package:flutter/material.dart';

import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

Map<String, BottomAppBarThemeData> bottomAppBarTheme = {
  'Dark': _bottomAppBarTheme(
    backgroundColor: DarkColorTokens.bottomAppBarBackgroundColor,
    surfaceTintColor: DarkColorTokens.bottomAppBarBackgroundColor,
  ),
  'Light': _bottomAppBarTheme(
    backgroundColor: LightColorTokens.bottomAppBarBackgroundColor,
    surfaceTintColor: LightColorTokens.bottomAppBarBackgroundColor,
  ),
};

BottomAppBarThemeData _bottomAppBarTheme({
  required Color backgroundColor,
  required Color surfaceTintColor,
}) {
  return BottomAppBarThemeData(
    color: backgroundColor,
    elevation: 0,
    shadowColor: Colors.transparent,
    surfaceTintColor: surfaceTintColor,
  );
}
