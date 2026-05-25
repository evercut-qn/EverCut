// lib/core/theme/components/tooltip.dart

import 'package:flutter/material.dart';

import '../../../shared/extensions/context/device_metrics_extension.dart';
import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

Map<String, TooltipThemeData> tooltipTheme(BuildContext context) => {
  'Dark': _tooltipTheme(
    context: context,
    textColor: DarkColorTokens.neutralShade50,
    backgroundColor: DarkColorTokens.neutralShade450,
  ),
  'Light': _tooltipTheme(
    context: context,
    textColor: LightColorTokens.neutralShade50,
    backgroundColor: LightColorTokens.neutralShade450,
  ),
};

TooltipThemeData _tooltipTheme({
  required BuildContext context,
  required Color textColor,
  required Color backgroundColor,
}) {
  return TooltipThemeData(
    textStyle: TextStyle(
      color: textColor,
      fontSize: context.scale(14),
    ),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(context.scale(4)),
      color: backgroundColor,
    ),
  );
}
