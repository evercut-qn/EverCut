// lib/core/theme/components/radio.dart

import 'package:flutter/material.dart';

import '../../../shared/extensions/context/device_metrics_extension.dart';
import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

Map<String, RadioThemeData> radioTheme(BuildContext context) => {
  'Dark': _radioTheme(
    context: context,
    overlayColor: DarkColorTokens.greenShade300.withAlpha(31),
    fillColor: DarkColorTokens.greenShade100,
    borderColorSelected: DarkColorTokens.greenShade100,
    borderColorUnselected: DarkColorTokens.neutralShade850,
  ),
  'Light': _radioTheme(
    context: context,
    overlayColor: LightColorTokens.greenShade300.withAlpha(31),
    fillColor: LightColorTokens.greenShade100,
    borderColorSelected: LightColorTokens.greenShade100,
    borderColorUnselected: LightColorTokens.neutralShade850,
  ),
};

RadioThemeData _radioTheme({
  required BuildContext context,
  required Color overlayColor,
  required Color fillColor,
  required Color borderColorSelected,
  required Color borderColorUnselected,
}) {
  return RadioThemeData(
    overlayColor: WidgetStatePropertyAll(overlayColor),
    fillColor: WidgetStatePropertyAll(fillColor),
    side: BorderSide(
      color: WidgetStateColor.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return borderColorSelected;
        } else {
          return borderColorUnselected;
        }
      }),
      width: context.scale(2),
    ),
  );
}
