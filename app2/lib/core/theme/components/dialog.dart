// lib/core/theme/components/dialog.dart

import 'package:flutter/material.dart';

import '../../../shared/extensions/context/device_metrics_extension.dart';
import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

Map<String, DialogThemeData> dialogTheme(BuildContext context) => {
  'Dark': _dialogTheme(
    context: context,
    backgroundColor: DarkColorTokens.dialogBackgroundColor,
  ),
  'Light': _dialogTheme(
    context: context,
    backgroundColor: LightColorTokens.dialogBackgroundColor,
  ),
};

DialogThemeData _dialogTheme({
  required BuildContext context,
  required Color backgroundColor,
}) {
  return DialogThemeData(
    backgroundColor: backgroundColor,
    insetPadding: EdgeInsets.all(context.scale(12)),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(
        context.scale(12),
      ),
    ),
    surfaceTintColor: backgroundColor,
  );
}
