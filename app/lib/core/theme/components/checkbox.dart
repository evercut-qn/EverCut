// lib/core/theme/components/checkbox.dart

import 'package:flutter/material.dart';

import '../../../shared/extensions/context/device_metrics_extension.dart';
import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

Map<String, CheckboxThemeData> checkboxTheme(BuildContext context) => {
  'Dark': _checkboxTheme(
    context: context,
    checkColor: DarkColorTokens.neutralShade50,
    fillColorSelected: DarkColorTokens.greenShade100,
    fillColorUnselected: Colors.transparent,
    borderColor: DarkColorTokens.neutralShade850,
  ),
  'Light': _checkboxTheme(
    context: context,
    checkColor: LightColorTokens.neutralShade50,
    fillColorSelected: LightColorTokens.greenShade100,
    fillColorUnselected: Colors.transparent,
    borderColor: LightColorTokens.neutralShade850,
  ),
};

CheckboxThemeData _checkboxTheme({
  required BuildContext context,
  required Color checkColor,
  required Color fillColorSelected,
  required Color fillColorUnselected,
  required Color borderColor,
}) {
  return CheckboxThemeData(
    checkColor: WidgetStatePropertyAll(checkColor),
    fillColor: WidgetStateColor.resolveWith((states) {
      if (states.contains(WidgetState.selected)) {
        return fillColorSelected;
      } else {
        return fillColorUnselected;
      }
    }),
    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    overlayColor: WidgetStateColor.transparent,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(context.scale(4)),
    ),
    side: BorderSide(
      color: borderColor,
      width: context.scale(2),
    ),
    splashRadius: 0,
    visualDensity: VisualDensity.compact,
  );
}
