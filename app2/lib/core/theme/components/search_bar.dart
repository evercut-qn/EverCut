// lib/core/theme/components/search_bar.dart

import 'package:flutter/material.dart';

import '../../../shared/extensions/context/device_metrics_extension.dart';
import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

Map<String, SearchBarThemeData> searchBarTheme(BuildContext context) => {
  'Dark': _searchBarTheme(
    context: context,
    backgroundColor: DarkColorTokens.neutralShade300.withAlpha(127),
    overlayColor: DarkColorTokens.neutralShade350.withAlpha(127),
    shadowColor: Colors.transparent,
    hintTextColor: DarkColorTokens.neutralShade750,
    inputTextColor: DarkColorTokens.neutralShade850,
    borderColor: DarkColorTokens.neutralShade600.withAlpha(127),
    surfaceTintColor: DarkColorTokens.neutralShade300.withAlpha(127),
  ),
  'Light': _searchBarTheme(
    context: context,
    backgroundColor: LightColorTokens.neutralShade100,
    overlayColor: LightColorTokens.neutralShade150.withAlpha(127),
    shadowColor: Colors.transparent,
    hintTextColor: LightColorTokens.neutralShade350,
    inputTextColor: LightColorTokens.neutralShade850,
    borderColor: LightColorTokens.neutralShade200,
    surfaceTintColor: LightColorTokens.neutralShade100,
  ),
};

SearchBarThemeData _searchBarTheme({
  required BuildContext context,
  required Color backgroundColor,
  required Color overlayColor,
  required Color shadowColor,
  required Color hintTextColor,
  required Color inputTextColor,
  required Color borderColor,
  required Color surfaceTintColor,
}) {
  return SearchBarThemeData(
    backgroundColor: WidgetStatePropertyAll(backgroundColor),
    elevation: const WidgetStatePropertyAll(0),
    hintStyle: WidgetStatePropertyAll(
      TextStyle(
        color: hintTextColor,
        fontSize: context.scale(16),
      ),
    ),
    overlayColor: WidgetStatePropertyAll(overlayColor),
    textStyle: WidgetStatePropertyAll(
      TextStyle(
        color: inputTextColor,
        fontSize: context.scale(16),
      ),
    ),
    shadowColor: WidgetStatePropertyAll(shadowColor),
    shape: WidgetStatePropertyAll(
      RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(context.scale(8)),
        side: BorderSide(color: borderColor),
      ),
    ),
    surfaceTintColor: WidgetStatePropertyAll(surfaceTintColor),
  );
}
