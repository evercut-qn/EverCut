// lib/core/theme/components/divider.dart

import 'package:flutter/material.dart';

import '../../../shared/extensions/context/device_metrics_extension.dart';
import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

Map<String, DividerThemeData> dividerTheme(BuildContext context) => {
  'Dark': _dividerTheme(
    context: context,
    color: DarkColorTokens.primaryDividerColor,
  ),
  'Light': _dividerTheme(
    context: context,
    color: LightColorTokens.primaryDividerColor,
  ),
};

DividerThemeData _dividerTheme({
  required BuildContext context,
  required Color color,
}) {
  return DividerThemeData(
    color: color,
    space: context.scale(25),
  );
}
