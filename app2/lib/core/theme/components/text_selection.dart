// lib/core/theme/components/text_selection.dart

import 'package:flutter/material.dart';

import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

Map<String, TextSelectionThemeData> textSelectionTheme = {
  'Dark': _textSelectionTheme(
    cursorAndHandleColor: DarkColorTokens.neutralShade850,
    selectionColor: DarkColorTokens.neutralShade850.withAlpha(31),
  ),
  'Light': _textSelectionTheme(
    cursorAndHandleColor: LightColorTokens.neutralShade850,
    selectionColor: LightColorTokens.neutralShade850.withAlpha(31),
  ),
};

TextSelectionThemeData _textSelectionTheme({
  required Color cursorAndHandleColor,
  required Color selectionColor,
}) {
  return TextSelectionThemeData(
    cursorColor: cursorAndHandleColor,
    selectionColor: selectionColor,
    selectionHandleColor: cursorAndHandleColor,
  );
}
